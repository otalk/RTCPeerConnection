var WildEmitter = require('wildemitter');

// The RTCPeerConnection object.
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

// The RTCSessionDescription object.
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;

// The RTCIceCandidate object.
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;


function PeerConnection(config, constraints) {
    this.pc = new RTCPeerConnection(config, constraints);
    WildEmitter.call(this);
    this.pc.onicemessage = this._onIce.bind(this);
    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.onremovestream = this._onRemoveStream.bind(this);
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
    this.emit('ice', event.candidate);
};

PeerConnection.prototype._onAddStream = function () {

};

PeerConnection.prototype._onRemoveStream = function () {

};

PeerConnection.prototype.processIce = function (candidate) {
    this.pc.addIceCandidate(new RTCIceCandidate(candidate));
};

PeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var mediaConstraints = constraints || {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

    this.pc.createOffer(function (sessionDescription) {
        self.pc.setLocalDescription(sessionDescription);
        self.emit('offer', sessionDescription);
        cb && cb(sessionDescription)
    }, null, mediaConstraints);
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
    this.setRemoteDescription(new RTCSessionDescription(offer));
    this.createAnswer(function (sessionDescription) {
        self.pc.setLocalDescription(sessionDescription);
        self.emit('answer', sessionDescription);
        cb && cb(sessionDescription);
    }, null, constraints);
};

PeerConnection.prototype.answer = function (offer, constraints, cb) {
    var self = this;
    var threeArgs = arguments.length === 3;
    var callback = threeArgs ? cb : constraints;
    var mediaConstraints = threeArgs ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

    this._answer(offer, mediaConstraints, cb);
};

PeerConnection.prototype.close = function () {
    this.pc.close();
    this.emit('close');
};

module.exports = PeerConnection;
