const broadcastIPC = require("../broadcast-ipc.js");
const commonConfig = require("common-display-module");
const db = require("../../db/api");
const fileSystem = require("../../files/file-system");
const entry = require("./entry");

module.exports = {
  process(message) {
    const {filePath, from} = message;

    if (!entry.validate({filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    const metaData = db.fileMetadata.get(filePath) || {};

    if (metaData.status && metaData.status !== "UNKNOWN") {
      return db.owners.addToSet({filePath, owner: from})
      .then(()=>{
        broadcastIPC.broadcast("FILE-UPDATE", {
          filePath,
          ospath: fileSystem.osPath(filePath),
          status: metaData.status,
          version: metaData.version
        });
      });
    }

    const msMessage = Object.assign({}, message, {version: metaData.version || "0"});
    return Promise.resolve(commonConfig.sendToMessagingService(msMessage));
  },
  msResult(message) {
    const {filePath, version, token, error} = message;

    if (error) {
      broadcastIPC.broadcast("FILE-UPDATE", {
        filePath,
        status: "NOEXIST"
      });

      return Promise.resolve();
    }

    const status = token ? "STALE" : "CURRENT";

    return db.fileMetadata.put({filePath, version, status, token})
    .then(db.watchlist.put({filePath, version}))
    .then(()=>{
      broadcastIPC.broadcast("FILE-UPDATE", {
        filePath,
        status,
        version,
        ospath: fileSystem.osPath(filePath)
      });
    });
  }
};
