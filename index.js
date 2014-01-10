var modeler = require('modeler');

module.exports = function (_opts) {
  var api = modeler(_opts);

  if (!api.options.db) throw new Error('must pass a node-mongodb-native db with options.db');
  var db = api.options.db
    , collection = db.collection(api.options.name)
    , counter = db.collection('_counters')
    , initialized = false;

  // Make sure we have the indexes we need
  function initialize (cb) {
    collection.ensureIndex([{ "__idx": -1 }], { unique: true }, function (err) {
      if (err) return cb(err);
      counter.ensureIndex([{ "_id": 1, "seq": -1 }], { unique: true }, cb);
    });
  }

  function continuable (skip, limit, reverse, cb) {
    (function next () {
      var cur = collection.find().skip( skip ? skip : 0);
      limit && cur.limit(limit);
      cur.sort({ "__idx": reverse ? -1 : 1 });
      cur.toArray(function (err, results) {
        if (err) return cb(err);
        skip += results.length;
        cb(null, results, next);
      });
    })();
  }

  api._head = function (skip, limit, cb) {
    continuable(skip, limit, false, cb);
  };
  api._tail = function (skip, limit, cb) {
    continuable(skip, limit, true, cb);
  };
  api._save = function (entity, cb) {

    if (!initialized) {
      return initialize(function(err) {
        if (err) return cb(err);
        initialized = true;
        api._save(entity, cb);
      });
    }

    function save () {
      // We need to mirror id to _id
      entity._id || (entity._id = entity.id);
      collection.save(entity, function (err) {
        cb(err, { _id: entity._id });
      });
    }

    if (entity.rev > 1 || typeof entity.__idx !== 'undefined') save();
    else {
      // http://docs.mongodb.org/manual/tutorial/create-an-auto-incrementing-field/
      // compound unique index is ensured in the initialize function, above
      counter.findAndModify({ _id: api.options.name }, null, { "$inc": { seq: 1 } }, { new: true, upsert: true }, function (err, ct) {
        if (err) return cb(err);
        entity.__idx = ct.seq;
        save();
      });
    }
  };
  api._load = function (id, cb) {
    collection.findOne({ id: id }, cb);
  };
  api._destroy = function (id, cb) {
    collection.remove({ id: id }, cb);
  };

  return api;
};