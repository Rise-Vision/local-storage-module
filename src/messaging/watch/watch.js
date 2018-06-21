const broadcastIPC = require("../broadcast-ipc");
const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const entry = require("./entry");
const addition = require("../add/add");
const update = require("../update/update");
const logger = require("../../logger");

function handleFileWatchResult(message) {
  const {filePath, version, token} = message;

  logger.file(`Received version ${version} for ${filePath}`);

  const status = token ? "STALE" : "CURRENT";

  return update.updateWatchlistAndMetadata({filePath, version, status, token})
  .then(()=>{
    broadcastIPC.fileUpdate({filePath, status, version});
  });
}

function handleFolderWatchResult(message) {
  logger.file(JSON.stringify(message), "Handling folder watch result")
  const {folderData} = message;

  return Promise.all(folderData.map(fileData => {
    return addition.assignOwnersOfParentDirectory(fileData, 'WATCH-RESULT')
    .then(assigned => assigned && handleFileWatchResult(fileData));
  }));
}

function processFileWatch(message, existingMetadata) {
  const metadata = existingMetadata || {filePath: message.filePath};
  metadata.status = metadata.status || "UNKNOWN";

  if (metadata.status === "UNKNOWN") {
    return requestMSUpdate(message, metadata);
  }

  return Promise.resolve(broadcastIPC.fileUpdate({
    filePath: message.filePath,
    status: metadata.status,
    version: metadata.version
  }));
}

function processFolderWatch(message, existingMetadata) {
  const folderPath = message.filePath;
  if (existingMetadata) {
    const folderFiles = db.fileMetadata.getFolderFiles(folderPath);
    logger.file(JSON.stringify(folderFiles), `Processing watch for existing folder ${folderPath}`);
    const promises = folderFiles.map(fileMetadata => processFileWatch({filePath: fileMetadata.filePath}, fileMetadata));
    return Promise.all(promises);
  }

  logger.file(`Requesting MS update for folder ${folderPath}`);
  return requestMSUpdate(message, {filePath: folderPath});
}

function requestMSUpdate(message, metaData) {
  const msMessage = Object.assign({}, message, {version: metaData.version || "0"});
  const isFolder = metaData.filePath.endsWith("/");
  if (!isFolder) {
    metaData.status = metaData.status === "UNKNOWN" ? "PENDING" : metaData.status;
  }

  return db.fileMetadata.put(metaData)
  .then(()=>{
    commonMessaging.sendToMessagingService(msMessage);
  });
}

function processFileOrFolderWatch(message) {
  const {filePath} = message;

  const existingMetadata = db.fileMetadata.get(filePath);
  const isFolder = filePath.endsWith("/");
  const action = isFolder ? processFolderWatch : processFileWatch;

  return action(message, existingMetadata);
}

module.exports = {
  process(message) {
    const {filePath, from} = message;

    logger.file(JSON.stringify(message), `Received watch for ${filePath}`);

    if (!entry.validate({filePath, owner: from})) {
      return Promise.reject(new Error("Invalid watch message"));
    }

    return db.owners.addToSet({filePath, owner: from})
    .then(() => processFileOrFolderWatch(message));
  },
  msResult(message) {
    const {filePath, errorCode, errorMsg, folderData, watchlistLastChanged} = message;

    if (errorCode || errorMsg) {
      broadcastIPC.fileUpdate({filePath, status: errorMsg || errorCode});
      return Promise.resolve();
    }

    const action = folderData ? handleFolderWatchResult : handleFileWatchResult;

    return action(message)
    .then(() => db.watchlist.setLastChanged(watchlistLastChanged));
  },
  requestMSUpdate
};
