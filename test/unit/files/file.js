/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const file = require("../../../src/files/file");
const request = require("request");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");
const mockfs = require("mock-fs");
const nock = require("nock");
const platform = require("rise-common-electron").platform;
const fileSystem = require("../../../src/files/file-system");
const logger = require("../../../src/logger");

describe("File", ()=>{

  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testVersion = "123456";
  const filePathVersionHash = "d38980a3b3e98a1074df0d535da83b74";
  const mockModuleDir = "rvplayer/modules";
  const testModulePath = "rvplayer/modules/local-storage/";
  const testSignedURL = "http://test-signed-url";
  const mockSuccessfulResponse = {statusCode: 200, headers: {"Content-length": "100000"}};

  describe("request", ()=> {
    beforeEach(()=>{
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(logger, "file").returnWith();
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
      simple.mock(request, "get").returnWith({
        pause() {},
        on(msg, cb) {
          if (msg === "response") {
            return cb({statusCode: 200, headers: {"Content-length": "100000"}});
          }
        }
      });

      return file.request(testFilePath, testSignedURL)
        .then(response=>{
          assert(response);
          assert.deepEqual(response, mockSuccessfulResponse);
        })
    });

    it("should retry before broadcasting FILE-ERROR when request error occurs", ()=>{
      simple.mock(request, "get").returnWith({
        pause: () => {},
        on: (type, action) => type === 'error' && action()
      });

      simple.mock(broadcastIPC, "broadcast");

      return file.request(testFilePath, testSignedURL, 4, 0)
        .catch(err=>{
          assert(err);
          assert.equal(request.get.callCount, 5);
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "File's host server could not be reached");
        })
    });

  });

  describe("writeToDisk", ()=> {
    beforeEach(()=>{
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(commonConfig, "getModuleDir").returnWith(mockModuleDir);
      simple.mock(logger, "file").returnWith();

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

          file.writeToDisk(testFilePath, testVersion, response);
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
        .then(response=>file.writeToDisk(testFilePath, testVersion, response))
        .then(()=>{

          assert(fileSystem.removeFromDownloadTotalSize.called);
          assert.equal(fileSystem.removeFromDownloadTotalSize.lastCall.args[0], 10);

          assert(!platform.fileExists(`${testModulePath}download/${filePathVersionHash}`));
          assert(platform.fileExists(`${testModulePath}cache/${filePathVersionHash}`));
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
        .then(response=>file.writeToDisk(testFilePath, testVersion, response))
        .catch((err)=>{
          assert(err);

          assert(fileSystem.removeFromDownloadTotalSize.called);
          assert.equal(fileSystem.removeFromDownloadTotalSize.lastCall.args[0], 10);

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "File I/O Error");

          setTimeout(()=>{
            assert(!platform.fileExists(`${testModulePath}download/${filePathVersionHash}`));
            assert(!platform.fileExists(`${testModulePath}cache/${filePathVersionHash}`));
          }, 200);
        });
    });
  });
});
