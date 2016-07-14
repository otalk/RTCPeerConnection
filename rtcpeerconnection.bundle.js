(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PeerConnection = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":3,"_process":2,"inherits":1}],5:[function(require,module,exports){
var toSDP = require('./lib/tosdp');
var toJSON = require('./lib/tojson');


// Converstion from JSON to SDP

exports.toIncomingSDPOffer = function (session) {
    return toSDP.toSessionSDP(session, {
        role: 'responder',
        direction: 'incoming'
    });
};
exports.toOutgoingSDPOffer = function (session) {
    return toSDP.toSessionSDP(session, {
        role: 'initiator',
        direction: 'outgoing'
    });
};
exports.toIncomingSDPAnswer = function (session) {
    return toSDP.toSessionSDP(session, {
        role: 'initiator',
        direction: 'incoming'
    });
};
exports.toOutgoingSDPAnswer = function (session) {
    return toSDP.toSessionSDP(session, {
        role: 'responder',
        direction: 'outgoing'
    });
};
exports.toIncomingMediaSDPOffer = function (media) {
    return toSDP.toMediaSDP(media, {
        role: 'responder',
        direction: 'incoming'
    });
};
exports.toOutgoingMediaSDPOffer = function (media) {
    return toSDP.toMediaSDP(media, {
        role: 'initiator',
        direction: 'outgoing'
    });
};
exports.toIncomingMediaSDPAnswer = function (media) {
    return toSDP.toMediaSDP(media, {
        role: 'initiator',
        direction: 'incoming'
    });
};
exports.toOutgoingMediaSDPAnswer = function (media) {
    return toSDP.toMediaSDP(media, {
        role: 'responder',
        direction: 'outgoing'
    });
};
exports.toCandidateSDP = toSDP.toCandidateSDP;
exports.toMediaSDP = toSDP.toMediaSDP;
exports.toSessionSDP = toSDP.toSessionSDP;


// Conversion from SDP to JSON

exports.toIncomingJSONOffer = function (sdp, creators) {
    return toJSON.toSessionJSON(sdp, {
        role: 'responder',
        direction: 'incoming',
        creators: creators
    });
};
exports.toOutgoingJSONOffer = function (sdp, creators) {
    return toJSON.toSessionJSON(sdp, {
        role: 'initiator',
        direction: 'outgoing',
        creators: creators
    });
};
exports.toIncomingJSONAnswer = function (sdp, creators) {
    return toJSON.toSessionJSON(sdp, {
        role: 'initiator',
        direction: 'incoming',
        creators: creators
    });
};
exports.toOutgoingJSONAnswer = function (sdp, creators) {
    return toJSON.toSessionJSON(sdp, {
        role: 'responder',
        direction: 'outgoing',
        creators: creators
    });
};
exports.toIncomingMediaJSONOffer = function (sdp, creator) {
    return toJSON.toMediaJSON(sdp, {
        role: 'responder',
        direction: 'incoming',
        creator: creator
    });
};
exports.toOutgoingMediaJSONOffer = function (sdp, creator) {
    return toJSON.toMediaJSON(sdp, {
        role: 'initiator',
        direction: 'outgoing',
        creator: creator
    });
};
exports.toIncomingMediaJSONAnswer = function (sdp, creator) {
    return toJSON.toMediaJSON(sdp, {
        role: 'initiator',
        direction: 'incoming',
        creator: creator
    });
};
exports.toOutgoingMediaJSONAnswer = function (sdp, creator) {
    return toJSON.toMediaJSON(sdp, {
        role: 'responder',
        direction: 'outgoing',
        creator: creator
    });
};
exports.toCandidateJSON = toJSON.toCandidateJSON;
exports.toMediaJSON = toJSON.toMediaJSON;
exports.toSessionJSON = toJSON.toSessionJSON;

},{"./lib/tojson":8,"./lib/tosdp":9}],6:[function(require,module,exports){
exports.lines = function (sdp) {
    return sdp.split('\r\n').filter(function (line) {
        return line.length > 0;
    });
};

exports.findLine = function (prefix, mediaLines, sessionLines) {
    var prefixLength = prefix.length;
    for (var i = 0; i < mediaLines.length; i++) {
        if (mediaLines[i].substr(0, prefixLength) === prefix) {
            return mediaLines[i];
        }
    }
    // Continue searching in parent session section
    if (!sessionLines) {
        return false;
    }

    for (var j = 0; j < sessionLines.length; j++) {
        if (sessionLines[j].substr(0, prefixLength) === prefix) {
            return sessionLines[j];
        }
    }

    return false;
};

exports.findLines = function (prefix, mediaLines, sessionLines) {
    var results = [];
    var prefixLength = prefix.length;
    for (var i = 0; i < mediaLines.length; i++) {
        if (mediaLines[i].substr(0, prefixLength) === prefix) {
            results.push(mediaLines[i]);
        }
    }
    if (results.length || !sessionLines) {
        return results;
    }
    for (var j = 0; j < sessionLines.length; j++) {
        if (sessionLines[j].substr(0, prefixLength) === prefix) {
            results.push(sessionLines[j]);
        }
    }
    return results;
};

exports.mline = function (line) {
    var parts = line.substr(2).split(' ');
    var parsed = {
        media: parts[0],
        port: parts[1],
        proto: parts[2],
        formats: []
    };
    for (var i = 3; i < parts.length; i++) {
        if (parts[i]) {
            parsed.formats.push(parts[i]);
        }
    }
    return parsed;
};

exports.rtpmap = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {
        id: parts.shift()
    };

    parts = parts[0].split('/');

    parsed.name = parts[0];
    parsed.clockrate = parts[1];
    parsed.channels = parts.length == 3 ? parts[2] : '1';
    return parsed;
};

exports.sctpmap = function (line) {
    // based on -05 draft
    var parts = line.substr(10).split(' ');
    var parsed = {
        number: parts.shift(),
        protocol: parts.shift(),
        streams: parts.shift()
    };
    return parsed;
};


exports.fmtp = function (line) {
    var kv, key, value;
    var parts = line.substr(line.indexOf(' ') + 1).split(';');
    var parsed = [];
    for (var i = 0; i < parts.length; i++) {
        kv = parts[i].split('=');
        key = kv[0].trim();
        value = kv[1];
        if (key && value) {
            parsed.push({key: key, value: value});
        } else if (key) {
            parsed.push({key: '', value: key});
        }
    }
    return parsed;
};

exports.crypto = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {
        tag: parts[0],
        cipherSuite: parts[1],
        keyParams: parts[2],
        sessionParams: parts.slice(3).join(' ')
    };
    return parsed;
};

exports.fingerprint = function (line) {
    var parts = line.substr(14).split(' ');
    return {
        hash: parts[0],
        value: parts[1]
    };
};

exports.extmap = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {};

    var idpart = parts.shift();
    var sp = idpart.indexOf('/');
    if (sp >= 0) {
        parsed.id = idpart.substr(0, sp);
        parsed.senders = idpart.substr(sp + 1);
    } else {
        parsed.id = idpart;
        parsed.senders = 'sendrecv';
    }

    parsed.uri = parts.shift() || '';

    return parsed;
};

exports.rtcpfb = function (line) {
    var parts = line.substr(10).split(' ');
    var parsed = {};
    parsed.id = parts.shift();
    parsed.type = parts.shift();
    if (parsed.type === 'trr-int') {
        parsed.value = parts.shift();
    } else {
        parsed.subtype = parts.shift() || '';
    }
    parsed.parameters = parts;
    return parsed;
};

exports.candidate = function (line) {
    var parts;
    if (line.indexOf('a=candidate:') === 0) {
        parts = line.substring(12).split(' ');
    } else { // no a=candidate
        parts = line.substring(10).split(' ');
    }

    var candidate = {
        foundation: parts[0],
        component: parts[1],
        protocol: parts[2].toLowerCase(),
        priority: parts[3],
        ip: parts[4],
        port: parts[5],
        // skip parts[6] == 'typ'
        type: parts[7],
        generation: '0'
    };

    for (var i = 8; i < parts.length; i += 2) {
        if (parts[i] === 'raddr') {
            candidate.relAddr = parts[i + 1];
        } else if (parts[i] === 'rport') {
            candidate.relPort = parts[i + 1];
        } else if (parts[i] === 'generation') {
            candidate.generation = parts[i + 1];
        } else if (parts[i] === 'tcptype') {
            candidate.tcpType = parts[i + 1];
        }
    }

    candidate.network = '1';

    return candidate;
};

exports.sourceGroups = function (lines) {
    var parsed = [];
    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].substr(13).split(' ');
        parsed.push({
            semantics: parts.shift(),
            sources: parts
        });
    }
    return parsed;
};

exports.sources = function (lines) {
    // http://tools.ietf.org/html/rfc5576
    var parsed = [];
    var sources = {};
    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].substr(7).split(' ');
        var ssrc = parts.shift();

        if (!sources[ssrc]) {
            var source = {
                ssrc: ssrc,
                parameters: []
            };
            parsed.push(source);

            // Keep an index
            sources[ssrc] = source;
        }

        parts = parts.join(' ').split(':');
        var attribute = parts.shift();
        var value = parts.join(':') || null;

        sources[ssrc].parameters.push({
            key: attribute,
            value: value
        });
    }

    return parsed;
};

exports.groups = function (lines) {
    // http://tools.ietf.org/html/rfc5888
    var parsed = [];
    var parts;
    for (var i = 0; i < lines.length; i++) {
        parts = lines[i].substr(8).split(' ');
        parsed.push({
            semantics: parts.shift(),
            contents: parts
        });
    }
    return parsed;
};

exports.bandwidth = function (line) {
    var parts = line.substr(2).split(':');
    var parsed = {};
    parsed.type = parts.shift();
    parsed.bandwidth = parts.shift();
    return parsed;
};

