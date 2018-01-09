const commonConfig = require("common-display-module");
const config = require("../../src/config/config");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const get = require("./get/get");
const util = require("util");
const fileSystem = require("../../src/files/file-system");

const logError = (err, userFriendlyMessage = "", filePath) => {
  console.dir(err);
  log.error({
    event_details: err ? err.stack || util.inspect(err, {depth: 1}) : "",
    version: config.getModuleVersion(),
    file_path: filePath,
    file_name: fileSystem.getFileName(filePath)
  }, userFriendlyMessage, config.bqTableName);
};

const handleWatch = (message) => {
  return watch.process(message)
    .catch((err) => {
      logError(err, "Handle WATCH Error", message.filePath);
    });
};

const handleWatchResult = (message) => {
  return watch.msResult(message)
  .catch((err) => {
    logError(err, "Handle WATCH-RESULT Error", message.filePath);
  });
};

const handleMSFileUpdate = (message) => {
  if (!message.type) {return;}

  if (message.type.toUpperCase() === "ADD" || message.type.toUpperCase() === "UPDATE") {
    return update.process(message)
      .catch((err) => {
        logError(err, "Handle MSFILEUPDATE Error", message.filePath);
      });
  }

  if (message.type.toUpperCase() === "DELETE") {
    return deleteFile.process(message)
      .catch((err) => {
        logError(err, "Handle DELETE Error", message.filePath);
      });
  }
};

const handleDirectCacheFileUpdate = (message) => {
  if (!message.type) {return;}

  switch (message.type.toUpperCase()) {
    case "UPDATE":
      return update.directCacheProcess(message)
        .catch((err) => {
          logError(err, "Handle DIRECTCACHEFILEUPDATE - UPDATE Error", message.filePath);
        });
    case "GET":
      try {
        get.directCacheProcess(message);
      } catch (err) {
        logError(err, "Handle DIRECTCACHEFILEUPDATE - GET Error", message.filePath);
      }
      break;
    case "DELETE":
      return deleteFile.directCacheProcess(message)
        .catch((err) => {
          logError(err, "Handle DIRECTCACHEFILEUPDATE - DELETE Error", message.filePath);
        });
    default:
  }
};

const messageReceiveHandler = (message) => {
  if (!message) {return;}
  if (!message.topic) {return;}

  switch (message.topic.toUpperCase()) {
      case "WATCH":
        return handleWatch(message);
      case "WATCH-RESULT":
        return handleWatchResult(message);
      case "MSFILEUPDATE":
        return handleMSFileUpdate(message);
      case "DIRECTCACHEFILEUPDATE":
        return handleDirectCacheFileUpdate(message);
      default:
  }
};

module.exports = {
  init() {
    return commonConfig.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
