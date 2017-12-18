/* eslint-env mocha */
const commonConfig = require("common-display-module");
const simple = require("simple-mock");
const assert = require("assert");
const os = require("os");
const messaging = require("../../src/messaging/messaging");
const database = require("../../src/db/lokijs/database");
const api = require("../../src/db/api");
const localMessagingModule = require("local-messaging-module");
const path = require("path");
const {platform} = require("rise-common-electron");
const dbSaveInterval = 5;
const fileStat = require("util").promisify(require("fs").stat);
const fileSystem = require("../../src/files/file-system");

global.log = {file: ()=>{}, debug: ()=>{}, error: ()=>{}};

describe("WATCH: Integration", function() {
  const tmpdir = os.tmpdir();
  const tempDBPath = path.join(tmpdir, `lokijs_test_dir${Math.random()}`);
  const tempModulePath = path.join(tmpdir, `local-storage${Math.random()}`);
  const tempCacheDir = path.join(tmpdir, `local-storage-cache${Math.random()}`);
  const filePath = "messaging-service-test-bucket/test-folder/test-file.txt";

  describe("Connected to Messaging Service through Local Messaging", ()=>{
    before(()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "ls-test-id", displayId: "ls-test-id"
      });

      simple.mock(commonConfig, "getMachineId").returnWith("0");
      simple.mock(commonConfig, "getModulePath").returnWith(tempModulePath);
      simple.mock(fileSystem, "getCacheDir").returnWith(tempCacheDir);

      return platform.mkdirRecursively(tempDBPath)
      .then(()=>platform.mkdirRecursively(tempModulePath))
      .then(()=>platform.mkdirRecursively(tempCacheDir))
      .then(()=>platform.mkdirRecursively(fileSystem.getDownloadDir()))
      .then(()=>platform.mkdirRecursively(fileSystem.getCacheDir()))
      .then(()=>localMessagingModule.start("ls-test-did", "ls-test-mid"))
      .then(()=>database.start(tempDBPath, dbSaveInterval))
      .then(messaging.init);
    });

    after(()=>{
      commonConfig.disconnect();
      localMessagingModule.stop();

      // allow for db save interval to complete before destroying
      return setTimeout(()=>{
        database.destroy();
        database.close();
      }, dbSaveInterval * dbSaveInterval);
    });

    it("[client] should send watch and receive response", function() {
      this.timeout(9000); // eslint-disable-line
      const expectedSavedSize = 10;

      return new Promise(res=>{
        commonConfig.receiveMessages("test")
        .then(receiver=>receiver.on("message", (message)=>{
          const fileDownloaded = message.topic === "FILE-UPDATE" &&
          message.status === "CURRENT";

          console.log("MESSAGE RECEIVED BY TEST DISPLAY MODULE");
          console.dir(message);
          if (fileDownloaded) {res(message.ospath);}
        }))
        .then(fileStat)
        .then(stats=>stats.size === expectedSavedSize);

        console.log("Broadcasting message through LM to LS");
        commonConfig.broadcastMessage({
          from: "test",
          topic: "watch",
          filePath
        });
      });
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
      commonConfig.broadcastMessage({
        topic: "msfileupdate",
        type: "update",
        filePath,
        version: "test-version-updated",
        token
      });

      const delay = 200;

      setTimeout(()=>{
        assert.equal(api.fileMetadata.get(filePath).version, "test-version-updated");
        assert.equal(api.fileMetadata.get(filePath).status, "STALE");
        assert.deepEqual(api.fileMetadata.get(filePath).token, token);

        assert.equal(api.watchlist.get(filePath).version, "test-version-updated");
        done();
      }, delay);

    });

    it("should receive MSFILEUPDATE, delete file in DB's, client receives response", function() {
      // confirm db state
      assert(api.fileMetadata.get(filePath));
      assert(api.watchlist.get(filePath));

      console.log("Broadcasting message through LM to LS");
      commonConfig.broadcastMessage({
        topic: "msfileupdate",
        type: "delete",
        filePath
      });

      return new Promise(res=>{
        commonConfig.receiveMessages("test")
          .then(receiver=>receiver.on("message", (message)=>{
            if (message.topic === "FILE-UPDATE") {
              assert.equal(message.status, "DELETED");
              assert(!api.fileMetadata.get(filePath));
              assert(!api.watchlist.get(filePath));
              res();
            }
          }));
      });
    });
  });
});
