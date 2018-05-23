/* eslint-env mocha */
/* eslint-disable no-magic-numbers */
const assert = require("assert");
const fs = require("fs-extra");
const fileSystem = require("../../../../src/files/file-system");
const database = require("../../../../src/db/lokijs/database");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const path = require("path");
const tempDir = path.join(require("os").tmpdir(), "lokijs_temp_dir");

describe("lokijs", () => {

  before(() => {
    fs.removeSync(path.join(tempDir, "local-storage.db"));
  });

  afterEach(() => {
    simple.restore();
    database.destroy();
  });

  it("should add all required collections when started", ()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

    return database.start().then(() => {
      assert.ok(database.getCollection("metadata"));
      assert.ok(database.getCollection("owners"));
      assert.ok(database.getCollection("watchlist"));
    });
  });

  it("should remove files not cached from metadata when started", ()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

    return mockPersistedMetadata([{filePath: 'any', version: 'any', status: 'CURRENT'}])
    .then(() => database.start())
    .then(() => {
      const metadata = database.getCollection("metadata").find();
      assert.equal(metadata.length, 0);
    });
  });

  it("should not remove non current files from metadata when started", ()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

    const mockedMetadata = [
      {filePath: 'current', version: 'any', status: 'CURRENT'},
      {filePath: 'stale', version: 'any', status: 'STALE'},
      {filePath: 'other', version: 'any', status: 'OTHER'}
    ];

    return mockPersistedMetadata(mockedMetadata)
    .then(() => database.start())
    .then(() => {
      const metadata = database.getCollection("metadata").find();
      assert.equal(metadata.length, 2);
    });
  });

  it("should not remove cached current files from metadata when started", ()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

    const mockedMetadata = [
      {filePath: 'cached', version: 'any', status: 'CURRENT'},
      {filePath: 'notInCache', version: 'any', status: 'CURRENT'}
    ];

    return mockPersistedMetadata(mockedMetadata)
    .then(() => {
      simple.mock(fileSystem, "isNotCached").returnWith(false).returnWith(true);
      return database.start()
    })
    .then(() => {
      const metadata = database.getCollection("metadata").find();
      assert.equal(metadata.length, 1);
    });
  });

  function mockPersistedMetadata(entries) {
    return database.start().then(() => {
      const metadata = database.getCollection("metadata");
      entries.forEach(entry => metadata.insert(entry));
    })
    .then(() => database.close());
  }
});
