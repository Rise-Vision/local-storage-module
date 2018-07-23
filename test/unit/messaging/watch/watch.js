/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc");
const fileController = require("../../../../src/files/file-controller");
const logger = require("../../../../src/logger");

describe("Watch - Unit", ()=>{

  const mockModuleDir = "rvplayer/modules";
  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testFolderPath = "test-bucket/test-folder/";
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
      simple.mock(db.fileMetadata, "updateWatchSequence").resolveWith();
      simple.mock(db.owners, "get").returnWith({owners: ["test"]});
      simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(logger, "file").returnWith();

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("adds to owners list -> broadcasts FILE-UPDATE -> does not call remote watch, when local file is STALE", ()=> {
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

          assert(db.fileMetadata.updateWatchSequence.called);
          assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFilePath);
        });
    });

    it("adds to owners list -> broadcasts FILE-UPDATE -> does not call remote watch, when local file is CURRENT", ()=> {
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

          assert(db.fileMetadata.updateWatchSequence.called);
          assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFilePath);
        });
    });

    it("calls remote watch when the local file is not present", ()=>{
      const mockMetadata = null;

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

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFilePath);
      });
    });

    it("calls remote watch when the local file state is UNKNOWN", ()=>{
      const mockMetadata = {
        filePath: testFilePath,
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

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFilePath);
      });
    });

    it("calls remote watch when folder has not been watched yet", () => {
      const mockMetadata = null;

      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.owners, "addToSet").resolveWith();

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFolderPath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert.ok(commonMessaging.sendToMessagingService.called);

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFolderPath);
      });
    });

    it("does not call remote watch when folder has already been watched", () => {
      const mockMetadata = {filePath: testFolderPath};
      const mockFolderFiles = [];

      simple.mock(db.fileMetadata, "getFolderFiles").returnWith(mockFolderFiles);
      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.owners, "addToSet").resolveWith();

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFolderPath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert.equal(commonMessaging.sendToMessagingService.called, false);

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFolderPath);
      });
    });

    it("broacasts FILE-UPDATE of local folder files", () => {
      const mockMetadata = {filePath: testFolderPath};
      const current = {filePath: `${testFolderPath}current.png`, status: "CURRENT", version: "1"};
      const another = {filePath: `${testFolderPath}another.png`, status: "CURRENT", version: "3"};
      const mockFolderFiles = [another, current];

      simple.mock(db.fileMetadata, "getFolderFiles").returnWith(mockFolderFiles);
      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.owners, "addToSet").resolveWith();
      simple.mock(broadcastIPC, "fileUpdate");

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFolderPath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert.equal(broadcastIPC.fileUpdate.callCount, 2);
        assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], current);
        assert.deepEqual(broadcastIPC.fileUpdate.firstCall.args[0], another);

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFolderPath);
      });
    });

    it("requests MS update of local folder files with status UNKNOWN", () => {
      const mockMetadata = {filePath: testFolderPath};
      const current = {filePath: `${testFolderPath}current.png`, status: "CURRENT", version: "1"};
      const unknown = {filePath: `${testFolderPath}unknown.png`, status: "UNKNOWN", version: "0"};
      const mockFolderFiles = [unknown, current];

      simple.mock(db.fileMetadata, "getFolderFiles").returnWith(mockFolderFiles);
      simple.mock(db.fileMetadata, "get").returnWith(mockMetadata);
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.owners, "addToSet").resolveWith();
      simple.mock(broadcastIPC, "fileUpdate");
      simple.mock(commonMessaging, "sendToMessagingService").returnWith();

      const msg = {
        topic: "watch",
        from: "test-module",
        filePath: testFolderPath
      };

      return messageReceiveHandler(msg)
      .then(()=>{
        assert.ok(commonMessaging.sendToMessagingService.called);
        assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
          topic: "watch",
          filePath: unknown.filePath,
          version: unknown.version
        });

        assert(db.fileMetadata.updateWatchSequence.called);
        assert.equal(db.fileMetadata.updateWatchSequence.lastCall.args[0], testFolderPath);
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
      filePath: testFilePath,
      watchlistLastChanged: "123456"
    };

    beforeEach(()=>{
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(commonMessaging, "receiveMessages").resolveWith(mockReceiver);
      simple.mock(commonConfig, "getModuleDir").returnWith(mockModuleDir);

      simple.mock(db.fileMetadata, "put").callFn(putObj=>Promise.resolve(putObj));
      simple.mock(db.owners, "get").returnWith({owners: ['licensing']});
      simple.mock(db.owners, "put").returnWith();
      simple.mock(db.watchlist, "put").resolveWith();
      simple.mock(db.watchlist, "setLastChanged").returnWith();
      simple.mock(fileController, "download").resolveWith();
      simple.mock(broadcastIPC, "fileUpdate");
      simple.mock(fileController, "addToProcessing");
      simple.mock(fileController, "removeFromProcessing");
      simple.mock(logger, "file").returnWith();

      fileController.removeFromProcessing(testFilePath);

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("should broadcast FILE-UPDATE with NOEXIST status when error providing from MS", ()=>{
      const msg = Object.assign({}, mockMessage, {errorMsg: "NOEXIST"});

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

          assert.equal(db.watchlist.setLastChanged.callCount, 1);
          assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
        });
    });

    it("determines file status to be STALE when token is provided in message", ()=>{
      const msg = Object.assign({}, mockMessage, {version: "1.0.0", token: "abc123"});

      return messageReceiveHandler(msg)
        .then(()=>{
          assert.equal(db.fileMetadata.put.lastCall.args[0].status, "STALE");

          assert.equal(db.watchlist.setLastChanged.callCount, 1);
          assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
        });
    });

    it("[CURRENT] adds to fileMetaData -> adds to watchlist -> broadcasts FILE-UPDATE", ()=>{
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

          const entry = db.watchlist.put.lastCall.args[0];
          assert.equal(entry.filePath, msg.filePath);
          assert.equal(entry.version, msg.version);
        })
        .then(()=>{
          assert(broadcastIPC.fileUpdate.called);
          assert.deepEqual(broadcastIPC.fileUpdate.lastCall.args[0], {
            filePath: msg.filePath,
            status: "CURRENT",
            version: msg.version
          });
        })
        .then(() => {
          assert.equal(db.watchlist.setLastChanged.callCount, 1);
          assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
        });
    });

    it("[STALE] adds to fileMetaData -> adds to watchlist -> broadcasts FILE-UPDATE -> download", ()=>{
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

        const entry = db.watchlist.put.lastCall.args[0];
        assert.equal(entry.filePath, msg.filePath);
        assert.equal(entry.version, msg.version);
      })
      .then(()=>{
        assert.equal(broadcastIPC.fileUpdate.callCount, 1);
        assert.deepEqual(broadcastIPC.fileUpdate.firstCall.args[0], {
          filePath: msg.filePath,
          status: "STALE",
          version: msg.version
        });
      })
      .then(()=>{
        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
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

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
      });
    });

    it("adds all files returning from a folder watch result", () => {
      const message = {
        topic: "watch-result",
        msg: "ok",
        folderData: [
          {filePath: "bucket/dir/file1", version: "1", token: {}},
          {filePath: "bucket/dir/file2", version: "1", token: {}}
        ],
        watchlistLastChanged: "123456"
      };

      return messageReceiveHandler(message)
      .then(()=>{
        assert.equal(db.fileMetadata.put.callCount, 2);
        db.fileMetadata.put.calls.forEach(call => {
          assert(["bucket/dir/file1", "bucket/dir/file2"].includes(call.args[0].filePath));
          assert.equal(call.args[0].version, "1");
          assert.equal(call.args[0].status, "STALE");
          assert.deepEqual(call.args[0].token, {});
        });

        assert.equal(db.watchlist.put.callCount, 2);
        db.watchlist.put.calls.forEach(call => {
          assert(["bucket/dir/file1", "bucket/dir/file2"].includes(call.args[0].filePath));
          assert.equal(call.args[0].version, "1");
        });

        assert.equal(db.owners.put.callCount, 2);
        db.owners.put.calls.forEach(call => {
          assert(["bucket/dir/file1", "bucket/dir/file2"].includes(call.args[0].filePath));
          assert.deepEqual(call.args[0].owners, ["licensing"]);
        });

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], "123456");
      });
    });

  });
});
