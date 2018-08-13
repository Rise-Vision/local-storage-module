/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const add = require("../../../../src/messaging/add/add.js");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc.js");

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

  it("updates file(s) in fileMetadata -> broadcasts FILE UPDATE -> updates file(s) in watchlist", ()=>{
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

    simple.mock(broadcastIPC, "fileUpdate");

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

        assert(broadcastIPC.fileUpdate.called);
        assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
          filePath: msg.filePath,
          status: "STALE",
          version: msg.version
        });

        assert(db.watchlist.setLastChanged.called);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
  });

  it("updates file(s) in fileMetadata -> broadcasts FILE UPDATE -> updates file(s) in watchlist even if no watchlistLastChanged ( transitional )", ()=>{
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

    simple.mock(broadcastIPC, "fileUpdate");

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

        assert(broadcastIPC.fileUpdate.called);
        assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
          filePath: msg.filePath,
          status: "STALE",
          version: msg.version
        });

        assert(db.watchlist.setLastChanged.called);
        assert(!db.watchlist.setLastChanged.lastCall.args[0]);
      });
  });

  it("ensures folder watchers are owners in case a deletion was received previously due to trashing", ()=>{
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

    simple.mock(broadcastIPC, "fileUpdate");
    simple.mock(db.owners, "put").returnWith();
    simple.mock(db.owners, "get").returnWith({owners: ["test-owner"]});

    return messageReceiveHandler(msg)
    .then(()=>{
      console.log(add);
      assert(db.owners.put.called);

      assert.deepEqual(db.owners.put.lastCall.args[0], {
        filePath: msg.filePath,
        owners: ["test-owner"]
      });
    });
  });
});
