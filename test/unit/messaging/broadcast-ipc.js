/* eslint-env mocha */
const assert = require("assert");
const broadcast = require("../../../src/messaging/broadcast-ipc");
const fileSystem = require("../../../src/files/file-system");
const db = require("../../../src/db/api");
const commonConfig = require("common-display-module");
const config = require("../../../src/config/config");
const simple = require("simple-mock");

describe("Broadcast IPC", ()=> {
  beforeEach(()=>{
    simple.mock(fileSystem, "getPathInCache").returnWith("fake-os-path");
    simple.mock(commonConfig, "broadcastMessage").returnWith();
    simple.mock(commonConfig, "broadcastToLocalWS").returnWith();
    simple.mock(db.owners, "get").returnWith([]);
  });

  afterEach(()=>{
    simple.restore();
  });

  it("broadcasts file update", ()=>{
    broadcast.fileUpdate({filePath: "test-file-path", status: "test-status"});
    assert.equal(commonConfig.broadcastMessage.callCount, 1);
    assert.deepEqual(commonConfig.broadcastMessage.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-UPDATE",
      filePath: "test-file-path",
      ospath: "fake-os-path",
      status: "test-status"
    });
  });

  it("broadcasts file update to websocket client", ()=>{
    simple.mock(db.owners, "get").returnWith(["ws-client"]);

    broadcast.fileUpdate({filePath: "test-file-path", status: "test-status"});
    assert.equal(commonConfig.broadcastToLocalWS.callCount, 1);
    assert.equal(commonConfig.broadcastMessage.callCount, 0);
    assert.deepEqual(commonConfig.broadcastToLocalWS.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-UPDATE",
      filePath: "test-file-path",
      ospath: "fake-os-path",
      status: "test-status"
    });
  });

  it("broadcasts file error", ()=>{
    broadcast.fileError({filePath: "test-file-path", msg: "test-message"});
    assert.equal(commonConfig.broadcastMessage.callCount, 1);
    assert.deepEqual(commonConfig.broadcastMessage.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-ERROR",
      filePath: "test-file-path",
      msg: "test-message"
    });
  });
});
