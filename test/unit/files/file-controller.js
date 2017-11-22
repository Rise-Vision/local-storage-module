/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const file = require("../../../src/files/file");
const db = require("../../../src/db/api");
const urlProvider = require("../../../src/files/url-provider");
const fileController = require("../../../src/files/file-controller");
const fileSystem = require("../../../src/files/file-system");
const request = require("request-promise-native");

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

    it("should reject when no metdata exists for given filePath", ()=>{
      simple.mock(db.fileMetadata, "get").returnWith();

      return fileController.download(testFilePath)
        .catch(error=>{
          assert(error);
        })
    });

    it("should not request signed url or attempt download when file is already downloading ", ()=>{
      simple.mock(db.fileMetadata, "get").returnWith({
        filePath: testFilePath,
        status: "STALE",
        version: "1.0.0",
        token: testToken
      });
      simple.mock(fileSystem, "isDownloading").returnWith(true);
      simple.mock(urlProvider, "getURL");
      simple.mock(file, "request");

      return fileController.download(testFilePath)
        .then(()=>{
          assert.equal(urlProvider.getURL.callCount, 0);
          assert.equal(file.request.callCount, 0);
        });
    });

    it("should get signed url and download", ()=>{
      simple.mock(db.fileMetadata, "get").returnWith({
        filePath: testFilePath,
        status: "STALE",
        version: "1.0.0",
        token: testToken
      });
      simple.mock(fileSystem, "isDownloading").returnWith(false);
      simple.mock(request, "post").resolveWith("test-signed-url");
      simple.mock(urlProvider, "getURL");
      simple.mock(file, "request");

      return fileController.download(testFilePath)
        .then(()=>{
          assert.equal(urlProvider.getURL.callCount, 1);
          assert.deepEqual(urlProvider.getURL.lastCall.args[0], testToken);
          assert.equal(file.request.callCount, 1);
          assert.equal(file.request.lastCall.args[0], "test-signed-url");
        });
    });

  });

});
