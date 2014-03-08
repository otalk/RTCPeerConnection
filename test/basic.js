/* testing basic session establishment */
var test = require('tape');
var PeerConnection = require('../rtcpeerconnection');

test('basic connection establishment', function (t) {
    var pc1, pc2;
    pc1 = new PeerConnection();
    pc2 = new PeerConnection();

    pc1.on('ice', function (candidate) {
        pc2.processIce(candidate);
    });
    pc2.on('ice', function (candidate) {
        pc1.processIce(candidate);
    });

    pc1.on('iceConnectionStateChange', function () {
        //console.log('pc1 iceConnectionStateChange', pc1.pc.iceConnectionState);
        if (pc1.pc.iceConnectionState == 'connected') {
            t.end();
        }
        // FIXME: also look for https://code.google.com/p/webrtc/issues/detail?id=1414
    });
    pc2.on('iceConnectionStateChange', function () {
        //console.log('pc2 iceConnectionStateChange', pc2.pc.iceConnectionState);
    });

    pc1.on('offer', function (offer) {
        pc2.handleOffer(offer, function (err) {
            if (err) {
                // handle error
                t.fail('error handling offer');
                return;
            }

            pc2.answer(function (err, answer) {
                if (err) {
                    // handle error
                    t.fail('error handling answer');
                    return;
                }
                pc1.handleAnswer(answer);
            });
        });
    });
    pc1.offer();
});

test('async accept', function (t) {
    var pc1, pc2;
    pc1 = new PeerConnection();
    pc2 = new PeerConnection();

    pc1.on('ice', function (candidate) {
        pc2.processIce(candidate);
    });
    pc2.on('ice', function (candidate) {
        pc1.processIce(candidate);
    });

    pc1.on('iceConnectionStateChange', function () {
        //console.log('pc1 iceConnectionStateChange', pc1.pc.iceConnectionState);
        if (pc1.pc.iceConnectionState == 'connected') {
            t.end();
        }
        // FIXME: also look for https://code.google.com/p/webrtc/issues/detail?id=1414
    });
    pc2.on('iceConnectionStateChange', function () {
        //console.log('pc2 iceConnectionStateChange', pc2.pc.iceConnectionState);
    });

    pc1.on('offer', function (offer) {
        pc2.handleOffer(offer, function (err) {
            if (err) {
                // handle error
                t.fail('error handling offer');
                return;
            }

            window.setTimeout(function () {
                pc2.answer(function (err, answer) {
                    if (err) {
                        // handle error
                        t.fail('error handling answer');
                        return;
                    }
                    pc1.handleAnswer(answer);
                });
            }, 5000);
        });
    });
    pc1.offer();
});
