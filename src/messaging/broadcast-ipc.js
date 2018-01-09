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
    let fileKey = data.filePath;
    if (data.status === "CACHED") {fileKey = data.fileId}

    log.file(`Broadcasting ${data.status} FILE-UPDATE for ${fileKey}`);
    const ospath = {ospath: fileSystem.getPathInCache(fileKey)};
    module.exports.broadcast("FILE-UPDATE", Object.assign({}, data, ospath));
  },
  fileError(data = {}) {
    log.file(`Broadcasting FILE-ERROR for ${data.filePath} ${data.msg} ${data.detail}`);
    module.exports.broadcast("FILE-ERROR", data);
  }
}
