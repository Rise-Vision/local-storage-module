/* eslint-env mocha */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const fileSystem = require("../../../src/files/file-system");

describe("file system", ()=> {

  const testLocalStoragePath = "test-local-storage-path/";

  beforeEach(() => {
    simple.mock(commonConfig, "getLocalStoragePath").returnWith(testLocalStoragePath);
  });

  afterEach(() => {
    simple.restore();
  });

  it("should provide os path for a file using gcs filePath", ()=> {
    const filePath = "test-gcs-file-path";
    assert.equal(fileSystem.osPath(filePath), `${testLocalStoragePath}create-dir-structure-for-${filePath}`);
  });

});
