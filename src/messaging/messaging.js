const commonConfig = require("common-display-module");
const config = require("../../src/config/config");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const util = require("util");
const fileSystem = require("../../src/files/file-system");

const logError = (filePath, err, userFriendlyMessage = "") => {
  log.error({
    event_details: err ? err.message || util.inspect(err, {depth: 1}) : "",
    version: config.getModuleVersion(),
    file_path: filePath,
    file_name: fileSystem.getFileName(filePath)
  }, userFriendlyMessage, config.bqTableName);
};

const handleWatch = (message) => {
  return watch.process(message)
    .catch((err) => {
      logError(err, "Handle WATCH Error");
    });
};

const handleWatchResult = (message) => {
  return watch.msResult(message)
    .catch((err) => {
      logError(err, "Handle WATCH-RESULT Error");
    });
};

const handleMSFileUpdate = (message) => {
  if (!message.type) {return;}

  if (message.type.toUpperCase() === "ADD" || message.type.toUpperCase() === "UPDATE") {
    return update.process(message)
      .catch((err) => {
        logError(err, "Handle MSFILEUPDATE Error");
      });
  }

  if (message.type.toUpperCase() === "DELETE") {
    return deleteFile.process(message)
      .catch((err) => {
        logError(err, "Handle DELETE Error");
      });
  }
};

const messageReceiveHandler = (message) => {
  if (!message) {return;}
  if (!message.topic) {return;}

  if (message.topic.toUpperCase() === "WATCH") {
    return handleWatch(message);
  } else if (message.topic.toUpperCase() === "WATCH-RESULT") {
    return handleWatchResult(message);
  } else if (message.topic.toUpperCase() === "MSFILEUPDATE") {
    return handleMSFileUpdate(message);
  }
};

module.exports = {
  init() {
    return commonConfig.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
