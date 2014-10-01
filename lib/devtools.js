/*
 * Breach: [mod_development] devtools.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu   Move to `mod_layout`
 * - 2014-02-18 spolu   Creation
 */
var common = require('./common.js');
var http = require('http');
var async = require('async');
var breach = require('breach_module');

// ### devtools
//
// ```
// @spec { http_port }
// ```
var devtools = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.http_port = spec.http_port;
  my.devtools_url = null;
  
  my.sockets = [];

  //
  // ### _public_
  //
  var handshake;                  /* handshake(socket) */
  var init;                       /* init(cb_); */
  var kill;                       /* kill(cb_); */

  //
  // ### _private_
  //
  var socket_push;                /* socket_push(); */

  var stack_devtools_handler;     /* stack_devtools_handler(evt); */
  var devtools_enabled = false;   /* bool */
  var devtools_context_tabs = []; /* array */
  var core_state_handler;         /* core_state_handler(evt); */
  var core_context_menu_handler;  /* core_context_menu_handler(evt); */

  //
  // ### _exposed_
  //
  var exposed_context_menu_builder; /* exposed_context_menu_builder(src, args, cb_); */

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### socket_push
  //
  // Pushes the current state on the UI socket
  socket_push = function() {
    var update = {
      devtools_url: my.devtools_url || 
        'http://localhost:' + my.http_port + '/devtools/blank.html'
    };
    my.sockets.forEach(function(s) {
      s.emit('state', update);
    });
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS */
  /****************************************************************************/
  // ### core_state_handler
  //
  // Handler called when the state is updated by the core module
  // ```
  // @state {object} the state
  // ```
  core_state_handler = function(state) {
    Object.keys(state).filter(function(tab_id) {
      return devtools_context_tabs.indexOf(tab_id) === -1;
    }).map(function(tab_id) {
      breach.module('core').call('tabs_set_context_menu_builder', {
        id: tab_id,
        procedure: 'context_menu_builder'
      });
      devtools_context_tabs.push(tab_id);
    });
  };

  // ### core_context_menu_handler
  //
  // Hanlder called when a context menu item is triggered
  // ```
  // @evt { src, id, item } the context menu item information
  // ```
  core_context_menu_handler = function(evt) {
    if (evt.src !== 'mod_development') {
      return;
    }

    switch (evt.item) {
      case 'Inspect Element':
        breach.module('core').call('tabs_devtools', {
          id: evt.id,
          element_at: {
            x: my.context_menu_params.x,
            y: my.context_menu_params.y
          }
        }, function(err, res) {
          if(err) {
            return;
          }
          var dev_id = res.id;
          var url_p = require('url').parse(res.url);
          var json_url = 'http://' + url_p.hostname + ':' + url_p.port +
            '/json/list';
          http.get(json_url, function(res) {
            res.setEncoding('utf8');
            var data = '';
            res.on('data', function(chunk) {
              data += chunk;
            });
            res.on('end', function() {
              try {
                JSON.parse(data).forEach(function(dev) {
                  if(dev.id === dev_id && dev.devtoolsFrontendUrl) {
                    var url = 'http://' + url_p.hostname + ':' + url_p.port +
                      dev.devtoolsFrontendUrl;
                    common.log.out('[tabs] devtools: ' + url);
                    breach.emit('devtools', { devtools_url: url });
                  }
                });
                devtools_enabled = true;
              }
              catch(err) { /* NOP */ }
            });
          }).on('error', function(err) { /* NOP */ });
        });
        break;
      case 'Close DevTools':
        breach.emit('devtools', { devtools_url: null });
        devtools_enabled = false;
        break;
      default:
        common.log.error('INFO: There is no action assigned to context menu item "' + evt.item + '"!');
    }
  };

  // ### exposed_context_menu_builder
  //
  // Procedure called when the context menu for registered tabs needs to be
  // built
  // ```
  // @src  {string} source module
  // @args { id, params }
  // @cb_  {function(err, res)}
  // ```
  exposed_context_menu_builder = function(src, args, cb_) {
    my.context_menu_params = args.params;
    var items = [
      'Inspect Element'
    ];

    if (devtools_enabled) {
      items.push('Close DevTools');
    }

    return cb_(null, {
      items: items
    })
  };

  /****************************************************************************/
  /* SOCKET EVENT HANDLERS */
  /****************************************************************************/

  /****************************************************************************/
  /* STACK EVENT HANDLERS */
  /****************************************************************************/
  // ### stack_devtools_handler
  //
  // Handler called when the mod_stack requests to display the dev tools on
  // a given URL.
  // ```
  // @evt {object} the event data
  // ```
  stack_devtools_handler = function(evt) {
    if(my.devtools_url !== evt.devtools_url) {
      my.devtools_url = evt.devtools_url;
      if(my.devtools_url) {
        breach.module('core').call('controls_dimension', {
          type: 'BOTTOM',
          dimension: 400,
          focus: true
        });
      }
      else {
        breach.module('core').call('controls_dimension', {
          type: 'BOTTOM',
          dimension: 0
        });
      }
      socket_push();
    }
  };

  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### handshake
  //
  // Called when the UI client connected to the Socket
  // ```
  // @socket {socket.io} the socket.io to connect with
  // ```
  handshake = function(socket) {
    common.log.out('[devtools] HANDSHAKE');
    my.sockets.unshift(socket);
    socket_push();

    socket.on('disconnect', function() {
      common.log.out('[devtools] disconnect');
      common.remove(my.sockets, socket, true);
    });

    socket.on('resize', function(newOffset) {
      breach.module('core').call('controls_dimension', {
        type: 'BOTTOM',
        dimension: newOffset,
        focus: true
      });
    });
  };


  // ### init 
  //
  // Called at initialisation of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  init = function(cb_) {
    async.series([
      function(cb_) {
        breach.expose('context_menu_builder', exposed_context_menu_builder);
        breach.module('core').on('tabs:context_menu', core_context_menu_handler);
        return cb_();
      },
      function(cb_) {
        breach.module('core').on('tabs:state', core_state_handler);
        return cb_();
      },
      function(cb_) {
        breach.module(null).on('devtools', stack_devtools_handler);
        breach.module('core').call('controls_set', {
          type: 'BOTTOM',
          url: 'http://localhost:' + my.http_port + '/devtools',
          dimension: 0
        });
        return cb_();
      }
    ], cb_);
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    breach.module('core').call('controls_unset', {
      type: 'BOTTOM'
    }, cb_);
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  common.method(that, 'handshake', handshake, _super);

  return that;
};

exports.devtools = devtools;
