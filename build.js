var bundle = require('browserify')({
    standalone: 'PeerConnection'
});
var fs = require('fs');


bundle.add('./rtcpeerconnection');
bundle.transform("babelify", {
  global: true,
  ignore: /\/node_modules\/(?!webrtc-adapter\/)/
});
bundle.bundle().pipe(fs.createWriteStream('rtcpeerconnection.bundle.js'));
