const db = require("../db/api");
const logger = require("../logger");
const commonMessaging = require("common-display-module/messaging");
const config = require("../config/config");

module.exports = {
  process() {
    logger.all("storage - clear-local-storage-request");

    db.fileMetadata.clear();
    db.watchlist.clear();

    logger.all("storage - database cleared. Restarting...");

    const message = {from: config.moduleName, msg: "restart-request"};
    commonMessaging.broadcastMessage(message);
  }
}
