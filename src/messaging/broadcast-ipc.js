const commonMessaging = require("common-display-module/messaging");
const fileSystem = require("../files/file-system");
const config = require("../config/config");
const db = require("../db/api");

const LICENSING_UPDATE_TOPIC = "STORAGE-LICENSING-UPDATE";

module.exports = {
  broadcast(topic, data = {}) {
    const message = Object.assign({from: config.moduleName, topic}, data);

    if (topic === LICENSING_UPDATE_TOPIC) {
      commonMessaging.broadcastToLocalWS(message);
      return;
    }

    const fileOwners = db.owners.get(data.filePath);

    // ensure to broadcast via websocket if "ws-client" is an owner
    if (fileOwners && fileOwners.owners.includes("ws-client")) {
      commonMessaging.broadcastToLocalWS(message);

      if (fileOwners.owners.length === 1) {return;}
    }

    commonMessaging.broadcastMessage(message);
  },
  fileUpdate(data = {}) {
    log.file(`Broadcasting ${data.status} FILE-UPDATE for ${data.filePath}`);
    const ospath = {ospath: fileSystem.getPathInCache(data.filePath, data.version)};
    const messageObj = Object.assign({}, data, data.version ? ospath : {});
    module.exports.broadcast("FILE-UPDATE", messageObj);
  },
  fileError(data = {}) {
    log.file(`Broadcasting FILE-ERROR for ${data.filePath} ${data.msg} ${data.detail}`);
    module.exports.broadcast("FILE-ERROR", data);
  },
  licensingUpdate(isAuthorized, userFriendlyStatus, data = {}) {
    log.file(`Broadcasting ${LICENSING_UPDATE_TOPIC} - ${userFriendlyStatus}`);
    const messageObj = Object.assign({}, {isAuthorized, userFriendlyStatus}, data);
    module.exports.broadcast(LICENSING_UPDATE_TOPIC, messageObj);
  }
};
