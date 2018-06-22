const database = require("./db/lokijs/database");
const fileSystem = require("./files/file-system");
const messaging = require("./messaging/messaging");
const watchlist = require("./messaging/watch/watchlist");
const commonConfig = require("common-display-module");
const downloadQueue = require("./files/download-queue");
const config = require("./config/config");
const expiration = require("./expiration");
const logger = require("./logger");

const initialize = () => {
  return commonConfig.getDisplayId()
  .then(displayId=>{
    const baseBytes = 10;
    const expo = 5;
    const maxFileSizeBytes = Math.pow(baseBytes, expo);

    config.setDisplayId(displayId);
    config.setModuleVersion(commonConfig.getModuleVersion(config.moduleName));

    logger.resetLogFiles(maxFileSizeBytes);
    logger.setDisplaySettings({displayid: displayId});
  })
  .then(fileSystem.cleanupDownloadFolder)
  .then(()=>fileSystem.createDir(fileSystem.getDownloadDir()))
  .then(()=>fileSystem.createDir(fileSystem.getCacheDir()))
  .then(()=> {
    return fileSystem.clearLeastRecentlyUsedFiles().catch(logger.error);
  });
};

initialize()
  .then(database.start)
  .then(messaging.init)
  .then(expiration.cleanExpired)
  .then(watchlist.requestWatchlistCompare)
  .then(downloadQueue.checkStaleFiles)
  .then(()=>{
    setTimeout(()=>{
      logger.all("started");
    }, config.initialLogDelay);
  })
  .then(expiration.scheduleIncreaseSequence)
  .catch(logger.error);
