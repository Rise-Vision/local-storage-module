/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

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
    simple.mock(db.lastChanged, "get").returnWith(123456);

    watchlist.requestWatchlistCompare();

    assert(commonMessaging.sendToMessagingService.callCount, 1);
    assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
      topic: "WATCHLIST-COMPARE", lastChanged: 123456
    });
  });

});
