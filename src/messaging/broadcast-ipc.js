const commonConfig = require("common-display-module");
const fileSystem = require("../files/file-system");
const config = require("../config/config");
const db = require("../db/api");

module.exports = {
  broadcast(topic, data = {}) {
    const message = Object.assign({from: config.moduleName, topic}, data);
    const owners = db.owners.get(data.filePath);

    // ensure to broadcast via websocket if "ws-client" is an owner
    if (owners && owners.includes("ws-client")) {
      commonConfig.broadcastToLocalWS(message);

      if (owners.length === 1) {return;}
    }

    commonConfig.broadcastMessage(message);
  },
  fileUpdate(data = {}) {
    log.file(`Broadcasting ${data.status} FILE-UPDATE for ${data.filePath}`);
    const ospath = {ospath: fileSystem.getPathInCache(data.filePath)};
    module.exports.broadcast("FILE-UPDATE", Object.assign({}, data, ospath));
  },
  fileError(data = {}) {
    log.file(`Broadcasting FILE-ERROR for ${data.filePath} ${data.msg} ${data.detail}`);
    module.exports.broadcast("FILE-ERROR", data);
  }
}
