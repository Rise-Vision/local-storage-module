const database = require("./db/lokijs/database");
const fileSystem = require("./files/file-system");
const messaging = require("./messaging/messaging");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;
const externalLogger = require("common-display-module/external-logger")(config.bqProjectName, config.bqDatasetName, config.bqFailedEntryFile);
const modulePath = commonConfig.getModulePath(config.moduleName);
const util = require("util");

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, modulePath, config.moduleName);

const initialize = () => {
  return commonConfig.getDisplayId()
    .then(displayId=>{
      const baseBytes = 10;
      const expo = 5;
      const maxFileSizeBytes = Math.pow(baseBytes, expo);

      config.setDisplayId(displayId);
      config.setModuleVersion(commonConfig.getModuleVersion(config.moduleName));

      log.resetLogFiles(maxFileSizeBytes);
      log.setDisplaySettings({displayid: displayId});
    })
    .then(fileSystem.cleanupDownloadFolder)
    .then(()=>fileSystem.createDir(fileSystem.getDownloadDir()))
    .then(()=>fileSystem.createDir(fileSystem.getCacheDir()))
};

initialize()
  .then(database.start)
  .then(messaging.init)
  .then(()=>{
    log.all("started", {
      version: config.getModuleVersion()
    }, null, config.bqTableName);
  })
  .catch((err)=>{
    log.error({
      event_details: err ? err.message || util.inspect(err, {depth: 1}) : "",
      version: config.getModuleVersion()
    }, null, config.bqTableName);
  });
