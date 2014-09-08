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

  // when a new socket is connected, deal with it with event handler store
  io.on('connect', function (socket) {
    _.each(self._handlers, function (handlers, event) {
      _.each(handlers, function (handler) {
        self._dealWithHandler(event, handler, socket);
      });
    });
  });
}

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

  // register event hander on the connected sockets
  _.each(self._io.sockets.connected, function (socket) {
    self._dealWithHandler(event, handler, socket);
  });
};

/**
 * Deal with event handler with one socket.
 * If the event is `connect`, invoke it immediately.
 * Otherwise, register the event handler on the socket.
 * @private
 * @param {string} event - The target event.
 * @param {function} handler - The event handler.
 * @param {Socket} socket - One socket.io Socket instance.
 */
SocketModel.prototype._dealWithHandler = function (event, handler, socket) {
  var self = this;
  var name = self.name;
  var namedEvent = name + ':' + event;

  if (event === 'connect') {
    // when a socket is connceted, invoke all connect event handler for it.
    handler(function () {
      var args = Array.prototype.slice.call(arguments);
      socket.emit.apply(socket, [namedEvent].concat(args));
    });

  } else {
    // then bind other event handlers on the socket
    socket.on(namedEvent, function () {
      var args = Array.prototype.slice.call(arguments);
      handler.apply(null, args);
      socket.emit.apply(socket, [namedEvent].concat(args));
    });
  }
};
