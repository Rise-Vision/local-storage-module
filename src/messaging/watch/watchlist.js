const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const update = require("../update/update");
const del = require("../delete/delete");
const watch = require("./watch");
const logger = require("../../logger");

function requestWatchlistCompare() {
  const lastChanged = db.watchlist.lastChanged();
  const msMessage = {topic: "WATCHLIST-COMPARE", lastChanged};

  logger.file(`Sending WATCHLIST-COMPARE against ${lastChanged}`);
  commonMessaging.sendToMessagingService(msMessage);
}

function addNewFile(filePath) {
  const metaData = {filePath, version: '0', status: "UNKNOWN"};

  return update.assignOwnersOfParentDirectory(metaData, 'WATCHLIST-RESULT')
  .then(assigned => {
     if (assigned) {
       return update.updateWatchlistAndMetadata(metaData)
      .then(() => refreshUpdatedFile(metaData));
    }
   });
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
    .map(entry => db.fileMetadata.get(entry.filePath))
    .filter(entry => entry && entry.filePath)
    .map(metaData => {
      const updatedMetaData = withUnknownStatus(metaData);

      return db.fileMetadata.put(updatedMetaData);
  }));
}

function rewatchMissingFolders(remoteWatchlist) {
  db.fileMetadata.getAllFolders()
  .filter(entry=>!remoteWatchlist[entry.filePath])
  .forEach(entry=>{
    watch.requestMSUpdate({
      topic: "watch",
      filePath: entry.filePath
    }, entry);
  });
}

function refresh(watchlist, lastChanged) {
  const filePaths = Object.keys(watchlist);
  logger.file(`Received WATCHLIST-RESULT for ${lastChanged} with count: ${filePaths.length}`);

  if (filePaths.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(filePaths.map(filePath => {
    const version = watchlist[filePath];
    const metaData = db.fileMetadata.get(filePath);

    if (!metaData) {
      if (version === "0") {
        return Promise.resolve();
      }

      return addNewFile(filePath);
    }

    return version === metaData.version ? Promise.resolve() :
      version === "0" ? del.process(metaData) :
      refreshUpdatedFile(metaData);
  }))
  .then(() => markMissingFilesAsUnknown(watchlist))
  .then(() => db.watchlist.setLastChanged(lastChanged))
  .then(() => rewatchMissingFolders(watchlist));
}

module.exports = {
  refresh,
  requestWatchlistCompare
};
