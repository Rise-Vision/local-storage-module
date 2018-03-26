const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const watch = require("./watch");

function requestWatchlistCompare() {
  const lastChanged = db.watchlist.lastChanged();
  const msMessage = {topic: "WATCHLIST-COMPARE", lastChanged};

  commonMessaging.sendToMessagingService(msMessage);
}

function addNewFile(filePath) {
  // obtain owner from parent folder, and register the new file, in a following PR
  log.debug(filePath);

  return Promise.resolve();
}

function withUnknownStatus(metaData) {
  return Object.assign({}, metaData, {status: "UNKNOWN"});
}

function refreshUpdatedFile(metaData) {
  const message = {topic: "WATCH", filePath: metaData.filePath};
  const updatedMetaData = withUnknownStatus(metaData);

  return watch.requestMSUpdate(message, updatedMetaData);
}

function markMissingFilesAsUnknown(remoteWatchlist) {
  const localWatchlist = db.watchlist.allEntries();

  return Promise.all(localWatchlist
    .filter(entry => !remoteWatchlist[entry.filePath])
    .map(entry => {
      const metaData = db.fileMetadata.get(entry.filePath);
      const updatedMetaData = withUnknownStatus(metaData);

      return db.fileMetadata.put(updatedMetaData);
  }));
}

function refresh(watchlist, lastChanged) {
  const filePaths = Object.keys(watchlist);

  if (filePaths.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(filePaths.map(filePath => {
    const version = watchlist[filePath];
    const metaData = db.fileMetadata.get(filePath);

    if (!metaData) {
      return addNewFile(filePath);
    }

    return version === metaData.version ?
      Promise.resolve() : refreshUpdatedFile(metaData);
  }))
  .then(() => markMissingFilesAsUnknown(watchlist))
  .then(() => db.watchlist.setLastChanged(lastChanged));
}

module.exports = {
  refresh,
  requestWatchlistCompare
};
