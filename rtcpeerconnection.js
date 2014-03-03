var _ = require('underscore');
var util = require('util');
var webrtc = require('webrtcsupport');
var SJJ = require('sdp-jingle-json');
var WildEmitter = require('wildemitter');


function PeerConnection(config, constraints) {
    var item;
    WildEmitter.call(this);

    config = config || {};
    config.iceServers = config.iceServers || [];

    this.pc = new webrtc.PeerConnection(config, constraints);

    // proxy some events directly
    this.pc.onremovestream = this.emit.bind(this, 'removeStream');
    this.pc.onnegotiationneeded = this.emit.bind(this, 'negotiationNeeded');
    this.pc.oniceconnectionstatechange = this.emit.bind(this, 'iceConnectionStateChange');
    this.pc.onsignalingstatechange = this.emit.bind(this, 'signalingStateChange');

    // handle incoming ice and data channel events
    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.onicecandidate = this._onIce.bind(this);
    this.pc.ondatachannel = this._onDataChannel.bind(this);

    this.localDescription = {
        contents: []
    };
    this.remoteDescription = {
        contents: []
    };

    this.localStream = null;
    this.remoteStreams = [];

    // whether to use SDP hack for faster data transfer
    this.config = {
        debug: false,
        sdpHack: true,
        ice: {},
        sid: '',
        isInitiator: true,
        sdpSessionID: Date.now(),
        useJingle: false
    };

    // apply our config
    for (item in config) {
        this.config[item] = config[item];
    }

    if (this.config.debug) {
        this.on('*', function (eventName, event) {
            var logger = config.logger || console;
            logger.log('PeerConnection event:', arguments);
        });
    }
}

util.inherits(PeerConnection, WildEmitter);


// Add a stream to the peer connection object
PeerConnection.prototype.addStream = function (stream) {
    this.localStream = stream;
    this.pc.addStream(stream);
};


// Init and add ice candidate object with correct constructor
PeerConnection.prototype.processIce = function (update, cb) {
    cb = cb || function () {};
    var self = this;

    var contentNames = _.pluck(this.remoteDescription.contents, 'name');
    var contents = update.contents || [];

    contents.forEach(function (content) {
        var transport = content.transport || {};
        var candidates = transport.candidates || [];
        var mline = contentNames.indexOf(content.name);
        var mid = content.name;

        candidates.forEach(function (candidate) {
            var iceCandidate = SJJ.toCandidateSDP(candidate) + '\r\n';
            self.pc.addIceCandidate(new webrtc.IceCandidate({
                candidate: iceCandidate,
                sdpMLineIndex: mline,
                sdpMid: mid
            })
            /* not yet, breaks Chrome M32 */
            /*
            , function () {
                // well, this success callback is pretty meaningless
            },
            function (err) {
                self.emit('error', err);
            }
            */
            );
        });
    });

    cb();
};

// Generate and emit an offer with the given constraints
PeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };
    cb = hasConstraints ? cb : constraints;
    cb = cb || function () {};

    // Actually generate the offer
    this.pc.createOffer(
        function (offer) {
            offer.sdp = self._applySdpHack(offer.sdp);
            self.pc.setLocalDescription(offer,
                function () {
                    var jingle;
                    var expandedOffer = {
                        type: 'offer',
                        sdp: offer.sdp
                    };
                    if (self.config.useJingle) {
                        jingle = SJJ.toSessionJSON(offer.sdp, self.config.isInitiator ? 'initiator' : 'responder');
                        jingle.sid = self.config.sid;
                        self.localDescription = jingle;

                        // Save ICE credentials
                        _.each(jingle.contents, function (content) {
                            var transport = content.transport || {};
                            if (transport.ufrag) {
                                self.config.ice[content.name] = {
                                    ufrag: transport.ufrag,
                                    pwd: transport.pwd
                                };
                            }
                        });

                        expandedOffer.jingle = jingle;
                    }

                    self.emit('offer', expandedOffer);
                    cb(null, expandedOffer);
                },
                function (err) {
                    self.emit('error', err);
                    cb(err);
                }
            );
        },
        function (err) {
            self.emit('error', err);
            cb(err);
        },
        mediaConstraints
    );
};


// Process an incoming offer so that ICE may proceed before deciding
// to answer the request.
PeerConnection.prototype.handleOffer = function (offer, cb) {
    cb = cb || function () {};
    var self = this;
    offer.type = 'offer';
    if (offer.jingle) {
        offer.sdp = SJJ.toSessionSDP(offer.jingle, self.config.sdpSessionID);
    }
    self.pc.setRemoteDescription(new webrtc.SessionDescription(offer), function () {
        cb();
    }, cb);
};

// Answer an offer with audio only
PeerConnection.prototype.answerAudioOnly = function (cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: false
            }
        };
    this._answer(mediaConstraints, cb);
};

// Answer an offer without offering to recieve
PeerConnection.prototype.answerBroadcastOnly = function (cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        };
    this._answer(mediaConstraints, cb);
};

