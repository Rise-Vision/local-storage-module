/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const database = require("../../../src/db/lokijs/database");
const db = require("../../../src/db/api");
const simple = require("simple-mock");

describe("DB API: Unit", ()=> {

  afterEach(() => {
    simple.restore();
  });

  describe("fileMeta.getdata", ()=> {
    const filePath = "test-path";
    const date = Date.now();
    const token = {
      hash: "abc123",
      data: {
        displayId: "ls-test-id",
        date,
        filePath
      }
    };
    const mockMetadata = {filePath, status: "STALE", version: "1.0.0", token};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(JSON.parse(JSON.stringify(mockMetadata))),
        insert: simple.stub(),
        update: simple.stub().returnWith(),
        remove: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    it("defines fileMetaData API", ()=> {
      assert(db.fileMetadata);
      assert(db.fileMetadata.get);
      assert(db.fileMetadata.put);
      assert(db.fileMetadata.delete);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.fileMetadata.get()}, Error);
    });

    it("calling get() with filePath should return metadata", ()=> {
      assert.deepEqual(db.fileMetadata.get(filePath), mockMetadata);
    });

    it("calling get() with filePath and field should return field value", ()=> {
      assert.equal(db.fileMetadata.get(filePath, "version"), mockMetadata.version);
    });

    it("calling put() without required entry throws error", ()=>{
      assert.throws(() => {db.fileMetadata.put()}, Error);
    });

    it("returns compares filePath supplied version against version in metadata", ()=>{
      mockCollection = {
        by: simple.stub().returnWith({filePath, version: "99"})
      }

      simple.mock(database, "getCollection").returnWith(mockCollection);

      assert(db.fileMetadata.isVersionMismatch(filePath, "98"));
      assert(!db.fileMetadata.isVersionMismatch(filePath, "99"));
    });

    it("calling put() with entry filePath that doesn't exist in collection should call insert and update", ()=>{
      const filePath2 = "test-path-2";
      mockCollection = {
        by: simple.stub().returnWith(),
        insert: simple.stub().returnWith({filePath: filePath2}),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      return db.fileMetadata.put({filePath: filePath2, status: "STALE", version: "1.1.0", token})
        .then(()=>{
          assert(mockCollection.insert.called);
          assert.deepEqual(mockCollection.insert.lastCall.args[0], {filePath: filePath2});
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath: filePath2, status: "STALE", version: "1.1.0", token});
        })
    });

    it("calling put() with entry filePath that exists in collection should only call update", ()=>{
      const tokenUpdated = {
        hash: "def456",
        data: {
          displayId: "ls-test-id",
          date,
          filePath
        }
      };

      return db.fileMetadata.put({filePath, status: "CURRENT", version: "1.2.0", token: tokenUpdated})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath, status: "CURRENT", version: "1.2.0", token: tokenUpdated});
        })
    });

    it("calling delete() without required filePath throws error", ()=>{
      assert.throws(() => {db.fileMetadata.delete()}, Error);
    });

    it("calling delete() with filePath should remove the item from the db", ()=>{
      return db.fileMetadata.delete(filePath)
        .then(()=>{
          assert(mockCollection.remove.called);
          assert.deepEqual(mockCollection.remove.lastCall.args[0], {filePath, status: "STALE", version: "1.0.0", token});
        });
    });
  });

  describe("owners", ()=> {
    const filePath = "test-path";
    const mockOwners = {filePath, owners: ["player", "display-control"]};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(JSON.parse(JSON.stringify(mockOwners))),
        insert: simple.stub(),
        update: simple.stub().returnWith(),
        remove: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    it("defines owners API", ()=> {
      assert(db.owners);
      assert(db.owners.get);
      assert(db.owners.addToSet);
      assert(db.owners.delete);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.owners.get()}, Error);
    });

    it("calling get() with filePath should return file owners", ()=> {
      assert.deepEqual(db.owners.get(filePath), mockOwners);
    });

    it("calling put() without required entry throws error", ()=>{
      assert.throws(() => {db.owners.put()}, Error);
    });

    it("calling put() with entry filePath that doesn't exist in collection should call insert and update", ()=>{
      mockCollection = {
        by: simple.stub().returnWith(),
        insert: simple.stub().callFn(arg => Object.assign({}, arg)),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      db.owners.put({filePath: "path2", owners: ["module1", "module2"]});

      assert(mockCollection.insert.called);
      assert.deepEqual(mockCollection.insert.lastCall.args[0], {
        filePath: "path2"
      });

      assert(mockCollection.update.called);
      assert.deepEqual(mockCollection.update.lastCall.args[0], {
        filePath: "path2", owners: ["module1", "module2"]
      });
    });

    it("calling put() with entry filePath that exists in collection should call update", ()=>{
      mockCollection = {
        by: simple.stub().returnWith({filePath: "path2"}),
        insert: simple.stub().returnWith(),
        update: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);

      db.owners.put({filePath: "path2", owners: ["module1", "module2"]});

      assert(!mockCollection.insert.called);

      assert(mockCollection.update.called);
      assert.deepEqual(mockCollection.update.lastCall.args[0], {
        filePath: "path2", owners: ["module1", "module2"]
      });
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
      return db.owners.addToSet({filePath, owner: "module1"})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath, owners: ["player", "display-control", "module1"]});
        })
    });

    it("calling delete() without required filePath throws error", ()=>{
      assert.throws(() => {db.owners.delete()}, Error);
    });

    it("calling delete() with filePath should remove the item from the db", ()=>{
      return db.owners.delete(filePath)
        .then(()=>{
          assert(mockCollection.remove.called);
          assert.deepEqual(mockCollection.remove.lastCall.args[0], {filePath, owners: ["player", "display-control"]});
        });
    });
  });

  describe("watchlist", ()=> {
    const filePath = "path";
    const mockWatchlist = {filePath, version: "1.0.0"};

    let mockCollection = null;

    beforeEach(() => {
      mockCollection = {
        by: simple.stub().returnWith(JSON.parse(JSON.stringify(mockWatchlist))),
        find: simple.stub().returnWith([]),
        findAndUpdate: simple.stub().returnWith(),
        insert: simple.stub().callFn(entry => entry),
        update: simple.stub().returnWith(),
        remove: simple.stub().returnWith()
      };

      simple.mock(database, "getCollection").returnWith(mockCollection);
    });

    it("defines watchlist API", ()=> {
      assert(db.watchlist);
      assert(db.watchlist.get);
      assert(db.watchlist.put);
      assert(db.watchlist.delete);
      assert(db.watchlist.lastChanged);
      assert(db.watchlist.setLastChanged);
    });

    it("calling get() without required filePath throws error", ()=>{
      assert.throws(() => {db.watchlist.get()}, Error);
    });

    it("calling get() with filePath should return watchlist", ()=> {
      assert.deepEqual(db.watchlist.get(filePath), mockWatchlist);
    });

    it("calling get() with filePath and field should return field value", ()=> {
      assert.equal(db.watchlist.get(filePath, "version"), mockWatchlist.version);
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
      return db.watchlist.put({filePath, version: "1.2.0"})
        .then(()=>{
          assert.equal(mockCollection.insert.callCount, 0);
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {filePath, version: "1.2.0"});
        })
    });

    it("calling delete() without required filePath throws error", ()=>{
      assert.throws(() => {db.watchlist.delete()}, Error);
    });

    it("calling delete() with filePath should remove the item from the db", ()=>{
      return db.watchlist.delete(filePath)
        .then(()=>{
          assert(mockCollection.remove.called);
          assert.deepEqual(mockCollection.remove.lastCall.args[0], {filePath, version: "1.0.0"});
        });
    });

    describe("lastChanged", () => {
      it("gets default lastChanged value as 0", ()=> {
        const defaultValue = db.watchlist.lastChanged();

        assert.equal(defaultValue, "0");
      });

      it("sets lastChanged value", ()=> {
        db.watchlist.setLastChanged("1000");

        assert.equal(mockCollection.findAndUpdate.callCount, 1);
        assert.deepEqual(mockCollection.findAndUpdate.lastCall.args[1]({}), {
          lastChanged: "1000", runtimeSequence: 1
        });
      });

      it("doesn't let change lastChanged to a value less that its current one", ()=> {
        simple.mock(db.watchlist, "lastChanged").returnWith(1000);

        db.watchlist.setLastChanged("100");

        assert(!mockCollection.findAndUpdate.called);
      });
    });

    describe("runtimeSequence", () => {
      it("gets default runtimeSequence value as 1", ()=> {
        const defaultValue = db.watchlist.runtimeSequence();

        assert.equal(defaultValue, 1);
      });

      it("increases runtimeSequence value", ()=> {
        db.watchlist.increaseRuntimeSequence();

        assert.equal(mockCollection.findAndUpdate.callCount, 1);
        assert.deepEqual(mockCollection.findAndUpdate.lastCall.args[1]({}), {
          lastChanged: "0", runtimeSequence: 2
        });
      });

      it("updates watchSequence", ()=> {
        return db.fileMetadata.updateWatchSequence('test-path')
        .then(() => {
          assert(mockCollection.update.called);
          assert.deepEqual(mockCollection.update.lastCall.args[0], {
            filePath: "test-path", version: "1.0.0", watchSequence: 1
          });
        });
      });
    });

  });
});
