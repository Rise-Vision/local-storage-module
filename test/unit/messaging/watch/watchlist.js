/* eslint-env mocha */
const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const db = require("../../../../src/db/api");
const watchlist = require("../../../../src/messaging/watch/watchlist");

describe("watchlist - unit", ()=>{

  beforeEach(()=>{
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
  });

  afterEach(() => simple.restore());

  it("requests WATCHLIST-COMPARE", ()=> {
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

    simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

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
