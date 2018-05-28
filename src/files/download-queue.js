const db = require("../db/api");
const queueCheckInterval = 5000;
const fileController = require("./file-controller");
const logger = require("../logger");

module.exports = {
  checkStaleFiles(timer = setTimeout) {
    const staleEntries = db.fileMetadata.getStale();
    if (!staleEntries.length) {
      return intervalCheck();
    }

    return fileController.download(staleEntries[0])
    .then(module.exports.checkStaleFiles.bind(null, timer))
    .catch((err)=>{
      logger.error(err);
      return intervalCheck();
    });

    function intervalCheck() {
      return Promise.resolve(timer(module.exports.checkStaleFiles.bind(null, timer), queueCheckInterval));
    }
  }
};
