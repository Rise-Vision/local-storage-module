/* eslint-env mocha */
/* eslint-disable max-statements */
const messaging = require("../../../../src/messaging/messaging.js");
const assert = require("assert");
const db = require("../../../../src/db/api");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");

describe("Messaging", ()=>{

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
