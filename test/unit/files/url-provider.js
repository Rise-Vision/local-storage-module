/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const broadcastIPC = require("../../../src/messaging/broadcast-ipc.js");
const request = require("request-promise-native");
const urlProvider = require("../../../src/files/url-provider");

describe("URL Provider", ()=>{

  describe("getURL", ()=> {
    const testToken = {
      hash: "abc123",
      data: {
        displayId: "test-display-id",
        timestamp: Date.now(),
        filePath: "test-path"
      }
    };

    beforeEach(()=>{
      simple.mock(commonConfig, "broadcastMessage").returnWith();
    });

    afterEach(()=>{
      simple.restore()
    });

    it("should throw error when no token provided", ()=>{
      assert.throws(() => {urlProvider.getURL()}, Error);
    });

    it("should throw error when no token hash provided", ()=>{
      assert.throws(() => {urlProvider.getURL({data: testToken.data})}, Error);
    });

    it("should throw error when no token data provided", ()=>{
      assert.throws(() => {urlProvider.getURL({hash: "abc123"})}, Error);
    });

    it("should throw error when token data invalid", ()=>{
      assert.throws(() => {urlProvider.getURL({hash: "abc123", data: {}})}, Error);
    });

    it("should return successful signed URL", ()=>{
      simple.mock(request, "post").resolveWith("test-signed-url");

      return urlProvider.getURL(testToken)
        .then(url=>{
          assert(url);
          assert.equal(url, "test-signed-url");
        })
    });

    it("should broadcast FILE-ERROR when unsuccessful response from URL Provider", ()=>{
      simple.mock(request, "post").rejectWith("test-signed-error");
      simple.mock(broadcastIPC, "broadcast");

      return urlProvider.getURL(testToken)
        .catch(error=>{
          assert(error);
          assert.equal(error, "test-signed-error");

          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.deepEqual(broadcastIPC.broadcast.lastCall.args[1], {
            filePath: testToken.data.filePath,
            error
          });
        })
    });

  });

});
