/* jshint node:true, mocha:true */

'use strict';

var http = require('http').Server;
var io = require('socket.io');
var ioc = require('socket.io-client');
var expect = require('expect.js');
var SocketModel = require('../lib/socket.model');

describe('SocketModel', function () {

  it('should trigger connect event when a client connects', function (done) {
    var srv = http();
    var sio = io(srv);
    var Post = new SocketModel('post', sio);

    Post.on('connect', function () {
      expect(true).to.be.ok();
      done();
    });

    srv.listen(function () {
      ioc('ws://127.0.0.1:' + srv.address().port);
    });
  });

});
