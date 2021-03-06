/* jshint node:true */

'use strict';

module.exports = SocketModel;

function SocketModel(io, name) {
  if (!(this instanceof SocketModel)) {
    return new SocketModel(io, name);
  }

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
   * The model collection.
   */
  self.collection = [];

  /**
   * Socket model mode, either `server` or `client`;
   */
  self.mode = io.sockets ? 'server' : 'client';

  /**
   * Socket.io connected sockets.
   */
  self._sockets = self.mode === 'server' ?
    io.sockets.connected :
    (function () {
      var sockets = {};
      sockets[io.id] = io;
      return sockets;
    }());

  /**
   * Socket.io instance. When in `client` mode, it is the socket client.
   */
  self._io = io;

  /**
   * Meta-class to get better syntax.
   * @example
   * var Post = new SocketModel(socketIo, 'post').class;
   * var post = new Post();
   */
  self.class = (function () {
    function MetaClass(obj) {
      if (typeof obj === 'object') {
        extend(this, obj);
      }
    }

    each(['save', 'delete'], function (method) {
      MetaClass.prototype[method] = function () {
        var args = Array.prototype.slice.call(arguments);

        if (args.length === 0) {
          // when invoke without parameter, pass `this` object as parameter
          var obj = {};
          args.push(obj);

          // but filter the function property out
          each(this, function (value, key) {
            if (typeof value !== 'function') {
              obj[key] = value;
            }
          });
        }

        self.emit.apply(self, [method].concat(args));
      };
    });

    return MetaClass;
  }());

  // in server-side, when a new socket is connected,
  // deal with it with event handler store.
  if (self.mode === 'server') {
    io.on('connect', function (socket) {
      each(self._handlers, function (handlers, event) {
        each(handlers, function (handler) {
          self._dealWithHandler(event, handler, socket);
        });
      });
    });
  }
}

/**
 * Register the handler to the event.
 * @param {string} event - The target event.
 * @param {function} handler - The registering event handler.
 */
SocketModel.prototype.on = function (event, handler) {
  var self = this;

  // add the event and hander to the store
  self._handlers[event] = self._handlers[event] || [];
  self._handlers[event].push(handler);

  // register event hander on the connected sockets
  each(self._sockets, function (socket) {
    self._dealWithHandler(event, handler, socket);
  });

  return self;
};

SocketModel.prototype.emit = function (event) {
  var socket = this._io;
  var namedEvent = this.name + ':' + event;
  var args = Array.prototype.slice.call(arguments, 1);

  socket.emit.apply(socket, [namedEvent].concat(args));

  return this;
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
  var namedEvent = self.name + ':' + event;
  var request = self.mode === 'server' ? socket.request : socket.io;

  if (event === 'connect' && self.mode === 'server') {
    // on server side, when a socket is connceted,
    // invoke all connect event handler for it.
    handler(request, function () {
      var args = Array.prototype.slice.call(arguments);
      socket.emit.apply(socket, [namedEvent].concat(args));
    });

  } else {
    // otherwise, bind the event handlers on the socket
    socket.on(namedEvent, function () {
      var response = function () {
        var io = self._io;
        var args = Array.prototype.slice.call(arguments);
        io.emit.apply(io, [namedEvent].concat(args));
      };

      var args = Array.prototype.slice.call(arguments);
      handler.apply(null, [request, response].concat(args));
    });
  }
};

function each(collections, fn) {
  for (var key in collections) {
    var value = collections[key];
    fn(value, key);
  }
}

function extend(destination, source) {
  each(source, function (value, key) {
    destination[key] = value;
  });
}
