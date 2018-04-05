/* eslint-env mocha */
const assert = require("assert");
const broadcast = require("../../../src/messaging/broadcast-ipc");
const fileSystem = require("../../../src/files/file-system");
const db = require("../../../src/db/api");
const commonMessaging = require("common-display-module/messaging");
const config = require("../../../src/config/config");
const simple = require("simple-mock");

describe("Broadcast IPC", ()=> {
  beforeEach(()=>{
    simple.mock(fileSystem, "getPathInCache").returnWith("fake-os-path");
    simple.mock(commonMessaging, "broadcastMessage").returnWith();
    simple.mock(commonMessaging, "broadcastToLocalWS").returnWith();
    simple.mock(db.owners, "get").returnWith({owners: []});
    simple.mock(log, "file").returnWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("broadcasts file update", ()=>{
    broadcast.fileUpdate({filePath: "test-file-path", version: "12345", status: "test-status"});
    assert.equal(commonMessaging.broadcastMessage.callCount, 1);
    assert.deepEqual(commonMessaging.broadcastMessage.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-UPDATE",
      filePath: "test-file-path",
      version: "12345",
      ospath: "fake-os-path",
      status: "test-status"
    });
  });

  it("broadcasts file update to websocket client", ()=>{
    simple.mock(db.owners, "get").returnWith({owners: ["ws-client"]});

    broadcast.fileUpdate({filePath: "test-file-path", version: "12345", status: "test-status"});
    assert.equal(commonMessaging.broadcastToLocalWS.callCount, 1);
    assert.equal(commonMessaging.broadcastMessage.callCount, 0);
    assert.deepEqual(commonMessaging.broadcastToLocalWS.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-UPDATE",
      filePath: "test-file-path",
      version: "12345",
      ospath: "fake-os-path",
      status: "test-status"
    });
  });

  it("broadcasts file error", ()=>{
    broadcast.fileError({filePath: "test-file-path", msg: "test-message"});
    assert.equal(commonMessaging.broadcastMessage.callCount, 1);
    assert.deepEqual(commonMessaging.broadcastMessage.lastCall.args[0], {
      from: config.moduleName,
      topic: "FILE-ERROR",
      filePath: "test-file-path",
      msg: "test-message"
    });
  });

});
