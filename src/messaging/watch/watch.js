const broadcastIPC = require("../broadcast-ipc.js");
const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const entry = require("./entry");

module.exports = {
  process(message) {
    const {filePath, from} = message;

    log.file(`Recieved watch from ${from} for ${filePath}`);

    if (!entry.validate({filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    return db.owners.addToSet({filePath, owner: from})
    .then(()=>{
      const metaData = db.fileMetadata.get(filePath) || {filePath};
      metaData.status = metaData.status || "UNKNOWN";

      if (metaData.status === "UNKNOWN") {
        return requestMSUpdate(message, metaData);
      }

      return broadcastIPC.fileUpdate({
        filePath,
        status: metaData.status,
        version: metaData.version
      });
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

function requestMSUpdate(message, metaData) {
  const msMessage = Object.assign({}, message, {version: metaData.version || "0"});
  metaData.status = metaData.status === "UNKNOWN" ? "PENDING" : metaData.status;

  return db.fileMetadata.put(metaData)
  .then(()=>{
    commonMessaging.sendToMessagingService(msMessage);
  });
}
