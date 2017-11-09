const db = require("../../db/api");
const entry = require("./entry");
const broadcastIPC = require("../broadcast-ipc.js");
const commonConfig = require("common-display-module");
const path = require("path");

module.exports = {
  process(message) {
    const {data, from} = message;

    if (!entry.validate({filePath: data.filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    const metaData = db.fileMetadata.get(data.filePath) || {};

    if (metaData.status && metaData.status !== "UNKNOWN") {
      return db.owners.addToSet({filePath: data.filePath, owner: from})
      .then(()=>{
        broadcastIPC.broadcast("FILE-UPDATE", {
          filePath: data.filePath,
          ospath: osPath(data.filePath),
          status: metaData.status,
          version: metaData.version
        });
      });
    }

    const msMessage = Object.assign({}, message, {version: metaData.version});
    return Promise.resolve(commonConfig.sendToMessagingService(msMessage));
  },
  msResult(message) {
    const {filePath, version, token} = message;
    const status = token ? "STALE" : "CURRENT";

    return db.fileMetadata.put({filePath, version, status, token})
    .then(db.watchlist.put({filePath, version}))
    .then(()=>{
      broadcastIPC.broadcast("FILE-UPDATE", {
        filePath,
        status,
        version,
        ospath: osPath(filePath)
      });
    });
  }
};

function osPath(filePath) {
  return path.join(commonConfig.getLocalStoragePath(), `create-dir-structure-for-${filePath}`);
}
