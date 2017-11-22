/* eslint-env mocha */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const fileSystem = require("../../../src/files/file-system");
const mockfs = require("mock-fs");

describe("File System", ()=> {

  const testModulePath = "rvplayer/modules/local-storage/";
  const testFilePath = "test-bucket/test-folder/test-file.jpg";

  beforeEach(() => {
    simple.mock(commonConfig, "getModulePath").returnWith(testModulePath);
  });

  afterEach(() => {
    simple.restore();
  });

  describe("getPathInCache", () => {
    it("should provide os path for a file given a gcs filePath", ()=> {
      assert.equal(fileSystem.getPathInCache(testFilePath), `${testModulePath}cache/e498da09daba1d6bb3c6e5c0f0966784`);
    });
  });

  describe("getFileName", () => {
    it("should return an empty string if no file path provided", () => {
      assert.equal(fileSystem.getFileName(), "");
    });

    it("should return an encoded file name given a file path", () => {
      assert.equal(fileSystem.getFileName(testFilePath), "e498da09daba1d6bb3c6e5c0f0966784");
    });
  });

  describe("getPathInDownload", () => {
    it("should return the path to a file in download folder given a gcs filePath", () => {
      assert.equal(fileSystem.getPathInDownload(testFilePath), `${testModulePath}download/e498da09daba1d6bb3c6e5c0f0966784`);
    });
  });

  describe("isDownloading", ()=>{
     it("should return true if file is found in the download folder given a gcs filePath", () => {
      mockfs({
        [`${testModulePath}download`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": "some content"
        }
      });

      assert(fileSystem.isDownloading(testFilePath));
      mockfs.restore();
    });

    it("should return false if file is not found in the download folder given a gcs filePath", () => {
      assert(!fileSystem.isDownloading(testFilePath));
    });
  });

});
