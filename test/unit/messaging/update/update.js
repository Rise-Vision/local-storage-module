/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");

describe("UPDATE - unit", ()=>{

  let messageReceiveHandler = null;

  const mockReceiver = {
    on(evt, handler) {
      if (evt === "message") {
        messageReceiveHandler = handler;
      }
    }
  };

  beforeEach(()=>{
    simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
    simple.mock(commonConfig, "getLocalStoragePath").returnWith("test-local-storage-path/");

    simple.mock(db.fileMetadata, "put").resolveWith();
    simple.mock(db.watchlist, "setLastChanged").resolveWith();
    simple.mock(db.watchlist, "put").resolveWith();
    simple.mock(log, "file").returnWith();

    return messaging.init();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("updates file(s) in fileMetadata -> updates file(s) in watchlist", ()=>{
    const msg = {
      topic: "msfileupdate",
      type: "update",
      from: "messaging-service",
      filePath: "test-bucket/test-file1",
      watchlistLastChanged: 123456,
      version: "2.1.0",
      token: {
        hash: "abc123",
        data: {
          displayId: "test-display",
          date: Date.now(),
          filePath: "test-bucket/test-file1"
        }
      }
    };

    return messageReceiveHandler(msg)
      .then(()=>{
        assert(db.fileMetadata.put.called);
        assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
          filePath: msg.filePath,
          version: msg.version,
          status: "STALE",
          token: msg.token
        });

        assert(db.watchlist.put.called);
        assert.deepEqual(db.watchlist.put.lastCall.args[0], {
          filePath: msg.filePath,
          version: msg.version,
          status: "STALE",
          token: msg.token
        });

        assert(db.watchlist.setLastChanged.called);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
  });

  it("updates file(s) in fileMetadata -> updates file(s) in watchlist even if no watchlistLastChanged ( transitional )", ()=>{
    const msg = {
      topic: "msfileupdate",
      type: "update",
      from: "messaging-service",
      filePath: "test-bucket/test-file1",
      version: "2.1.0",
      token: {
        hash: "abc123",
        data: {
          displayId: "test-display",
          date: Date.now(),
          filePath: "test-bucket/test-file1"
        }
      }
    };

    return messageReceiveHandler(msg)
      .then(()=>{
        assert(db.fileMetadata.put.called);
        assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
          filePath: msg.filePath,
          version: msg.version,
          status: "STALE",
          token: msg.token
        });

        assert(db.watchlist.put.called);
        assert.deepEqual(db.watchlist.put.lastCall.args[0], {
          filePath: msg.filePath,
          version: msg.version,
          status: "STALE",
          token: msg.token
        });

        assert(db.watchlist.setLastChanged.called);
        assert(!db.watchlist.setLastChanged.lastCall.args[0]);
      });
  });

});