exports.msid = function (line) {
    var data = line.substr(7);
    var parts = data.split(' ');
    return {
        msid: data,
        mslabel: parts[0],
        label: parts[1]
    };
};

},{}],7:[function(require,module,exports){
module.exports = {
    initiator: {
        incoming: {
            initiator: 'recvonly',
            responder: 'sendonly',
            both: 'sendrecv',
            none: 'inactive',
            recvonly: 'initiator',
            sendonly: 'responder',
            sendrecv: 'both',
            inactive: 'none'
        },
        outgoing: {
            initiator: 'sendonly',
            responder: 'recvonly',
            both: 'sendrecv',
            none: 'inactive',
            recvonly: 'responder',
            sendonly: 'initiator',
            sendrecv: 'both',
            inactive: 'none'
        }
    },
    responder: {
        incoming: {
            initiator: 'sendonly',
            responder: 'recvonly',
            both: 'sendrecv',
            none: 'inactive',
            recvonly: 'responder',
            sendonly: 'initiator',
            sendrecv: 'both',
            inactive: 'none'
        },
        outgoing: {
            initiator: 'recvonly',
            responder: 'sendonly',
            both: 'sendrecv',
            none: 'inactive',
            recvonly: 'initiator',
            sendonly: 'responder',
            sendrecv: 'both',
            inactive: 'none'
        }
    }
};

},{}],8:[function(require,module,exports){
var SENDERS = require('./senders');
var parsers = require('./parsers');
var idCounter = Math.random();


exports._setIdCounter = function (counter) {
    idCounter = counter;
};

exports.toSessionJSON = function (sdp, opts) {
    var i;
    var creators = opts.creators || [];
    var role = opts.role || 'initiator';
    var direction = opts.direction || 'outgoing';


    // Divide the SDP into session and media sections.
    var media = sdp.split('\r\nm=');
    for (i = 1; i < media.length; i++) {
        media[i] = 'm=' + media[i];
        if (i !== media.length - 1) {
            media[i] += '\r\n';
        }
    }
    var session = media.shift() + '\r\n';
    var sessionLines = parsers.lines(session);
    var parsed = {};

    var contents = [];
    for (i = 0; i < media.length; i++) {
        contents.push(exports.toMediaJSON(media[i], session, {
            role: role,
            direction: direction,
            creator: creators[i] || 'initiator'
        }));
    }
    parsed.contents = contents;

    var groupLines = parsers.findLines('a=group:', sessionLines);
    if (groupLines.length) {
        parsed.groups = parsers.groups(groupLines);
    }

    return parsed;
};

exports.toMediaJSON = function (media, session, opts) {
    var creator = opts.creator || 'initiator';
    var role = opts.role || 'initiator';
    var direction = opts.direction || 'outgoing';

    var lines = parsers.lines(media);
    var sessionLines = parsers.lines(session);
    var mline = parsers.mline(lines[0]);

    var content = {
        creator: creator,
        name: mline.media,
        description: {
            descType: 'rtp',
            media: mline.media,
            payloads: [],
            encryption: [],
            feedback: [],
            headerExtensions: []
        },
        transport: {
            transType: 'iceUdp',
            candidates: [],
            fingerprints: []
        }
    };
    if (mline.media == 'application') {
        // FIXME: the description is most likely to be independent
        // of the SDP and should be processed by other parts of the library
        content.description = {
            descType: 'datachannel'
        };
        content.transport.sctp = [];
    }
    var desc = content.description;
    var trans = content.transport;

    // If we have a mid, use that for the content name instead.
    var mid = parsers.findLine('a=mid:', lines);
    if (mid) {
        content.name = mid.substr(6);
    }

    if (parsers.findLine('a=sendrecv', lines, sessionLines)) {
        content.senders = 'both';
    } else if (parsers.findLine('a=sendonly', lines, sessionLines)) {
        content.senders = SENDERS[role][direction].sendonly;
    } else if (parsers.findLine('a=recvonly', lines, sessionLines)) {
        content.senders = SENDERS[role][direction].recvonly;
    } else if (parsers.findLine('a=inactive', lines, sessionLines)) {
        content.senders = 'none';
    }

    if (desc.descType == 'rtp') {
        var bandwidth = parsers.findLine('b=', lines);
        if (bandwidth) {
            desc.bandwidth = parsers.bandwidth(bandwidth);
        }

        var ssrc = parsers.findLine('a=ssrc:', lines);
        if (ssrc) {
            desc.ssrc = ssrc.substr(7).split(' ')[0];
        }

        var rtpmapLines = parsers.findLines('a=rtpmap:', lines);
        rtpmapLines.forEach(function (line) {
            var payload = parsers.rtpmap(line);
            payload.parameters = [];
            payload.feedback = [];

            var fmtpLines = parsers.findLines('a=fmtp:' + payload.id, lines);
            // There should only be one fmtp line per payload
            fmtpLines.forEach(function (line) {
                payload.parameters = parsers.fmtp(line);
            });

            var fbLines = parsers.findLines('a=rtcp-fb:' + payload.id, lines);
            fbLines.forEach(function (line) {
                payload.feedback.push(parsers.rtcpfb(line));
            });

            desc.payloads.push(payload);
        });

        var cryptoLines = parsers.findLines('a=crypto:', lines, sessionLines);
        cryptoLines.forEach(function (line) {
            desc.encryption.push(parsers.crypto(line));
        });

        if (parsers.findLine('a=rtcp-mux', lines)) {
            desc.mux = true;
        }

        var fbLines = parsers.findLines('a=rtcp-fb:*', lines);
        fbLines.forEach(function (line) {
            desc.feedback.push(parsers.rtcpfb(line));
        });

        var extLines = parsers.findLines('a=extmap:', lines);
        extLines.forEach(function (line) {
            var ext = parsers.extmap(line);

            ext.senders = SENDERS[role][direction][ext.senders];

            desc.headerExtensions.push(ext);
        });

        var ssrcGroupLines = parsers.findLines('a=ssrc-group:', lines);
        desc.sourceGroups = parsers.sourceGroups(ssrcGroupLines || []);

        var ssrcLines = parsers.findLines('a=ssrc:', lines);
        var sources = desc.sources = parsers.sources(ssrcLines || []);

        var msidLine = parsers.findLine('a=msid:', lines);
        if (msidLine) {
            var msid = parsers.msid(msidLine);
            ['msid', 'mslabel', 'label'].forEach(function (key) {
                for (var i = 0; i < sources.length; i++) {
                    var found = false;
                    for (var j = 0; j < sources[i].parameters.length; j++) {
                        if (sources[i].parameters[j].key === key) {
                            found = true;
                        }
                    }
                    if (!found) {
                        sources[i].parameters.push({ key: key, value: msid[key] });
                    }
                }
            });
        }

        if (parsers.findLine('a=x-google-flag:conference', lines, sessionLines)) {
            desc.googConferenceFlag = true;
        }
    }

    // transport specific attributes
    var fingerprintLines = parsers.findLines('a=fingerprint:', lines, sessionLines);
    var setup = parsers.findLine('a=setup:', lines, sessionLines);
    fingerprintLines.forEach(function (line) {
        var fp = parsers.fingerprint(line);
        if (setup) {
            fp.setup = setup.substr(8);
        }
        trans.fingerprints.push(fp);
    });

    var ufragLine = parsers.findLine('a=ice-ufrag:', lines, sessionLines);
    var pwdLine = parsers.findLine('a=ice-pwd:', lines, sessionLines);
    if (ufragLine && pwdLine) {
        trans.ufrag = ufragLine.substr(12);
        trans.pwd = pwdLine.substr(10);
        trans.candidates = [];

        var candidateLines = parsers.findLines('a=candidate:', lines, sessionLines);
        candidateLines.forEach(function (line) {
            trans.candidates.push(exports.toCandidateJSON(line));
        });
    }

    if (desc.descType == 'datachannel') {
        var sctpmapLines = parsers.findLines('a=sctpmap:', lines);
        sctpmapLines.forEach(function (line) {
            var sctp = parsers.sctpmap(line);
            trans.sctp.push(sctp);
        });
    }

    return content;
};

exports.toCandidateJSON = function (line) {
    var candidate = parsers.candidate(line.split('\r\n')[0]);
    candidate.id = (idCounter++).toString(36).substr(0, 12);
    return candidate;
};

},{"./parsers":6,"./senders":7}],9:[function(require,module,exports){
var SENDERS = require('./senders');


exports.toSessionSDP = function (session, opts) {
    var role = opts.role || 'initiator';
    var direction = opts.direction || 'outgoing';
    var sid = opts.sid || session.sid || Date.now();
    var time = opts.time || Date.now();

    var sdp = [
        'v=0',
        'o=- ' + sid + ' ' + time + ' IN IP4 0.0.0.0',
        's=-',
        't=0 0'
    ];

    var contents = session.contents || [];
    var hasSources = false;
    contents.forEach(function (content) {
        if (content.description.sources &&
            content.description.sources.length) {
            hasSources = true;
        }
    });

    if (hasSources) {
        sdp.push('a=msid-semantic: WMS *');
    }

    var groups = session.groups || [];
    groups.forEach(function (group) {
        sdp.push('a=group:' + group.semantics + ' ' + group.contents.join(' '));
    });


    contents.forEach(function (content) {
        sdp.push(exports.toMediaSDP(content, opts));
    });

    return sdp.join('\r\n') + '\r\n';
};

exports.toMediaSDP = function (content, opts) {
    var sdp = [];

    var role = opts.role || 'initiator';
    var direction = opts.direction || 'outgoing';

    var desc = content.description;
    var transport = content.transport;
    var payloads = desc.payloads || [];
    var fingerprints = (transport && transport.fingerprints) || [];

    var mline = [];
    if (desc.descType == 'datachannel') {
        mline.push('application');
        mline.push('1');
        mline.push('DTLS/SCTP');
        if (transport.sctp) {
            transport.sctp.forEach(function (map) {
                mline.push(map.number);
            });
        }
    } else {
        mline.push(desc.media);
        mline.push('1');
        if (fingerprints.length > 0) {
            mline.push('UDP/TLS/RTP/SAVPF');
        } else if (desc.encryption && desc.encryption.length > 0) {
            mline.push('RTP/SAVPF');
        } else {
            mline.push('RTP/AVPF');
        }
        payloads.forEach(function (payload) {
            mline.push(payload.id);
        });
    }


    sdp.push('m=' + mline.join(' '));

    sdp.push('c=IN IP4 0.0.0.0');
    if (desc.bandwidth && desc.bandwidth.type && desc.bandwidth.bandwidth) {
        sdp.push('b=' + desc.bandwidth.type + ':' + desc.bandwidth.bandwidth);
    }
    if (desc.descType == 'rtp') {
        sdp.push('a=rtcp:1 IN IP4 0.0.0.0');
    }

    if (transport) {
        if (transport.ufrag) {
            sdp.push('a=ice-ufrag:' + transport.ufrag);
        }
        if (transport.pwd) {
            sdp.push('a=ice-pwd:' + transport.pwd);
        }

        var pushedSetup = false;
        fingerprints.forEach(function (fingerprint) {
            sdp.push('a=fingerprint:' + fingerprint.hash + ' ' + fingerprint.value);
            if (fingerprint.setup && !pushedSetup) {
                sdp.push('a=setup:' + fingerprint.setup);
            }
        });

        if (transport.sctp) {
            transport.sctp.forEach(function (map) {
                sdp.push('a=sctpmap:' + map.number + ' ' + map.protocol + ' ' + map.streams);
            });
        }
    }

    if (desc.descType == 'rtp') {
        sdp.push('a=' + (SENDERS[role][direction][content.senders] || 'sendrecv'));
    }
    sdp.push('a=mid:' + content.name);

    if (desc.sources && desc.sources.length) {
        (desc.sources[0].parameters || []).forEach(function (param) {
            if (param.key === 'msid') {
                sdp.push('a=msid:' + param.value);
            }
        });
    }

    if (desc.mux) {
        sdp.push('a=rtcp-mux');
    }

    var encryption = desc.encryption || [];
    encryption.forEach(function (crypto) {
        sdp.push('a=crypto:' + crypto.tag + ' ' + crypto.cipherSuite + ' ' + crypto.keyParams + (crypto.sessionParams ? ' ' + crypto.sessionParams : ''));
    });
    if (desc.googConferenceFlag) {
        sdp.push('a=x-google-flag:conference');
    }

    payloads.forEach(function (payload) {
        var rtpmap = 'a=rtpmap:' + payload.id + ' ' + payload.name + '/' + payload.clockrate;
        if (payload.channels && payload.channels != '1') {
            rtpmap += '/' + payload.channels;
        }
        sdp.push(rtpmap);

        if (payload.parameters && payload.parameters.length) {
            var fmtp = ['a=fmtp:' + payload.id];
            var parameters = [];
            payload.parameters.forEach(function (param) {
                parameters.push((param.key ? param.key + '=' : '') + param.value);
            });
            fmtp.push(parameters.join(';'));
            sdp.push(fmtp.join(' '));
        }

        if (payload.feedback) {
            payload.feedback.forEach(function (fb) {
                if (fb.type === 'trr-int') {
                    sdp.push('a=rtcp-fb:' + payload.id + ' trr-int ' + (fb.value ? fb.value : '0'));
                } else {
                    sdp.push('a=rtcp-fb:' + payload.id + ' ' + fb.type + (fb.subtype ? ' ' + fb.subtype : ''));
                }
            });
        }
    });

    if (desc.feedback) {
        desc.feedback.forEach(function (fb) {
            if (fb.type === 'trr-int') {
                sdp.push('a=rtcp-fb:* trr-int ' + (fb.value ? fb.value : '0'));
            } else {
                sdp.push('a=rtcp-fb:* ' + fb.type + (fb.subtype ? ' ' + fb.subtype : ''));
            }
        });
    }

    var hdrExts = desc.headerExtensions || [];
    hdrExts.forEach(function (hdr) {
        sdp.push('a=extmap:' + hdr.id + (hdr.senders ? '/' + SENDERS[role][direction][hdr.senders] : '') + ' ' + hdr.uri);
    });

    var ssrcGroups = desc.sourceGroups || [];
    ssrcGroups.forEach(function (ssrcGroup) {
        sdp.push('a=ssrc-group:' + ssrcGroup.semantics + ' ' + ssrcGroup.sources.join(' '));
    });

    var ssrcs = desc.sources || [];
    ssrcs.forEach(function (ssrc) {
        for (var i = 0; i < ssrc.parameters.length; i++) {
            var param = ssrc.parameters[i];
            sdp.push('a=ssrc:' + (ssrc.ssrc || desc.ssrc) + ' ' + param.key + (param.value ? (':' + param.value) : ''));
        }
    });

    var candidates = transport.candidates || [];
    candidates.forEach(function (candidate) {
        sdp.push(exports.toCandidateSDP(candidate));
    });

    return sdp.join('\r\n');
};

exports.toCandidateSDP = function (candidate) {
    var sdp = [];

    sdp.push(candidate.foundation);
    sdp.push(candidate.component);
    sdp.push(candidate.protocol.toUpperCase());
    sdp.push(candidate.priority);
    sdp.push(candidate.ip);
    sdp.push(candidate.port);

    var type = candidate.type;
    sdp.push('typ');
    sdp.push(type);
    if (type === 'srflx' || type === 'prflx' || type === 'relay') {
        if (candidate.relAddr && candidate.relPort) {
            sdp.push('raddr');
            sdp.push(candidate.relAddr);
            sdp.push('rport');
            sdp.push(candidate.relPort);
        }
    }
    if (candidate.tcpType && candidate.protocol.toUpperCase() == 'TCP') {
        sdp.push('tcptype');
        sdp.push(candidate.tcpType);
    }

    sdp.push('generation');
    sdp.push(candidate.generation || '0');

    // FIXME: apparently this is wrong per spec
    // but then, we need this when actually putting this into
    // SDP so it's going to stay.
    // decision needs to be revisited when browsers dont
    // accept this any longer
    return 'a=candidate:' + sdp.join(' ');
};

},{"./senders":7}],10:[function(require,module,exports){
// based on https://github.com/ESTOS/strophe.jingle/
// adds wildemitter support
var util = require('util');
var adapter = require('webrtc-adapter'); // jshint ignore:line
var WildEmitter = require('wildemitter');

function dumpSDP(description) {
    return {
        type: description.type,
        sdp: description.sdp
    };
}

function dumpStream(stream) {
    var info = {
        label: stream.id,
    };
    if (stream.getAudioTracks().length) {
        info.audio = stream.getAudioTracks().map(function (track) {
            return track.id;
        });
    }
    if (stream.getVideoTracks().length) {
        info.video = stream.getVideoTracks().map(function (track) {
            return track.id;
        });
    }
    return info;
}

function TraceablePeerConnection(config, constraints) {
    var self = this;
    WildEmitter.call(this);

    this.peerconnection = new window.RTCPeerConnection(config, constraints);

    this.trace = function (what, info) {
        self.emit('PeerConnectionTrace', {
            time: new Date(),
            type: what,
            value: info || ""
        });
    };

    this.onicecandidate = null;
    this.peerconnection.onicecandidate = function (event) {
        self.trace('onicecandidate', event.candidate);
        if (self.onicecandidate !== null) {
            self.onicecandidate(event);
        }
    };
    this.onaddstream = null;
    this.peerconnection.onaddstream = function (event) {
        self.trace('onaddstream', dumpStream(event.stream));
        if (self.onaddstream !== null) {
            self.onaddstream(event);
        }
    };
    this.onremovestream = null;
    this.peerconnection.onremovestream = function (event) {
        self.trace('onremovestream', dumpStream(event.stream));
        if (self.onremovestream !== null) {
            self.onremovestream(event);
        }
    };
    this.onsignalingstatechange = null;
    this.peerconnection.onsignalingstatechange = function (event) {
        self.trace('onsignalingstatechange', self.signalingState);
        if (self.onsignalingstatechange !== null) {
            self.onsignalingstatechange(event);
        }
    };
    this.oniceconnectionstatechange = null;
    this.peerconnection.oniceconnectionstatechange = function (event) {
        self.trace('oniceconnectionstatechange', self.iceConnectionState);
        if (self.oniceconnectionstatechange !== null) {
            self.oniceconnectionstatechange(event);
        }
    };
    this.onnegotiationneeded = null;
    this.peerconnection.onnegotiationneeded = function (event) {
        self.trace('onnegotiationneeded');
        if (self.onnegotiationneeded !== null) {
            self.onnegotiationneeded(event);
        }
    };
    self.ondatachannel = null;
    this.peerconnection.ondatachannel = function (event) {
        self.trace('ondatachannel', event);
        if (self.ondatachannel !== null) {
            self.ondatachannel(event);
        }
    };
    this.getLocalStreams = this.peerconnection.getLocalStreams.bind(this.peerconnection);
    this.getRemoteStreams = this.peerconnection.getRemoteStreams.bind(this.peerconnection);
}

util.inherits(TraceablePeerConnection, WildEmitter);

['signalingState', 'iceConnectionState', 'localDescription', 'remoteDescription'].forEach(function (prop) {
    Object.defineProperty(TraceablePeerConnection.prototype, prop, {
        get: function () {
            return this.peerconnection[prop];
        }
    });
});

TraceablePeerConnection.prototype.addStream = function (stream) {
    this.trace('addStream', dumpStream(stream));
    this.peerconnection.addStream(stream);
};

TraceablePeerConnection.prototype.removeStream = function (stream) {
    this.trace('removeStream', dumpStream(stream));
    this.peerconnection.removeStream(stream);
};

TraceablePeerConnection.prototype.createDataChannel = function (label, opts) {
    this.trace('createDataChannel', label, opts);
    return this.peerconnection.createDataChannel(label, opts);
};

TraceablePeerConnection.prototype.setLocalDescription = function (description, successCallback, failureCallback) {
    var self = this;
    this.trace('setLocalDescription', dumpSDP(description));
    return this.peerconnection.setLocalDescription(
        description
    ).then(
        function () {
            self.trace('setLocalDescriptionOnSuccess');
            if (successCallback) successCallback();
        },
        function (err) {
            self.trace('setLocalDescriptionOnFailure', err);
            if (failureCallback) failureCallback(err);
        }
    );
};

TraceablePeerConnection.prototype.setRemoteDescription = function (description, successCallback, failureCallback) {
    var self = this;
    this.trace('setRemoteDescription', dumpSDP(description));
    return this.peerconnection.setRemoteDescription(
        description
    ).then(
        function () {
            self.trace('setRemoteDescriptionOnSuccess');
            if (successCallback) successCallback();
        },
        function (err) {
            self.trace('setRemoteDescriptionOnFailure', err);
            if (failureCallback) failureCallback(err);
        }
    );
};

TraceablePeerConnection.prototype.close = function () {
    this.trace('stop');
    if (this.peerconnection.signalingState != 'closed') {
        this.peerconnection.close();
    }
};

TraceablePeerConnection.prototype.createOffer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createOffer', constraints);
    return this.peerconnection.createOffer(
        constraints
    ).then(
        function (offer) {
            self.trace('createOfferOnSuccess', dumpSDP(offer));
            if (successCallback) successCallback(offer);
        },
        function (err) {
            self.trace('createOfferOnFailure', err);
            if (failureCallback) failureCallback(err);
        }
    );
};

TraceablePeerConnection.prototype.createAnswer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createAnswer', constraints);
    return this.peerconnection.createAnswer(
        constraints
    ).then(
        function (answer) {
            self.trace('createAnswerOnSuccess', dumpSDP(answer));
            if (successCallback) successCallback(answer);
        },
        function (err) {
            self.trace('createAnswerOnFailure', err);
            if (failureCallback) failureCallback(err);
        }
    );
};

