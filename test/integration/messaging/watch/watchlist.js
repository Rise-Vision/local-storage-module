/* eslint-env mocha */
/* eslint-disable function-paren-newline, no-magic-numbers, object-property-newline */

const assert = require("assert");
const commonMessaging = require("common-display-module/messaging");
const os = require("os");
const path = require("path");
const {platform} = require("rise-common-electron");
const simple = require("simple-mock");

const database = require("../../../../src/db/lokijs/database");
const db = require("../../../../src/db/api");
const watchlist = require("../../../../src/messaging/watch/watchlist");

const dbSaveInterval = 5;

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
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
  });

  afterEach(()=>{
    simple.restore();

    db.fileMetadata.clear();
    db.owners.clear();
    db.watchlist.clear();
  });

  describe("WATCHLIST-COMPARE", () => {
    it("requests WATCHLIST-COMPARE", () => {
      db.watchlist.setLastChanged(123456);

      watchlist.requestWatchlistCompare();

      assert(commonMessaging.sendToMessagingService.callCount, 1);
      assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
        topic: "WATCHLIST-COMPARE", lastChanged: 123456
      });
    });
  });

  describe("WATCHLIST-RESULT", () => {
    function fillDatabase() {
      db.fileMetadata.put({
        filePath: "bucket/file1", status: "CURRENT", version: "1"
      });
      db.fileMetadata.put({
        filePath: "bucket/file2", status: "CURRENT", version: "2"
      });
      db.fileMetadata.put({
        filePath: "bucket/file3", status: "CURRENT", version: "3"
      });

      db.watchlist.put({filePath: "bucket/file1", version: "1"});
      db.watchlist.put({filePath: "bucket/file2", version: "2"});
      db.watchlist.put({filePath: "bucket/file3", version: "3"});

      db.owners.addToSet({filePath: "bucket/file1", owner: "licensing"});
      db.owners.addToSet({filePath: "bucket/file2", owner: "licensing"});
      db.owners.addToSet({filePath: "bucket/file3", owner: "display-control"});
    }

    it("refreshes the watchlist when there are changes", () => {
      fillDatabase();

      const remoteWatchlist = {
        "bucket/file1": "2",
        "bucket/file2": "3",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        const metaDataList = db.fileMetadata.allEntries()
        .map(({filePath, status, version}) =>
          ({filePath, status, version})
        );

        assert.deepEqual(metaDataList, [
          {
            filePath: "bucket/file1", status: "PENDING", version: "1"
          },
          {
            filePath: "bucket/file2", status: "PENDING", version: "2"
          },
          {
            filePath: "bucket/file3", status: "CURRENT", version: "3"
          }
        ]);

        assert.equal(db.watchlist.lastChanged(), 123456);

        // 2 updates
        assert.equal(commonMessaging.sendToMessagingService.callCount, 2);
        commonMessaging.sendToMessagingService.calls.forEach(call =>{
          const message = call.args[0];

          switch (message.filePath) {
            case "bucket/file1": return assert.equal(message.version, "1");
            case "bucket/file2": return assert.equal(message.version, "2");
            default: assert.fail(message.filePath);
          }
        });
      });
    });

    it("refreshes the watchlist when there are changes and deletions", () => {
      fillDatabase();

      const remoteWatchlist = {
        "bucket/file1": "2",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        const metaDataList = db.fileMetadata.allEntries()
        .map(({filePath, status, version}) =>
          ({filePath, status, version})
        );

        assert.deepEqual(metaDataList, [
          {
            filePath: "bucket/file1", status: "PENDING", version: "1"
          },
          {
            filePath: "bucket/file2", status: "UNKNOWN", version: "2"
          },
          {
            filePath: "bucket/file3", status: "CURRENT", version: "3"
          }
        ]);

        assert.equal(db.watchlist.lastChanged(), 123456);

        // 1 update
        assert.equal(commonMessaging.sendToMessagingService.callCount, 1);
        assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
          filePath: "bucket/file1",
          version: "1"
        });
      });
    });

    it("refreshes the watchlist when there are no changes", () => {
      fillDatabase();

      const remoteWatchlist = {
        "bucket/file1": "1",
        "bucket/file2": "2",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        const metaDataList = db.fileMetadata.allEntries()
        .map(({filePath, status, version}) =>
          ({filePath, status, version})
        );

        assert.deepEqual(metaDataList, [
          {
            filePath: "bucket/file1", status: "CURRENT", version: "1"
          },
          {
            filePath: "bucket/file2", status: "CURRENT", version: "2"
          },
          {
            filePath: "bucket/file3", status: "CURRENT", version: "3"
          }
        ]);

        assert.equal(db.watchlist.lastChanged(), 123456);

        // no updates
        assert.equal(commonMessaging.sendToMessagingService.callCount, 0);
      });
    });

    it("does not refresh anything if there is no remote watchlist provided", () => {
      fillDatabase();

      return watchlist.refresh({}, 123456)
      .then(() => {
        const metaDataList = db.fileMetadata.allEntries()
        .map(({filePath, status, version}) =>
          ({filePath, status, version})
        );

        assert.deepEqual(metaDataList, [
          {
            filePath: "bucket/file1", status: "CURRENT", version: "1"
          },
          {
            filePath: "bucket/file2", status: "CURRENT", version: "2"
          },
          {
            filePath: "bucket/file3", status: "CURRENT", version: "3"
          }
        ]);

        // last changed not updated in this scenario
        assert.equal(db.watchlist.lastChanged(), 0);

        // no updates
        assert.equal(commonMessaging.sendToMessagingService.callCount, 0);
      });
    });
  });

});
