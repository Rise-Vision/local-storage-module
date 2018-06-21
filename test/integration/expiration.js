/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const database = require("../../src/db/lokijs/database");
const db = require("../../src/db/api");
const expiration = require("../../src/expiration");
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
  })

  afterEach(() => {
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  it("doesn't expire entries if they haven't gone stale", ()=>{
    const testEntries = [
      {filePath: "a.txt", status: "STALE", version: "1"},
      {filePath: "b.txt", status: "CURRENT", watchSequence: 1},
      {filePath: "c.txt", status: "CURRENT", watchSequence: 1}
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    db.fileMetadata.put(testEntries[2]);

    return expiration.cleanExpired()
    .then(() => {
      assert.equal(expiration.clean.callCount, 0);
    });
  });

  it("expires file entries if they have gone stale", ()=>{
    const testEntries = [
      {filePath: "a.txt", status: "STALE", version: "1"},
      {filePath: "b.txt", status: "CURRENT", watchSequence: 1},
      {filePath: "c.txt", status: "CURRENT", watchSequence: 1}
    ];

    db.fileMetadata.put(testEntries[0]);
    db.fileMetadata.put(testEntries[1]);
    db.fileMetadata.put(testEntries[2]);

    Array(5).fill().forEach(db.watchlist.increaseRuntimeSequence);

    return expiration.cleanExpired()
    .then(() => {
      assert.equal(expiration.clean.callCount, 2);
    });
  });

});
