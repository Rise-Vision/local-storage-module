/* eslint-env mocha */
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
});
