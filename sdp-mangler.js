var SJJ = require('sdp-jingle-json');

exports.addOpusFEC = function (sessiondescription) {
    var jingle = sessiondescription.jingle ? sessiondescription.jingle : SJJ.toSessionJSON(sessiondescription.sdp);
    sessiondescription.jingle = jingle;
    if (jingle.contents.length > 0 && jingle.contents[0].description) {
        var description = jingle.contents[0].description;
        if (description.descType == 'rtp' && description.media == 'audio' && description.payloads) {
            description.payloads.forEach(function (payload) {
                if (payload.name == 'opus') {
                    if (!payload.parameters) payload.parameters = [];
                    payload.parameters.push({
                        key: 'useinbandfec',
                        value: '1'
                    });
                }
            });
        }
    }
    sessiondescription.sdp = SJJ.toSessionSDP(jingle);
    return sessiondescription;
};

exports.addOpusStereo = function (sessiondescription) {
    var jingle = sessiondescription.jingle ? sessiondescription.jingle : SJJ.toSessionJSON(sessiondescription.sdp);
    sessiondescription.jingle = jingle;
    if (jingle.contents.length > 0 && jingle.contents[0].description) {
        var description = jingle.contents[0].description;
        if (description.descType == 'rtp' && description.media == 'audio' && description.payloads) {
            description.payloads.forEach(function (payload) {
                if (payload.name == 'opus') {
                    if (!payload.parameters) payload.parameters = [];
                    payload.parameters.push({
                        key: 'stereo',
                        value: '1'
                    });
                }
            });
        }
    }
    sessiondescription.sdp = SJJ.toSessionSDP(jingle);
    return sessiondescription;
};

exports.preferAudioCodec = function (sessiondescription) {
};

exports.setAudioBitRate = function (sessiondescription, bandwidth) {
    var jingle = sessiondescription.jingle ? sessiondescription.jingle : SJJ.toSessionJSON(sessiondescription.sdp);
    sessiondescription.jingle = jingle;
    if (jingle.contents.length > 0 && jingle.contents[0].description) {
        var description = jingle.contents[0].description;
        if (description.descType == 'rtp' && description.media == 'audio') {
            description.bandwidth = {
                type: 'AS',
                bandwidth: bandwidth
            };
        }
    }
    sessiondescription.sdp = SJJ.toSessionSDP(jingle);
    return sessiondescription;
};

exports.setVideoBitRate = function (sessiondescription) {
};

exports.setInitialVideoBitRate = function (sessiondescription) {
};