// Answer an offer with given constraints default is audio/video
PeerConnection.prototype.answer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var callback = hasConstraints ? cb : constraints;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

    this._answer(mediaConstraints, callback);
};

// Process an answer
PeerConnection.prototype.handleAnswer = function (answer, cb) {
    cb = cb || function () {};
    var self = this;
    if (answer.jingle) {
        answer.sdp = SJJ.toSessionSDP(answer.jingle, self.config.sdpSessionID);
        self.remoteDescription = answer.jingle;
    }
    self.pc.setRemoteDescription(
        new webrtc.SessionDescription(answer),
        function () {
            cb(null);
        },
        cb
    );
};

// Close the peer connection
PeerConnection.prototype.close = function () {
    this.pc.close();
    this.emit('close');
};

// Internal code sharing for various types of answer methods
PeerConnection.prototype._answer = function (constraints, cb) {
    cb = cb || function () {};
    var self = this;
    if (!this.pc.remoteDescription) {
        // the old API is used, call handleOffer
        throw new Error('remoteDescription not set');
    }
    self.pc.createAnswer(
        function (answer) {
            answer.sdp = self._applySdpHack(answer.sdp);
            self.pc.setLocalDescription(answer,
                function () {
                    var expandedAnswer = {
                        type: 'answer',
                        sdp: answer.sdp
                    };
                    if (self.config.useJingle) {
                        var jingle = SJJ.toSessionJSON(answer.sdp);
                        jingle.sid = self.config.sid;
                        self.localDescription = jingle;
                        expandedAnswer.jingle = jingle;
                    }
                    self.emit('answer', expandedAnswer);
                    cb(null, expandedAnswer);
                },
                function (err) {
                    self.emit('error', err);
                    cb(err);
                }
            );
        },
        function (err) {
            self.emit('error', err);
            cb(err);
        },
        constraints
    );
};

// Internal method for emitting ice candidates on our peer object
PeerConnection.prototype._onIce = function (event) {
    var self = this;
    if (event.candidate) {
        var ice = event.candidate;

        var expandedCandidate = {
            candidate: event.candidate
        };

        if (self.config.useJingle) {
            if (!self.config.ice[ice.sdpMid]) {
                var jingle = SJJ.toSessionJSON(self.pc.localDescription.sdp, self.config.isInitiator ? 'initiator' : 'responder');
                _.each(jingle.contents, function (content) {
                    var transport = content.transport || {};
                    if (transport.ufrag) {
                        self.config.ice[content.name] = {
                            ufrag: transport.ufrag,
                            pwd: transport.pwd
                        };
                    }
                });
            }
            expandedCandidate.jingle = {
                contents: [{
                    name: ice.sdpMid,
                    creator: self.config.isInitiator ? 'initiator' : 'responder',
                    transport: {
                        transType: 'iceUdp',
                        ufrag: self.config.ice[ice.sdpMid].ufrag,
                        pwd: self.config.ice[ice.sdpMid].pwd,
                        candidates: [
                            SJJ.toCandidateJSON(ice.candidate)
                        ]
                    }
                }]
            };
        }

        this.emit('ice', expandedCandidate);
    } else {
        this.emit('endOfCandidates');
    }
};

// Internal method for processing a new data channel being added by the
// other peer.
PeerConnection.prototype._onDataChannel = function (event) {
    this.emit('addChannel', event.channel);
};

// Internal handling of adding stream
PeerConnection.prototype._onAddStream = function (event) {
    this.remoteStreams.push(event.stream);
    this.emit('addStream', event);
};

// SDP hack for increasing AS (application specific) data transfer speed allowed in chrome
PeerConnection.prototype._applySdpHack = function (sdp) {
    if (!this.config.sdpHack) return sdp;
    var parts = sdp.split('b=AS:30');
    if (parts.length === 2) {
        // increase max data transfer bandwidth to 100 Mbps
        return parts[0] + 'b=AS:102400' + parts[1];
    } else {
        return sdp;
    }
};

// Create a data channel spec reference:
// http://dev.w3.org/2011/webrtc/editor/webrtc.html#idl-def-RTCDataChannelInit
PeerConnection.prototype.createDataChannel = function (name, opts) {
    opts || (opts = {});
    var reliable = !!opts.reliable;
    var protocol = opts.protocol || 'text/plain';
    var negotiated = !!(opts.negotiated || opts.preset);
    var settings;
    var channel;
    // firefox is a bit more finnicky
    if (webrtc.prefix === 'moz') {
        if (reliable) {
            settings = {
                protocol: protocol,
                preset: negotiated,
                stream: name
            };
        } else {
            settings = {};
        }
        channel = this.pc.createDataChannel(name, settings);
        channel.binaryType = 'blob';
    } else {
        if (reliable) {
            settings = {
                reliable: true
            };
        } else {
            settings = {reliable: false};
        }
        channel = this.pc.createDataChannel(name, settings);
    }
    return channel;
};

module.exports = PeerConnection;
