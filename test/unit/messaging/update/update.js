/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const platform = require("rise-common-electron").platform;
const db = require("../../../../src/db/api");
const file = require("../../../../src/files/file");
const fileSystem = require("../../../../src/files/file-system");
const messaging = require("../../../../src/messaging/messaging.js");

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
        topic: "msfileupdate",
        type: "update",
        from: "messaging-service",
        filePath: "test-bucket/test-file1",
        version: "2.1.0",
        token: {
          hash: "abc123",
          data: {
            displayId: "test-display",
            date: Date.now(),
            filePath: "test-bucket/test-file1"
          }
        }
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(db.fileMetadata.put.called);
          assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
            filePath: msg.filePath,
            version: msg.version,
            status: "STALE",
            token: msg.token
          });

          assert(db.watchlist.put.called);
          assert.deepEqual(db.watchlist.put.lastCall.args[0], {
            filePath: msg.filePath,
            version: msg.version,
            status: "STALE",
            token: msg.token
          });
        });
    });
  });


  describe("UPDATE - direct caching", ()=>{
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

      return messaging.init();
    });

    afterEach(()=>{
      simple.restore();
    });


    it("writes files directly to disk --> updates file(s) in directCacheFileMetadata", ()=>{
      const msg = {
        topic: "directcachefileupdate",
        type: "update",
        from: "twitter",
        filePath: "test_component_id",
        timestamp: "2017.01.01.13.12",
        data: JSON.stringify({
          test: "testing",
          tweet: "hello world"
        })
      };

      return messageReceiveHandler(msg)
        .then(()=>{
          assert(file.writeDirectlyToDisk.called);
          platform.readTextFile(fileSystem.getPathInCache(msg.filePath))
            .then(fileData=>{
              assert.deepEqual(fileData, msg.data);
            });

          assert(db.directCacheFileMetadata.put.called);
          assert.deepEqual(db.directCacheFileMetadata.put.lastCall.args[0], {
            filePath: msg.filePath,
            timestamp: msg.timestamp
          });
        });
    });
  });
});
