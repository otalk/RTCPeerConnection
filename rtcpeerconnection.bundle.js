(function(e){if("function"==typeof bootstrap)bootstrap("peerconnection",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makePeerConnection=e}else"undefined"!=typeof window?window.PeerConnection=e():global.PeerConnection=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
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

},{"wildemitter":2,"webrtcsupport":3}],2:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based 
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {
    
});

emitter.on('somenamespace*', function (eventName, payloads) {
    
});

Please note that callbacks triggered by wildcard registered events also get 
the event name as the first argument.
*/
module.exports = WildEmitter;

function WildEmitter() {
    this.callbacks = {};
}

// Listen on the given `event` with `fn`. Store a group name if present.
WildEmitter.prototype.on = function (event, groupName, fn) {
    var hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    func._groupName = group;
    (this.callbacks[event] = this.callbacks[event] || []).push(func);
    return this;
};

// Adds an `event` listener that will be invoked a single
// time then automatically removed.
WildEmitter.prototype.once = function (event, groupName, fn) {
    var self = this,
        hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    function on() {
        self.off(event, on);
        func.apply(this, arguments);
    }
    this.on(event, group, on);
    return this;
};

// Unbinds an entire group
WildEmitter.prototype.releaseGroup = function (groupName) {
    var item, i, len, handlers;
    for (item in this.callbacks) {
        handlers = this.callbacks[item];
        for (i = 0, len = handlers.length; i < len; i++) {
            if (handlers[i]._groupName === groupName) {
                //console.log('removing');
                // remove it and shorten the array we're looping through
                handlers.splice(i, 1);
                i--;
                len--;
            }
        }
    }
    return this;
};

// Remove the given callback for `event` or all
// registered callbacks.
WildEmitter.prototype.off = function (event, fn) {
    var callbacks = this.callbacks[event],
        i;
    
    if (!callbacks) return this;

    // remove all handlers
    if (arguments.length === 1) {
        delete this.callbacks[event];
        return this;
    }

    // remove specific handler
    i = callbacks.indexOf(fn);
    callbacks.splice(i, 1);
    return this;
};

// Emit `event` with the given args.
// also calls any `*` handlers
WildEmitter.prototype.emit = function (event) {
    var args = [].slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        specialCallbacks = this.getWildcardCallbacks(event),
        i,
        len,
        item;

    if (callbacks) {
        for (i = 0, len = callbacks.length; i < len; ++i) {
            if (callbacks[i]) {
                callbacks[i].apply(this, args);
            } else {
                break;
            }
        }
    }

    if (specialCallbacks) {
        for (i = 0, len = specialCallbacks.length; i < len; ++i) {
            if (specialCallbacks[i]) {
                specialCallbacks[i].apply(this, [event].concat(args));
            } else {
                break;
            }
        }
    }

    return this;
};

// Helper for for finding special wildcard event handlers that match the event
WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
    var item,
        split,
        result = [];

    for (item in this.callbacks) {
        split = item.split('*');
        if (item === '*' || (split.length === 2 && eventName.slice(0, split[1].length) === split[1])) {
            result = result.concat(this.callbacks[item]);
        }
    }
    return result;
};

},{}],3:[function(require,module,exports){
// created by @HenrikJoreteg
var PC = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var prefix = function () {
    if (window.mozRTCPeerConnection) {
        return 'moz';
    } else if (window.webkitRTCPeerConnection) {
        return 'webkit';
    }
}();
var screenSharing = navigator.userAgent.match('Chrome') && parseInt(navigator.userAgent.match(/Chrome\/(.*) /)[1], 10) >= 26;
var webAudio = !!window.webkitAudioContext;

// export support flags and constructors.prototype && PC
module.exports = {
    support: !!PC,
    dataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
    prefix: prefix,
    webAudio: webAudio,
    screenSharing: screenSharing,
    PeerConnection: PC,
    SessionDescription: SessionDescription,
    IceCandidate: IceCandidate
};

},{}]},{},[1])(1)
});
;