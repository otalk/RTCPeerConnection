var WildEmitter = require('wildemitter');
var webrtc = require('webrtcsupport');


function PeerConnection(config, constraints) {
    this.pc = new webrtc.PeerConnection(config, constraints);
    WildEmitter.call(this);
    this.pc.onicecandidate = this._onIce.bind(this);
    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.onremovestream = this._onRemoveStream.bind(this);

    if (config.debug) {
        this.on('*', function (eventName, event) {
            console.log('PeerConnection event:', eventName, event);
        });
    }
}

PeerConnection.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: PeerConnection
    }
});

PeerConnection.prototype.addStream = function (stream) {
    this.localStream = stream;
    this.pc.addStream(stream);
};

PeerConnection.prototype._onIce = function (event) {
    if (event.candidate) {
        this.emit('ice', event.candidate);
    } else {
        this.emit('endOfCandidates');
    }
};

PeerConnection.prototype._onAddStream = function (event) {
    this.emit('addStream', event);
};

PeerConnection.prototype._onRemoveStream = function (event) {
    this.emit('removeStream', event);
};

PeerConnection.prototype.processIce = function (candidate) {
    this.pc.addIceCandidate(new webrtc.IceCandidate(candidate));
};

PeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };
    var callback = hasConstraints ? cb : constraints;

    this.pc.createOffer(
        function (sessionDescription) {
            self.pc.setLocalDescription(sessionDescription);
            self.emit('offer', sessionDescription);
            if (callback) callback(null, sessionDescription);
        },
        function (err) {
            self.emit('error', err);
            if (callback) callback(err);
        },
        mediaConstraints
    );
};

PeerConnection.prototype.answerAudioOnly = function (offer, cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: false
            }
        };

    this._answer(offer, mediaConstraints, cb);
};

PeerConnection.prototype.answerVideoOnly = function (offer, cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: true
            }
        };

    this._answer(offer, mediaConstraints, cb);
};

PeerConnection.prototype._answer = function (offer, constraints, cb) {
    var self = this;
    this.pc.setRemoteDescription(new webrtc.SessionDescription(offer));
    this.pc.createAnswer(
        function (sessionDescription) {
            self.pc.setLocalDescription(sessionDescription);
            self.emit('answer', sessionDescription);
            if (cb) cb(null, sessionDescription);
        }, function (err) {
            self.emit('error', err);
            if (cb) cb(err);
        },
        constraints
    );
};

PeerConnection.prototype.answer = function (offer, constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 3;
    var callback = hasConstraints ? cb : constraints;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

    this._answer(offer, mediaConstraints, callback);
};

PeerConnection.prototype.handleAnswer = function (answer) {
    this.pc.setRemoteDescription(new webrtc.SessionDescription(answer));
};

PeerConnection.prototype.close = function () {
    this.pc.close();
    this.emit('close');
};

module.exports = PeerConnection;
