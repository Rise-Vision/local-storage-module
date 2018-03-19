const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");
const watch = require("./watch");

function updateFilesStatusAndRequestUpdatedFiles(filePaths) {
  if (filePaths.length === 0) {
    return Promise.resolve();
  }

  log.all('refreshing files', filePaths.join(', '));

  return Promise.all(filePaths.map(filePath => {
    const metaData = db.fileMetadata.get(filePath);
    const item = db.owners.get(filePath);

    // will happen when folders contain new entries, but we'll ignore those for now
    if (!item || !metaData) {
      return false;
    }

    // just take the first, so process() call won't fail
    const from = item.owners[0];
    metaData.status = "UNKNOWN";

    return db.fileMetadata.put(metaData)
    .then(() => watch.process({filePath, from}));
  }));
}

function requestWatchlistCompare() {
  const watchlist = db.watchlist.allEntries()
  .map(({filePath, version}) => ({filePath, version}));

  const msMessage = {topic: "WATCHLIST-COMPARE", watchlist};

  commonMessaging.sendToMessagingService(msMessage);
}

module.exports = {
  requestWatchlistCompare,
  updateFilesStatusAndRequestUpdatedFiles
};
