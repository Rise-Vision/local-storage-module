/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const database = require("../../../../src/db/lokijs/database");
const db = require("../../../../src/db/api");
const path = require("path");
const {platform} = require("rise-common-electron");
const os = require("os");
const simple = require("simple-mock");
const dbSaveInterval = 5;

describe("lokijs - integration", ()=>{
  before(()=>{
    const tempDBPath = path.join(os.tmpdir(), "local-storage");

    return platform.mkdirRecursively(tempDBPath)
    .then(()=>{
      return database.start(os.tmpdir(), dbSaveInterval);
    })
    .then(()=>{
      return new Promise(res=>setTimeout(()=>{
        assert(platform.fileExists(path.join(tempDBPath, "local-storage.db")));
        res();
      }, dbSaveInterval * dbSaveInterval));
    });
  });

  after(()=>{
    database.destroy();
    database.close();
  });

  afterEach(()=>{
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  describe("fileMetadata", () => {
    it("retrieves STALE entries", ()=>{
      const testEntries = [
        {
          filePath: "my-bucket/my-file",
          status: "STALE",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          status: "CURRENT",
          version: "2"
        }
      ];

      db.fileMetadata.put(testEntries[0]);
      db.fileMetadata.put(testEntries[1]);
      assert.equal(db.fileMetadata.getStale().length, 1);
      assert.equal(db.fileMetadata.getStale()[0].filePath, "my-bucket/my-file");
    });

    it("updates all entries with new field values", ()=>{
      const testEntries = [
        {
          filePath: "my-bucket/my-file",
          status: "STALE",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          status: "CURRENT",
          version: "2"
        }
      ];

      db.fileMetadata.put(testEntries[0]);
      db.fileMetadata.put(testEntries[1]);

      db.fileMetadata.setAll({status: "UNKNOWN"});
      assert.deepEqual(db.fileMetadata.allEntries()[0].filePath, "my-bucket/my-file");
      assert.deepEqual(db.fileMetadata.allEntries()[0].status, "UNKNOWN");
      assert.deepEqual(db.fileMetadata.allEntries()[1].filePath, "my-bucket/my-other-file");
      assert.deepEqual(db.fileMetadata.allEntries()[1].status, "UNKNOWN");
    });

    it("finds all entries with watchSequence assigned", ()=>{
      const testEntries = [
        {
          filePath: "my-bucket/my-file",
          status: "STALE",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          status: "CURRENT",
          watchSequence: 1
        },
        {
          filePath: "my-bucket/my-last-file",
          status: "CURRENT",
          watchSequence: 23
        }
      ];

      db.fileMetadata.put(testEntries[0]);
      db.fileMetadata.put(testEntries[1]);
      db.fileMetadata.put(testEntries[2]);

      const entries = db.fileMetadata.find({watchSequence: {"$gt": 0}});
      assert.equal(entries.length, 2);

      entries.forEach(entry => assert(entry.watchSequence));

      const all = db.fileMetadata.allEntries();
      assert.equal(all.length, 3);
    });
  });

  describe("watchlist", () => {
    it("retrieves all WATCH entries", ()=>{
      const testEntries = [
        {
          filePath: "my-bucket/my-file",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          version: "2"
        }
      ];

      db.watchlist.put(testEntries[0]);
      db.watchlist.put(testEntries[1]);
      assert.deepEqual(db.watchlist.allEntries()[0].filePath, "my-bucket/my-file");
      assert.deepEqual(db.watchlist.allEntries()[0].version, "1");
      assert.deepEqual(db.watchlist.allEntries()[1].filePath, "my-bucket/my-other-file");
      assert.deepEqual(db.watchlist.allEntries()[1].version, "2");
    });
  });

  describe("owners", () => {
    it("adds owners", ()=>{
      const filePath = "my-bucket/my-file";
      db.owners.addToSet({filePath, owner: "test-owner"});
      assert(db.owners.get(filePath).owners.includes("test-owner"));
    });

    it("puts owners", ()=>{
      const filePath = "my-bucket/my-file";

      db.owners.put({filePath, owners: ["module1", "module2"]});
      assert.deepEqual(db.owners.get(filePath).owners, ["module1", "module2"]);

      db.owners.put({filePath, owners: ["module3"]});
      assert.deepEqual(db.owners.get(filePath).owners, ["module3"]);
    });
  });

  describe("lastChanged", () => {
    it("returns a default last changed value", ()=>{
      const defaultValue = db.watchlist.lastChanged();

      assert.equal(defaultValue, '0');
    });

    it("sets the last changed value", ()=>{
      db.watchlist.setLastChanged("123456");

      const lastChanged = db.watchlist.lastChanged();

      assert.equal(lastChanged, "123456");
    });

    it("sets the last changed value as undefined", ()=>{
      db.watchlist.setLastChanged();

      const lastChanged = db.watchlist.lastChanged();

      assert.equal(lastChanged, '0');
    });

    it("doesn't let to set lastChanged value to a less value than its current value", ()=>{
      db.watchlist.setLastChanged("123456");
      db.watchlist.setLastChanged("12345");
      db.watchlist.setLastChanged("1234");
      db.watchlist.setLastChanged("34");

      const lastChanged = db.watchlist.lastChanged();

      assert.equal(lastChanged, "123456");
    });
  });

  describe("runtimeSequence", () => {
    it("returns a default runtime sequence value", ()=>{
      const defaultValue = db.watchlist.runtimeSequence();

      assert.equal(defaultValue, 1);
    });

    it("increases the runtime sequence value", () => {
      db.watchlist.increaseRuntimeSequence();

      const runtimeSequence = db.watchlist.runtimeSequence();

      assert.equal(runtimeSequence, 2);
    });

    it("does not indicate a metadata entry should be expired if it doesn't have a watchSequence field", () => {
      const shouldBeExpired = db.watchlist.shouldBeExpired({});

      assert(!shouldBeExpired);
    });

    it("does not indicate a metadata entry should be expired if its watchSequence field value is close to the runtime sequence value", () => {
      db.watchlist.increaseRuntimeSequence();

      const shouldBeExpired = db.watchlist.shouldBeExpired({watchSequence: 1});

      assert(!shouldBeExpired);
    });

    it("indicates a metadata entry should be expired if its watchSequence field value is MAX_EXPIRE_COUNT less than the runtime sequence value", () => {
      Array(5).fill().forEach(db.watchlist.increaseRuntimeSequence);

      const shouldBeExpired = db.watchlist.shouldBeExpired({watchSequence: 1});

      assert(shouldBeExpired);
    });

    it("updates watchSequence", ()=>{
      const filePath = 'my-bucket/my-file';
      const testEntry = {
        filePath, status: "STALE", version: "1"
      };

      return db.fileMetadata.put(testEntry)
      .then(() => db.fileMetadata.updateWatchSequence(filePath))
      .then(() => {
        const sequence = db.fileMetadata.get(filePath, 'watchSequence');

        assert.equal(sequence, 1);
      });
    });

    it("throws an error if it tries to update a watch sequence over a non registered filePath", ()=>{
      const filePath = 'my-bucket/my-file';

      return db.fileMetadata.updateWatchSequence(filePath)
      .then(() => assert.fail())
      .catch(() => {});
    });

  });

  describe("all data", () => {
    it("deletes all data for a given filePath", () => {
      db.fileMetadata.put({
        filePath: "my-bucket/my-file",
        status: "STALE",
        version: "1"
      });
      db.fileMetadata.put({
        filePath: "my-bucket/my-other-file",
        status: "CURRENT",
        version: "2"
      });
      db.watchlist.put({
        filePath: "my-bucket/my-file",
        version: "1"
      });
      db.watchlist.put({
        filePath: "my-bucket/my-other-file",
        version: "2"
      });
      db.owners.put({filePath: "my-bucket/my-file", owners: ["module1"]});
      db.owners.put({filePath: "my-bucket/my-other-file", owners: ["module1"]});

      return db.deleteAllDataFor("my-bucket/my-file")
      .then(() => {
        assert.equal(db.fileMetadata.allEntries().length, 1);
        assert.equal(db.owners.allEntries().length, 1);
        assert.equal(db.watchlist.allEntries().length, 1);
      });
    });
  });

});
