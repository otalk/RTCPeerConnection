var bundle = require('browserify')(),
    fs = require('fs');


bundle.add('./rtcpeerconnection');
bundle.bundle({standalone: 'PeerConnection'}).pipe(fs.createWriteStream('rtcpeerconnection.bundle.js'));
