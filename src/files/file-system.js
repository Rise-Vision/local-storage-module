const commonConfig = require("common-display-module");
const crypto = require("crypto");
const path = require("path");
const {platform} = require("rise-common-electron");

const DIR_CACHE = "cache";
const DIR_DOWNLOAD = "download";

module.exports = {

  getFileName(filePath) {
    if (!filePath) {return "";}

    return crypto.createHash("md5").update(filePath).digest("hex");
  },
  getPathInDownload(filePath) {
    const modulePath = commonConfig.getModulePath("local-storage");
    const fileName = module.exports.getFileName(filePath);

    return path.join(modulePath, DIR_DOWNLOAD, fileName);
  },
  isDownloading(filePath) {
    const downloadPath = module.exports.getPathInDownload(filePath);

    return platform.fileExists(downloadPath);
  },
  osPath(filePath) {
    const modulePath = commonConfig.getModulePath("local-storage");
    const fileName = module.exports.getFileName(filePath);

    return path.join(modulePath, DIR_CACHE, fileName);
  }

};
