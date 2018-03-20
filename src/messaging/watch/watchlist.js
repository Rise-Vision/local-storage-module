const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const update = require("../update/update");

function requestWatchlistCompare() {
  const lastChanged = db.watchlist.lastChanged();
  const msMessage = {topic: "WATCHLIST-COMPARE", lastChanged};

  commonMessaging.sendToMessagingService(msMessage);
}

function addOrUpdate(filePath, version) {
  const previousEntry = db.fileMetadata.get(filePath);
  const updatedEntry = Object.assign({}, previousEntry, {filePath, version});

  return update.update(updatedEntry);
}

function setUnknownStatusToMissingFiles(watchlist) {
  console.log(watchlist);
}

function refresh(watchlist, lastChanged) {
  const filePaths = Object.keys(watchlist);

  if (watchlist.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(filePaths.map(filePath => {
    const version = watchlist[filePath];

    return addOrUpdate(filePath, version);
  }))
  .then(() => setUnknownStatusToMissingFiles(watchlist))
  .then(() => db.watchlist.setLastChanged(lastChanged));
}

module.exports = {
  refresh,
  requestWatchlistCompare
};
