const commonConfig = require("common-display-module");
const crypto = require("crypto");
const path = require("path");
const platform = require("rise-common-electron").platform;
const fs = require("fs-extra");
const config = require("../../src/config/config");

const DIR_CACHE = "cache";
const DIR_DOWNLOAD = "download";

const halfGB = 512 * 1024 * 1024; // eslint-disable-line no-magic-numbers

const processingList = new Set();
let downloadTotalSize = 0;

module.exports = {

  getFileName(filePath, version = "") {
    if (!filePath) {return "";}

    return crypto.createHash("md5").update(`${filePath}${version}`).digest("hex");
  },
  getCacheDir() {
    const modulePath = commonConfig.getModuleDir();
    return path.join(modulePath, config.moduleName, DIR_CACHE);
  },
  getDownloadDir() {
    const modulePath = commonConfig.getModuleDir();
    return path.join(modulePath, config.moduleName, DIR_DOWNLOAD);
  },
  getDiskThreshold() {
    return halfGB;
  },
  getPathInDownload(filePath, version = "") {
    const fileName = module.exports.getFileName(filePath, version);
    const downloadDir = module.exports.getDownloadDir();

    return path.join(downloadDir, fileName);
  },
  isDownloading(filePath) {
    const downloadPath = module.exports.getPathInDownload(filePath);

    return platform.fileExists(downloadPath);
  },
  getPathInCache(filePath, version = "") {
    const fileName = module.exports.getFileName(filePath, version);
    const cacheDir = module.exports.getCacheDir();

    return path.join(cacheDir, fileName);
  },
  isProcessing(fileName) {
    return processingList.has(fileName);
  },
  addToProcessingList(fileName) {
    processingList.add(fileName);
  },
  removeFromProcessingList(fileName) {
    processingList.delete(fileName);
  },
  addToDownloadTotalSize(size = 0) {
    downloadTotalSize += parseInt(size, 10);
  },
  removeFromDownloadTotalSize(size = 0) {
    downloadTotalSize -= parseInt(size, 10);
  },
  getAvailableSpace() {
    return platform.getFreeDiskSpace(module.exports.getCacheDir())
    .catch(err=>console.log(err));
  },
  isThereAvailableSpace(spaceOnDisk, fileSize = 0) {
    if (spaceOnDisk === 0) {return false;}

    if (!spaceOnDisk || Number.isNaN(spaceOnDisk)) {
      throw Error("Not a valid value for spaceOnDisk");
    }

    const spaceLeft = spaceOnDisk - downloadTotalSize - module.exports.getDiskThreshold() - fileSize;
    return spaceLeft > 0;
  },
  moveFileFromDownloadToCache(filePath, version) {
    return fs.move(module.exports.getPathInDownload(filePath, version), module.exports.getPathInCache(filePath, version), {overwrite: true});
  },
  deleteFileFromDownload(filePath, version) {
    const downloadPath = module.exports.getPathInDownload(filePath, version);

    if (platform.fileExists(downloadPath)) {
      fs.remove(downloadPath)
        .catch(err=>console.log(err));
    }
  },
  cleanupDownloadFolder() {
    return fs.emptyDir(module.exports.getDownloadDir())
  },
  createDir(dir) {
    return fs.ensureDir(dir);
  }

};
