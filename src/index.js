const database = require("./db/lokijs/database");
const fileSystem = require("./files/file-system");
const messaging = require("./messaging/messaging");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;
const externalLogger = require("common-display-module/external-logger")(config.bqProjectName, config.bqDatasetName, config.bqFailedEntryFile);
const modulePath = commonConfig.getModulePath(config.moduleName);

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, modulePath, config.moduleName);

const initialize = () => {
  return commonConfig.getDisplayId()
    .then(displayId=>{
      log.resetLogFiles(Math.pow(10, 5)); // eslint-disable-line no-magic-numbers
      log.setDisplaySettings({displayid: displayId})
    })
    .then(fileSystem.cleanupDownloadFolder())
    .then(fileSystem.createDir(fileSystem.getDownloadDir()))
    .then(fileSystem.createDir(fileSystem.getCacheDir()))
};

initialize()
  .then(database.start)
  .then(messaging.init)
  .catch((err)=>{
    log.error({
      event_details: JSON.stringify(err),
      version: commonConfig.getModuleVersion()
    }, null, config.bqTableName);
  });
