const db = require("../db/api");
const downloader = require("./downloader");
const fileSystem = require("./file-system");
const urlProvider = require("./url-provider");

module.exports = {
  download(filePath) {
    const fileMetaData = db.fileMetadata.get(filePath);

    if (!fileMetaData) {
      return Promise.reject(new Error("No metadata for file download"));
    }

    if (fileSystem.isDownloading(filePath)) {
      return Promise.resolve();
    }

    return urlProvider.getURL(fileMetaData.token).then(downloader.download);
  }
};
