const util = require("util");
const commonConfig = require("common-display-module");
const config = require("./config/config");
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;
const externalLogger = require("common-display-module/external-logger")(config.bqProjectName, config.bqDatasetName, config.bqFailedEntryFile);
const modulePath = commonConfig.getModulePath(config.moduleName);

const log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, modulePath, config.moduleName);

const originalErrorFn = log.error;

function error(err, userFriendlyMessage = null, detail = {}) {
  const basicDetail = {
    event_details: err ? err.stack || util.inspect(err, {depth: 1}) : "",
    version: config.getModuleVersion()
  };
  originalErrorFn(Object.assign(basicDetail, detail), userFriendlyMessage, config.bqTableName);
}

const originalWarningFn = log.error;

function warning(detail) {
  originalWarningFn(detail, config.bqTableName);
}

module.exports = Object.assign(log, {error, warning});
