/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const database = require("../../../src/db/lokijs/database");
const db = require("../../../src/db/api");
const simple = require("simple-mock");

describe("DB API", ()=> {
  describe("fileMetadata", ()=> {
    const mockMetadata = {filePath: "path", status: "STALE", version: "1.0.0", token: "tokenabc"};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(mockMetadata),
        insert: simple.stub(),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    afterEach(() => {
      simple.restore();
    });

    it("defines fileMetaData API", ()=> {
      assert(db.fileMetadata);
      assert(db.fileMetadata.get);
      assert(db.fileMetadata.put);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.fileMetadata.get()}, Error);
    });

    it("calling get() with filePath should return metadata", ()=> {
      assert.deepEqual(db.fileMetadata.get("path"), mockMetadata);
    });

    it("calling get() with filePath and field should return field value", ()=> {
      assert.equal(db.fileMetadata.get("path", "version"), mockMetadata.version);
    });

    it("calling put() without required entry throws error", ()=>{
      assert.throws(() => {db.fileMetadata.put()}, Error);
    });

    it("calling put() with entry filePath that doesn't exist in collection should call insert and update", ()=>{
      mockCollection = {
        by: simple.stub().returnWith(),
        insert: simple.stub().returnWith({filePath: "path2"}),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      return db.fileMetadata.put({filePath: "path2", status: "STALE", version: "1.1.0", token: "tokenabc"})
        .then(()=>{
          assert(mockCollection.insert.called);
          assert.deepEqual(mockCollection.insert.lastCall.args[0], {filePath: "path2"});
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path2", status: "STALE", version: "1.1.0", token: "tokenabc"});
        })
    });

    it("calling put() with entry filePath that exists in collection should only call update", ()=>{
      return db.fileMetadata.put({filePath: "path", status: "CURRENT", version: "1.2.0", token: "tokendef"})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path", status: "CURRENT", version: "1.2.0", token: "tokendef"});
        })
    });
  });

  describe("owners", ()=> {
    const mockOwners = {filePath: "path", owners: ["player", "display-control"]};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(mockOwners),
        insert: simple.stub(),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    afterEach(() => {
      simple.restore();
    });

    it("defines owners API", ()=> {
      assert(db.owners);
      assert(db.owners.get);
      assert(db.owners.addToSet);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.owners.get()}, Error);
    });

    it("calling get() with filePath should return file owners", ()=> {
      assert.deepEqual(db.owners.get("path"), mockOwners);
    });

    it("calling addToSet() without required entry throws error", ()=>{
      assert.throws(() => {db.owners.addToSet()}, Error);
    });

    it("calling addToSet() with entry filePath that doesn't exist in collection should call insert and update", ()=>{
      mockCollection = {
        by: simple.stub().returnWith(),
        insert: simple.stub().returnWith({filePath: "path2"}),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      return db.owners.addToSet({filePath: "path2", owner: "module1"})
        .then(()=>{
          assert(mockCollection.insert.called);
          assert.deepEqual(mockCollection.insert.lastCall.args[0], {filePath: "path2"});
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path2", owners: ["module1"]});
        })
    });

    it("calling addToSet() with entry filePath that exists in collection should only call update", ()=>{
      return db.owners.addToSet({filePath: "path", owner: "module1"})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path", owners: ["player", "display-control", "module1"]});
        })
    });
  });

  describe("watchlist", ()=> {
    const mockWatchlist = {filePath: "path", version: "1.0.0"};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(mockWatchlist),
        insert: simple.stub(),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    afterEach(() => {
      simple.restore();
    });

    it("defines watchlist API", ()=> {
      assert(db.watchlist);
      assert(db.watchlist.get);
      assert(db.watchlist.put);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.watchlist.get()}, Error);
    });

    it("calling get() with filePath should return watchlist", ()=> {
      assert.deepEqual(db.watchlist.get("path"), mockWatchlist);
    });

    it("calling get() with filePath and field should return field value", ()=> {
      assert.equal(db.watchlist.get("path", "version"), mockWatchlist.version);
    });

    it("calling put() without required entry throws error", ()=>{
      assert.throws(() => {db.watchlist.put()}, Error);
    });

    it("calling put() with entry filePath that doesn't exist in collection should call insert and update", ()=>{
      mockCollection = {
        by: simple.stub().returnWith(),
        insert: simple.stub().returnWith({filePath: "path2"}),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      return db.watchlist.put({filePath: "path2", version: "1.1.0"})
        .then(()=>{
          assert(mockCollection.insert.called);
          assert.deepEqual(mockCollection.insert.lastCall.args[0], {filePath: "path2"});
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path2", version: "1.1.0"});
        })
    });

    it("calling put() with entry filePath that exists in collection should only call update", ()=>{
      return db.watchlist.put({filePath: "path", version: "1.2.0"})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: "path", version: "1.2.0"});
        })
    });
  });


});