TraceablePeerConnection.prototype.addIceCandidate = function (candidate, successCallback, failureCallback) {
    var self = this;
    this.trace('addIceCandidate', candidate);
    return this.peerconnection.addIceCandidate(
        candidate
    ).then(
        function () {
            //self.trace('addIceCandidateOnSuccess');
            if (successCallback) successCallback();
        },
        function (err) {
            self.trace('addIceCandidateOnFailure', err);
            if (failureCallback) failureCallback(err);
        }
    );
};

TraceablePeerConnection.prototype.getStats = function () {
    this.peerconnection.getStats.apply(this.peerconnection, arguments);
};

module.exports = TraceablePeerConnection;

},{"util":4,"webrtc-adapter":12,"wildemitter":21}],11:[function(require,module,exports){
 /* eslint-env node */
'use strict';

// SDP helpers.
var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
SDPUtils.generateIdentifier = function() {
  return Math.random().toString(36).substr(2, 10);
};

// The RTCP CNAME used by all peerconnections from the same JS.
SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
SDPUtils.splitLines = function(blob) {
  return blob.trim().split('\n').map(function(line) {
    return line.trim();
  });
};
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
SDPUtils.splitSections = function(blob) {
  var parts = blob.split('\nm=');
  return parts.map(function(part, index) {
    return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
  });
};

// Returns lines that start with a certain prefix.
SDPUtils.matchPrefix = function(blob, prefix) {
  return SDPUtils.splitLines(blob).filter(function(line) {
    return line.indexOf(prefix) === 0;
  });
};

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
SDPUtils.parseCandidate = function(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parts[1],
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7]
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      default: // Unknown extensions are silently ignored.
        break;
    }
  }
  return candidate;
};

// Translates a candidate object into SDP candidate attribute.
SDPUtils.writeCandidate = function(candidate) {
  var sdp = [];
  sdp.push(candidate.foundation);
  sdp.push(candidate.component);
  sdp.push(candidate.protocol.toUpperCase());
  sdp.push(candidate.priority);
  sdp.push(candidate.ip);
  sdp.push(candidate.port);

  var type = candidate.type;
  sdp.push('typ');
  sdp.push(type);
  if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
    sdp.push('raddr');
    sdp.push(candidate.relatedAddress); // was: relAddr
    sdp.push('rport');
    sdp.push(candidate.relatedPort); // was: relPort
  }
  if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
    sdp.push('tcptype');
    sdp.push(candidate.tcpType);
  }
  return 'candidate:' + sdp.join(' ');
};

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
SDPUtils.parseRtpMap = function(line) {
  var parts = line.substr(9).split(' ');
  var parsed = {
    payloadType: parseInt(parts.shift(), 10) // was: id
  };

  parts = parts[0].split('/');

  parsed.name = parts[0];
  parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  // was: channels
  parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
  return parsed;
};

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
SDPUtils.writeRtpMap = function(codec) {
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
};

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
SDPUtils.parseExtmap = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    id: parseInt(parts[0], 10),
    uri: parts[1]
  };
};

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
SDPUtils.writeExtmap = function(headerExtension) {
  return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
       ' ' + headerExtension.uri + '\r\n';
};

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
SDPUtils.parseFmtp = function(line) {
  var parsed = {};
  var kv;
  var parts = line.substr(line.indexOf(' ') + 1).split(';');
  for (var j = 0; j < parts.length; j++) {
    kv = parts[j].trim().split('=');
    parsed[kv[0].trim()] = kv[1];
  }
  return parsed;
};

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeFmtp = function(codec) {
  var line = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.parameters && Object.keys(codec.parameters).length) {
    var params = [];
    Object.keys(codec.parameters).forEach(function(param) {
      params.push(param + '=' + codec.parameters[param]);
    });
    line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
  }
  return line;
};

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
SDPUtils.parseRtcpFb = function(line) {
  var parts = line.substr(line.indexOf(' ') + 1).split(' ');
  return {
    type: parts.shift(),
    parameter: parts.join(' ')
  };
};
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeRtcpFb = function(codec) {
  var lines = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
    codec.rtcpFeedback.forEach(function(fb) {
      lines += 'a=rtcp-fb:' + pt + ' ' + fb.type + ' ' + fb.parameter +
          '\r\n';
    });
  }
  return lines;
};

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
SDPUtils.parseSsrcMedia = function(line) {
  var sp = line.indexOf(' ');
  var parts = {
    ssrc: parseInt(line.substr(7, sp - 7), 10)
  };
  var colon = line.indexOf(':', sp);
  if (colon > -1) {
    parts.attribute = line.substr(sp + 1, colon - sp - 1);
    parts.value = line.substr(colon + 1);
  } else {
    parts.attribute = line.substr(sp + 1);
  }
  return parts;
};

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var fpLine = lines.filter(function(line) {
    return line.indexOf('a=fingerprint:') === 0;
  })[0].substr(14);
  // Note: a=setup line is ignored since we use the 'auto' role.
  var dtlsParameters = {
    role: 'auto',
    fingerprints: [{
      algorithm: fpLine.split(' ')[0],
      value: fpLine.split(' ')[1]
    }]
  };
  return dtlsParameters;
};

// Serializes DTLS parameters to SDP.
SDPUtils.writeDtlsParameters = function(params, setupType) {
  var sdp = 'a=setup:' + setupType + '\r\n';
  params.fingerprints.forEach(function(fp) {
    sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
  });
  return sdp;
};
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var iceParameters = {
    usernameFragment: lines.filter(function(line) {
      return line.indexOf('a=ice-ufrag:') === 0;
    })[0].substr(12),
    password: lines.filter(function(line) {
      return line.indexOf('a=ice-pwd:') === 0;
    })[0].substr(10)
  };
  return iceParameters;
};

// Serializes ICE parameters to SDP.
SDPUtils.writeIceParameters = function(params) {
  return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
};

// Parses the SDP media section and returns RTCRtpParameters.
SDPUtils.parseRtpParameters = function(mediaSection) {
  var description = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: [],
    rtcp: []
  };
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
    var pt = mline[i];
    var rtpmapline = SDPUtils.matchPrefix(
        mediaSection, 'a=rtpmap:' + pt + ' ')[0];
    if (rtpmapline) {
      var codec = SDPUtils.parseRtpMap(rtpmapline);
      var fmtps = SDPUtils.matchPrefix(
          mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
      codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
      codec.rtcpFeedback = SDPUtils.matchPrefix(
          mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
      description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
      switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
      }
    }
  }
  SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
    description.headerExtensions.push(SDPUtils.parseExtmap(line));
  });
  // FIXME: parse rtcp.
  return description;
};

// Generates parts of the SDP media section describing the capabilities /
// parameters.
SDPUtils.writeRtpDescription = function(kind, caps) {
  var sdp = '';

  // Build the mline.
  sdp += 'm=' + kind + ' ';
  sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
  sdp += ' UDP/TLS/RTP/SAVPF ';
  sdp += caps.codecs.map(function(codec) {
    if (codec.preferredPayloadType !== undefined) {
      return codec.preferredPayloadType;
    }
    return codec.payloadType;
  }).join(' ') + '\r\n';

  sdp += 'c=IN IP4 0.0.0.0\r\n';
  sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
  caps.codecs.forEach(function(codec) {
    sdp += SDPUtils.writeRtpMap(codec);
    sdp += SDPUtils.writeFmtp(codec);
    sdp += SDPUtils.writeRtcpFb(codec);
  });
  // FIXME: add headerExtensions, fecMechanismş and rtcp.
  sdp += 'a=rtcp-mux\r\n';
  return sdp;
};

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
  var encodingParameters = [];
  var description = SDPUtils.parseRtpParameters(mediaSection);
  var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
  var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
  var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'cname';
  });
  var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
  var secondarySsrc;

  var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
  .map(function(line) {
    var parts = line.split(' ');
    parts.shift();
    return parts.map(function(part) {
      return parseInt(part, 10);
    });
  });
  if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
    secondarySsrc = flows[0][1];
  }

  description.codecs.forEach(function(codec) {
    if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
      var encParam = {
        ssrc: primarySsrc,
        codecPayloadType: parseInt(codec.parameters.apt, 10),
        rtx: {
          payloadType: codec.payloadType,
          ssrc: secondarySsrc
        }
      };
      encodingParameters.push(encParam);
      if (hasRed) {
        encParam = JSON.parse(JSON.stringify(encParam));
        encParam.fec = {
          ssrc: secondarySsrc,
          mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
        };
        encodingParameters.push(encParam);
      }
    }
  });
  if (encodingParameters.length === 0 && primarySsrc) {
    encodingParameters.push({
      ssrc: primarySsrc
    });
  }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
  var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
  if (bandwidth.length) {
    if (bandwidth[0].indexOf('b=TIAS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(7), 10);
    } else if (bandwidth[0].indexOf('b=AS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(5), 10);
    }
    encodingParameters.forEach(function(params) {
      params.maxBitrate = bandwidth;
    });
  }
  return encodingParameters;
};

SDPUtils.writeSessionBoilerplate = function() {
  // FIXME: sess-id should be an NTP timestamp.
  return 'v=0\r\n' +
      'o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
};

SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  // FIXME: for RTX there might be multiple SSRCs. Not implemented in Edge yet.
  if (transceiver.rtpSender) {
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  return sdp;
};

// Gets the direction from the mediaSection or the sessionpart.
SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
  var lines = SDPUtils.splitLines(mediaSection);
  for (var i = 0; i < lines.length; i++) {
    switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
    }
  }
  if (sessionpart) {
    return SDPUtils.getDirection(sessionpart);
  }
  return 'sendrecv';
};

// Expose public methods.
module.exports = SDPUtils;

},{}],12:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';

// Shimming starts here.

