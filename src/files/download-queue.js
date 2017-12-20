// const fileController = require("./file-controller");
const db = require("../db/api");
const queueCheckInterval = 5000;
const fileController = require("./file-controller");

module.exports = {
  checkStaleFiles(timer = setTimeout) {
    const staleEntries = db.fileMetadata.getStale();
    if (!staleEntries.length) {
      return Promise.resolve(timer(module.exports.checkStaleFiles, queueCheckInterval));
    }

    return fileController.download(staleEntries[0])
    .then(module.exports.checkStaleFiles)
    .catch((err)=>{
      log.error(err);
      timer(module.exports.checkStaleFiles, queueCheckInterval);
    });
  }
};
