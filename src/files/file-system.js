const commonConfig = require("common-display-module");
const crypto = require("crypto");
const path = require("path");
const platform = require("rise-common-electron").platform;
const fs = require("fs-extra");

const DIR_CACHE = "cache";
const DIR_DOWNLOAD = "download";

const halfGB = 512 * 1024 * 1024; // eslint-disable-line no-magic-numbers

const processingList = new Set();
let downloadTotalSize = 0;

module.exports = {

  getFileName(filePath) {
    if (!filePath) {return "";}

    return crypto.createHash("md5").update(filePath).digest("hex");
  },
  getCacheDir() {
    const modulePath = commonConfig.getModulePath("local-storage");
    return path.join(modulePath, DIR_CACHE);
  },
  getDownloadDir() {
    const modulePath = commonConfig.getModulePath("local-storage");
    return path.join(modulePath, DIR_DOWNLOAD);
  },
  getDiskThreshold() {
    return halfGB;
  },
  getPathInDownload(filePath) {
    const fileName = module.exports.getFileName(filePath);
    const downloadDir = module.exports.getDownloadDir();

    return path.join(downloadDir, fileName);
  },
  isDownloading(filePath) {
    const downloadPath = module.exports.getPathInDownload(filePath);

    return platform.fileExists(downloadPath);
  },
  getPathInCache(filePath) {
    const fileName = module.exports.getFileName(filePath);
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
    return platform.getFreeDiskSpace(module.exports.getCacheDir());
  },
  isThereAvailableSpace(spaceOnDisk, fileSize = 0) {
    if (!spaceOnDisk || Number.isNaN(spaceOnDisk)) {throw Error("Not a valid value for spaceOnDisk");}

    const spaceLeft = spaceOnDisk - downloadTotalSize - module.exports.getDiskThreshold() - fileSize;
    return spaceLeft > 0;
  },
  moveFileFromDownloadToCache(filePath) {
    return fs.move(module.exports.getPathInDownload(filePath), module.exports.getPathInCache(filePath));
  },
  deleteFileFromDownload(filePath) {
    const downloadPath = module.exports.getPathInDownload(filePath);

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
