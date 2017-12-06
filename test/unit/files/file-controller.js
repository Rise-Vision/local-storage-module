/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const file = require("../../../src/files/file");
const urlProvider = require("../../../src/files/url-provider");
const fileController = require("../../../src/files/file-controller");
const fileSystem = require("../../../src/files/file-system");
const request = require("request");
const requestPromise = require("request-promise-native");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");

describe("File Controller", ()=>{

  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testToken = {
    hash: "abc123",
    data: {
      displayId: "test-display",
      timestamp: Date.now(),
      filePath: testFilePath
    }
  };

  describe("download", ()=> {
    afterEach(()=>{
      simple.restore();
    });

    beforeEach(()=>{
      simple.mock(broadcastIPC, "broadcast").returnWith();
      simple.mock(urlProvider, "getURL");
      simple.mock(file, "request");
      simple.mock(file, "writeToDisk").resolveWith();
    });

    it("should reject and broadcast FILE-ERROR and not get signed url when no available space", ()=>{
      simple.mock(fileSystem, "getAvailableSpace").resolveWith(0);
      simple.mock(fileSystem, "isThereAvailableSpace").returnWith(false);

      return fileController.download(testFilePath, testToken)
        .catch((err) => {
          assert(err);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert(broadcastIPC.broadcast.lastCall.args[1]);
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].filePath, testFilePath);
          assert(broadcastIPC.broadcast.lastCall.args[1].msg);
          assert(!urlProvider.getURL.called);
        })
    });

    it("should reject and broadcast FILE-ERROR and not request file when requesting signed url fails", ()=>{
      simple.mock(fileSystem, "getAvailableSpace").resolveWith(0);
      simple.mock(fileSystem, "isThereAvailableSpace").returnWith(true);
      simple.mock(requestPromise, "post").resolveWith({statusCode: 403, body: "test issue"});

      return fileController.download(testFilePath, testToken)
        .catch((err) => {
          assert(err);
          assert.equal(urlProvider.getURL.lastCall.args[0], testToken);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert(!file.request.called);
        })
    });

    it("should reject and broadcast FILE-ERROR and not write file when file request returns invalid response", ()=>{
      simple.mock(fileSystem, "getAvailableSpace").resolveWith(0);
      simple.mock(fileSystem, "isThereAvailableSpace").returnWith(true);
      simple.mock(requestPromise, "post").resolveWith({statusCode: 200, body: "test-signed-url"});
      simple.mock(request, "get").resolveWith({statusCode: 404});


      return fileController.download(testFilePath, testToken)
        .catch((err) => {
          assert(err);
          assert.equal(file.request.lastCall.args[0], testFilePath);
          assert.equal(file.request.lastCall.args[1], "test-signed-url");
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert(!file.writeToDisk.called);
        })
    });

    it("should action writing file with successful request response", ()=>{
      simple.mock(fileSystem, "getAvailableSpace").resolveWith(0);
      simple.mock(fileSystem, "isThereAvailableSpace").returnWith(true);
      simple.mock(requestPromise, "post").resolveWith({statusCode: 200, body: "test-signed-url"});
      simple.mock(request, "get").returnWith({
        pause() {},
        on(msg, cb) {
          if (msg === "response") {
            return cb({statusCode: 200, headers: {"Content-length": "100000"}});
          }
        }
      });

      return fileController.download(testFilePath, testToken)
        .then(() => {
          assert(file.writeToDisk.called);
          assert.equal(file.writeToDisk.lastCall.args[0], testFilePath);
          assert.deepEqual(file.writeToDisk.lastCall.args[1], {statusCode: 200, headers: {"Content-length": "100000"}});
        })
    });
  });

});
