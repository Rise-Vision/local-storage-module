/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");
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
      simple.mock(commonMessaging, "broadcastMessage").returnWith();
      simple.mock(log, "file").returnWith();
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
      simple.mock(request, "post").resolveWith({statusCode: 200, body: "test-signed-url"});

      return urlProvider.getURL(testToken)
        .then(url=>{
          assert(url);
          assert.equal(url, "test-signed-url");
        })
    });

    it("should broadcast FILE-ERROR when unsuccessful response from URL Provider", ()=>{
      simple.mock(request, "post").rejectWith();
      simple.mock(broadcastIPC, "broadcast");

      return urlProvider.getURL(testToken)
        .then(url=>{
          assert(!url);
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "Could not retrieve signed URL");
        })
    });

    it("should broadcast FILE-ERROR when invalid status response from URL Provider", ()=>{
      simple.mock(request, "post").resolveWith({statusCode: 403, body: "test issue"});
      simple.mock(broadcastIPC, "broadcast");

      return urlProvider.getURL(testToken)
        .then(url=>{
          assert(!url);
          assert(broadcastIPC.broadcast.called);
          assert.equal(broadcastIPC.broadcast.lastCall.args[0], "FILE-ERROR");
          assert.equal(broadcastIPC.broadcast.lastCall.args[1].msg, "Could not retrieve signed URL");
        })
    });

  });

});
