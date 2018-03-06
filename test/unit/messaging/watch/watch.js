/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
/* eslint max-lines: ["off"] */
const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc.js");
const fileController = require("../../../../src/files/file-controller");

describe("Messaging", ()=>{

  const mockModuleDir = "rvplayer/modules";
  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testToken = {
    hash: "abc123",
    data: {
      displayId: "test-display",
      timestamp: Date.now(),
      filePath: testFilePath
    }
  };

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
      simple.mock(commonMessaging, "sendToMessagingService").returnWith();
      simple.mock(commonConfig, "getModuleDir").returnWith(mockModuleDir);
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(db.owners, "get").returnWith({owners: ["test"]});
      simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(global.log, "file").returnWith();

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
      simple.mock(broadcastIPC, "fileUpdate");

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.fileUpdate.called);
          assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
            filePath: msg.filePath,
            status: mockMetadata.status,
            version: mockMetadata.version
          });

          assert.equal(commonMessaging.sendToMessagingService.callCount, 0);
        });
    });

    it("adds to owners list -> broadcasts FILEUPDATE -> does not call remote watch, when local file is CURRENT", ()=> {
      const mockMetadata = {
        status: "CURRENT",
        version: "1.0.0"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.owners, "addToSet").resolveWith();
      simple.mock(broadcastIPC, "fileUpdate");

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.fileUpdate.called);
          assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
            filePath: msg.filePath,
            status: mockMetadata.status,
            version: mockMetadata.version
          });

          assert.equal(commonMessaging.sendToMessagingService.callCount, 0);
        });
    });

    it("calls remote watch when the local file is not present", ()=>{
      const mockMetadata = {};

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.owners, "addToSet").resolveWith();

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert(commonMessaging.sendToMessagingService.called);
      });
    });

    it("calls remote watch when the local file state is UNKNOWN", ()=>{
      const mockMetadata = {
        status: "UNKNOWN"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.owners, "addToSet").resolveWith();

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert(commonMessaging.sendToMessagingService.called);
      });
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
    const mockMessage = {
      topic: "watch-result",
      from: "test-module",
      filePath: testFilePath
    };

    beforeEach(()=>{
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(commonConfig, "getModuleDir").returnWith(mockModuleDir);

      simple.mock(db.fileMetadata, "put").callFn(putObj=>Promise.resolve(putObj));
      simple.mock(db.watchlist, "put").resolveWith();
      simple.mock(fileController, "download").resolveWith();
      simple.mock(broadcastIPC, "fileUpdate");
      simple.mock(fileController, "addToProcessing");
      simple.mock(fileController, "removeFromProcessing");
      simple.mock(global.log, "file").returnWith();

      fileController.removeFromProcessing(testFilePath);

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("should broadcast FILEUPDATE with NOEXIST status when error providing from MS", ()=>{
      const msg = Object.assign({}, mockMessage, {error: 404});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(broadcastIPC.fileUpdate.called);
          assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
            filePath: msg.filePath,
            status: "NOEXIST"
          });
        });
    });

    it("determines file status to be CURRENT when no token provided in message", ()=>{
      const msg = Object.assign({}, mockMessage, {version: "1.0.0"});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert.equal(db.fileMetadata.put.lastCall.args[0].status, "CURRENT");
        });
    });

    it("determines file status to be STALE when token is provided in message", ()=>{
      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: "abc123"});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert.equal(db.fileMetadata.put.lastCall.args[0].status, "STALE");
        });
    });

    it("[CURRENT] adds to fileMetaData -> adds to watchlist -> broadcasts FILEUPDATE", ()=>{
      const msg = Object.assign({}, mockMessage, {version: "1.0.0"});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.fileMetadata.put.called);
          assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
            filePath: msg.filePath,
            version: msg.version,
            status: "CURRENT",
            token: undefined // eslint-disable-line no-undefined
          });
        })
        .then(()=>{
          assert(db.watchlist.put.called);
          assert.deepEqual(db.watchlist.put.lastCall.args[0], {filePath: msg.filePath, version: msg.version});
        })
        .then(()=>{
          assert(broadcastIPC.fileUpdate.called);
          assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
            filePath: msg.filePath,
            status: "CURRENT",
            version: msg.version
          });
        });
    });

    it("[STALE] adds to fileMetaData -> adds to watchlist -> broadcasts FILEUPDATE -> download", ()=>{
      const mockMetadata = {
        version: "1.0.0"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: testToken});

      return messageReceiveHandler(msg)
      .then(()=>{
        assert(db.fileMetadata.put.called);
        assert.deepEqual(db.fileMetadata.put.calls[0].args[0], {
          filePath: msg.filePath,
          version: msg.version,
          status: "STALE",
          token: testToken
        });
      })
      .then(()=>{
        assert(db.watchlist.put.called);
        assert.deepEqual(db.watchlist.put.lastCall.args[0], {filePath: msg.filePath, version: msg.version});
      })
      .then(()=>{
        assert.equal(broadcastIPC.fileUpdate.callCount, 1);
        assert.deepEqual(broadcastIPC.fileUpdate.firstCall.args[0], {
          filePath: msg.filePath,
          status: "STALE",
          version: msg.version
        });
      })
    });

    it("Updates file metadata status as stale after downloading if version has changed", ()=>{
      const mockMetadata = {
        version: "2.0.0"
      };

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: testToken});

      return messageReceiveHandler(msg)
      .then(()=>{
        assert.equal(db.fileMetadata.put.lastCall.args[0].status, "STALE");
        assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
          filePath: msg.filePath,
          status: "STALE",
          version: msg.version
        });
      });
    });
  });
});
