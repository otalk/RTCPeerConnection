var _ = require('underscore');
var util = require('util');
var webrtc = require('webrtcsupport');
var SJJ = require('sdp-jingle-json');
var WildEmitter = require('wildemitter');
var peerconn = require('traceablepeerconnection');

function PeerConnection(config, constraints) {
    var self = this;
    var item;
    WildEmitter.call(this);

    config = config || {};
    config.iceServers = config.iceServers || [];

    // make sure this only gets enabled in Google Chrome
    // EXPERIMENTAL FLAG, might get removed without notice
    this.enableChromeNativeSimulcast = false;
    if (constraints && constraints.optional &&
            webrtc.prefix === 'webkit' &&
            navigator.appVersion.match(/Chromium\//) === null) {
        constraints.optional.forEach(function (constraint, idx) {
            if (constraint.enableChromeNativeSimulcast) {
                self.enableChromeNativeSimulcast = true;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    this.enableMultiStreamHacks = false;
    if (constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint, idx) {
            if (constraint.enableMultiStreamHacks) {
                self.enableMultiStreamHacks = true;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    // make firefox announce its ssrcs in answers
    this.enableFirefoxSSRCAnnounce = false;
    if (webrtc.prefix == 'moz' && constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint, idx) {
            if (constraint.enableFirefoxSSRCAnnounce) {
                self.enableFirefoxSSRCAnnounce = true;
            }
        });
    }

    this.pc = new peerconn(config, constraints);

    this.getLocalStreams = this.pc.getLocalStreams.bind(this.pc);
    this.getRemoteStreams = this.pc.getRemoteStreams.bind(this.pc);
    this.addStream = this.pc.addStream.bind(this.pc);
    this.removeStream = this.pc.removeStream.bind(this.pc);

    // proxy events 
    this.pc.on('*', function () {
        self.emit.apply(self, arguments);
    });

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

    this.config = {
        debug: false,
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
    this.hadLocalStunCandidate = false;
    this.hadRemoteStunCandidate = false;
    this.hadLocalRelayCandidate = false;
    this.hadRemoteRelayCandidate = false;

    this.hadLocalIPv6Candidate = false;
    this.hadRemoteIPv6Candidate = false;

    // keeping references for all our data channels
    // so they dont get garbage collected
    // can be removed once the following bugs have been fixed
    // https://crbug.com/405545 
    // https://bugzilla.mozilla.org/show_bug.cgi?id=964092
    // to be filed for opera
    this._remoteDataChannels = [];
    this._localDataChannels = [];
}

util.inherits(PeerConnection, WildEmitter);

Object.defineProperty(PeerConnection.prototype, 'signalingState', {
    get: function () {
        return this.pc.signalingState;
    }
});
Object.defineProperty(PeerConnection.prototype, 'iceConnectionState', {
    get: function () {
        return this.pc.iceConnectionState;
    }
});

// Add a stream to the peer connection object
PeerConnection.prototype.addStream = function (stream) {
    this.localStream = stream;
    this.pc.addStream(stream);
};


// Init and add ice candidate object with correct constructor
PeerConnection.prototype.processIce = function (update, cb) {
    cb = cb || function () {};
    var self = this;

    if (update.contents) {
        var contentNames = _.pluck(this.remoteDescription.contents, 'name');
        var contents = update.contents;

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
                if (candidate.type === 'srflx') {
                    self.hadRemoteStunCandidate = true;
                } else if (candidate.type === 'relay') {
                    self.hadRemoteRelayCandidate = true;
                }
                if (candidate.ip.indexOf(':') != -1) {
                    self.hadRemoteIPv6Candidate = true;
                }
            });
        });
    } else {
        // working around https://code.google.com/p/webrtc/issues/detail?id=3669
        if (update.candidate.candidate.indexOf('a=') !== 0) {
            update.candidate.candidate = 'a=' + update.candidate.candidate;
        }

        self.pc.addIceCandidate(new webrtc.IceCandidate(update.candidate));
        var cand = SJJ.toCandidateJSON(update.candidate.candidate);
        if (cand.type == 'srflx') {
            self.hadRemoteStunCandidate = true;
        } else if (cand.type == 'relay') {
            self.hadRemoteRelayCandidate = true;
        }
        if (cand.ip.indexOf(':') != -1) {
            self.hadRemoteIPv6Candidate = true;
        }
    }
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
        if (this.enableChromeNativeSimulcast) {
            offer.jingle.contents.forEach(function (content) {
                if (content.name === 'video') {
                    content.description.googConferenceFlag = true;
                }
            });
        }
        if (this.enableMultiStreamHacks) {
            // add a mixed video stream as first stream
            offer.jingle.contents.forEach(function (content) {
                if (content.name === 'video') {
                    var sources = content.description.sources || [];
                    if (sources.length === 0 || sources[0].ssrc !== '3735928559') {
                        sources.unshift({
                            ssrc: '3735928559', // 0xdeadbeef
                            parameters: [
                                {
                                    key: 'cname',
                                    value: 'deadbeef'
                                },
                                {
                                    key: 'msid',
                                    value: 'mixyourfecintothis please'
                                }
                            ]
                        });
                        content.description.sources = sources;
                    }
                }
            });
        }
        offer.sdp = SJJ.toSessionSDP(offer.jingle, self.config.sdpSessionID);
        self.remoteDescription = offer.jingle;
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

    this._localDataChannels = [];
    this._remoteDataChannels = [];

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
            var sim = [];
            if (self.enableChromeNativeSimulcast) {
                // native simulcast part 1: add another SSRC
                answer.jingle = SJJ.toSessionJSON(answer.sdp);
                if (answer.jingle.contents.length >= 2 && answer.jingle.contents[1].name === 'video') {
                    var hasSimgroup = false;
                    var groups = answer.jingle.contents[1].description.sourceGroups || [];
                    if (groups.length === 0 && // FIXME: should check for SIM group exist
                        answer.jingle.contents[1].description.sources.length) {
                        var newssrc = JSON.parse(JSON.stringify(answer.jingle.contents[1].description.sources[0]));
                        newssrc.ssrc = '' + Math.floor(Math.random() * 0xffffffff); // FIXME: look for conflicts
                        answer.jingle.contents[1].description.sources.push(newssrc);

                        answer.jingle.contents[1].description.sources.forEach(function (source) {
                            sim.push(source.ssrc);
                        });
                        answer.jingle.contents[1].description.sourceGroups = [
                            {
                                semantics: 'SIM',
                                sources: sim
                            }
                        ];
                        answer.sdp = SJJ.toSessionSDP(answer.jingle, self.config.sdpSessionID);
                    }
                }
            }
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
                    if (self.enableChromeNativeSimulcast) {
                        // native simulcast part 2: 
                        // signal multiple tracks to the receiver
                        if (!expandedAnswer.jingle) {
                            expandedAnswer.jingle = SJJ.toSessionJSON(expandedAnswer.sdp);
                        }
                        expandedAnswer.jingle.contents[1].description.sources.forEach(function (source, idx) {
                            if (sim.indexOf(source.ssrc) != -1) {
                                source.parameters = source.parameters.map(function (parameter) {
                                    if (parameter.key === 'msid') {
                                        parameter.value += '-' + idx;
                                    }
                                    return parameter;
                                });
                            }
                        });
                        expandedAnswer.sdp = SJJ.toSessionSDP(expandedAnswer.jingle);
                    }

                    if (self.enableFirefoxSSRCAnnounce) {
                        // generate fake cname and msid lines for firefox
                        self.getStats(function (err, items) {
                            if (items) {
                                var ssrcs = {};
                                items.forEach(function (item) {
                                    if (item.id === 'outbound_rtp_audio_0') {
                                        ssrcs.audio = item.ssrc;
                                    } else if (item.id == 'outbound_rtp_video_1') {
                                        ssrcs.video = item.ssrc;
                                    }
                                });
                                if (ssrcs.audio || ssrcs.video) {
                                    ssrcs.cname = Math.random().toString(36).substring(2);
                                    ssrcs.stream = self.pc.getLocalStreams()[0].id || Math.random().toString(36).substring(2);
                                    if (!expandedAnswer.jingle) {
                                        expandedAnswer.jingle = SJJ.toSessionJSON(expandedAnswer.sdp);
                                    }
                                    if (ssrcs.audio && self.pc.getLocalStreams()[0].getAudioTracks().length) {
                                        ssrcs.audiotrack = self.pc.getLocalStreams()[0].getAudioTracks()[0].id;
                                        expandedAnswer.jingle.contents[0].description.sources.push({
                                            ssrc: ssrcs.audio,
                                            parameters: [
                                                {
                                                    key: 'cname',
                                                    value: ssrcs.cname
                                                },
                                                {
                                                    key: 'msid',
                                                    value: [ssrcs.stream, ssrcs.audiotrack].join(' ')
                                                }
                                            ]
                                        });
                                    }
                                    if (ssrcs.video && self.pc.getLocalStreams()[0].getVideoTracks().length) {
                                        ssrcs.videotrack = self.pc.getLocalStreams()[0].getVideoTracks()[0].id;
                                        expandedAnswer.jingle.contents[1].description.sources.push({
                                            ssrc: ssrcs.video,
                                            parameters: [
                                                {
                                                    key: 'cname',
                                                    value: ssrcs.cname
                                                },
                                                {
                                                    key: 'msid',
                                                    value: [ssrcs.stream, ssrcs.videotrack].join(' ')
                                                }
                                            ]
                                        });
                                    }
                                    expandedAnswer.sdp = SJJ.toSessionSDP(expandedAnswer.jingle);
                                }
                            }
                            // in case of errors just emit unmodified
                            self.emit('answer', expandedAnswer);
                            cb(null, expandedAnswer);
                        });

                    } else {
                        self.emit('answer', expandedAnswer);
                        cb(null, expandedAnswer);
                    }
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

        var cand = SJJ.toCandidateJSON(ice.candidate);
        if (self.config.useJingle) {
            if (!ice.sdpMid) { // firefox doesn't set this
                ice.sdpMid = self.localDescription.contents[ice.sdpMLineIndex].name;
            }
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
                            cand
                        ]
                    }
                }]
            };
        }
        if (cand.type === 'srflx') {
            this.hadLocalStunCandidate = true;
        } else if (cand.type == 'relay') {
            this.hadLocalRelayCandidate = true;
        }
        if (cand.ip.indexOf(':') != -1) {
            self.hadLocalIPv6Candidate = true;
        }

        this.emit('ice', expandedCandidate);
    } else {
        this.emit('endOfCandidates');
    }
};

