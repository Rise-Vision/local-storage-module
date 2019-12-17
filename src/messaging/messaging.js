const commonMessaging = require("common-display-module/messaging");
const config = require("../../src/config/config");
const add = require("./add/add");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const watchlist = require("./watch/watchlist");
const clearLocalStorageRequest = require('./clear-local-storage-request');
const debugDataRequest = require('./debug-data-request');
const logger = require("../logger");
const db = require("../db/api");

const actions = {ADD: add, UPDATE: update, DELETE: deleteFile};

const handleWatch = (message) => {
  return watch.process(message)
    .catch((err) => {
      logger.error(err, "Handle WATCH Error", {file_path: message.filePath});
    });
};

const handleWatchResult = (message) => {
  return watch.msResult(message)
  .catch((err) => {
    logger.error(err, "Handle WATCH-RESULT Error", {file_path: message.filePath});
  });
};

const handleWatchlistResult = (message) => {
  return watchlist.refresh(message.watchlist, message.lastChanged)
  .catch((err) => {
    logger.error(err, "Handle WATCHLIST-RESULT Error");
  });
};

const handleMSFileUpdate = (message) => {
  if (!message.type) {return;}

  const type = message.type.toUpperCase();
  const action = actions[type];

  if (!action) {return;}

  logger.all(`MS file ${type} received`, {file_path: message.filePath});

  return action.process(message)
  .catch(err => {
    logger.error(err, `Handle MSFILEUPDATE ${type} Error`, {file_path: message.filePath});
  });
};

const handleClearLocalStorageRequest = () => clearLocalStorageRequest.process();
const handleDebugDataRequest = () => debugDataRequest.process();
const handleUnwatchResult = () => db.expired.clear();

const messageReceiveHandler = (message) => {
  if (!message) {return;}
  const topic = message.topic || message.msg;
  if (!topic) {return;}

  switch (topic.toUpperCase()) {
    case "CLEAR-LOCAL-STORAGE-REQUEST":
      return handleClearLocalStorageRequest();
    case "DEBUG-DATA-REQUEST":
      return handleDebugDataRequest();
    case "MSFILEUPDATE":
      return handleMSFileUpdate(message);
    case "WATCH":
      return handleWatch(message);
    case "WATCH-RESULT":
      return handleWatchResult(message);
    case "WATCHLIST-RESULT":
      return handleWatchlistResult(message);
    case "UNWATCH-RESULT":
      return handleUnwatchResult(message);
    default:
      logger.debug(`Unrecognized message topic: ${message.topic}`);
  }
};

module.exports = {
  init() {
    return commonMessaging.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
