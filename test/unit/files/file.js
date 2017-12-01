/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const file = require("../../../src/files/file");
const request = require("request-promise-native");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");
const mockfs = require("mock-fs");
const nock = require("nock");
const platform = require("rise-common-electron").platform;
const fileSystem = require("../../../src/files/file-system");

describe("File", ()=>{

  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testModulePath = "rvplayer/modules/local-storage/";
  const testSignedURL = "http://test-signed-url";
  const mockSuccessfulResponse = {statusCode: 200, headers: {"Content-length": "100000"}};

  describe("request", ()=> {
    beforeEach(()=>{
      simple.mock(commonConfig, "broadcastMessage").returnWith();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("should throw error when no filePath provided", ()=>{
      assert.throws(() => {file.request()}, Error);
    });

    it("should throw error when no signedURL provided", ()=>{
      assert.throws(() => {file.request(testFilePath)}, Error);
    });

    it("should return successful response", ()=>{
      simple.mock(request, "get").resolveWith(mockSuccessfulResponse);

      return file.request(testFilePath, testSignedURL)
        .then(response=>{
          assert(response);
          assert.deepEqual(response, mockSuccessfulResponse);
        })
    });

    it("should attempt request 3 times before broadcasting FILE-ERROR when request error occurs", ()=>{
      simple.mock(request, "get").rejectWith();
      simple.mock(broadcastIPC, "broadcast");

      return file.request(testFilePath, testSignedURL)
        .catch(err=>{
          assert(err);
          assert.equal(request.get.callCount, 3);
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "File's host server could not be reached");
        })
    });

  });

  describe("writeToDisk", ()=> {
    beforeEach(()=>{
      simple.mock(commonConfig, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "getModulePath").returnWith(testModulePath);

      // Mock the file system.
      mockfs({
        "test-file.png": Buffer.from([8, 6, 7, 5, 3, 0, 9]),
        [`${testModulePath}download`]: {},
        [`${testModulePath}cache`]: {}
      });

    });

    afterEach(()=>{
      simple.restore();
      mockfs.restore();
    });

    after(() => {
      nock.cleanAll();
    });

    it("should throw error when no filePath provided", ()=>{
      assert.throws(() => {file.writeToDisk()}, Error);
    });

    it("should throw error when no request response provided", ()=>{
      assert.throws(() => {file.request(testFilePath)}, Error);
    });

    it("should add to download total size before writing to disk", () => {
      nock(testSignedURL)
        .get("/test-file.png")
        .replyWithFile(200, "test-file.png", {"Content-length": "10"});

      simple.mock(fileSystem, "addToDownloadTotalSize");

      return file.request(testFilePath, `${testSignedURL}/test-file.png`)
        .then((response)=>{
          simple.mock(response, "pipe").returnWith();

          file.writeToDisk(testFilePath, response);
          assert(fileSystem.addToDownloadTotalSize.called);
          assert.equal(fileSystem.addToDownloadTotalSize.lastCall.args[0], 10);
        });
    });

    it("should write file to download folder, encrypt file name, and move to cache folder", () => {
      nock(testSignedURL)
        .get("/test-file.png")
        .replyWithFile(200, "test-file.png", {"Content-length": "10"});

      simple.mock(fileSystem, "removeFromDownloadTotalSize");

      return file.request(testFilePath, `${testSignedURL}/test-file.png`)
        .then(response=>file.writeToDisk(testFilePath, response))
        .then(()=>{

          assert(fileSystem.removeFromDownloadTotalSize.called);
          assert.equal(fileSystem.removeFromDownloadTotalSize.lastCall.args[0], 10);

          assert(!platform.fileExists(`${testModulePath}download/e498da09daba1d6bb3c6e5c0f0966784`));
          assert(platform.fileExists(`${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`));
        })
        .catch((err)=>{
          console.log("shouldn't be here", err);
          assert(false);
        });


    });

    it("should delete file from download folder and broadcast FILE-ERROR when I/O error", () => {
      nock(testSignedURL)
        .get("/test-file.png")
        .replyWithFile(200, "test-file.png", {"Content-length": "10"});

      simple.mock(fileSystem, "moveFileFromDownloadToCache").rejectWith();
      simple.mock(fileSystem, "removeFromDownloadTotalSize");
      simple.mock(broadcastIPC, "broadcast");

      return file.request(testFilePath, `${testSignedURL}/test-file.png`)
        .then(response=>file.writeToDisk(testFilePath, response))
        .catch((err)=>{
          assert(err);

          assert(fileSystem.removeFromDownloadTotalSize.called);
          assert.equal(fileSystem.removeFromDownloadTotalSize.lastCall.args[0], 10);

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "File I/O Error");

          setTimeout(()=>{
            assert(!platform.fileExists(`${testModulePath}download/e498da09daba1d6bb3c6e5c0f0966784`));
            assert(!platform.fileExists(`${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`));
          }, 200);

        });

    });
  });

});
