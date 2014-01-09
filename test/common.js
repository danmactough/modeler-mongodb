assert = require('assert');
util = require('util');
modeler = require('../');
idgen = require('idgen');

extraOptions = {
  db: null,
  dbName: 'modeler-mongodb-test-' + idgen()
};

setUp = function (done) {
  var MongoClient = require('mongodb').MongoClient
    , Server = require('mongodb').Server;
  var client = new MongoClient(new Server('localhost', 27017));
  client.open(function (err, client) {
    if (err) return done(err);
    extraOptions.db = client.db(extraOptions.dbName);
    done();
  });
};

tearDown = function (done) {
  extraOptions.db.dropDatabase(done);
};