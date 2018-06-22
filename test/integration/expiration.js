/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const database = require("../../src/db/lokijs/database");
const db = require("../../src/db/api");
const expiration = require("../../src/expiration");
const fileSystem = require("../../src/files/file-system");
const path = require("path");
const {platform} = require("rise-common-electron");
const os = require("os");
const simple = require("simple-mock");
const dbSaveInterval = 5;

describe("expiration - integration", () => {
  before(() => {
    const tempDBPath = path.join(os.tmpdir(), "local-storage");

    return platform.mkdirRecursively(tempDBPath)
    .then(() => {
      return database.start(os.tmpdir(), dbSaveInterval);
    })
    .then(() => {
      return new Promise(res=>setTimeout(()=>{
        assert(platform.fileExists(path.join(tempDBPath, "local-storage.db")));
        res();
      }, dbSaveInterval * dbSaveInterval));
    });
  });

  after(() => {
    database.destroy();
    database.close();
  });

  beforeEach(() => {
    simple.mock(expiration, "clean").resolveWith();
    simple.mock(fileSystem, "removeCacheFile").resolveWith();
  })

  afterEach(() => {
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  it("doesn't expire entries if their watchSequence is current", ()=>{
    const testEntries = [
      {filePath: "a.txt", status: "STALE", version: "1.1"},
      {filePath: "b.txt", status: "CURRENT", watchSequence: 1, version: "1.1"},
      {filePath: "folder/", watchSequence: 1, version: "1.1"}
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    db.fileMetadata.put(testEntries[2]);
    db.watchlist.put(testEntries[0]);
    db.watchlist.put(testEntries[1]);
    db.watchlist.put(testEntries[2]);

    return expiration.cleanExpired()
    .then(() => {
      assert.equal(db.fileMetadata.allEntries().length, 3);
      assert.equal(db.watchlist.allEntries().length, 3);
      assert(!fileSystem.removeCacheFile.called);
    });
  });

  it("expires file entries if their watchSequence is too old", ()=>{
    const testEntries = [
      {filePath: "a.txt", status: "STALE", version: "1.1"},
      {filePath: "b.txt", status: "CURRENT", watchSequence: 1, version: "1.1"},
      {filePath: "c.txt", status: "CURRENT", watchSequence: 1, version: "1.1"}
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    db.fileMetadata.put(testEntries[2]);
    db.watchlist.put(testEntries[0]);
    db.watchlist.put(testEntries[1]);
    db.watchlist.put(testEntries[2]);

    Array(5).fill().forEach(db.watchlist.increaseRuntimeSequence);

    return expiration.cleanExpired()
    .then(() => {
      const metadataEntries = db.fileMetadata.allEntries();
      assert.equal(metadataEntries.length, 1);
      assert.equal(metadataEntries[0].filePath, "a.txt");

      const watchlistEntries = db.watchlist.allEntries();
      assert.equal(watchlistEntries.length, 1);
      assert.equal(watchlistEntries[0].filePath, "a.txt");

      assert.equal(fileSystem.removeCacheFile.callCount, 2);
      fileSystem.removeCacheFile.calls.forEach(call => {
        const filePath = call.args[0];
        const version = call.args[1];

        assert(['b.txt', 'c.txt'].includes(filePath));
        assert.equal(version, "1.1");
      });
    });
  });

  it("expires folder entries if their watchSequence is too old", ()=>{
    const testEntries = [
      {filePath: "a.txt", status: "STALE", version: "1.1"},
      {filePath: "folder/", watchSequence: 1},
      {filePath: "folder/b.txt", status: "CURRENT", version: "1.1"},
      {filePath: "folder/c.txt", status: "CURRENT", version: "1.1"}
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    db.fileMetadata.put(testEntries[2]);
    db.fileMetadata.put(testEntries[3]);
    db.watchlist.put(testEntries[0]);
    db.watchlist.put(testEntries[1]);
    db.watchlist.put(testEntries[2]);
    db.watchlist.put(testEntries[3]);

    Array(5).fill().forEach(db.watchlist.increaseRuntimeSequence);

    return expiration.cleanExpired()
    .then(() => {
      const metadataEntries = db.fileMetadata.allEntries();
      assert.equal(metadataEntries.length, 1);
      assert.equal(metadataEntries[0].filePath, "a.txt");

      const watchlistEntries = db.watchlist.allEntries();
      assert.equal(watchlistEntries.length, 1);
      assert.equal(watchlistEntries[0].filePath, "a.txt");

      assert.equal(fileSystem.removeCacheFile.callCount, 2);
      fileSystem.removeCacheFile.calls.forEach(call => {
        const filePath = call.args[0];
        const version = call.args[1];

        assert(['folder/b.txt', 'folder/c.txt'].includes(filePath));
        assert.equal(version, "1.1");
      });
    });
  });

});
