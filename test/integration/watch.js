/* eslint-env mocha */
const commonConfig = require("common-display-module");
const simple = require("simple-mock");
const messaging = require("../../src//messaging/messaging");
const database = require("../../src//db/lokijs/database");
const os = require("os");
const localMessagingModule = require("local-messaging-module");

global.log = {file: ()=>{}};

describe("WATCH: Integration", function() {
  describe("Connected to Messaging Service through Local Messaging", ()=>{
    before(()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "ls-test-id", displayId: "ls-test-id"
      });

      return localMessagingModule.start()
      .then(()=>database.start(os.tmpdir()))
      .then(()=>database.destroy())
      .then(messaging.init);
    });

    after(()=>{
      commonConfig.disconnect();
      localMessagingModule.stop();
      database.close();
    })

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
