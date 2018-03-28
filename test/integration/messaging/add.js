/* eslint-env mocha */

const assert = require("assert");
const commonMessaging = require("common-display-module/messaging");
const os = require("os");
const path = require("path");
const {platform} = require("rise-common-electron");
const simple = require("simple-mock");

const database = require("../../../src/db/lokijs/database");
const db = require("../../../src/db/api");
const addition = require("../../../src/messaging/add/add");

const dbSaveInterval = 5;

describe("ADD - integration", ()=>{
  before(()=>{
    const tempDBPath = path.join(os.tmpdir(), "local-storage");

    return platform.mkdirRecursively(tempDBPath)
    .then(()=>{
      return database.start(os.tmpdir(), dbSaveInterval);
    })
    .then(()=>{
      return new Promise(res=>setTimeout(()=>{
        res();
      }, dbSaveInterval * dbSaveInterval));
    });
  });

  after(()=>{
    database.destroy();
    database.close();
  });

  beforeEach(()=>{
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
  });

  afterEach(()=>{
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  function fillDatabase() {
    db.owners.put({filePath: "bucket/directory/", owners: ["licensing", "display-control"]});
  }

  it("assigns the owners of the parent directory", () => {
    const filePath = "bucket/directory/file1";

    fillDatabase();

    addition.assignOwnersOfParentDirectory({filePath});

    const item = db.owners.get(filePath);

    assert(item);
    assert(item.owners);
    assert.deepEqual(item.owners, ["licensing", "display-control"]);
  });

  it("fails if there is no owner registered for parent directory", () => {
    const filePath = "bucket/directory/file1";

    assert.throws(() => addition.assignOwnersOfParentDirectory({filePath}), Error);
  });

  it("adds a file to the database", () => {
    const filePath = "bucket/directory/file1";

    fillDatabase();

    const token = {
      data: {
        timestamp: Date.now(),
        filePath,
        displayId: "ls-test-id"
      },
      hash: "abc123"
    };

    return addition.process({
      topic: "msfileupdate",
      type: "add",
      filePath,
      watchlistLastChanged: "123456",
      version: "test-version-updated",
      token
    })
    .then(() => {
      const metaData = db.fileMetadata.get(filePath);

      assert(metaData);
      assert.equal(metaData.version, "test-version-updated");
      assert.equal(metaData.status, "STALE");
      assert.deepEqual(metaData.token, token);
      assert.equal(db.watchlist.lastChanged(), "123456");

      assert.equal(db.watchlist.get(filePath).version, "test-version-updated");

      const item = db.owners.get(filePath);

      assert(item);
      assert(item.owners);
      assert.deepEqual(item.owners, ["licensing", "display-control"]);
    });
  });

});
