/* jshint node:true, mocha:true */

'use strict';

var http = require('http').Server;
var io = require('socket.io');
var ioc = require('socket.io-client');
var expect = require('expect.js');
var SocketModel = require('../lib/socket.model');

describe('SocketModel', function () {

  var sio;
  var port;

  beforeEach(function (done) {
    var srv = http();
    sio = io(srv);

    srv.listen(function () {
      port = srv.address().port;
      done();
    });
  });

  function createClient() {
    return ioc('ws://127.0.0.1:' + port);
  }

  it('should trigger connect event when a client connects', function (done) {
    var Post = new SocketModel('post', sio);
    Post.on('connect', function () {
      expect(true).to.be.ok();
      done();
    });

    createClient();
  });

  it('should trigger connect event on the connected client', function (done) {
    var client = createClient();
    client.on('connect', function () {

      // new socket model after client is connected
      var Post = new SocketModel('post', sio);
      Post.on('connect', function () {
        expect(true).to.be.ok();
        done();
      });
    });
  });

  it('should trigger client connect event when response', function (done) {
    var expectedPosts = ['p1', 'p2', 'p3'];

    var Post = new SocketModel('post', sio);
    Post.on('connect', function (res) {
      res(expectedPosts);
    });

    var client = createClient();
    client.on('post:connect', function (actualPosts) {
      expect(actualPosts).to.eql(expectedPosts);
      done();
    });
  });

});
