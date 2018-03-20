const commonMessaging = require("common-display-module/messaging");
const db = require("../../db/api");

function requestWatchlistCompare() {
  const lastChanged = db.watchlist.lastChanged();
  const msMessage = {topic: "WATCHLIST-COMPARE", lastChanged};

  commonMessaging.sendToMessagingService(msMessage);
}

module.exports = {
  requestWatchlistCompare
};
