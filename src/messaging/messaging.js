const commonMessaging = require("common-display-module/messaging");
const config = require("../../src/config/config");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");
const licensing = require("../licensing");
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

const handleClientList = (message) => {
  return licensing.checkIfLicensingIsAvailable(message);
};

const handleLicensingUpdate = (message) => {
  return licensing.updateLicensingData(message);
};

const handleLicensingRequest = () => {
  return licensing.sendLicensing();
};

const messageReceiveHandler = (message) => {
  if (!message) {return;}
  if (!message.topic) {return;}

  switch (message.topic.toUpperCase()) {
    case "CLIENT-LIST":
      return handleClientList(message);
    case "LICENSING-UPDATE":
      return handleLicensingUpdate(message);
    case "MSFILEUPDATE":
      return handleMSFileUpdate(message);
    case "STORAGE-LICENSING-REQUEST":
      return handleLicensingRequest(message);
    case "WATCH":
      return handleWatch(message);
    case "WATCH-RESULT":
      return handleWatchResult(message);
    default:
      log.debug(`Unrecognized message topic: ${message.topic}`);
  }
};

module.exports = {
  init() {
    return commonMessaging.receiveMessages(config.moduleName).then((receiver) => {
      receiver.on("message", messageReceiveHandler);
      commonMessaging.getClientList(config.moduleName);
    });
  }
};