// Internal method for processing a new data channel being added by the
// other peer.
PeerConnection.prototype._onDataChannel = function (event) {
    // make sure we keep a reference so this doesn't get garbage collected
    var channel = event.channel;
    this._remoteDataChannels.push(channel);

    this.emit('addChannel', channel);
};

// Internal handling of adding stream
PeerConnection.prototype._onAddStream = function (event) {
    this.remoteStreams.push(event.stream);
    this.emit('addStream', event);
};

// Create a data channel spec reference:
// http://dev.w3.org/2011/webrtc/editor/webrtc.html#idl-def-RTCDataChannelInit
PeerConnection.prototype.createDataChannel = function (name, opts) {
    var channel = this.pc.createDataChannel(name, opts);

    // make sure we keep a reference so this doesn't get garbage collected
    this._localDataChannels.push(channel);

    return channel;
};

// a wrapper around getStats which hides the differences (where possible)
PeerConnection.prototype.getStats = function (cb) {
    if (webrtc.prefix === 'moz') {
        this.pc.getStats(
            function (res) {
                var items = [];
                for (var result in res) {
                    if (typeof res[result] === 'object') {
                        items.push(res[result]);
                    }
                }
                cb(null, items);
            },
            cb
        );
    } else {
        this.pc.getStats(function (res) {
            var items = [];
            res.result().forEach(function (result) {
                var item = {};
                result.names().forEach(function (name) {
                    item[name] = result.stat(name);
                });
                item.id = result.id;
                item.type = result.type;
                item.timestamp = result.timestamp;
                items.push(item);
            });
            cb(null, items);
        });
    }
};

module.exports = PeerConnection;
