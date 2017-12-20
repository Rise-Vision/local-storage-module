/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const simple = require("simple-mock");
const fileController = require("../../../src/files/file-controller");
const queue = require("../../../src/files/download-queue");
const db = require("../../../src/db/api");

describe("Download Queue", ()=>{
  beforeEach(()=>{
    simple.mock(db.fileMetadata, "getStale").returnWith([{filePath: "my-file"}])
    .returnWith([]);

    simple.mock(fileController, "download").resolveWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("downloads stale entry", ()=>{
    return queue.checkStaleFiles(()=>{})
    .then(()=>{
      assert(fileController.download.called);
      assert.equal(fileController.download.lastCall.args[0].filePath, "my-file");
    });
  });

  it("downloads multiple stale entries one after the other", ()=>{
    simple.mock(db.fileMetadata, "getStale").returnWith([{filePath: "my-file-0"}])
    .returnWith([{filePath: "my-file-1"}])
    .returnWith([{filePath: "my-file-2"}])
    .returnWith([]);

    return queue.checkStaleFiles(()=>{})
    .then(()=>{
      assert(fileController.download.called);
      assert.equal(fileController.download.callCount, 3);
      assert.equal(fileController.download.lastCall.args[0].filePath, "my-file-2");
    });
  });

  it("checks for stale files on interval if nothing was downloaded", ()=>{
    simple.mock(db.fileMetadata, "getStale").returnWith([]);

    let callCount = 0;
    return queue.checkStaleFiles((cb)=>{
      callCount += 1;
      if (callCount < 5) {return cb();}
    })
    .then(()=>{
      assert.equal(callCount, 5);
    });
  });

  it("retries on interval after a download failure", ()=>{
    simple.mock(db.fileMetadata, "getStale").returnWith([{filePath: "my-file-0"}])
    simple.mock(fileController, "download").rejectWith("test-error");
    simple.mock(log, "error").returnWith();

    let callCount = 0;
    return queue.checkStaleFiles((cb)=>{
      callCount += 1;
      if (callCount < 5) {return cb();}
    })
    .then(()=>{
      assert.equal(callCount, 5);
      assert.equal(log.error.callCount, 5);
    });
  });
});
