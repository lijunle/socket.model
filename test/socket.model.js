/* jshint node:true, mocha:true */

'use strict';

var http = require('http').Server;
var io = require('socket.io');
var ioc = require('socket.io-client');
var expect = require('expect.js');
var SocketModel = require('../lib/socket.model');
var Q = require('q');

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

var expectedPost = {
  id: 1234,
  content: 'post content'
};

describe('server', function () {

  describe('model fields', function () {

    it('should have a name', function () {
      var Post = new SocketModel('post', sio);
      expect(Post).to.have.property('name');
    });

    it('should have collection as an empty array', function () {
      var Post = new SocketModel('post', sio);
      expect(Post).to.have.property('collection');
      expect(Post.collection).to.be.an('array').and.to.have.length(0);
    });

    it('should have mode', function () {
      var Post = new SocketModel('post', sio);
      expect(Post).to.have.property('mode');
      expect(Post.mode).to.be('server');
    });

  });

  describe('connect', function () {

    it('should trigger connect event when a client connects', function (done) {
      var Post = new SocketModel('post', sio);
      Post.on('connect', function () {
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

  describe('create', function () {

    it('should not trigger any event handler when client connect', function (done) {
      var Post = new SocketModel('post', sio);

      Post.on('create', function () {
        expect().fail('');
      });

      Post.on('edit', function () {
        done();
      });

      var client = createClient();
      client.on('connect', function () {
        client.emit('post:edit');
      });
    });

    it('should trigger create handler when client emit event', function (done) {
      var Post = new SocketModel('post', sio);
      Post.on('create', function () {
        done();
      });

      var client = createClient();
      client.emit('post:create');
    });

    it('should register event handler on connected sockets', function (done) {
      var client = createClient();
      client.on('connect', function () {
        var Post = new SocketModel('post', sio);
        Post.on('create', function () {
          done();
        });

        client.emit('post:create');
      });
    });

    it('should communicate between server and client via callback', function (done) {
      var Post = new SocketModel('post', sio);
      Post.on('create', function (actualPost, res) {
        expect(actualPost).to.eql(expectedPost);
        res(true);
      });

      var res = function (result) {
        expect(result).to.be(true);
        done();
      };

      var client = createClient();
      client.emit('post:create', expectedPost, res);
    });

    it('should broadcast every socket that something is created', function (done) {
      var Post = new SocketModel('post', sio);
      Post.on('create', function (actualPost) {
        expect(actualPost).to.eql(expectedPost);
      });

      var client1 = createClient();
      var defer1 = Q.defer();
      client1.on('post:create', function (actualPost) {
        expect(actualPost).to.eql(expectedPost);
        defer1.resolve();
      });

      var client2 = createClient();
      var defer2 = Q.defer();
      client2.on('post:create', function (actualPost) {
        expect(actualPost).to.eql(expectedPost);
        defer2.resolve();
      });

      client2.emit('post:create', expectedPost);
      Q.all([defer1.promise, defer2.promise]).then(function () {
        done();
      });
    });

  });

});

describe('client', function () {

  describe('connect', function () {

    it('should get something from connect event', function (done) {
      var expectedPosts = ['p1', 'p2', 'p3'];

      sio.on('connect', function (socket) {
        socket.emit('post:connect', expectedPosts);
      });

      var client = createClient();
      var Post = new SocketModel('post', client);
      Post.on('connect', function (actualPosts) {
        expect(actualPosts).to.be.eql(expectedPosts);
        done();
      });
    });

    it('should register event handler after connected', function (done) {
      sio.on('connect', function (socket) {
        socket.emit('post:create', true);
      });

      var client = createClient();
      client.on('connect', function () {
        var Post = new SocketModel('post', client);
        Post.on('create', function (result) {
          expect(result).to.be(true);
          done();
        });
      });
    });

    it('should trigger server-side create event handler', function (done) {
      sio.on('connect', function (socket) {
        socket.on('post:create', function (actualPost) {
          expect(actualPost).to.eql(expectedPost);
          socket.emit('post:create', true);
          done();
        });
      });

      var client = createClient();
      var Post = new SocketModel('post', client);
      Post.emit('create', expectedPost);
    });

    it('should trigger event, and then get it back on listener', function (done) {
      sio.on('connect', function (socket) {
        socket.on('post:create', function (actualPost) {
          expect(actualPost).to.eql(expectedPost);
          socket.emit('post:create', true);
        });
      });

      var client = createClient();
      var Post = new SocketModel('post', client);

      Post.on('create', function (result) {
        expect(result).to.be(true);
        done();
      });

      Post.emit('create', expectedPost);
    });

  });

});
