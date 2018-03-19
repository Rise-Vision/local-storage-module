/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const commonMessaging = require("common-display-module/messaging");
const os = require("os");
const path = require("path");
const {platform} = require("rise-common-electron");
const simple = require("simple-mock");

const broadcastIPC = require("../../../../src/messaging/broadcast-ipc");
const database = require("../../../../src/db/lokijs/database");
const db = require("../../../../src/db/api");
const watchlist = require("../../../../src/messaging/watch/watchlist");

const dbSaveInterval = 5;

global.log = {file: ()=>{}, debug: ()=>{}, error: ()=>{}, all: () => {}};

describe("watchlist - integration", ()=>{
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
    simple.mock(broadcastIPC, "fileUpdate").returnWith();
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
  });

  afterEach(()=>{
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  it("requests WATCHLIST-COMPARE", () => {
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

    watchlist.requestWatchlistCompare();

    assert(commonMessaging.sendToMessagingService.callCount, 1);
    assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
      topic: "WATCHLIST-COMPARE",
      watchlist: [
        {
          filePath: "my-bucket/my-file",
          version: "1"
        },
        {
          filePath: "my-bucket/my-other-file",
          version: "2"
        }
      ]
    });
  });

  it("requests status for all filepaths updated", () => {
    db.fileMetadata.put({
      filePath: "bucket/file1", status: "CURRENT", version: "1"
    });
    db.fileMetadata.put({
      filePath: "bucket/file2", status: "CURRENT", version: "2"
    });
    db.fileMetadata.put({
      filePath: "bucket/file3", status: "CURRENT", version: "3"
    });

    db.owners.addToSet({filePath: "bucket/file1", owner: "licensing"});
    db.owners.addToSet({filePath: "bucket/file2", owner: "licensing"});
    db.owners.addToSet({filePath: "bucket/file3", owner: "display-control"});

    const updated = ["bucket/file1", "bucket/file3"];

    return watchlist.updateFilesStatusAndRequestUpdatedFiles(updated)
    .then(() => {
      assert(!broadcastIPC.fileUpdate.called);
      assert.equal(commonMessaging.sendToMessagingService.callCount, 2);

      commonMessaging.sendToMessagingService.calls.forEach(call => {
        const message = call.args[0];

        assert(typeof message === 'object');

        switch (message.filePath) {
          case "bucket/file1": return assert.equal(message.version, "1");
          case "bucket/file3": return assert.equal(message.version, "3");
          default: assert.fail(message.filePath);
        }
      });

      {
        const metaData = db.fileMetadata.get("bucket/file1");
        assert.equal(metaData.filePath, "bucket/file1");
        assert.equal(metaData.status, "PENDING");
        assert.equal(metaData.version, "1");
      }

      {
        const metaData = db.fileMetadata.get("bucket/file2");
        assert.equal(metaData.filePath, "bucket/file2");
        assert.equal(metaData.status, "CURRENT");
        assert.equal(metaData.version, "2");
      }

      {
        const metaData = db.fileMetadata.get("bucket/file3");
        assert.equal(metaData.filePath, "bucket/file3");
        assert.equal(metaData.status, "PENDING");
        assert.equal(metaData.version, "3");
      }
    });
  });
});
