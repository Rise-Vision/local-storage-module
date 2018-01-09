/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const db = require("../../../../src/db/api");
const file = require("../../../../src/files/file");
const messaging = require("../../../../src/messaging/messaging.js");
const broadcastIPC = require("../../../../src/messaging/broadcast-ipc.js");

describe("Messaging", ()=>{

  describe("GET - direct caching", ()=>{
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

      simple.mock(file, "writeDirectlyToDisk");
      simple.mock(db.directCacheFileMetadata, "put");
      simple.mock(broadcastIPC, "broadcast");

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("broadcasts message with retrieved cached file path", ()=>{
      const msg = {
        topic: "directcachefileupdate",
        type: "get",
        from: "twitter",
        fileId: "test_component_id"
      };
      const expectedMetadata = {fileId: msg.fileId, timestamp: '2018.01.01.02.02'};

      simple.mock(db.directCacheFileMetadata, "get").returnWith(expectedMetadata);

      messageReceiveHandler(msg);

      assert(broadcastIPC.broadcast.called);
      assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-UPDATE");
    });
  });
});
