/* jshint node:true */

'use strict';

var _ = require('lodash');

module.exports = SocketModel;

function SocketModel(name, io) {
  /**
   * Model name. Used as model event namespace.
   */
  this._name = name;

  /**
   * Registered event handlers.
   * Object key is the event, value is an array of handlers.
   */
  this._handlers = {};

  /**
   * Socket.io instance.
   */
  this._io = io;

  io.on('connect', function (socket) {
    // when a socket is connceted, invoke all connect event handler for it.
    var connectHandlers = this._handlers.connect;
    if (connectHandlers) {
      connectHandlers.forEach(function (handler) {
        this._invokeHandler(name + ':connect', handler, socket);
      }.bind(this));
    }

    // then bind other event handlers on the socket
    _.each(this._handlers, function (handlers, event) {
      if (event !== 'connect') {
        _.each(handlers, function (handler) {
          socket.on(name + ':' + event, function (data, response) {
            handler(data, response);
            socket.emit(name + ':' + event, data, response);
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
}

SocketModel.prototype._invokeHandler = function (event, handler, socket) {
  var response = function () {
    var args = Array.prototype.slice.call(arguments);
    socket.emit.apply(socket, [event].concat(args));
  };

  handler(response);
};

/**
 * Register the handler to the event.
 * @param {string} event - The target event.
 * @param {function} handler - The registering event handler.
 */
SocketModel.prototype.on = function (event, handler) {
  this._handlers[event] = this._handlers[event] || [];
  this._handlers[event].push(handler);

  var name = this._name;
  if (event === 'connect') {
    // when a new conncet event handler comes, invoke it on connected sockets
    var connectedSockets = this._io.sockets.connected;
    for (var socketId in connectedSockets) {
      var socket = connectedSockets[socketId];
      this._invokeHandler(name + ':connect', handler, socket);
    }
  } else {
    // otherwise, register the event handler on connected sockets
    _.each(this._io.sockets.connected, function (socket) {
      socket.on(name + ':' + event, function (data, response) {
        handler(data, response);
        socket.emit(name + ':' + event, data, response);
      });
    });
  }
};
