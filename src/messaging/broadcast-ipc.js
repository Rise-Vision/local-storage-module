const commonMessaging = require("common-display-module/messaging");
const fileSystem = require("../files/file-system");
const config = require("../config/config");
const db = require("../db/api");
const logger = require("../logger");

module.exports = {
  broadcast(topic, data = {}) {
    const message = Object.assign({from: config.moduleName, topic}, data);

    const fileOwners = db.owners.get(data.filePath);

    // ensure to broadcast via websocket if "ws-client" is an owner
    if (fileOwners && fileOwners.owners.includes("ws-client")) {
      commonMessaging.broadcastToLocalWS(message);

      if (fileOwners.owners.length === 1) {return;}
    }

    commonMessaging.broadcastMessage(message);
  },
  fileUpdate(data = {}) {
    logger.file(`Broadcasting ${data.status} FILE-UPDATE for ${data.filePath}`);
    const ospath = {
      ospath: fileSystem.getPathInCache(data.filePath, data.version),
      osurl: fileSystem.getLocalFileUrl(data.filePath, data.version)
    };
    const messageObj = Object.assign({}, data, data.version ? ospath : {});
    module.exports.broadcast("FILE-UPDATE", messageObj);
  },
  fileError(data = {}) {
    logger.file(`Broadcasting FILE-ERROR for ${data.filePath} ${data.msg} ${data.detail}`);
    module.exports.broadcast("FILE-ERROR", data);
  }
};
