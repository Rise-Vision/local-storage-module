/* eslint-env mocha */

const debugData = require("../../../src/messaging/debug-data-request");
const assert = require("assert");
const db = require("../../../src/db/api");
const simple = require("simple-mock");
const fileSystem = require("../../../src/files/file-system");
const logger = require("../../../src/logger");

describe("DEBUG-DATA-REQUEST - unit", ()=>{

  beforeEach(()=>{
    simple.mock(logger, "all").returnWith();
    simple.mock(fileSystem, "getCacheDirEntries").resolveWith([]);
    simple.mock(db, "getEntireDBObject").resolveWith({});
  });

  afterEach(()=>{
    simple.restore();
  });

  it("returns data", done =>{
    debugData.process()
    .then(()=>{
      assert(logger.all.called);
      assert.equal(logger.all.lastCall.args[1], '{"files":[],"databaseContents":{}}');

      done();
    });
  });

});
