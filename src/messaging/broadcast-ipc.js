const commonConfig = require("common-display-module");
const fileSystem = require("../files/file-system");
const config = require("../config/config");

module.exports = {
  broadcast(topic, data = {}) {
    commonConfig.broadcastMessage(Object.assign(
      {
        from: config.moduleName,
        topic
      },
      data
    ));
  },
  fileUpdate(data = {}) {
    log.file(`Broadcasting ${data.status} FILE-UPDATE for ${data.filePath}`);
    const ospath = {ospath: fileSystem.getPathInCache(data.filePath)};
    module.exports.broadcast("FILE-UPDATE", Object.assign({}, data, ospath));
  },
  fileError(data = {}) {
    log.file(`Broadcasting FILE-ERROR ${data.msg} for ${data.filePath}`);
    module.exports.broadcast("FILE-ERROR", data);
  }
}
