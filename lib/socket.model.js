/* jshint node:true */

'use strict';

var _ = require('lodash');

module.exports = SocketModel;

function SocketModel(name, io) {
  var self = this;

  /**
   * Model name. Used as model event namespace.
   */
  self.name = name;

  /**
   * Registered event handlers.
   * Object key is the event, value is an array of handlers.
   */
  self._handlers = {};

  /**
   * Socket.io instance.
   */
  self._io = io;

  io.on('connect', function (socket) {
    _.each(self._handlers, function (handlers, event) {
      _.each(handlers, function (handler) {
        self._dealWithHandler(event, handler, socket);
      });
    });
  });
}

SocketModel.prototype._dealWithHandler = function (event, handler, socket) {
  var self = this;
  var name = self.name;

  if (event === 'connect') {
    // when a socket is connceted, invoke all connect event handler for it.
    var response = function () {
      var args = Array.prototype.slice.call(arguments);
      socket.emit.apply(socket, [name + ':' + event].concat(args));
    };

    handler(response);

  } else {
    // then bind other event handlers on the socket
    socket.on(name + ':' + event, function (data, response) {
      handler(data, response);
      socket.emit(name + ':' + event, data, response);
    });
  }
};

/**
 * Register the handler to the event.
 * @param {string} event - The target event.
 * @param {function} handler - The registering event handler.
 */
SocketModel.prototype.on = function (event, handler) {
  var self = this;
  var name = self.name;

  // add the event and hander to the store
  self._handlers[event] = self._handlers[event] || [];
  self._handlers[event].push(handler);

  _.each(self._io.sockets.connected, function (socket) {
    self._dealWithHandler(event, handler, socket);
  });
};
