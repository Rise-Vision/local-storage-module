/* eslint-env mocha */
/* eslint-disable max-statements */
const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc.js");
const fileController = require("../../../../src/files/file-controller");

describe("Messaging", ()=>{

  const testModulePath = "rvplayer/modules/local-storage/";
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
      simple.mock(commonConfig, "sendToMessagingService").returnWith();
      simple.mock(commonConfig, "getModulePath").returnWith(testModulePath);
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
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`,
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
        filePath: testFilePath
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.owners.addToSet.called);
          assert.deepEqual(db.owners.addToSet.lastCall.args[0], {filePath: msg.filePath, owner: msg.from});

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`,
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
        filePath: testFilePath
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
        filePath: testFilePath
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
    const mockMessage = {
      topic: "watch-result",
      from: "test-module",
      filePath: testFilePath
    };

    beforeEach(()=>{
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(commonConfig, "getModulePath").returnWith(testModulePath);

      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.watchlist, "put").resolveWith();
      simple.mock(fileController, "download").resolveWith();
      simple.mock(broadcastIPC, "broadcast");

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
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
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
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`,
            status: "CURRENT",
            version: msg.version
          });
        });
    });

    it("[STALE] adds to fileMetaData -> adds to watchlist -> broadcasts FILEUPDATE -> download", ()=>{
      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: testToken});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.fileMetadata.put.called);
          assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
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
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: msg.filePath,
            ospath: `${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`,
            status: "STALE",
            version: msg.version
          });
        })
        .then(()=>{
          assert(fileController.download.called);
          assert.equal(fileController.download.lastCall.args[0], msg.filePath);
          assert.equal(fileController.download.lastCall.args[1], testToken);
        });
    });

    it("[STALE] does not download when file already processing", () => {
      fileController.addToProcessing(testFilePath);

      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: testToken});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(!fileController.download.called);
        });
    });
  });

});
