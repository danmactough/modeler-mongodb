var modeler = require('modeler');

module.exports = function (_opts) {
  var api = modeler(_opts);

  if (!api.options.db) throw new Error('must pass a node-mongodb-native db with options.db');
  var db = api.options.db;
  var collection = db.collection(api.options.collection || api.options.name);
  var sort = (function () {
    var obj = {}
      , field = api.options.sort || '$natural';
    return function (reverse) {
      obj[field] = reverse ? -1 : 1;
      return obj;
    };
  })();

  function continuable (skip, limit, reverse, cb) {
    (function next () {
      var cur = collection.find().skip( skip ? skip : 0);
      limit && cur.limit(limit);
      cur.sort(sort(reverse));
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
    // @TODO create a side collection with an incrementing counter to keep true insertion order
    collection.findAndModify({ id: entity.id }, sort(), entity, { new: true, upsert: true }, cb);
  };
  api._load = function (id, cb) {
    collection.findOne({ id: id }, cb);
  };
  api._destroy = function (id, cb) {
    collection.remove({ id: id }, cb);
  };

  return api;
};