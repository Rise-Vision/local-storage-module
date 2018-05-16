/* eslint-env mocha */
/* eslint-disable no-magic-numbers, max-statements */
const assert = require("assert");
const simple = require("simple-mock");
const commonConfig = require("common-display-module");
const mockfs = require("mock-fs");
const fs = require("fs-extra");
const platform = require("rise-common-electron").platform;

const fileSystem = require("../../../src/files/file-system");

describe("File System", ()=> {

  const mockModulePath = "rvplayer/modules/";
  const expectedDataPath = "rvplayer/modules/local-storage/";
  const testFilePath = "test-bucket/test-folder/test-file.jpg";

  beforeEach(() => {
    simple.mock(commonConfig, "getModuleDir").returnWith(mockModulePath);
  });

  afterEach(() => {
    simple.restore();
  });

  describe("getCacheDir", () => {
    it("should provide path to cache folder", ()=> {
      assert.equal(fileSystem.getCacheDir(), `${expectedDataPath}cache`);
    });
  });

  describe("getDownloadDir", () => {
    it("should provide path to download folder", ()=> {
      assert.equal(fileSystem.getDownloadDir(), `${expectedDataPath}download`);
    });
  });

  describe("getPathInCache", () => {
    it("should provide path for a file in cache given a gcs filePath", ()=> {
      assert.equal(fileSystem.getPathInCache(testFilePath), `${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`);
    });
  });

  describe("getLocalFileUrl", () => {
    it("should provide local file url for a file in cache given a gcs filePath", ()=> {
      assert.equal(fileSystem.getLocalFileUrl(testFilePath), `file:///${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`);
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
      assert.equal(fileSystem.getPathInDownload(testFilePath), `${expectedDataPath}download/e498da09daba1d6bb3c6e5c0f0966784`);
    });
  });

  describe("processing", ()=>{
    it("should return true if file hash name is found in processing list", () => {
      fileSystem.addToProcessingList("abc123");
      assert(fileSystem.isProcessing("abc123"));
    });

    it("should return false if file hash name is not found in processing list", () => {
      fileSystem.removeFromProcessingList("abc123");
      assert(!fileSystem.isProcessing("abc123"));
    });
  });

  describe("isThereAvailableSpace", () => {
    const oneGB = 1024 * 1024 * 1024;
    const fiveHundredTwelveMB = 512 * 1024 * 1024;
    const threeHundredMB = 300 * 1024 * 1024;

    it("should return  true when passing no fileSize and there is space in disk", () => {
      assert(fileSystem.isThereAvailableSpace(oneGB));
    });

    it("should return true when passing no fileSize and there is space in disk even though a file is being downloaded", () => {
      fileSystem.addToDownloadTotalSize(threeHundredMB);
      assert(fileSystem.isThereAvailableSpace(oneGB));
      fileSystem.removeFromDownloadTotalSize(threeHundredMB);
    });

    it("should return false when passing no fileSize and there is no space in disk", () => {
      assert(!fileSystem.isThereAvailableSpace(fiveHundredTwelveMB));
    });

    it("should return false when passing no fileSize and there is no space in disk when downloading a file", () => {
      fileSystem.addToDownloadTotalSize(fiveHundredTwelveMB);
      assert(!fileSystem.isThereAvailableSpace(oneGB));
      fileSystem.removeFromDownloadTotalSize(fiveHundredTwelveMB);
    });

    it("should return false when passing fileSize and there is no space in disk", () => {
      assert(!fileSystem.isThereAvailableSpace(oneGB, fiveHundredTwelveMB));
    });

    it("should return true when passing fileSize and there is space in disk", () => {
      assert(fileSystem.isThereAvailableSpace(oneGB, threeHundredMB));
    });

    it("should return false when passing fileSize and there is space in disk but it is downloading", () => {
      fileSystem.addToDownloadTotalSize(threeHundredMB);
      assert(!fileSystem.isThereAvailableSpace(oneGB, fiveHundredTwelveMB));
      fileSystem.removeFromDownloadTotalSize(threeHundredMB);
    });
  });

  describe("moveFromDownloadToCache", () => {

    beforeEach(()=>{
      mockfs.restore();
    });

    it("should move the file", () => {
      mockfs({
        [`${expectedDataPath}download`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": "some content"
        },
        [`${expectedDataPath}cache`]: {}
      });

      return fileSystem.moveFileFromDownloadToCache(testFilePath)
        .then(()=>{
          assert(!platform.fileExists(`${expectedDataPath}download/e498da09daba1d6bb3c6e5c0f0966784`));
          assert(platform.fileExists(`${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`));

        })
        .catch((err) => {
          console.log("shouldn't be here", err);
          assert(false);
        });
      });
    });

  describe("deleteFileFromDownload", () => {

    it("should delete a file in download directory", (done) => {
      mockfs({
        [`${expectedDataPath}download`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": "some content"
        }
      });

      fileSystem.deleteFileFromDownload(testFilePath);

      setTimeout(()=>{
        assert(!platform.fileExists(`${expectedDataPath}download/e498da09daba1d6bb3c6e5c0f0966784`));
        done();
      }, 200);
    });

  });

  describe("cleanupDownloadFolder", () => {

    it("should delete all files in download directory", () => {
      mockfs({
        [`${expectedDataPath}download`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": "some content"
        }
      });

      assert(platform.fileExists(`${expectedDataPath}download/e498da09daba1d6bb3c6e5c0f0966784`));

      return fileSystem.cleanupDownloadFolder(testFilePath)
        .then(() => {
          assert(!platform.fileExists(`${expectedDataPath}download/e498da09daba1d6bb3c6e5c0f0966784`));
        });
    });

  });

  describe("clearLeastRecentlyUsedFiles", () => {

    beforeEach(()=>{
      mockfs.restore();
    });

    it("should not delete anything if it available space is greather than threshold", () => {
      const tenGB = 10 * 1024 * 1024 * 1024;
      simple.mock(platform, "getFreeDiskSpace").resolveWith(tenGB);
      mockfs({
        [`${expectedDataPath}cache`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": "some content"
        }
      });

      assert.ok(platform.fileExists(`${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`));

      return fileSystem.clearLeastRecentlyUsedFiles()
        .then(() => {
          assert.ok(platform.fileExists(`${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`));
        });
    });

    it("should not delete anything if there is no file to be deleted", () => {
      const halfGB = 512 * 1024 * 1024;
      simple.mock(platform, "getFreeDiskSpace").resolveWith(halfGB);
      simple.mock(fs, "remove").callOriginal();
      mockfs({
        [`${expectedDataPath}cache`]: {}
      });

      return fileSystem.clearLeastRecentlyUsedFiles()
        .then(() => {
          assert.equal(fs.remove.called, false);
        });
    });

    it("should delete least recently used file until available space is greather than threshold", () => {
      simple.mock(fs, "remove").callOriginal();

      const halfGB = 512 * 1024 * 1024;
      const oneGB = 2 * halfGB;
      simple.mock(platform, "getFreeDiskSpace")
        .resolveWith(halfGB)
        .resolveWith(oneGB);

      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const oneMB = 1024 * 1024;
      mockfs({
        [`${expectedDataPath}cache`]: {
          "e498da09daba1d6bb3c6e5c0f0966784": mockfs.file({
            content: "I'm very recent",
            atime: now,
            size: oneMB
          }),
          "e498da09daba1d6bb3c6ab23kdbasf84": mockfs.file({
            content: "I'm old",
            atime: oneYearAgo,
            size: oneGB
          })
        }
      });

      return fileSystem.clearLeastRecentlyUsedFiles()
        .then(() => {
          assert.equal(fs.remove.callCount, 1);
          assert.equal(fs.remove.lastCall.args, `${expectedDataPath}cache/e498da09daba1d6bb3c6ab23kdbasf84`);
          assert.ok(platform.fileExists(`${expectedDataPath}cache/e498da09daba1d6bb3c6e5c0f0966784`));
          assert.equal(platform.fileExists(`${expectedDataPath}cache/e498da09daba1d6bb3c6ab23kdbasf84`), false);
        });
    });

  });

});
