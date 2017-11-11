/* eslint-env mocha */
const commonConfig = require("common-display-module");
const simple = require("simple-mock");
const os = require("os");
const messaging = require("../../src/messaging/messaging");
const database = require("../../src/db/lokijs/database");
const localMessagingModule = require("local-messaging-module");
const path = require("path");
const {platform} = require("rise-common-electron");
const dbSaveInterval = 5;

global.log = {file: ()=>{}};

describe("WATCH: Integration", function() {
  const tempDBPath = path.join(os.tmpdir(), "lokijs_test_dir");

  describe("Connected to Messaging Service through Local Messaging", ()=>{
    before(()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "ls-test-id", displayId: "ls-test-id"
      });

      return platform.mkdirRecursively(tempDBPath)
      .then(()=>localMessagingModule.start())
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

    beforeEach(()=>{
      simple.mock(commonConfig, "getMachineId").returnWith("0");
      simple.mock(commonConfig, "getLocalStoragePath").returnWith("mock-file-path");
    });

    afterEach(()=>{
      simple.restore();
    });

    it("sends watch and receives response", function() {
      this.timeout(9000); // eslint-disable-line
      const filePath = "messaging-service-test-bucket/test-folder/test-file.txt";

      console.log("Broadcasting message through LM to LS");
      commonConfig.broadcastMessage({
        from: "test",
        topic: "watch",
        filePath
      });

      return new Promise(res=>{
        commonConfig.receiveMessages("test")
        .then(receiver=>receiver.on("message", (message)=>{
          console.log(message);
          if (message.topic === "FILE-UPDATE") {res();}
        }));
      });
    });
  });
});
