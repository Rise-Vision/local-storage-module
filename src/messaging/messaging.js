const commonMessaging = require("common-display-module/messaging");
const config = require("../../src/config/config");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const util = require("util");

const logError = (err, userFriendlyMessage = "", filePath) => {
  console.dir(err);
  log.error({
    event_details: err ? err.stack || util.inspect(err, {depth: 1}) : "",
    version: config.getModuleVersion(),
    file_path: filePath
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
    return commonMessaging.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