(function () {
  // Utils.
  var logging = require('./utils').log;
  var browserDetails = require('./utils').browserDetails;
  // Export to the adapter global object visible in the browser.
  module.exports.browserDetails = browserDetails;
  module.exports.extractVersion = require('./utils').extractVersion;
  module.exports.disableLog = require('./utils').disableLog;

  // Comment out the line below if you want logging to occur, including logging
  // for the switch statement below. Can also be turned on in the browser via
  // adapter.disableLog(false), but then logging from the switch statement below
  // will not appear.
  require('./utils').disableLog(true);

  // Browser shims.
  var chromeShim = require('./chrome/chrome_shim') || null;
  var edgeShim = require('./edge/edge_shim') || null;
  var firefoxShim = require('./firefox/firefox_shim') || null;
  var safariShim = require('./safari/safari_shim') || null;

  // Shim browser if found.
  switch (browserDetails.browser) {
    case 'opera': // fallthrough as it uses chrome shims
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection) {
        logging('Chrome shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = chromeShim;

      chromeShim.shimGetUserMedia();
      chromeShim.shimMediaStream();
      chromeShim.shimSourceObject();
      chromeShim.shimPeerConnection();
      chromeShim.shimOnTrack();
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection) {
        logging('Firefox shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = firefoxShim;

      firefoxShim.shimGetUserMedia();
      firefoxShim.shimSourceObject();
      firefoxShim.shimPeerConnection();
      firefoxShim.shimOnTrack();
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection) {
        logging('MS edge shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = edgeShim;

      edgeShim.shimGetUserMedia();
      edgeShim.shimPeerConnection();
      break;
    case 'safari':
      if (!safariShim) {
        logging('Safari shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = safariShim;

      safariShim.shimGetUserMedia();
      break;
    default:
      logging('Unsupported browser!');
  }
})();

},{"./chrome/chrome_shim":13,"./edge/edge_shim":15,"./firefox/firefox_shim":17,"./safari/safari_shim":19,"./utils":20}],13:[function(require,module,exports){

/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var logging = require('../utils.js').log;
var browserDetails = require('../utils.js').browserDetails;

var chromeShim = {
  shimMediaStream: function shimMediaStream() {
    window.MediaStream = window.MediaStream || window.webkitMediaStream;
  },

  shimOnTrack: function shimOnTrack() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && !('ontrack' in window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function get() {
          return this._ontrack;
        },
        set: function set(f) {
          var self = this;
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function (e) {
            // onaddstream does not fire when a track is added to an existing
            // stream. But stream.onaddtrack is implemented so we use that.
            e.stream.addEventListener('addtrack', function (te) {
              var event = new Event('track');
              event.track = te.track;
              event.receiver = { track: te.track };
              event.streams = [e.stream];
              self.dispatchEvent(event);
            });
            e.stream.getTracks().forEach(function (track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = { track: track };
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
  },

  shimSourceObject: function shimSourceObject() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
      if (window.HTMLMediaElement && !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function get() {
            return this._srcObject;
          },
          set: function set(stream) {
            var self = this;
            // Use _srcObject as a private property for this shim
            this._srcObject = stream;
            if (this.src) {
              URL.revokeObjectURL(this.src);
            }

            if (!stream) {
              this.src = '';
              return;
            }
            this.src = URL.createObjectURL(stream);
            // We need to recreate the blob url when a track is added or
            // removed. Doing it manually since we want to avoid a recursion.
            stream.addEventListener('addtrack', function () {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
            stream.addEventListener('removetrack', function () {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
          }
        });
      }
    }
  },

  shimPeerConnection: function shimPeerConnection() {
    // The RTCPeerConnection object.
    window.RTCPeerConnection = function (pcConfig, pcConstraints) {
      // Translate iceTransportPolicy to iceTransports,
      // see https://code.google.com/p/webrtc/issues/detail?id=4869
      logging('PeerConnection');
      if (pcConfig && pcConfig.iceTransportPolicy) {
        pcConfig.iceTransports = pcConfig.iceTransportPolicy;
      }

      var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints);
      var origGetStats = pc.getStats.bind(pc);
      pc.getStats = function (selector, successCallback, errorCallback) {
        var self = this;
        var args = arguments;

        // If selector is a function then we are in the old style stats so just
        // pass back the original getStats format to avoid breaking old users.
        if (arguments.length > 0 && typeof selector === 'function') {
          return origGetStats(selector, successCallback);
        }

        var fixChromeStats_ = function fixChromeStats_(response) {
          var standardReport = {};
          var reports = response.result();
          reports.forEach(function (report) {
            var standardStats = {
              id: report.id,
              timestamp: report.timestamp,
              type: report.type
            };
            report.names().forEach(function (name) {
              standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
          });

          return standardReport;
        };

        // shim getStats with maplike support
        var makeMapStats = function makeMapStats(stats, legacyStats) {
          var map = new Map(Object.keys(stats).map(function (key) {
            return [key, stats[key]];
          }));
          legacyStats = legacyStats || stats;
          Object.keys(legacyStats).forEach(function (key) {
            map[key] = legacyStats[key];
          });
          return map;
        };

        if (arguments.length >= 2) {
          var successCallbackWrapper_ = function successCallbackWrapper_(response) {
            args[1](makeMapStats(fixChromeStats_(response)));
          };

          return origGetStats.apply(this, [successCallbackWrapper_, arguments[0]]);
        }

        // promise-support
        return new Promise(function (resolve, reject) {
          if (args.length === 1 && (typeof selector === 'undefined' ? 'undefined' : _typeof(selector)) === 'object') {
            origGetStats.apply(self, [function (response) {
              resolve(makeMapStats(fixChromeStats_(response)));
            }, reject]);
          } else {
            // Preserve legacy chrome stats only on legacy access of stats obj
            origGetStats.apply(self, [function (response) {
              resolve(makeMapStats(fixChromeStats_(response), response.result()));
            }, reject]);
          }
        }).then(successCallback, errorCallback);
      };

      return pc;
    };
    window.RTCPeerConnection.prototype = webkitRTCPeerConnection.prototype;

    // wrap static methods. Currently just generateCertificate.
    if (webkitRTCPeerConnection.generateCertificate) {
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function get() {
          return webkitRTCPeerConnection.generateCertificate;
        }
      });
    }

    // add promise support -- natively available in Chrome 51
    if (browserDetails.version < 51) {
      ['createOffer', 'createAnswer'].forEach(function (method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function () {
          var self = this;
          if (arguments.length < 1 || arguments.length === 1 && _typeof(arguments[0]) === 'object') {
            var opts = arguments.length === 1 ? arguments[0] : undefined;
            return new Promise(function (resolve, reject) {
              nativeMethod.apply(self, [resolve, reject, opts]);
            });
          }
          return nativeMethod.apply(this, arguments);
        };
      });

      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function () {
          var args = arguments;
          var self = this;
          var promise = new Promise(function (resolve, reject) {
            nativeMethod.apply(self, [args[0], resolve, reject]);
          });
          if (args.length < 2) {
            return promise;
          }
          return promise.then(function () {
            args[1].apply(null, []);
          }, function (err) {
            if (args.length >= 3) {
              args[2].apply(null, [err]);
            }
          });
        };
      });
    }

    // shim implicit creation of RTCSessionDescription/RTCIceCandidate
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
      var nativeMethod = webkitRTCPeerConnection.prototype[method];
      webkitRTCPeerConnection.prototype[method] = function () {
        arguments[0] = new (method === 'addIceCandidate' ? RTCIceCandidate : RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      };
    });
  },

  // Attach a media stream to an element.
  attachMediaStream: function attachMediaStream(element, stream) {
    logging('DEPRECATED, attachMediaStream will soon be removed.');
    if (browserDetails.version >= 43) {
      element.srcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      logging('Error attaching stream to element.');
    }
  },

  reattachMediaStream: function reattachMediaStream(to, from) {
    logging('DEPRECATED, reattachMediaStream will soon be removed.');
    if (browserDetails.version >= 43) {
      to.srcObject = from.srcObject;
    } else {
      to.src = from.src;
    }
  }
};

// Expose public methods.
module.exports = {
  shimMediaStream: chromeShim.shimMediaStream,
  shimOnTrack: chromeShim.shimOnTrack,
  shimSourceObject: chromeShim.shimSourceObject,
  shimPeerConnection: chromeShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia'),
  attachMediaStream: chromeShim.attachMediaStream,
  reattachMediaStream: chromeShim.reattachMediaStream
};

},{"../utils.js":20,"./getusermedia":14}],14:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var logging = require('../utils.js').log;

// Expose public methods.
module.exports = function () {
  var constraintsToChrome_ = function constraintsToChrome_(c) {
    if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function (key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname_ = function oldname_(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return name === 'deviceId' ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname_('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function (mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function shimConstraints_(constraints, func) {
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && constraints.audio) {
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && _typeof(constraints.video) === 'object') {
      // Shim facingMode for mobile, where it defaults to "user".
      var face = constraints.video.facingMode;
      face = face && ((typeof face === 'undefined' ? 'undefined' : _typeof(face)) === 'object' ? face : { ideal: face });

      if (face && (face.exact === 'user' || face.exact === 'environment' || face.ideal === 'user' || face.ideal === 'environment') && !(navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().facingMode)) {
        delete constraints.video.facingMode;
        if (face.exact === 'environment' || face.ideal === 'environment') {
          // Look for "back" in label, or use last cam (typically back cam).
          return navigator.mediaDevices.enumerateDevices().then(function (devices) {
            devices = devices.filter(function (d) {
              return d.kind === 'videoinput';
            });
            var back = devices.find(function (d) {
              return d.label.toLowerCase().indexOf('back') !== -1;
            }) || devices.length && devices[devices.length - 1];
            if (back) {
              constraints.video.deviceId = face.exact ? { exact: back.deviceId } : { ideal: back.deviceId };
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
  };

  var shimError_ = function shimError_(e) {
    return {
      name: {
        PermissionDeniedError: 'NotAllowedError',
        ConstraintNotSatisfiedError: 'OverconstrainedError'
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraintName,
      toString: function toString() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function (c) {
      navigator.webkitGetUserMedia(c, onSuccess, function (e) {
        onError(shimError_(e));
      });
    });
  };

  navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function getUserMediaPromise_(constraints) {
    return new Promise(function (resolve, reject) {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  };

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {
      getUserMedia: getUserMediaPromise_,
      enumerateDevices: function enumerateDevices() {
        return new Promise(function (resolve) {
          var kinds = { audio: 'audioinput', video: 'videoinput' };
          return MediaStreamTrack.getSources(function (devices) {
            resolve(devices.map(function (device) {
              return { label: device.label,
                kind: kinds[device.kind],
                deviceId: device.id,
                groupId: '' };
            }));
          });
        });
      }
    };
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      return getUserMediaPromise_(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (cs) {
      return shimConstraints_(cs, function (c) {
        return origGetUserMedia(c).catch(function (e) {
          return Promise.reject(shimError_(e));
        });
      });
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function () {
      logging('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function () {
      logging('Dummy mediaDevices.removeEventListener called.');
    };
  }
};

},{"../utils.js":20}],15:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var SDPUtils = require('sdp');
var logging = require('../utils').log;

var edgeShim = {
  shimPeerConnection: function shimPeerConnection() {
    if (window.RTCIceGatherer) {
      // ORTC defines an RTCIceCandidate object but no constructor.
      // Not implemented in Edge.
      if (!window.RTCIceCandidate) {
        window.RTCIceCandidate = function (args) {
          return args;
        };
      }
      // ORTC does not have a session description object but
      // other browsers (i.e. Chrome) that will support both PC and ORTC
      // in the future might have this defined already.
      if (!window.RTCSessionDescription) {
        window.RTCSessionDescription = function (args) {
          return args;
        };
      }
    }

    window.RTCPeerConnection = function (config) {
      var self = this;

      var _eventTarget = document.createDocumentFragment();
      ['addEventListener', 'removeEventListener', 'dispatchEvent'].forEach(function (method) {
        self[method] = _eventTarget[method].bind(_eventTarget);
      });

      this.onicecandidate = null;
      this.onaddstream = null;
      this.ontrack = null;
      this.onremovestream = null;
      this.onsignalingstatechange = null;
      this.oniceconnectionstatechange = null;
      this.onnegotiationneeded = null;
      this.ondatachannel = null;

      this.localStreams = [];
      this.remoteStreams = [];
      this.getLocalStreams = function () {
        return self.localStreams;
      };
      this.getRemoteStreams = function () {
        return self.remoteStreams;
      };

      this.localDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.remoteDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.signalingState = 'stable';
      this.iceConnectionState = 'new';
      this.iceGatheringState = 'new';

      this.iceOptions = {
        gatherPolicy: 'all',
        iceServers: []
      };
      if (config && config.iceTransportPolicy) {
        switch (config.iceTransportPolicy) {
          case 'all':
          case 'relay':
            this.iceOptions.gatherPolicy = config.iceTransportPolicy;
            break;
          case 'none':
            // FIXME: remove once implementation and spec have added this.
            throw new TypeError('iceTransportPolicy "none" not supported');
          default:
            // don't set iceTransportPolicy.
            break;
        }
      }
      if (config && config.iceServers) {
        // Edge does not like
        // 1) stun:
        // 2) turn: that does not have all of turn:host:port?transport=udp
        this.iceOptions.iceServers = config.iceServers.filter(function (server) {
          if (server && server.urls) {
            server.urls = server.urls.filter(function (url) {
              return url.indexOf('turn:') === 0 && url.indexOf('transport=udp') !== -1;
            })[0];
            return !!server.urls;
          }
          return false;
        });
      }

      // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
      // everything that is needed to describe a SDP m-line.
      this.transceivers = [];

      // since the iceGatherer is currently created in createOffer but we
      // must not emit candidates until after setLocalDescription we buffer
      // them in this array.
      this._localIceCandidatesBuffer = [];
    };

    window.RTCPeerConnection.prototype._emitBufferedCandidates = function () {
      var self = this;
      var sections = SDPUtils.splitSections(self.localDescription.sdp);
      // FIXME: need to apply ice candidates in a way which is async but
      // in-order
      this._localIceCandidatesBuffer.forEach(function (event) {
        var end = !event.candidate || Object.keys(event.candidate).length === 0;
        if (end) {
          for (var j = 1; j < sections.length; j++) {
            if (sections[j].indexOf('\r\na=end-of-candidates\r\n') === -1) {
              sections[j] += 'a=end-of-candidates\r\n';
            }
          }
        } else if (event.candidate.candidate.indexOf('typ endOfCandidates') === -1) {
          sections[event.candidate.sdpMLineIndex + 1] += 'a=' + event.candidate.candidate + '\r\n';
        }
        self.localDescription.sdp = sections.join('');
        self.dispatchEvent(event);
        if (self.onicecandidate !== null) {
          self.onicecandidate(event);
        }
        if (!event.candidate && self.iceGatheringState !== 'complete') {
          var complete = self.transceivers.every(function (transceiver) {
            return transceiver.iceGatherer && transceiver.iceGatherer.state === 'completed';
          });
          if (complete) {
            self.iceGatheringState = 'complete';
          }
        }
      });
      this._localIceCandidatesBuffer = [];
    };

    window.RTCPeerConnection.prototype.addStream = function (stream) {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
      this.localStreams.push(stream.clone());
      this._maybeFireNegotiationNeeded();
    };

    window.RTCPeerConnection.prototype.removeStream = function (stream) {
      var idx = this.localStreams.indexOf(stream);
      if (idx > -1) {
        this.localStreams.splice(idx, 1);
        this._maybeFireNegotiationNeeded();
      }
    };

    window.RTCPeerConnection.prototype.getSenders = function () {
      return this.transceivers.filter(function (transceiver) {
        return !!transceiver.rtpSender;
      }).map(function (transceiver) {
        return transceiver.rtpSender;
      });
    };

    window.RTCPeerConnection.prototype.getReceivers = function () {
      return this.transceivers.filter(function (transceiver) {
        return !!transceiver.rtpReceiver;
      }).map(function (transceiver) {
        return transceiver.rtpReceiver;
      });
    };

    // Determines the intersection of local and remote capabilities.
    window.RTCPeerConnection.prototype._getCommonCapabilities = function (localCapabilities, remoteCapabilities) {
      var commonCapabilities = {
        codecs: [],
        headerExtensions: [],
        fecMechanisms: []
      };
      localCapabilities.codecs.forEach(function (lCodec) {
        for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
          var rCodec = remoteCapabilities.codecs[i];
          if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() && lCodec.clockRate === rCodec.clockRate && lCodec.numChannels === rCodec.numChannels) {
            // push rCodec so we reply with offerer payload type
            commonCapabilities.codecs.push(rCodec);

            // FIXME: also need to determine intersection between
            // .rtcpFeedback and .parameters
            break;
          }
        }
      });

      localCapabilities.headerExtensions.forEach(function (lHeaderExtension) {
        for (var i = 0; i < remoteCapabilities.headerExtensions.length; i++) {
          var rHeaderExtension = remoteCapabilities.headerExtensions[i];
          if (lHeaderExtension.uri === rHeaderExtension.uri) {
            commonCapabilities.headerExtensions.push(rHeaderExtension);
            break;
          }
        }
      });

      // FIXME: fecMechanisms
      return commonCapabilities;
    };

    // Create ICE gatherer, ICE transport and DTLS transport.
    window.RTCPeerConnection.prototype._createIceAndDtlsTransports = function (mid, sdpMLineIndex) {
      var self = this;
      var iceGatherer = new RTCIceGatherer(self.iceOptions);
      var iceTransport = new RTCIceTransport(iceGatherer);
      iceGatherer.onlocalcandidate = function (evt) {
        var event = new Event('icecandidate');
        event.candidate = { sdpMid: mid, sdpMLineIndex: sdpMLineIndex };

        var cand = evt.candidate;
        var end = !cand || Object.keys(cand).length === 0;
        // Edge emits an empty object for RTCIceCandidateComplete‥
        if (end) {
          // polyfill since RTCIceGatherer.state is not implemented in
          // Edge 10547 yet.
          if (iceGatherer.state === undefined) {
            iceGatherer.state = 'completed';
          }

          // Emit a candidate with type endOfCandidates to make the samples
          // work. Edge requires addIceCandidate with this empty candidate
          // to start checking. The real solution is to signal
          // end-of-candidates to the other side when getting the null
          // candidate but some apps (like the samples) don't do that.
          event.candidate.candidate = 'candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates';
        } else {
          // RTCIceCandidate doesn't have a component, needs to be added
          cand.component = iceTransport.component === 'RTCP' ? 2 : 1;
          event.candidate.candidate = SDPUtils.writeCandidate(cand);
        }

        var complete = self.transceivers.every(function (transceiver) {
          return transceiver.iceGatherer && transceiver.iceGatherer.state === 'completed';
        });

        // Emit candidate if localDescription is set.
        // Also emits null candidate when all gatherers are complete.
        switch (self.iceGatheringState) {
          case 'new':
            self._localIceCandidatesBuffer.push(event);
            if (end && complete) {
              self._localIceCandidatesBuffer.push(new Event('icecandidate'));
            }
            break;
          case 'gathering':
            self._emitBufferedCandidates();
            self.dispatchEvent(event);
            if (self.onicecandidate !== null) {
              self.onicecandidate(event);
            }
            if (complete) {
              self.dispatchEvent(new Event('icecandidate'));
              if (self.onicecandidate !== null) {
                self.onicecandidate(new Event('icecandidate'));
              }
              self.iceGatheringState = 'complete';
            }
            break;
          case 'complete':
            // should not happen... currently!
            break;
          default:
            // no-op.
            break;
        }
      };
      iceTransport.onicestatechange = function () {
        self._updateConnectionState();
      };

      var dtlsTransport = new RTCDtlsTransport(iceTransport);
      dtlsTransport.ondtlsstatechange = function () {
        self._updateConnectionState();
      };
      dtlsTransport.onerror = function () {
        // onerror does not set state to failed by itself.
        dtlsTransport.state = 'failed';
        self._updateConnectionState();
      };

      return {
        iceGatherer: iceGatherer,
        iceTransport: iceTransport,
        dtlsTransport: dtlsTransport
      };
    };

    // Start the RTP Sender and Receiver for a transceiver.
    window.RTCPeerConnection.prototype._transceive = function (transceiver, send, recv) {
      var params = this._getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);
      if (send && transceiver.rtpSender) {
        params.encodings = transceiver.sendEncodingParameters;
        params.rtcp = {
          cname: SDPUtils.localCName
        };
        if (transceiver.recvEncodingParameters.length) {
          params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
        }
        transceiver.rtpSender.send(params);
      }
      if (recv && transceiver.rtpReceiver) {
        params.encodings = transceiver.recvEncodingParameters;
        params.rtcp = {
          cname: transceiver.cname
        };
        if (transceiver.sendEncodingParameters.length) {
          params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
        }
        transceiver.rtpReceiver.receive(params);
      }
    };

    window.RTCPeerConnection.prototype.setLocalDescription = function (description) {
      var self = this;
      var sections;
      var sessionpart;
      if (description.type === 'offer') {
        // FIXME: What was the purpose of this empty if statement?
        // if (!this._pendingOffer) {
        // } else {
        if (this._pendingOffer) {
          // VERY limited support for SDP munging. Limited to:
          // * changing the order of codecs
          sections = SDPUtils.splitSections(description.sdp);
          sessionpart = sections.shift();
          sections.forEach(function (mediaSection, sdpMLineIndex) {
            var caps = SDPUtils.parseRtpParameters(mediaSection);
            self._pendingOffer[sdpMLineIndex].localCapabilities = caps;
          });
          this.transceivers = this._pendingOffer;
          delete this._pendingOffer;
        }
      } else if (description.type === 'answer') {
        sections = SDPUtils.splitSections(self.remoteDescription.sdp);
        sessionpart = sections.shift();
        var isIceLite = SDPUtils.matchPrefix(sessionpart, 'a=ice-lite').length > 0;
        sections.forEach(function (mediaSection, sdpMLineIndex) {
          var transceiver = self.transceivers[sdpMLineIndex];
          var iceGatherer = transceiver.iceGatherer;
          var iceTransport = transceiver.iceTransport;
          var dtlsTransport = transceiver.dtlsTransport;
          var localCapabilities = transceiver.localCapabilities;
          var remoteCapabilities = transceiver.remoteCapabilities;
          var rejected = mediaSection.split('\n', 1)[0].split(' ', 2)[1] === '0';

          if (!rejected) {
            var remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
            if (isIceLite) {
              var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:').map(function (cand) {
                return SDPUtils.parseCandidate(cand);
              }).filter(function (cand) {
                return cand.component === '1';
              });
              // ice-lite only includes host candidates in the SDP so we can
              // use setRemoteCandidates (which implies an
              // RTCIceCandidateComplete)
              iceTransport.setRemoteCandidates(cands);
            }
            iceTransport.start(iceGatherer, remoteIceParameters, isIceLite ? 'controlling' : 'controlled');

            var remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
            if (isIceLite) {
              remoteDtlsParameters.role = 'server';
            }
            dtlsTransport.start(remoteDtlsParameters);

            // Calculate intersection of capabilities.
            var params = self._getCommonCapabilities(localCapabilities, remoteCapabilities);

            // Start the RTCRtpSender. The RTCRtpReceiver for this
            // transceiver has already been started in setRemoteDescription.
            self._transceive(transceiver, params.codecs.length > 0, false);
          }
        });
      }

      this.localDescription = {
        type: description.type,
        sdp: description.sdp
      };
      switch (description.type) {
        case 'offer':
          this._updateSignalingState('have-local-offer');
          break;
        case 'answer':
          this._updateSignalingState('stable');
          break;
        default:
          throw new TypeError('unsupported type "' + description.type + '"');
      }

      // If a success callback was provided, emit ICE candidates after it
      // has been executed. Otherwise, emit callback after the Promise is
      // resolved.
      var hasCallback = arguments.length > 1 && typeof arguments[1] === 'function';
      if (hasCallback) {
        var cb = arguments[1];
        window.setTimeout(function () {
          cb();
          if (self.iceGatheringState === 'new') {
            self.iceGatheringState = 'gathering';
          }
          self._emitBufferedCandidates();
        }, 0);
      }
      var p = Promise.resolve();
      p.then(function () {
        if (!hasCallback) {
          if (self.iceGatheringState === 'new') {
            self.iceGatheringState = 'gathering';
          }
          // Usually candidates will be emitted earlier.
          window.setTimeout(self._emitBufferedCandidates.bind(self), 500);
        }
      });
      return p;
    };

    window.RTCPeerConnection.prototype.setRemoteDescription = function (description) {
      var self = this;
      var stream = new MediaStream();
      var receiverList = [];
      var sections = SDPUtils.splitSections(description.sdp);
      var sessionpart = sections.shift();
      var isIceLite = SDPUtils.matchPrefix(sessionpart, 'a=ice-lite').length > 0;
      sections.forEach(function (mediaSection, sdpMLineIndex) {
        var lines = SDPUtils.splitLines(mediaSection);
        var mline = lines[0].substr(2).split(' ');
        var kind = mline[0];
        var rejected = mline[1] === '0';
        var direction = SDPUtils.getDirection(mediaSection, sessionpart);

        var transceiver;
        var iceGatherer;
        var iceTransport;
        var dtlsTransport;
        var rtpSender;
        var rtpReceiver;
        var sendEncodingParameters;
        var recvEncodingParameters;
        var localCapabilities;

        var track;
        // FIXME: ensure the mediaSection has rtcp-mux set.
        var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
        var remoteIceParameters;
        var remoteDtlsParameters;
        if (!rejected) {
          remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
          remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
          remoteDtlsParameters.role = 'client';
        }
        recvEncodingParameters = SDPUtils.parseRtpEncodingParameters(mediaSection);

        var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:');
        if (mid.length) {
          mid = mid[0].substr(6);
        } else {
          mid = SDPUtils.generateIdentifier();
        }

        var cname;
        // Gets the first SSRC. Note that with RTX there might be multiple
        // SSRCs.
        var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:').map(function (line) {
          return SDPUtils.parseSsrcMedia(line);
        }).filter(function (obj) {
          return obj.attribute === 'cname';
        })[0];
        if (remoteSsrc) {
          cname = remoteSsrc.value;
        }

        var isComplete = SDPUtils.matchPrefix(mediaSection, 'a=end-of-candidates').length > 0;
        var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:').map(function (cand) {
          return SDPUtils.parseCandidate(cand);
        }).filter(function (cand) {
          return cand.component === '1';
        });
        if (description.type === 'offer' && !rejected) {
          var transports = self._createIceAndDtlsTransports(mid, sdpMLineIndex);
          if (isComplete) {
            transports.iceTransport.setRemoteCandidates(cands);
          }

          localCapabilities = RTCRtpReceiver.getCapabilities(kind);
          sendEncodingParameters = [{
            ssrc: (2 * sdpMLineIndex + 2) * 1001
          }];

          rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);

          track = rtpReceiver.track;
          receiverList.push([track, rtpReceiver]);
          // FIXME: not correct when there are multiple streams but that is
          // not currently supported in this shim.
          stream.addTrack(track);

          // FIXME: look at direction.
          if (self.localStreams.length > 0 && self.localStreams[0].getTracks().length >= sdpMLineIndex) {
            // FIXME: actually more complicated, needs to match types etc
            var localtrack = self.localStreams[0].getTracks()[sdpMLineIndex];
            rtpSender = new RTCRtpSender(localtrack, transports.dtlsTransport);
          }

          self.transceivers[sdpMLineIndex] = {
            iceGatherer: transports.iceGatherer,
            iceTransport: transports.iceTransport,
            dtlsTransport: transports.dtlsTransport,
            localCapabilities: localCapabilities,
            remoteCapabilities: remoteCapabilities,
            rtpSender: rtpSender,
            rtpReceiver: rtpReceiver,
            kind: kind,
            mid: mid,
            cname: cname,
            sendEncodingParameters: sendEncodingParameters,
            recvEncodingParameters: recvEncodingParameters
          };
          // Start the RTCRtpReceiver now. The RTPSender is started in
          // setLocalDescription.
          self._transceive(self.transceivers[sdpMLineIndex], false, direction === 'sendrecv' || direction === 'sendonly');
        } else if (description.type === 'answer' && !rejected) {
          transceiver = self.transceivers[sdpMLineIndex];
          iceGatherer = transceiver.iceGatherer;
          iceTransport = transceiver.iceTransport;
          dtlsTransport = transceiver.dtlsTransport;
          rtpSender = transceiver.rtpSender;
          rtpReceiver = transceiver.rtpReceiver;
          sendEncodingParameters = transceiver.sendEncodingParameters;
          localCapabilities = transceiver.localCapabilities;

          self.transceivers[sdpMLineIndex].recvEncodingParameters = recvEncodingParameters;
          self.transceivers[sdpMLineIndex].remoteCapabilities = remoteCapabilities;
          self.transceivers[sdpMLineIndex].cname = cname;

          if (isIceLite || isComplete) {
            iceTransport.setRemoteCandidates(cands);
          }
          iceTransport.start(iceGatherer, remoteIceParameters, 'controlling');
          dtlsTransport.start(remoteDtlsParameters);

          self._transceive(transceiver, direction === 'sendrecv' || direction === 'recvonly', direction === 'sendrecv' || direction === 'sendonly');

          if (rtpReceiver && (direction === 'sendrecv' || direction === 'sendonly')) {
            track = rtpReceiver.track;
            receiverList.push([track, rtpReceiver]);
            stream.addTrack(track);
          } else {
            // FIXME: actually the receiver should be created later.
            delete transceiver.rtpReceiver;
          }
        }
      });

      this.remoteDescription = {
        type: description.type,
        sdp: description.sdp
      };
      switch (description.type) {
        case 'offer':
          this._updateSignalingState('have-remote-offer');
          break;
        case 'answer':
          this._updateSignalingState('stable');
          break;
        default:
          throw new TypeError('unsupported type "' + description.type + '"');
      }
      if (stream.getTracks().length) {
        self.remoteStreams.push(stream);
        window.setTimeout(function () {
          var event = new Event('addstream');
          event.stream = stream;
          self.dispatchEvent(event);
          if (self.onaddstream !== null) {
            window.setTimeout(function () {
              self.onaddstream(event);
            }, 0);
          }

          receiverList.forEach(function (item) {
            var track = item[0];
            var receiver = item[1];
            var trackEvent = new Event('track');
            trackEvent.track = track;
            trackEvent.receiver = receiver;
            trackEvent.streams = [stream];
            self.dispatchEvent(event);
            if (self.ontrack !== null) {
              window.setTimeout(function () {
                self.ontrack(trackEvent);
              }, 0);
            }
          });
        }, 0);
      }
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return Promise.resolve();
    };

    window.RTCPeerConnection.prototype.close = function () {
      this.transceivers.forEach(function (transceiver) {
        /* not yet
        if (transceiver.iceGatherer) {
          transceiver.iceGatherer.close();
        }
        */
        if (transceiver.iceTransport) {
          transceiver.iceTransport.stop();
        }
        if (transceiver.dtlsTransport) {
          transceiver.dtlsTransport.stop();
        }
        if (transceiver.rtpSender) {
          transceiver.rtpSender.stop();
        }
        if (transceiver.rtpReceiver) {
          transceiver.rtpReceiver.stop();
        }
      });
      // FIXME: clean up tracks, local streams, remote streams, etc
      this._updateSignalingState('closed');
    };

    // Update the signaling state.
    window.RTCPeerConnection.prototype._updateSignalingState = function (newState) {
      this.signalingState = newState;
      var event = new Event('signalingstatechange');
      this.dispatchEvent(event);
      if (this.onsignalingstatechange !== null) {
        this.onsignalingstatechange(event);
      }
    };

    // Determine whether to fire the negotiationneeded event.
    window.RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function () {
      // Fire away (for now).
      var event = new Event('negotiationneeded');
      this.dispatchEvent(event);
      if (this.onnegotiationneeded !== null) {
        this.onnegotiationneeded(event);
      }
    };

    // Update the connection state.
    window.RTCPeerConnection.prototype._updateConnectionState = function () {
      var self = this;
      var newState;
      var states = {
        'new': 0,
        closed: 0,
        connecting: 0,
        checking: 0,
        connected: 0,
        completed: 0,
        failed: 0
      };
      this.transceivers.forEach(function (transceiver) {
        states[transceiver.iceTransport.state]++;
        states[transceiver.dtlsTransport.state]++;
      });
      // ICETransport.completed and connected are the same for this purpose.
      states.connected += states.completed;

      newState = 'new';
      if (states.failed > 0) {
        newState = 'failed';
      } else if (states.connecting > 0 || states.checking > 0) {
        newState = 'connecting';
      } else if (states.disconnected > 0) {
        newState = 'disconnected';
      } else if (states.new > 0) {
        newState = 'new';
      } else if (states.connected > 0 || states.completed > 0) {
        newState = 'connected';
      }

      if (newState !== self.iceConnectionState) {
        self.iceConnectionState = newState;
        var event = new Event('iceconnectionstatechange');
        this.dispatchEvent(event);
        if (this.oniceconnectionstatechange !== null) {
          this.oniceconnectionstatechange(event);
        }
      }
    };

    window.RTCPeerConnection.prototype.createOffer = function () {
      var self = this;
      if (this._pendingOffer) {
        throw new Error('createOffer called while there is a pending offer.');
      }
      var offerOptions;
      if (arguments.length === 1 && typeof arguments[0] !== 'function') {
        offerOptions = arguments[0];
      } else if (arguments.length === 3) {
        offerOptions = arguments[2];
      }

      var tracks = [];
      var numAudioTracks = 0;
      var numVideoTracks = 0;
      // Default to sendrecv.
      if (this.localStreams.length) {
        numAudioTracks = this.localStreams[0].getAudioTracks().length;
        numVideoTracks = this.localStreams[0].getVideoTracks().length;
      }
      // Determine number of audio and video tracks we need to send/recv.
      if (offerOptions) {
        // Reject Chrome legacy constraints.
        if (offerOptions.mandatory || offerOptions.optional) {
          throw new TypeError('Legacy mandatory/optional constraints not supported.');
        }
        if (offerOptions.offerToReceiveAudio !== undefined) {
          numAudioTracks = offerOptions.offerToReceiveAudio;
        }
        if (offerOptions.offerToReceiveVideo !== undefined) {
          numVideoTracks = offerOptions.offerToReceiveVideo;
        }
      }
      if (this.localStreams.length) {
        // Push local streams.
        this.localStreams[0].getTracks().forEach(function (track) {
          tracks.push({
            kind: track.kind,
            track: track,
            wantReceive: track.kind === 'audio' ? numAudioTracks > 0 : numVideoTracks > 0
          });
          if (track.kind === 'audio') {
            numAudioTracks--;
          } else if (track.kind === 'video') {
            numVideoTracks--;
          }
        });
      }
      // Create M-lines for recvonly streams.
      while (numAudioTracks > 0 || numVideoTracks > 0) {
        if (numAudioTracks > 0) {
          tracks.push({
            kind: 'audio',
            wantReceive: true
          });
          numAudioTracks--;
        }
        if (numVideoTracks > 0) {
          tracks.push({
            kind: 'video',
            wantReceive: true
          });
          numVideoTracks--;
        }
      }

      var sdp = SDPUtils.writeSessionBoilerplate();
      var transceivers = [];
      tracks.forEach(function (mline, sdpMLineIndex) {
        // For each track, create an ice gatherer, ice transport,
        // dtls transport, potentially rtpsender and rtpreceiver.
        var track = mline.track;
        var kind = mline.kind;
        var mid = SDPUtils.generateIdentifier();

        var transports = self._createIceAndDtlsTransports(mid, sdpMLineIndex);

        var localCapabilities = RTCRtpSender.getCapabilities(kind);
        var rtpSender;
        var rtpReceiver;

        // generate an ssrc now, to be used later in rtpSender.send
        var sendEncodingParameters = [{
          ssrc: (2 * sdpMLineIndex + 1) * 1001
        }];
        if (track) {
          rtpSender = new RTCRtpSender(track, transports.dtlsTransport);
        }

        if (mline.wantReceive) {
          rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
        }

        transceivers[sdpMLineIndex] = {
          iceGatherer: transports.iceGatherer,
          iceTransport: transports.iceTransport,
          dtlsTransport: transports.dtlsTransport,
          localCapabilities: localCapabilities,
          remoteCapabilities: null,
          rtpSender: rtpSender,
          rtpReceiver: rtpReceiver,
          kind: kind,
          mid: mid,
          sendEncodingParameters: sendEncodingParameters,
          recvEncodingParameters: null
        };
        var transceiver = transceivers[sdpMLineIndex];
        sdp += SDPUtils.writeMediaSection(transceiver, transceiver.localCapabilities, 'offer', self.localStreams[0]);
      });

      this._pendingOffer = transceivers;
      var desc = new RTCSessionDescription({
        type: 'offer',
        sdp: sdp
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return Promise.resolve(desc);
    };

    window.RTCPeerConnection.prototype.createAnswer = function () {
      var self = this;

      var sdp = SDPUtils.writeSessionBoilerplate();
      this.transceivers.forEach(function (transceiver) {
        // Calculate intersection of capabilities.
        var commonCapabilities = self._getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);

        sdp += SDPUtils.writeMediaSection(transceiver, commonCapabilities, 'answer', self.localStreams[0]);
      });

      var desc = new RTCSessionDescription({
        type: 'answer',
        sdp: sdp
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return Promise.resolve(desc);
    };

    window.RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
      var mLineIndex = candidate.sdpMLineIndex;
      if (candidate.sdpMid) {
        for (var i = 0; i < this.transceivers.length; i++) {
          if (this.transceivers[i].mid === candidate.sdpMid) {
            mLineIndex = i;
            break;
          }
        }
      }
      var transceiver = this.transceivers[mLineIndex];
      if (transceiver) {
        var cand = Object.keys(candidate.candidate).length > 0 ? SDPUtils.parseCandidate(candidate.candidate) : {};
        // Ignore Chrome's invalid candidates since Edge does not like them.
        if (cand.protocol === 'tcp' && cand.port === 0) {
          return;
        }
        // Ignore RTCP candidates, we assume RTCP-MUX.
        if (cand.component !== '1') {
          return;
        }
        // A dirty hack to make samples work.
        if (cand.type === 'endOfCandidates') {
          cand = {};
        }
        transceiver.iceTransport.addRemoteCandidate(cand);

        // update the remoteDescription.
        var sections = SDPUtils.splitSections(this.remoteDescription.sdp);
        sections[mLineIndex + 1] += (cand.type ? candidate.candidate.trim() : 'a=end-of-candidates') + '\r\n';
        this.remoteDescription.sdp = sections.join('');
      }
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return Promise.resolve();
    };

    window.RTCPeerConnection.prototype.getStats = function () {
      var promises = [];
      this.transceivers.forEach(function (transceiver) {
        ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport', 'dtlsTransport'].forEach(function (method) {
          if (transceiver[method]) {
            promises.push(transceiver[method].getStats());
          }
        });
      });
      var cb = arguments.length > 1 && typeof arguments[1] === 'function' && arguments[1];
      return new Promise(function (resolve) {
        // shim getStats with maplike support
        var results = new Map();
        Promise.all(promises).then(function (res) {
          res.forEach(function (result) {
            Object.keys(result).forEach(function (id) {
              results.set(id, result[id]);
              results[id] = result[id];
            });
          });
          if (cb) {
            window.setTimeout(cb, 0, results);
          }
          resolve(results);
        });
      });
    };
  },

  // Attach a media stream to an element.
  attachMediaStream: function attachMediaStream(element, stream) {
    logging('DEPRECATED, attachMediaStream will soon be removed.');
    element.srcObject = stream;
  },

  reattachMediaStream: function reattachMediaStream(to, from) {
    logging('DEPRECATED, reattachMediaStream will soon be removed.');
    to.srcObject = from.srcObject;
  }
};

// Expose public methods.
module.exports = {
  shimPeerConnection: edgeShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia'),
  attachMediaStream: edgeShim.attachMediaStream,
  reattachMediaStream: edgeShim.reattachMediaStream
};

},{"../utils":20,"./getusermedia":16,"sdp":11}],16:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

// Expose public methods.

module.exports = function () {
  var shimError_ = function shimError_(e) {
    return {
      name: { PermissionDeniedError: 'NotAllowedError' }[e.name] || e.name,
      message: e.message,
      constraint: e.constraint,
      toString: function toString() {
        return this.name;
      }
    };
  };

  // getUserMedia error shim.
  var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function (c) {
    return origGetUserMedia(c).catch(function (e) {
      return Promise.reject(shimError_(e));
    });
  };
};

},{}],17:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var logging = require('../utils').log;
var browserDetails = require('../utils').browserDetails;

