/*
 * Breach: [mod_development] index.js
 *
 * @log:
 * - 2014-01-17 jreisdorf   Initial
 */
"use strict"

var express = require('express');
var http = require('http');
var common = require('./lib/common.js');
var breach = require('breach_module');
var async = require('async');

var bootstrap = function(http_srv) {
  var port = http_srv.address().port;

  common._ = {
    devtools: require('./lib/devtools.js').devtools({
      http_port: port
    })
  };

  breach.init(function() {
    breach.register('.*', 'devtools');

    breach.expose('init', function(src, args, cb_) {
      async.parallel([common._.devtools.init], cb_);
    });

    breach.expose('kill', function() {
      async.parallel([common._.devtools.kill], function() {
        common.exit(0);
      });
    });
  });

  var io = require('socket.io').listen(http_srv, {
    'log level': 1
  });

  io.sockets.on('connection', function (socket) {
    socket.on('handshake', function (name) {
      var name_r = /^_(.*)$/;
      var name_m = name_r.exec(name);
      if(name_m && common._[name_m[1]]) {
        common._[name_m[1]].handshake(socket);
      }
    });
  });
};

(function setup() {
  var app = express();

  /* App Configuration */
  app.use('/', express.static(__dirname + '/controls'));
  app.use(require('body-parser')());
  app.use(require('method-override')())

  /* Listen locally only */
  var http_srv = http.createServer(app).listen(0, '127.0.0.1');

  http_srv.on('listening', function() {
    return bootstrap(http_srv);
  });
})();


process.on('uncaughtException', function(err) {
  common.fatal(err);
});