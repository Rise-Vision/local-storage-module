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
    db.watchlist.put({filePath: "bucket/directory/", version: "0"});

    db.owners.put({filePath: "bucket/directory/", owners: ["licensing", "display-control"]});
  }

  it("assigns the owners of the parent directory", () => {
    const subdirFilePath = "bucket/directory/file1";

    fillDatabase();

    return addition.assignOwnersOfParentDirectory({filePath: subdirFilePath})
    .then(() => {
      const item = db.owners.get(subdirFilePath);

      assert(item);
      assert(item.owners);
      assert.deepEqual(item.owners, ["licensing", "display-control"]);
    });
  });

});
