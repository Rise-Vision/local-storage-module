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
        versions: "2"
      }
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    assert.equal(db.fileMetadata.getStale().length, 1);
    assert.equal(db.fileMetadata.getStale()[0].filePath, "my-bucket/my-file");
  });
});
