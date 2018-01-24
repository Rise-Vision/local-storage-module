const broadcastIPC = require("../broadcast-ipc.js");
const commonConfig = require("common-display-module");
const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  process(message) {
    const {filePath, from} = message;

    log.file(`Recieved watch for ${filePath}`);

    if (!entry.validate({filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    const metaData = db.fileMetadata.get(filePath) || {};

    return db.owners.addToSet({filePath, owner: from})
    .then(()=>{
      broadcastIPC.fileUpdate({filePath, status: metaData.status, version: metaData.version});

      if (!metaData.status || metaData.status === "UNKNOWN") {
        const msMessage = Object.assign({}, message, {version: metaData.version || "0"});
        return Promise.resolve(commonConfig.sendToMessagingService(msMessage));
      }
    });
  },
  msResult(message) {
    const {filePath, version, token, error} = message;

    log.file(`Received version ${version} for ${filePath}`);

    if (error) {
      broadcastIPC.fileUpdate({filePath, status: "NOEXIST"});
      return Promise.resolve();
    }

    const status = token ? "STALE" : "CURRENT";

    return db.fileMetadata.put({filePath, version, status, token})
    .then(db.watchlist.put({filePath, version}))
    .then(()=>{
      broadcastIPC.fileUpdate({filePath, status, version});
    });
  }
};
