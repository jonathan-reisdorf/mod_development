/**
 * Breach: common.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-05-16 spolu   Added `exit` method
 * - 2014-01-14 spolu   Added `hash` method
 * - 2013-13-15 spolu   Creation
 */
var util = require('util');
var events = require('events');
var crypto = require('crypto');

"use strict";

/******************************************************************************/
/* GLOBAL CONFIG */
/******************************************************************************/

exports.DEBUG = false;
exports.MSG_LOGGING = false;
exports.MSG_DUMP = false;

/******************************************************************************/
/* CROCKFORD */
/******************************************************************************/

// ### method
//
// Adds a method to the current object denoted by that and preserves _super 
// implementation (see Crockford)
// ```
// @that {object} object to extend
// @name {string} the method name
// @method {function} the method
// @_super {object} parent object for functional inheritence
// ```
exports.method = function(that, name, method, _super) {
  if(_super) {
    var m = that[name];
    _super[name] = function() {
      return m.apply(that, arguments);
    };    
  }
  that[name] = method;    
};

// ### getter
//
// Generates a getter on obj for key
// ```
// @that {object} object to extend
// @name {string} the getter name
// @obj {object} the object targeted by the getter
// @key {string} the key to get on obj
// ```
exports.getter = function(that, name, obj, prop) {
  var getter = function() {
    return obj[prop];
  };
  that[name] = getter;
};

// ### setter
//
// Generates a getter on obj for key
// ```
// @that {object} object to extend
// @name {string} the getter name
// @obj {object} the object targeted by the getter
// @key {string} the key to get on obj
// ```
exports.setter = function(that, name, obj, prop) {
  var setter = function (arg) {
    obj[prop] = arg;
    return that;
  };  
  that['set' + name.substring(0, 1).toUpperCase() + name.substring(1)] = setter;
  that['set' + '_' + name] = setter;
};

// ### responds
//
// Tests wether the object responds to the given method name
// ```
// @that {object} object to test
// @name {string} the method/getter/setter name
// ```
exports.responds = function(that, name) {
    return (that[name] && typeof that[name] === 'function');
};


/******************************************************************************/
/* HELPERS */
/******************************************************************************/

// ### remove
//
// Removes the element e from the Array, using the JS '===' equality
// ```
// @that {array} the array to operate on
// @e {object} element to remove from the array
// @only_one {boolean} remove only one
// ```
exports.remove = function(that, e, only_one) {
  "use strict";
  
  if(that === void 0 || that === null || !Array.isArray(that))
    throw new TypeError();
  
  for(var i = that.length - 1; i >= 0; i--) {
    if(e === that[i]) {
      that.splice(i, 1);        
      if(only_one) return;
    }
  }
};


/******************************************************************************/
/* LOGGING AND ERROR REPORTING */
/******************************************************************************/

var log = function(str, debug, error) {
  var pre = '[' + new Date().toISOString() + '] ';
  //pre += (my.name ? '{' + my.name.toUpperCase() + '} ' : '');
  pre += (debug ? 'DEBUG: ' : '');
  str.toString().split('\n').forEach(function(line) {
    if(error)
      console.error(pre + line)
    else if(debug)
      console.log(pre + line);
    else 
      console.log(pre + line);
  });
};


// ### log
//
// Loging helpers. Object based on the `log` function including 4 logging
// functions: `out`, `error`, `debug`, `info`
// ```
// @str {string|error} the string or error to log
// ```
exports.log = {
  out: function(str) {
    log(str);
  },
  error: function(err) {
    if(typeof err === 'object') {
      log('*********************************************', false, true);
      log('ERROR: ' + err.message);
      log('*********************************************', false, true);
      log(err.stack);
      log('---------------------------------------------', false, true);
    }
    else {
      log('*********************************************', false, true);
      log('ERROR: ' + JSON.stringify(err));
      log('*********************************************', false, true);
      log('---------------------------------------------', false, true);
    }
  },
  debug: function(str) {
    if(exports.DEBUG)
      log(str, true);
  },
  info: function(str) {
    util.print(str + '\n');
  }
};

// ### exit
//
// Makes sure to kill all subprocesses
// ``
// @code {number} exit code
// ```
exports.exit = function(code) {
  try {
    process.kill('-' + process.pid);
  }
  finally {
    process.exit(code);
  }
};

// ### fatal
//
// Prints out the error and exits the process while killing all sub processes
// ```
// @err {error}
// ```
exports.fatal = function(err) {
  exports.log.error(err);
  exports.exit(1);
};

// ### err
//
// Generates a proper error with name set
// ```
// @msg  {string} the error message
// @name {string} the error name
// ```
exports.err = function(msg, name) {
  var err = new Error(msg);
  err.name = name || 'CommonError';
  return err;
};

