/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const file = require("../../../src/files/file");
const request = require("request-promise-native");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");

describe("File", ()=>{

  const testFilePath = "test-bucket/test-folder/test-file.jpg";
  const testSignedURL = "test-signed-url";
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

    it("should broadcast FILE-ERROR when request error occurs", ()=>{
      simple.mock(request, "get").rejectWith();
      simple.mock(broadcastIPC, "broadcast");

      return file.request(testFilePath, testSignedURL)
        .catch(err=>{
          assert(err);
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "File's host server could not be reached");
        })
    });

  });

});
