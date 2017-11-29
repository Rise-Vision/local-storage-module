const commonConfig = require("common-display-module");
const config = require("../../src/config/config");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");

const handleWatch = (message) => {
  return watch.process(message)
    .catch((err) => {
      log.error({
        event_details: JSON.stringify(err),
        version: commonConfig.getModuleVersion()
      }, null, config.bqTableName);
    });
};

const handleWatchResult = (message) => {
  return watch.msResult(message)
    .catch((err) => {
      log.error({
        event_details: JSON.stringify(err),
        version: commonConfig.getModuleVersion()
      }, null, config.bqTableName);
    });
};

const handleMSFileUpdate = (message) => {
  if (!message.type) {return;}

  if (message.type.toUpperCase() === "ADD" || message.type.toUpperCase() === "UPDATE") {
    return update.process(message)
      .catch((err) => {
        log.error({
          event_details: JSON.stringify(err),
          version: commonConfig.getModuleVersion()
        }, null, config.bqTableName);
      });
  }

  if (message.type.toUpperCase() === "DELETE") {
    return deleteFile.process(message)
      .catch((err) => {
        log.error({
          event_details: JSON.stringify(err),
          version: commonConfig.getModuleVersion()
        }, null, config.bqTableName);
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
