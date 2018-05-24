/* eslint-env mocha */
/* eslint-disable no-magic-numbers */
const assert = require("assert");
const fs = require("fs-extra");
const {platform} = require("rise-common-electron");
const fileSystem = require("../../../../src/files/file-system");
const database = require("../../../../src/db/lokijs/database");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const path = require("path");
const os = require("os");

const tempDir = path.join(os.tmpdir(), "lokijs_temp_dir");
const dbSaveInterval = 5

function waitForDatabaseSaveInterval() {
  return new Promise(res=>setTimeout(()=>{
    res();
  }, dbSaveInterval * dbSaveInterval));
}

describe("lokijs", () => {

  before(() => {
    fs.ensureDirSync(tempDir);
    fs.removeSync(path.join(tempDir, "local-storage.db"));
  });

  afterEach(() => {
    simple.restore();
    database.destroy();
    return waitForDatabaseSaveInterval();
  });

  it("should add all required collections when started", ()=>{
    simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

    return database.start(os.tmpdir(), dbSaveInterval).then(() => {
      assert.ok(database.getCollection("metadata"));
      assert.ok(database.getCollection("owners"));
      assert.ok(database.getCollection("watchlist"));
    });
  });

  describe("syncCacheMetadataWithFileSystem", () => {
    before(()=>{
      const tempDBPath = path.join(os.tmpdir(), "lokijs_sync_temp_dir");
      return platform.mkdirRecursively(tempDBPath)
      .then(()=>{
        return database.start(os.tmpdir(), dbSaveInterval);
      })
      .then(()=> waitForDatabaseSaveInterval());
    });

    afterEach(() => database.getCollection("metadata").clear());

    after(()=>{
      database.destroy();
      database.close();
    });

    it("should remove files not cached from metadata", ()=>{
      simple.mock(commonConfig, "getModulePath").returnWith(tempDir);
      simple.mock(fileSystem, "readCacheDir").resolveWith([]);

      return mockPersistedMetadata([{filePath: 'any', version: 'any', status: 'CURRENT'}])
      .then(() => database.syncCacheMetadataWithFileSystem())
      .then(() => {
        const metadata = database.getCollection("metadata").find();
        assert.equal(metadata.length, 0);
      });
    });

    it("should not remove non current files from metadata", ()=>{
      simple.mock(commonConfig, "getModulePath").returnWith(tempDir);
      simple.mock(fileSystem, "readCacheDir").resolveWith([]);

      const mockedMetadata = [
        {filePath: 'current', version: 'any', status: 'CURRENT'},
        {filePath: 'stale', version: 'any', status: 'STALE'},
        {filePath: 'other', version: 'any', status: 'OTHER'}
      ];

      return mockPersistedMetadata(mockedMetadata)
      .then(() => database.syncCacheMetadataWithFileSystem())
      .then(() => {
        const metadata = database.getCollection("metadata").find();
        assert.equal(metadata.length, 2);
      });
    });

    it("should not remove cached current files from metadata", ()=>{
      simple.mock(commonConfig, "getModulePath").returnWith(tempDir);

      const mockedMetadata = [
        {filePath: 'cached', version: 'any', status: 'CURRENT'},
        {filePath: 'notInCache', version: 'any', status: 'CURRENT'}
      ];

      simple.mock(fileSystem, "readCacheDir").resolveWith([fileSystem.getPathInCache('cached', 'any')]);

      return mockPersistedMetadata(mockedMetadata)
      .then(() => database.syncCacheMetadataWithFileSystem())
      .then(() => {
        const metadata = database.getCollection("metadata").find();
        assert.equal(metadata.length, 1);
      });
    });

    function mockPersistedMetadata(entries) {
      const metadata = database.getCollection("metadata");
      entries.forEach(entry => metadata.insert(entry));
      return waitForDatabaseSaveInterval();
    }

  });
});
