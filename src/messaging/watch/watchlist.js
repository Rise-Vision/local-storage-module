const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");

function requestWatchlistCompare() {
  const watchlist = db.watchlist.allEntries()
  .map(({filePath, version}) => ({filePath, version}));

  const msMessage = {topic: "WATCHLIST-COMPARE", watchlist};

  commonMessaging.sendToMessagingService(msMessage);
}

module.exports = {
  requestWatchlistCompare
};
