const broadcastIPC = require("../broadcast-ipc");
const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const entry = require("./entry");
const addition = require("../add/add");
const update = require("../update/update");

function handleFileWatchResult(message) {
  const {filePath, version, token} = message;

  log.file(`Received version ${version} for ${filePath}`);

  const status = token ? "STALE" : "CURRENT";

  return update.updateWatchlistAndMetadata({filePath, version, status, token})
  .then(()=>{
    broadcastIPC.fileUpdate({filePath, status, version});
  });
}

function handleFolderWatchResult(message) {
  const {folderData} = message;

  return Promise.all(folderData.map(fileData => {
    addition.assignOwnersOfParentDirectory(fileData);

    return handleFileWatchResult(fileData);
  }));
}

module.exports = {
  process(message) {
    const {filePath, from} = message;

    log.file(`Received watch for ${filePath}`);

    if (!entry.validate({filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    return db.owners.addToSet({filePath, owner: from})
    .then(()=>{
      const metaData = db.fileMetadata.get(filePath) || {filePath};
      metaData.status = metaData.status || "UNKNOWN";

      if (metaData.status === "UNKNOWN") {
        return module.exports.requestMSUpdate(message, metaData);
      }

      return Promise.resolve(broadcastIPC.fileUpdate({
        filePath,
        status: metaData.status,
        version: metaData.version
      }));
    });
  },
  msResult(message) {
    const {filePath, error, folderData, watchlistLastChanged} = message;

    if (error) {
      broadcastIPC.fileUpdate({filePath, status: "NOEXIST"});
      return Promise.resolve();
    }

    const action = folderData ? handleFolderWatchResult : handleFileWatchResult;

    return action(message)
    .then(() => db.watchlist.setLastChanged(watchlistLastChanged));
  },
  requestMSUpdate(message, metaData) {
    const msMessage = Object.assign({}, message, {version: metaData.version || "0"});
    metaData.status = metaData.status === "UNKNOWN" ? "PENDING" : metaData.status;

    return db.fileMetadata.put(metaData)
    .then(()=>{
      commonMessaging.sendToMessagingService(msMessage);
    });
  }
};
