/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const simple = require("simple-mock");
const queue = require("../../../src/files/download-queue");
const assert = require("assert");
const os = require("os");
const messaging = require("../../../src/messaging/messaging");
const database = require("../../../src/db/lokijs/database");
const api = require("../../../src/db/api");
const ipc = require("node-ipc");
const localMessagingModule = require("local-messaging-module");
const path = require("path");
const {platform} = require("rise-common-electron");
const dbSaveInterval = 5;
const fileStat = require("util").promisify(require("fs").stat);
const fileSystem = require("../../../src/files/file-system");
const logger = require("../../../src/logger");

describe("WATCH: Integration", function() {
  const tmpdir = os.tmpdir();
  const tempDBPath = path.join(tmpdir, `lokijs_test_dir${Math.random()}`);
  const tempModulePath = path.join(tmpdir, `local-storage${Math.random()}`);
  const tempCacheDir = path.join(tmpdir, `local-storage-cache${Math.random()}`);
  const filePath = "messaging-service-test-bucket/test-folder/test-file.txt";

  describe("Connected to Messaging Service through Local Messaging", ()=>{
    before(()=>{
      simple.mock(logger, "all");
      simple.mock(logger, "file");
      simple.mock(logger, "debug");
      simple.mock(logger, "error");
      simple.mock(logger, "warning");
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "ls-test-id", displayId: "ls-test-id"
      });

      simple.mock(commonConfig, "getMachineId").returnWith("0");
      simple.mock(commonConfig, "getModulePath").returnWith(tempModulePath);
      simple.mock(fileSystem, "getCacheDir").returnWith(tempCacheDir);

      ipc.config.id = "lms";
      ipc.config.retry = 1500;

      return platform.mkdirRecursively(tempDBPath)
      .then(()=>platform.mkdirRecursively(tempModulePath))
      .then(()=>platform.mkdirRecursively(tempCacheDir))
      .then(()=>platform.mkdirRecursively(fileSystem.getDownloadDir()))
      .then(()=>platform.mkdirRecursively(fileSystem.getCacheDir()))
      .then(()=>localMessagingModule.start(ipc, "ls-test-did", "ls-test-mid"))
      .then(()=>database.start(tempDBPath, dbSaveInterval))
      .then(messaging.init);
    });

    after(()=>{
      commonMessaging.disconnect();
      localMessagingModule.stop();

      // allow for db save interval to complete before destroying
      return setTimeout(()=>{
        database.destroy();
        database.close();
      }, dbSaveInterval * dbSaveInterval);
    });

    it("[client] should send watch and receive response after queue downloads file", ()=>{
      this.timeout(9000); // eslint-disable-line
      const expectedSavedSize = 10;

      queueOneStaleFileCheck();

      return new Promise(res=>{
        commonMessaging.receiveMessages("test")
        .then(receiver=>receiver.on("message", (message)=>{
          const fileDownloaded = message.topic === "FILE-UPDATE" &&
          message.status === "CURRENT";

          console.log("MESSAGE RECEIVED BY TEST DISPLAY MODULE");
          console.dir(message);
          if (fileDownloaded) {res(message.ospath);}
        }));

        console.log("Broadcasting message through LM to LS");
        commonMessaging.broadcastMessage({
          from: "test",
          topic: "watch",
          filePath
        });
      })
      .then(fileStat)
      .then(stats=>stats.size === expectedSavedSize);

      function queueOneStaleFileCheck() {
        const timers = [()=>{}, setTimeout];
        queue.checkStaleFiles((fn, timeout)=>timers.pop()(fn, timeout));
      }
    });

    it("should receive MSFILEUPDATE from MS and update DB", function(done) {
      // confirm db state
      assert(api.fileMetadata.get(filePath).version);
      assert.equal(api.fileMetadata.get(filePath).status, "CURRENT");
      assert(api.fileMetadata.get(filePath).token);
      assert(api.watchlist.get(filePath).version);

      const token = {
        data: {
          timestamp: Date.now(),
          filePath,
          displayId: "ls-test-id"
        },
        hash: "abc123"
      };

      console.log("Broadcasting message through LM to LS");
      commonMessaging.broadcastMessage({
        topic: "msfileupdate",
        type: "update",
        filePath,
        watchlistLastChanged: "2522697262234",
        version: "test-version-updated",
        token
      });

      const delay = 200;

      setTimeout(()=>{
        assert.equal(api.fileMetadata.get(filePath).version, "test-version-updated");
        assert.equal(api.fileMetadata.get(filePath).status, "STALE");
        assert.deepEqual(api.fileMetadata.get(filePath).token, token);
        assert.equal(api.watchlist.lastChanged(), "2522697262234");

        assert.equal(api.watchlist.get(filePath).version, "test-version-updated");
        done();
      }, delay);

    });

    it("should receive MSFILEUPDATE, delete file in DB's, client receives response", function() {
      // confirm db state
      assert(api.fileMetadata.get(filePath));
      assert(api.watchlist.get(filePath));

      console.log("Broadcasting message through LM to LS");
      commonMessaging.broadcastMessage({
        topic: "msfileupdate",
        type: "delete",
        watchlistLastChanged: "2522697262234",
        filePath
      });

      const delay = 200;

      setTimeout(()=>{
        return new Promise(res=>{
          commonMessaging.receiveMessages("test")
            .then(receiver=>receiver.on("message", (message)=>{
              if (message.topic === "FILE-UPDATE") {
                assert.equal(message.status, "DELETED");
                assert(!api.fileMetadata.get(filePath));
                assert(!api.watchlist.get(filePath));
                assert.equal(api.watchlist.lastChanged(), "2522697262234");

                res();
              }
            }));
        });
      }, delay);
    });

    it("should receive MSFILEUPDATE from MS for an added file to a folder and update DB", function(done) {
      api.owners.put({
        filePath: "messaging-service-test-bucket/test-folder/",
        owners: ["licensing", "display-control"]
      });

      const addedFilePath = "messaging-service-test-bucket/test-folder/added.file";

      const token = {
        data: {
          timestamp: Date.now(),
          filePath,
          displayId: "ls-test-id"
        },
        hash: "abc123"
      };

      console.log("Broadcasting message through LM to LS");
      commonMessaging.broadcastMessage({
        topic: "msfileupdate",
        type: "add",
        filePath: addedFilePath,
        watchlistLastChanged: "2522697262234",
        version: "test-version-updated",
        token
      });

      const delay = 200;

      setTimeout(()=>{
        const metaData = api.fileMetadata.get(addedFilePath);

        assert(metaData);
        assert.equal(metaData.version, "test-version-updated");
        assert.equal(metaData.status, "STALE");
        assert.deepEqual(metaData.token, token);
        assert.equal(api.watchlist.lastChanged(), "2522697262234");

        assert.equal(api.watchlist.get(addedFilePath).version, "test-version-updated");

        const item = api.owners.get(addedFilePath);

        assert(item);
        assert(item.owners);
        assert.deepEqual(item.owners, ["licensing", "display-control"]);

        done();
      }, delay);
    });

  });
});
