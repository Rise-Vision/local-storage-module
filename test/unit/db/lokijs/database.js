/* eslint-env mocha */
const assert = require("assert");
const database = require("../../../../src/db/lokijs/database");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const path = require("path");
const tempDir = path.join(require("os").tmpdir(), "lokijs_temp_dir");

describe("lokijs", ()=>{
  afterEach(()=>{
    simple.restore();
  });

  before(()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir)
    return database.start();
  });

  after(()=>{
    database.close();
  });

  it("adds all required collections", ()=>{
    assert(database.getCollection("metadata"));
    assert(database.getCollection("owners"));
    assert(database.getCollection("watchlist"));
  });
});
