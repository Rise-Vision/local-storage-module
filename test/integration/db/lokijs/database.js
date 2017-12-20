/* eslint-env mocha */
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
