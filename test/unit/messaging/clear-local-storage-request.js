/* eslint-env mocha */

const clearLocalStorage = require("../../../src/messaging/clear-local-storage-request");
const assert = require("assert");
const db = require("../../../src/db/api");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");
const logger = require("../../../src/logger");

describe("CLEAR-LOCAL-STORAGE-REQUEST - unit", ()=>{

  beforeEach(()=>{
    simple.mock(logger, "all").returnWith();
    simple.mock(commonMessaging, "broadcastMessage").returnWith();

    simple.mock(db.fileMetadata, "clear").resolveWith();
    simple.mock(db.watchlist, "clear").resolveWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("clears DB", ()=>{
    clearLocalStorage.process();

    assert(db.fileMetadata.clear.called);
    assert(db.watchlist.clear.called);
    assert(commonMessaging.broadcastMessage.called);
  });

});
