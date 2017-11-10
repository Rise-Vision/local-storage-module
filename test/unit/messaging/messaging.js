/* eslint-env mocha */
/* eslint-disable max-statements */
const messaging = require("../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");

describe("Messaging", ()=>{

  describe("WATCH", ()=> {
    let messageReceiveHandler = null;

    const mockReceiver = {
      on(evt, handler) {
        if (evt === "message") {
          messageReceiveHandler = handler;
        }
      }
    };

    beforeEach(()=>{
      simple.mock(commonConfig, "sendToMessagingService").returnWith();
      simple.mock(commonConfig, "getLocalStoragePath").returnWith("");
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("adds to owners list -> broadcasts FILEUPDATE -> does not call remote watch, when local file is STALE", ()=> {
      const mockMetadata = {
        status: "STALE",
        version: "1.0.0"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.owners, "addToSet").resolveWith();
      simple.mock(broadcastIPC, "broadcast");

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: "test-bucket/test-file"
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `create-dir-structure-for-${msg.filePath}`,
            status: mockMetadata.status,
            version: mockMetadata.version
          });

          assert.equal(commonConfig.sendToMessagingService.callCount, 0);
        });
    });

    it("adds to owners list -> broadcasts FILEUPDATE -> does not call remote watch, when local file is CURRENT", ()=> {
      const mockMetadata = {
        status: "CURRENT",
        version: "1.0.0"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.owners, "addToSet").resolveWith();
      simple.mock(broadcastIPC, "broadcast");

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: "test-bucket/test-file"
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `create-dir-structure-for-${msg.filePath}`,
            status: mockMetadata.status,
            version: mockMetadata.version
          });

          assert.equal(commonConfig.sendToMessagingService.callCount, 0);
        });
    });

    it("calls remote watch when the local file is not present", ()=>{
      const mockMetadata = {};

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: "test-bucket/test-file"
      };

      messageReceiveHandler(msg);
      assert(commonConfig.sendToMessagingService.called);
    });

    it("calls remote watch when the local file state is UNKNOWN", ()=>{
      const mockMetadata = {
        status: "UNKNOWN"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: "test-bucket/test-file"
      };

      messageReceiveHandler(msg);
      assert(commonConfig.sendToMessagingService.called);
    });
  });

  describe("WATCH-RESULT", ()=>{
    let messageReceiveHandler = null;

    const mockReceiver = {
      on(evt, handler) {
        if (evt === "message") {
          messageReceiveHandler = handler;
        }
      }
    };

    beforeEach(()=>{
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(commonConfig, "getLocalStoragePath").returnWith("");

      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.watchlist, "put").resolveWith();
      simple.mock(broadcastIPC, "broadcast");

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("determines file status to be CURRENT when no token provided in message", ()=>{
      const msg = {
        topic: "watch-result",
        from: "test-module",
        filePath: "test-bucket/test-file",
        version: "1.0.0"
      };


      return messageReceiveHandler(msg)
        .then(()=>{
          assert.equal(db.fileMetadata.put.lastCall.args[0].status, "CURRENT");
        });
    });

    it("determines file status to be STALE when token is provided in message", ()=>{
      const msg = {
        topic: "watch-result",
        from: "test-module",
        filePath: "test-bucket/test-file",
        version: "1.0.0",
        token: "abc123"
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert.equal(db.fileMetadata.put.lastCall.args[0].status, "STALE");
        });
    });

    it("adds to fileMetaData -> adds to watchlist -> broadcasts FILEUPDATE", ()=>{
      const msg = {
        topic: "watch-result",
        from: "test-module",
        filePath: "test-bucket/test-file",
        version: "1.0.0"
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.fileMetadata.put.called);
          assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
            filePath: msg.filePath,
            version: msg.version,
            status: "CURRENT",
            token: undefined // eslint-disable-line no-undefined
          });

          assert(db.watchlist.put.called);
          assert.deepEqual(db.watchlist.put.lastCall.args[0], {filePath: msg.filePath, version: msg.version});

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `create-dir-structure-for-${msg.filePath}`,
            status: "CURRENT",
            version: msg.version
          });
        });
    });
  });

  describe("UPDATE", ()=>{
    let messageReceiveHandler = null;

    const mockReceiver = {
      on(evt, handler) {
        if (evt === "message") {
          messageReceiveHandler = handler;
        }
      }
    };

    beforeEach(()=>{
      simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(commonConfig, "getLocalStoragePath").returnWith("test-local-storage-path/");

      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.watchlist, "put").resolveWith();

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });


    it("updates file(s) in fileMetadata -> updates file(s) in watchlist", ()=>{
      const msg = {
        topic: "update",
        from: "messaging-service",
        files: [
          {
          filePath: "test-bucket/test-file1",
          version: "2.1.0",
          token: "abc123"
        }, {
          filePath: "test-bucket/test-file2",
          version: "1.1.0",
          token: "def456"
        }
        ]
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          const totalCalls = 2;

          assert.equal(db.fileMetadata.put.callCount, totalCalls);
          assert.deepEqual(db.fileMetadata.put.calls[0].args[0], {
            filePath: msg.files[0].filePath,
            version: msg.files[0].version,
            status: "STALE",
            token: msg.files[0].token
          });
          assert.deepEqual(db.fileMetadata.put.calls[1].args[0], {
            filePath: msg.files[1].filePath,
            version: msg.files[1].version,
            status: "STALE",
            token: msg.files[1].token
          });

          assert.equal(db.watchlist.put.callCount, totalCalls);
          assert.deepEqual(db.watchlist.put.calls[0].args[0], {
            filePath: msg.files[0].filePath,
            version: msg.files[0].version,
            status: "STALE",
            token: msg.files[0].token
          });
          assert.deepEqual(db.watchlist.put.calls[1].args[0], {
            filePath: msg.files[1].filePath,
            version: msg.files[1].version,
            status: "STALE",
            token: msg.files[1].token
          });
        });


    });
  });

});