var firefoxShim = {
  shimOnTrack: function shimOnTrack() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && !('ontrack' in window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function get() {
          return this._ontrack;
        },
        set: function set(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function (e) {
            e.stream.getTracks().forEach(function (track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = { track: track };
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
  },

  shimSourceObject: function shimSourceObject() {
    // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
      if (window.HTMLMediaElement && !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function get() {
            return this.mozSrcObject;
          },
          set: function set(stream) {
            this.mozSrcObject = stream;
          }
        });
      }
    }
  },

  shimPeerConnection: function shimPeerConnection() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) {
      return; // probably media.peerconnection.enabled=false in about:config
    }
    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = function (pcConfig, pcConstraints) {
        if (browserDetails.version < 38) {
          // .urls is not supported in FF < 38.
          // create RTCIceServers with a single url.
          if (pcConfig && pcConfig.iceServers) {
            var newIceServers = [];
            for (var i = 0; i < pcConfig.iceServers.length; i++) {
              var server = pcConfig.iceServers[i];
              if (server.hasOwnProperty('urls')) {
                for (var j = 0; j < server.urls.length; j++) {
                  var newServer = {
                    url: server.urls[j]
                  };
                  if (server.urls[j].indexOf('turn') === 0) {
                    newServer.username = server.username;
                    newServer.credential = server.credential;
                  }
                  newIceServers.push(newServer);
                }
              } else {
                newIceServers.push(pcConfig.iceServers[i]);
              }
            }
            pcConfig.iceServers = newIceServers;
          }
        }
        return new mozRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype = mozRTCPeerConnection.prototype;

      // wrap static methods. Currently just generateCertificate.
      if (mozRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function get() {
            return mozRTCPeerConnection.generateCertificate;
          }
        });
      }

      window.RTCSessionDescription = mozRTCSessionDescription;
      window.RTCIceCandidate = mozRTCIceCandidate;
    }

    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
      var nativeMethod = RTCPeerConnection.prototype[method];
      RTCPeerConnection.prototype[method] = function () {
        arguments[0] = new (method === 'addIceCandidate' ? RTCIceCandidate : RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      };
    });

    // shim getStats with maplike support
    var makeMapStats = function makeMapStats(stats) {
      var map = new Map();
      Object.keys(stats).forEach(function (key) {
        map.set(key, stats[key]);
        map[key] = stats[key];
      });
      return map;
    };

    var nativeGetStats = RTCPeerConnection.prototype.getStats;
    RTCPeerConnection.prototype.getStats = function (selector, onSucc, onErr) {
      return nativeGetStats.apply(this, [selector || null]).then(function (stats) {
        return makeMapStats(stats);
      }).then(onSucc, onErr);
    };
  },

  shimGetUserMedia: function shimGetUserMedia() {
    // getUserMedia constraints shim.
    var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
      var constraintsToFF37_ = function constraintsToFF37_(c) {
        if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) !== 'object' || c.require) {
          return c;
        }
        var require = [];
        Object.keys(c).forEach(function (key) {
          if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
            return;
          }
          var r = c[key] = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
          if (r.min !== undefined || r.max !== undefined || r.exact !== undefined) {
            require.push(key);
          }
          if (r.exact !== undefined) {
            if (typeof r.exact === 'number') {
              r.min = r.max = r.exact;
            } else {
              c[key] = r.exact;
            }
            delete r.exact;
          }
          if (r.ideal !== undefined) {
            c.advanced = c.advanced || [];
            var oc = {};
            if (typeof r.ideal === 'number') {
              oc[key] = { min: r.ideal, max: r.ideal };
            } else {
              oc[key] = r.ideal;
            }
            c.advanced.push(oc);
            delete r.ideal;
            if (!Object.keys(r).length) {
              delete c[key];
            }
          }
        });
        if (require.length) {
          c.require = require;
        }
        return c;
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      if (browserDetails.version < 38) {
        logging('spec: ' + JSON.stringify(constraints));
        if (constraints.audio) {
          constraints.audio = constraintsToFF37_(constraints.audio);
        }
        if (constraints.video) {
          constraints.video = constraintsToFF37_(constraints.video);
        }
        logging('ff37: ' + JSON.stringify(constraints));
      }
      return navigator.mozGetUserMedia(constraints, onSuccess, onError);
    };

    navigator.getUserMedia = getUserMedia_;

    // Returns the result of getUserMedia as a Promise.
    var getUserMediaPromise_ = function getUserMediaPromise_(constraints) {
      return new Promise(function (resolve, reject) {
        navigator.getUserMedia(constraints, resolve, reject);
      });
    };

    // Shim for mediaDevices on older versions.
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = { getUserMedia: getUserMediaPromise_,
        addEventListener: function addEventListener() {},
        removeEventListener: function removeEventListener() {}
      };
    }
    navigator.mediaDevices.enumerateDevices = navigator.mediaDevices.enumerateDevices || function () {
      return new Promise(function (resolve) {
        var infos = [{ kind: 'audioinput', deviceId: 'default', label: '', groupId: '' }, { kind: 'videoinput', deviceId: 'default', label: '', groupId: '' }];
        resolve(infos);
      });
    };

    if (browserDetails.version < 41) {
      // Work around http://bugzil.la/1169665
      var orgEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      navigator.mediaDevices.enumerateDevices = function () {
        return orgEnumerateDevices().then(undefined, function (e) {
          if (e.name === 'NotFoundError') {
            return [];
          }
          throw e;
        });
      };
    }
  },

  // Attach a media stream to an element.
  attachMediaStream: function attachMediaStream(element, stream) {
    logging('DEPRECATED, attachMediaStream will soon be removed.');
    element.srcObject = stream;
  },

  reattachMediaStream: function reattachMediaStream(to, from) {
    logging('DEPRECATED, reattachMediaStream will soon be removed.');
    to.srcObject = from.srcObject;
  }
};

