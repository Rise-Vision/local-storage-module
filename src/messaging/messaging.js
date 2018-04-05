const commonMessaging = require("common-display-module/messaging");
const config = require("../../src/config/config");
const add = require("./add/add");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const watchlist = require("./watch/watchlist");
const util = require("util");

const actions = {ADD: add, UPDATE: update, DELETE: deleteFile};

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

const handleWatchlistResult = (message) => {
  return watchlist.refresh(message.watchlist, message.lastChanged)
  .catch((err) => {
    logError(err, "Handle WATCHLIST-RESULT Error", "");
  });
};

const handleMSFileUpdate = (message) => {
  if (!message.type) {return;}

  const type = message.type.toUpperCase();
  const action = actions[type];

  if (!action) {return;}

  return action.process(message)
  .catch(err => {
    logError(err, `Handle MSFILEUPDATE ${type} Error`, message.filePath);
  });
};

const messageReceiveHandler = (message) => {
  if (!message) {return;}
  if (!message.topic) {return;}

  switch (message.topic.toUpperCase()) {
    case "MSFILEUPDATE":
      return handleMSFileUpdate(message);
    case "WATCH":
      return handleWatch(message);
    case "WATCH-RESULT":
      return handleWatchResult(message);
    case "WATCHLIST-RESULT":
      return handleWatchlistResult(message);
    default:
      log.debug(`Unrecognized message topic: ${message.topic}`);
  }
};

module.exports = {
  init() {
    return commonMessaging.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
