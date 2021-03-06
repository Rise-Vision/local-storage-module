/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc");
const logger = require("../../../../src/logger");

describe("DELETE - unit", ()=>{

  let messageReceiveHandler = null;

  const mockReceiver = {
    on(evt, handler) {
      if (evt === "message") {
        messageReceiveHandler = handler;
      }
    }
  };

  beforeEach(()=>{
    simple.mock(logger, "file").returnWith();
    simple.mock(commonMessaging, "broadcastMessage").returnWith();
    simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
    simple.mock(commonConfig, "getLocalStoragePath").returnWith("test-local-storage-path/");

    simple.mock(db.fileMetadata, "delete").resolveWith();
    simple.mock(db.watchlist, "setLastChanged").resolveWith();
    simple.mock(db.owners, "delete").resolveWith();
    simple.mock(db.owners, "get").returnWith({owners: ["test"]});
    simple.mock(db.watchlist, "delete").resolveWith();
    simple.mock(broadcastIPC, "broadcast");

    return messaging.init();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("deletes file in all databases and broadcasts FILE-UPDATE with DELETED status", ()=>{
    const msg = {
      topic: "msfileupdate",
      type: "delete",
      from: "messaging-service",
      watchlistLastChanged: 123456,
      filePath: "test-bucket/test-file1"
    };

    return messageReceiveHandler(msg)
      .then(()=>{
        assert(db.fileMetadata.delete.called);
        assert.equal(db.fileMetadata.delete.lastCall.args[0], msg.filePath);

        assert(broadcastIPC.broadcast.called);
        assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
        assert.equal(broadcastIPC.broadcast.lastCall.args[1].filePath, msg.filePath);
        assert.equal(broadcastIPC.broadcast.lastCall.args[1].status, "DELETED");

        assert(db.watchlist.setLastChanged.called);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
  });

  it("deletes file in all databases and broadcasts FILE-UPDATE with DELETED status even if no watchlistLastChanged ( transitional )", ()=>{
    const msg = {
      topic: "msfileupdate",
      type: "delete",
      from: "messaging-service",
      filePath: "test-bucket/test-file1"
    };

    return messageReceiveHandler(msg)
      .then(()=>{
        assert(db.fileMetadata.delete.called);
        assert.equal(db.fileMetadata.delete.lastCall.args[0], msg.filePath);

        assert(broadcastIPC.broadcast.called);
        assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
        assert.equal(broadcastIPC.broadcast.lastCall.args[1].filePath, msg.filePath);
        assert.equal(broadcastIPC.broadcast.lastCall.args[1].status, "DELETED");

        assert(db.watchlist.setLastChanged.called);
        assert(!db.watchlist.setLastChanged.lastCall.args[0]);
      });
  });

});