// Expose public methods.
module.exports = {
  shimOnTrack: firefoxShim.shimOnTrack,
  shimSourceObject: firefoxShim.shimSourceObject,
  shimPeerConnection: firefoxShim.shimPeerConnection,
  shimGetUserMedia: require('./getusermedia'),
  attachMediaStream: firefoxShim.attachMediaStream,
  reattachMediaStream: firefoxShim.reattachMediaStream
};

},{"../utils":20,"./getusermedia":18}],18:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var logging = require('../utils').log;
var browserDetails = require('../utils').browserDetails;

// Expose public methods.
module.exports = function () {
  var shimError_ = function shimError_(e) {
    return {
      name: {
        SecurityError: 'NotAllowedError',
        PermissionDeniedError: 'NotAllowedError'
      }[e.name] || e.name,
      message: {
        'The operation is insecure.': 'The request is not allowed by the user ' + 'agent or the platform in the current context.'
      }[e.message] || e.message,
      constraint: e.constraint,
      toString: function toString() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  // getUserMedia constraints shim.
  var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
    var constraintsToFF37_ = function constraintsToFF37_(c) {
      if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function (key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
        if (r.min !== undefined || r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r.min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = { min: r.ideal, max: r.ideal };
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    constraints = JSON.parse(JSON.stringify(constraints));
    if (browserDetails.version < 38) {
      logging('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37_(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37_(constraints.video);
      }
      logging('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, function (e) {
      return onError(shimError_(e));
    });
  };

  navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function getUserMediaPromise_(constraints) {
    return new Promise(function (resolve, reject) {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  };

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = { getUserMedia: getUserMediaPromise_,
      addEventListener: function addEventListener() {},
      removeEventListener: function removeEventListener() {}
    };
  }
  navigator.mediaDevices.enumerateDevices = navigator.mediaDevices.enumerateDevices || function () {
    return new Promise(function (resolve) {
      var infos = [{ kind: 'audioinput', deviceId: 'default', label: '', groupId: '' }, { kind: 'videoinput', deviceId: 'default', label: '', groupId: '' }];
      resolve(infos);
    });
  };

  if (browserDetails.version < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function () {
      return orgEnumerateDevices().then(undefined, function (e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
  if (browserDetails.version < 49) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (c) {
      return origGetUserMedia(c).catch(function (e) {
        return Promise.reject(shimError_(e));
      });
    };
  }
};

},{"../utils":20}],19:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

var safariShim = {
  // TODO: DrAlex, should be here, double check against LayoutTests
  // shimOnTrack: function() { },

  // TODO: DrAlex
  // attachMediaStream: function(element, stream) { },
  // reattachMediaStream: function(to, from) { },

  // TODO: once the back-end for the mac port is done, add.
  // TODO: check for webkitGTK+
  // shimPeerConnection: function() { },

  shimGetUserMedia: function shimGetUserMedia() {
    navigator.getUserMedia = navigator.webkitGetUserMedia;
  }
};

// Expose public methods.
module.exports = {
  shimGetUserMedia: safariShim.shimGetUserMedia
  // TODO
  // shimOnTrack: safariShim.shimOnTrack,
  // shimPeerConnection: safariShim.shimPeerConnection,
  // attachMediaStream: safariShim.attachMediaStream,
  // reattachMediaStream: safariShim.reattachMediaStream
};

},{}],20:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var logDisabled_ = false;

// Utility methods.
var utils = {
  disableLog: function disableLog(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + (typeof bool === 'undefined' ? 'undefined' : _typeof(bool)) + '. Please use a boolean.');
    }
    logDisabled_ = bool;
    return bool ? 'adapter.js logging disabled' : 'adapter.js logging enabled';
  },

  log: function log() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
      if (logDisabled_) {
        return;
      }
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log.apply(console, arguments);
      }
    }
  },

  /**
   * Extract browser version out of the provided user agent string.
   *
   * @param {!string} uastring userAgent string.
   * @param {!string} expr Regular expression used as match criteria.
   * @param {!number} pos position in the version string to be returned.
   * @return {!number} browser version.
   */
  extractVersion: function extractVersion(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos], 10);
  },

  /**
   * Browser detector.
   *
   * @return {object} result containing browser, version and minVersion
   *     properties.
   */
  detectBrowser: function detectBrowser() {
    // Returned result object.
    var result = {};
    result.browser = null;
    result.version = null;
    result.minVersion = null;

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
      result.browser = 'Not a browser.';
      return result;
    }

    // Firefox.
    if (navigator.mozGetUserMedia) {
      result.browser = 'firefox';
      result.version = this.extractVersion(navigator.userAgent, /Firefox\/([0-9]+)\./, 1);
      result.minVersion = 31;

      // all webkit-based browsers
    } else if (navigator.webkitGetUserMedia) {
      // Chrome, Chromium, Webview, Opera, all use the chrome shim for now
      if (window.webkitRTCPeerConnection) {
        result.browser = 'chrome';
        result.version = this.extractVersion(navigator.userAgent, /Chrom(e|ium)\/([0-9]+)\./, 2);
        result.minVersion = 38;

        // Safari or unknown webkit-based
        // for the time being Safari has support for MediaStreams but not webRTC
      } else {
        // Safari UA substrings of interest for reference:
        // - webkit version:           AppleWebKit/602.1.25 (also used in Op,Cr)
        // - safari UI version:        Version/9.0.3 (unique to Safari)
        // - safari UI webkit version: Safari/601.4.4 (also used in Op,Cr)
        //
        // if the webkit version and safari UI webkit versions are equals,
        // ... this is a stable version.
        //
        // only the internal webkit version is important today to know if
        // media streams are supported
        //
        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
          result.browser = 'safari';
          result.version = this.extractVersion(navigator.userAgent, /AppleWebKit\/([0-9]+)\./, 1);
          result.minVersion = 602;

          // unknown webkit-based browser
        } else {
          result.browser = 'Unsupported webkit-based browser ' + 'with GUM support but no WebRTC support.';
          return result;
        }
      }

      // Edge.
    } else if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
      result.browser = 'edge';
      result.version = this.extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2);
      result.minVersion = 10547;

      // Default fallthrough: not supported.
    } else {
      result.browser = 'Not a supported browser.';
      return result;
    }

    // Warn if version is less than minVersion.
    if (result.version < result.minVersion) {
      utils.log('Browser: ' + result.browser + ' Version: ' + result.version + ' < minimum supported version: ' + result.minVersion + '\n some things might not work!');
    }

    return result;
  }
};

