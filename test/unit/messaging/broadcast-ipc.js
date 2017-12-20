/* eslint-env mocha */
const assert = require("assert");
const broadcast = require("../../../src/messaging/broadcast-ipc");
const fileSystem = require("../../../src/files/file-system");
const simple = require("simple-mock");

describe("Broadcast IPC", ()=> {
  beforeEach(()=>{
    simple.mock(fileSystem, "getPathInCache").returnWith("fake-os-path");
    simple.mock(broadcast, "broadcast").returnWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("broadcasts file update", ()=>{
    broadcast.fileUpdate({filePath: "test-file-path", status: "test-status"});
    assert.equal(broadcast.broadcast.callCount, 1);
    assert.equal(broadcast.broadcast.lastCall.args[0], "FILE-UPDATE");
    assert.equal(broadcast.broadcast.lastCall.args[1].ospath, "fake-os-path");
    assert.equal(broadcast.broadcast.lastCall.args[1].filePath, "test-file-path");
    assert.equal(broadcast.broadcast.lastCall.args[1].status, "test-status");
  });

  it("broadcasts file error", ()=>{
    broadcast.fileError({filePath: "test-file-path", msg: "test-message"});
    assert.equal(broadcast.broadcast.callCount, 1);
    assert.equal(broadcast.broadcast.lastCall.args[0], "FILE-ERROR");
    assert.equal(broadcast.broadcast.lastCall.args[1].filePath, "test-file-path");
  });
});
