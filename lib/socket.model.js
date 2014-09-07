/* jshint node:true */

'use strict';

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

  io.on('connect', function (socket) {
    var connectHandlers = this._handlers.connect;
    if (connectHandlers) {
      connectHandlers.forEach(function (handler) {
        handler();
      });
    }
  }.bind(this));
}

/**
 * Register the handler to the event.
 * @param {string} event - The target event.
 * @param {function} handler - The registering event handler.
 */
SocketModel.prototype.on = function (event, handler) {
  this._handlers[event] = this._handlers[event] || [];
  this._handlers[event].push(handler);
};