// Export.
module.exports = {
  log: utils.log,
  disableLog: utils.disableLog,
  browserDetails: utils.detectBrowser(),
  extractVersion: utils.extractVersion
};

},{}],21:[function(require,module,exports){
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

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
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
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
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
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
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
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}],22:[function(require,module,exports){
var util = require('util');
var SJJ = require('sdp-jingle-json');
var WildEmitter = require('wildemitter');
var Peerconn = require('traceablepeerconnection');
var adapter = require('webrtc-adapter');

function PeerConnection(config, constraints) {
    var self = this;
    var item;
    WildEmitter.call(this);

    config = config || {};
    config.iceServers = config.iceServers || [];

    var detectedBrowser = adapter.browserDetails.browser;

    // make sure this only gets enabled in Google Chrome
    // EXPERIMENTAL FLAG, might get removed without notice
    this.enableChromeNativeSimulcast = false;
    if (constraints && constraints.optional && detectedBrowser === 'chrome' && navigator.appVersion.match(/Chromium\//) === null) {
        constraints.optional.forEach(function (constraint) {
            if (constraint.enableChromeNativeSimulcast) {
                self.enableChromeNativeSimulcast = true;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    this.enableMultiStreamHacks = false;
    if (constraints && constraints.optional && detectedBrowser === 'chrome') {
        constraints.optional.forEach(function (constraint) {
            if (constraint.enableMultiStreamHacks) {
                self.enableMultiStreamHacks = true;
            }
        });
    }
    // EXPERIMENTAL FLAG, might get removed without notice
    this.restrictBandwidth = 0;
    if (constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint) {
            if (constraint.andyetRestrictBandwidth) {
                self.restrictBandwidth = constraint.andyetRestrictBandwidth;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    // bundle up ice candidates, only works for jingle mode
    // number > 0 is the delay to wait for additional candidates
    // ~20ms seems good
    this.batchIceCandidates = 0;
    if (constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint) {
            if (constraint.andyetBatchIce) {
                self.batchIceCandidates = constraint.andyetBatchIce;
            }
        });
    }
    this.batchedIceCandidates = [];

    // EXPERIMENTAL FLAG, might get removed without notice
    // this attemps to strip out candidates with an already known foundation
    // and type -- i.e. those which are gathered via the same TURN server
    // but different transports (TURN udp, tcp and tls respectively)
    if (constraints && constraints.optional && detectedBrowser === 'chrome') {
        constraints.optional.forEach(function (constraint) {
            if (constraint.andyetFasterICE) {
                self.eliminateDuplicateCandidates = constraint.andyetFasterICE;
            }
        });
    }
    // EXPERIMENTAL FLAG, might get removed without notice
    // when using a server such as the jitsi videobridge we don't need to signal
    // our candidates
    if (constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint) {
            if (constraint.andyetDontSignalCandidates) {
                self.dontSignalCandidates = constraint.andyetDontSignalCandidates;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    this.assumeSetLocalSuccess = false;
    if (constraints && constraints.optional) {
        constraints.optional.forEach(function (constraint) {
            if (constraint.andyetAssumeSetLocalSuccess) {
                self.assumeSetLocalSuccess = constraint.andyetAssumeSetLocalSuccess;
            }
        });
    }

    // EXPERIMENTAL FLAG, might get removed without notice
    // working around https://bugzilla.mozilla.org/show_bug.cgi?id=1087551
    // pass in a timeout for this
    if (detectedBrowser === 'firefox') {
        if (constraints && constraints.optional) {
            this.wtFirefox = 0;
            constraints.optional.forEach(function (constraint) {
                if (constraint.andyetFirefoxMakesMeSad) {
                    self.wtFirefox = constraint.andyetFirefoxMakesMeSad;
                    if (self.wtFirefox > 0) {
                        self.firefoxcandidatebuffer = [];
                    }
                }
            });
        }
    }

    this.pc = new Peerconn(config, constraints);

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
    this.pc.onaddstream = this.emit.bind(this, 'addStream');
    this.pc.onnegotiationneeded = this.emit.bind(this, 'negotiationNeeded');
    this.pc.oniceconnectionstatechange = this.emit.bind(this, 'iceConnectionStateChange');
    this.pc.onsignalingstatechange = this.emit.bind(this, 'signalingStateChange');

    // handle ice candidate and data channel events
    this.pc.onicecandidate = this._onIce.bind(this);
    this.pc.ondatachannel = this._onDataChannel.bind(this);

    this.localDescription = {
        contents: []
    };
    this.remoteDescription = {
        contents: []
    };

    this.config = {
        debug: false,
        sid: '',
        isInitiator: true,
        sdpSessionID: Date.now(),
        useJingle: false
    };

    this.iceCredentials = {
        local: {},
        remote: {}
    };

    // apply our config
    for (item in config) {
        this.config[item] = config[item];
    }

    if (this.config.debug) {
        this.on('*', function () {
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

    this._candidateBuffer = [];
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

PeerConnection.prototype._role = function () {
    return this.isInitiator ? 'initiator' : 'responder';
};

// Add a stream to the peer connection object
PeerConnection.prototype.addStream = function (stream) {
    this.localStream = stream;
    this.pc.addStream(stream);
};

// helper function to check if a remote candidate is a stun/relay
// candidate or an ipv6 candidate
PeerConnection.prototype._checkLocalCandidate = function (candidate) {
    var cand = SJJ.toCandidateJSON(candidate);
    if (cand.type == 'srflx') {
        this.hadLocalStunCandidate = true;
    } else if (cand.type == 'relay') {
        this.hadLocalRelayCandidate = true;
    }
    if (cand.ip.indexOf(':') != -1) {
        this.hadLocalIPv6Candidate = true;
    }
};

// helper function to check if a remote candidate is a stun/relay
// candidate or an ipv6 candidate
PeerConnection.prototype._checkRemoteCandidate = function (candidate) {
    var cand = SJJ.toCandidateJSON(candidate);
    if (cand.type == 'srflx') {
        this.hadRemoteStunCandidate = true;
    } else if (cand.type == 'relay') {
        this.hadRemoteRelayCandidate = true;
    }
    if (cand.ip.indexOf(':') != -1) {
        this.hadRemoteIPv6Candidate = true;
    }
};

// Init and add ice candidate object with correct constructor
PeerConnection.prototype.processIce = function (update, cb) {
    cb = cb || function () {};
    var self = this;

    // ignore any added ice candidates to avoid errors. why does the
    // spec not do this?
    if (this.pc.signalingState === 'closed') return cb();

    if (update.contents || update.jingle && update.jingle.contents) {
        var contentNames = this.remoteDescription.contents.map(function (c) {
            return c.name;
        });
        var contents = update.contents || update.jingle.contents;

        contents.forEach(function (content) {
            var transport = content.transport || {};
            var candidates = transport.candidates || [];
            var mline = contentNames.indexOf(content.name);
            var mid = content.name;
            var remoteContent = self.remoteDescription.contents.find(function (c) {
                return c.name === content.name;
            });

            // process candidates as a callback, in case we need to
            // update ufrag and pwd with offer/answer
            var processCandidates = function () {
                candidates.forEach(function (candidate) {
                    var iceCandidate = SJJ.toCandidateSDP(candidate) + '\r\n';
                    self.pc.addIceCandidate(new RTCIceCandidate({
                        candidate: iceCandidate,
                        sdpMLineIndex: mline,
                        sdpMid: mid
                    }), function () {
                        // well, this success callback is pretty meaningless
                    }, function (err) {
                        self.emit('error', err);
                    });
                    self._checkRemoteCandidate(iceCandidate);
                });
                cb();
            };

            if (self.iceCredentials.remote[content.name] && transport.ufrag && self.iceCredentials.remote[content.name].ufrag !== transport.ufrag) {
                if (remoteContent) {
                    remoteContent.transport.ufrag = transport.ufrag;
                    remoteContent.transport.pwd = transport.pwd;
                    var offer = {
                        type: 'offer',
                        jingle: self.remoteDescription
                    };
                    offer.sdp = SJJ.toSessionSDP(offer.jingle, {
                        sid: self.config.sdpSessionID,
                        role: self._role(),
                        direction: 'incoming'
                    });
                    self.pc.setRemoteDescription(new RTCSessionDescription(offer), function () {
                        processCandidates();
                    }, function (err) {
                        self.emit('error', err);
                    });
                } else {
                    self.emit('error', 'ice restart failed to find matching content');
                }
            } else {
                processCandidates();
            }
        });
    } else {
        // working around https://code.google.com/p/webrtc/issues/detail?id=3669
        if (update.candidate && update.candidate.candidate.indexOf('a=') !== 0) {
            update.candidate.candidate = 'a=' + update.candidate.candidate;
        }

        if (this.wtFirefox && this.firefoxcandidatebuffer !== null) {
            // we cant add this yet due to https://bugzilla.mozilla.org/show_bug.cgi?id=1087551
            if (this.pc.localDescription && this.pc.localDescription.type === 'offer') {
                this.firefoxcandidatebuffer.push(update.candidate);
                return cb();
            }
        }

        self.pc.addIceCandidate(new RTCIceCandidate(update.candidate), function () {}, function (err) {
            self.emit('error', err);
        });
        self._checkRemoteCandidate(update.candidate.candidate);
        cb();
    }
};

// Generate and emit an offer with the given constraints
PeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var mediaConstraints = hasConstraints && constraints ? constraints : {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };
    cb = hasConstraints ? cb : constraints;
    cb = cb || function () {};

    if (this.pc.signalingState === 'closed') return cb('Already closed');

    // Actually generate the offer
    this.pc.createOffer(function (offer) {
        // does not work for jingle, but jingle.js doesn't need
        // this hack...
        var expandedOffer = {
            type: 'offer',
            sdp: offer.sdp
        };
        if (self.assumeSetLocalSuccess) {
            self.emit('offer', expandedOffer);
            cb(null, expandedOffer);
        }
        self._candidateBuffer = [];
        self.pc.setLocalDescription(offer, function () {
            var jingle;
            if (self.config.useJingle) {
                jingle = SJJ.toSessionJSON(offer.sdp, {
                    role: self._role(),
                    direction: 'outgoing'
                });
                jingle.sid = self.config.sid;
                self.localDescription = jingle;

                // Save ICE credentials
                jingle.contents.forEach(function (content) {
                    var transport = content.transport || {};
                    if (transport.ufrag) {
                        self.iceCredentials.local[content.name] = {
                            ufrag: transport.ufrag,
                            pwd: transport.pwd
                        };
                    }
                });

                expandedOffer.jingle = jingle;
            }
            expandedOffer.sdp.split('\r\n').forEach(function (line) {
                if (line.indexOf('a=candidate:') === 0) {
                    self._checkLocalCandidate(line);
                }
            });

            if (!self.assumeSetLocalSuccess) {
                self.emit('offer', expandedOffer);
                cb(null, expandedOffer);
            }
        }, function (err) {
            self.emit('error', err);
            cb(err);
        });
    }, function (err) {
        self.emit('error', err);
        cb(err);
    }, mediaConstraints);
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
                    content.application.googConferenceFlag = true;
                }
            });
        }
        if (this.enableMultiStreamHacks) {
            // add a mixed video stream as first stream
            offer.jingle.contents.forEach(function (content) {
                if (content.name === 'video') {
                    var sources = content.application.sources || [];
                    if (sources.length === 0 || sources[0].ssrc !== "3735928559") {
                        sources.unshift({
                            ssrc: "3735928559", // 0xdeadbeef
                            parameters: [{
                                key: "cname",
                                value: "deadbeef"
                            }, {
                                key: "msid",
                                value: "mixyourfecintothis please"
                            }]
                        });
                        content.application.sources = sources;
                    }
                }
            });
        }
        if (self.restrictBandwidth > 0) {
            if (offer.jingle.contents.length >= 2 && offer.jingle.contents[1].name === 'video') {
                var content = offer.jingle.contents[1];
                var hasBw = content.application && content.application.bandwidth && content.application.bandwidth.bandwidth;
                if (!hasBw) {
                    offer.jingle.contents[1].application.bandwidth = { type: 'AS', bandwidth: self.restrictBandwidth.toString() };
                    offer.sdp = SJJ.toSessionSDP(offer.jingle, {
                        sid: self.config.sdpSessionID,
                        role: self._role(),
                        direction: 'outgoing'
                    });
                }
            }
        }
        // Save ICE credentials
        offer.jingle.contents.forEach(function (content) {
            var transport = content.transport || {};
            if (transport.ufrag) {
                self.iceCredentials.remote[content.name] = {
                    ufrag: transport.ufrag,
                    pwd: transport.pwd
                };
            }
        });
        offer.sdp = SJJ.toSessionSDP(offer.jingle, {
            sid: self.config.sdpSessionID,
            role: self._role(),
            direction: 'incoming'
        });
        self.remoteDescription = offer.jingle;
    }
    offer.sdp.split('\r\n').forEach(function (line) {
        if (line.indexOf('a=candidate:') === 0) {
            self._checkRemoteCandidate(line);
        }
    });
    self.pc.setRemoteDescription(new RTCSessionDescription(offer), function () {
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
    var hasConstraints = arguments.length === 2;
    var callback = hasConstraints ? cb : constraints;
    var mediaConstraints = hasConstraints && constraints ? constraints : {
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
        answer.sdp = SJJ.toSessionSDP(answer.jingle, {
            sid: self.config.sdpSessionID,
            role: self._role(),
            direction: 'incoming'
        });
        self.remoteDescription = answer.jingle;

        // Save ICE credentials
        answer.jingle.contents.forEach(function (content) {
            var transport = content.transport || {};
            if (transport.ufrag) {
                self.iceCredentials.remote[content.name] = {
                    ufrag: transport.ufrag,
                    pwd: transport.pwd
                };
            }
        });
    }
    answer.sdp.split('\r\n').forEach(function (line) {
        if (line.indexOf('a=candidate:') === 0) {
            self._checkRemoteCandidate(line);
        }
    });
    self.pc.setRemoteDescription(new RTCSessionDescription(answer), function () {
        if (self.wtFirefox) {
            window.setTimeout(function () {
                self.firefoxcandidatebuffer.forEach(function (candidate) {
                    // add candidates later
                    self.pc.addIceCandidate(new RTCIceCandidate(candidate), function () {}, function (err) {
                        self.emit('error', err);
                    });
                    self._checkRemoteCandidate(candidate.candidate);
                });
                self.firefoxcandidatebuffer = null;
            }, self.wtFirefox);
        }
        cb(null);
    }, cb);
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

    if (this.pc.signalingState === 'closed') return cb('Already closed');

    self.pc.createAnswer(function (answer) {
        var sim = [];
        if (self.enableChromeNativeSimulcast) {
            // native simulcast part 1: add another SSRC
            answer.jingle = SJJ.toSessionJSON(answer.sdp, {
                role: self._role(),
                direction: 'outgoing'
            });
            if (answer.jingle.contents.length >= 2 && answer.jingle.contents[1].name === 'video') {
                var groups = answer.jingle.contents[1].application.sourceGroups || [];
                var hasSim = false;
                groups.forEach(function (group) {
                    if (group.semantics == 'SIM') hasSim = true;
                });
                if (!hasSim && answer.jingle.contents[1].application.sources.length) {
                    var newssrc = JSON.parse(JSON.stringify(answer.jingle.contents[1].application.sources[0]));
                    newssrc.ssrc = '' + Math.floor(Math.random() * 0xffffffff); // FIXME: look for conflicts
                    answer.jingle.contents[1].application.sources.push(newssrc);

                    sim.push(answer.jingle.contents[1].application.sources[0].ssrc);
                    sim.push(newssrc.ssrc);
                    groups.push({
                        semantics: 'SIM',
                        sources: sim
                    });

                    // also create an RTX one for the SIM one
                    var rtxssrc = JSON.parse(JSON.stringify(newssrc));
                    rtxssrc.ssrc = '' + Math.floor(Math.random() * 0xffffffff); // FIXME: look for conflicts
                    answer.jingle.contents[1].application.sources.push(rtxssrc);
                    groups.push({
                        semantics: 'FID',
                        sources: [newssrc.ssrc, rtxssrc.ssrc]
                    });

                    answer.jingle.contents[1].application.sourceGroups = groups;
                    answer.sdp = SJJ.toSessionSDP(answer.jingle, {
                        sid: self.config.sdpSessionID,
                        role: self._role(),
                        direction: 'outgoing'
                    });
                }
            }
        }
        var expandedAnswer = {
            type: 'answer',
            sdp: answer.sdp
        };
        if (self.assumeSetLocalSuccess) {
            // not safe to do when doing simulcast mangling
            self.emit('answer', expandedAnswer);
            cb(null, expandedAnswer);
        }
        self._candidateBuffer = [];
        self.pc.setLocalDescription(answer, function () {
            if (self.config.useJingle) {
                var jingle = SJJ.toSessionJSON(answer.sdp, {
                    role: self._role(),
                    direction: 'outgoing'
                });
                jingle.sid = self.config.sid;
                self.localDescription = jingle;
                expandedAnswer.jingle = jingle;
            }
            if (self.enableChromeNativeSimulcast) {
                // native simulcast part 2:
                // signal multiple tracks to the receiver
                // for anything in the SIM group
                if (!expandedAnswer.jingle) {
                    expandedAnswer.jingle = SJJ.toSessionJSON(answer.sdp, {
                        role: self._role(),
                        direction: 'outgoing'
                    });
                }
                expandedAnswer.jingle.contents[1].application.sources.forEach(function (source, idx) {
                    // the floor idx/2 is a hack that relies on a particular order
                    // of groups, alternating between sim and rtx
                    source.parameters = source.parameters.map(function (parameter) {
                        if (parameter.key === 'msid') {
                            parameter.value += '-' + Math.floor(idx / 2);
                        }
                        return parameter;
                    });
                });
                expandedAnswer.sdp = SJJ.toSessionSDP(expandedAnswer.jingle, {
                    sid: self.sdpSessionID,
                    role: self._role(),
                    direction: 'outgoing'
                });
            }
            expandedAnswer.sdp.split('\r\n').forEach(function (line) {
                if (line.indexOf('a=candidate:') === 0) {
                    self._checkLocalCandidate(line);
                }
            });
            if (!self.assumeSetLocalSuccess) {
                self.emit('answer', expandedAnswer);
                cb(null, expandedAnswer);
            }
        }, function (err) {
            self.emit('error', err);
            cb(err);
        });
    }, function (err) {
        self.emit('error', err);
        cb(err);
    }, constraints);
};

// Internal method for emitting ice candidates on our peer object
PeerConnection.prototype._onIce = function (event) {
    var self = this;
    if (event.candidate) {
        if (this.dontSignalCandidates) return;
        var ice = event.candidate;

        var expandedCandidate = {
            candidate: {
                candidate: ice.candidate,
                sdpMid: ice.sdpMid,
                sdpMLineIndex: ice.sdpMLineIndex
            }
        };
        this._checkLocalCandidate(ice.candidate);

        var cand = SJJ.toCandidateJSON(ice.candidate);

        var already;
        var idx;
        if (this.eliminateDuplicateCandidates && cand.type === 'relay') {
            // drop candidates with same foundation, component
            // take local type pref into account so we don't ignore udp
            // ones when we know about a TCP one. unlikely but...
            already = this._candidateBuffer.filter(function (c) {
                return c.type === 'relay';
            }).map(function (c) {
                return c.foundation + ':' + c.component;
            });
            idx = already.indexOf(cand.foundation + ':' + cand.component);
            // remember: local type pref of udp is 0, tcp 1, tls 2
            if (idx > -1 && cand.priority >> 24 >= already[idx].priority >> 24) {
                // drop it, same foundation with higher (worse) type pref
                return;
            }
        }
        if (this.config.bundlePolicy === 'max-bundle') {
            // drop candidates which are duplicate for audio/video/data
            // duplicate means same host/port but different sdpMid
            already = this._candidateBuffer.filter(function (c) {
                return cand.type === c.type;
            }).map(function (cand) {
                return cand.address + ':' + cand.port;
            });
            idx = already.indexOf(cand.address + ':' + cand.port);
            if (idx > -1) return;
        }
        // also drop rtcp candidates since we know the peer supports RTCP-MUX
        // this is a workaround until browsers implement this natively
        if (this.config.rtcpMuxPolicy === 'require' && cand.component === '2') {
            return;
        }
        this._candidateBuffer.push(cand);

        if (self.config.useJingle) {
            if (!ice.sdpMid) {
                // firefox doesn't set this
                if (self.pc.remoteDescription && self.pc.remoteDescription.type === 'offer') {
                    // preserve name from remote
                    ice.sdpMid = self.remoteDescription.contents[ice.sdpMLineIndex].name;
                } else {
                    ice.sdpMid = self.localDescription.contents[ice.sdpMLineIndex].name;
                }
            }
            if (!self.iceCredentials.local[ice.sdpMid]) {
                var jingle = SJJ.toSessionJSON(self.pc.localDescription.sdp, {
                    role: self._role(),
                    direction: 'outgoing'
                });
                jingle.contents.forEach(function (content) {
                    var transport = content.transport || {};
                    if (transport.ufrag) {
                        self.iceCredentials.local[content.name] = {
                            ufrag: transport.ufrag,
                            pwd: transport.pwd
                        };
                    }
                });
            }
            expandedCandidate.jingle = {
                contents: [{
                    name: ice.sdpMid,
                    creator: self._role(),
                    transport: {
                        transportType: 'iceUdp',
                        ufrag: self.iceCredentials.local[ice.sdpMid].ufrag,
                        pwd: self.iceCredentials.local[ice.sdpMid].pwd,
                        candidates: [cand]
                    }
                }]
            };
            if (self.batchIceCandidates > 0) {
                if (self.batchedIceCandidates.length === 0) {
                    window.setTimeout(function () {
                        var contents = {};
                        self.batchedIceCandidates.forEach(function (content) {
                            content = content.contents[0];
                            if (!contents[content.name]) contents[content.name] = content;
                            contents[content.name].transport.candidates.push(content.transport.candidates[0]);
                        });
                        var newCand = {
                            jingle: {
                                contents: []
                            }
                        };
                        Object.keys(contents).forEach(function (name) {
                            newCand.jingle.contents.push(contents[name]);
                        });
                        self.batchedIceCandidates = [];
                        self.emit('ice', newCand);
                    }, self.batchIceCandidates);
                }
                self.batchedIceCandidates.push(expandedCandidate.jingle);
                return;
            }
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

// Create a data channel spec reference:
// http://dev.w3.org/2011/webrtc/editor/webrtc.html#idl-def-RTCDataChannelInit
PeerConnection.prototype.createDataChannel = function (name, opts) {
    var channel = this.pc.createDataChannel(name, opts);

    // make sure we keep a reference so this doesn't get garbage collected
    this._localDataChannels.push(channel);

    return channel;
};

PeerConnection.prototype.getStats = function (cb) {
    this.pc.getStats(null, function (res) {
        cb(null, res);
    }, function (err) {
        cb(err);
    });
};

module.exports = PeerConnection;

},{"sdp-jingle-json":5,"traceablepeerconnection":10,"util":4,"webrtc-adapter":12,"wildemitter":21}]},{},[22])(22)
});