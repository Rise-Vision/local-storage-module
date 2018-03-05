const licensing = require("common-display-module/licensing");
const util = require("util");
const config = require("./config/config");

// So we ensure it will only be sent once.
let initialRequestAlreadySent = false;

module.exports = {
  checkIfLicensingIsAvailable(message) {
    if (!initialRequestAlreadySent) {
      const clients = message.clients;

      if (clients.includes("licensing")) {
        return module.exports.requestLicensingData()
          .then(() => initialRequestAlreadySent = true);
      }
    }

    return Promise.resolve()
  },
  requestLicensingData() {
    return licensing.requestLicensingData(config.moduleName)
      .catch(err => {
        log.error({
          event_details: err ? err.stack || util.inspect(err, {depth: 1}) : "",
          version: config.getModuleVersion(),
        }, "Error while requesting licensing data", config.bqTableName);
      });
  },
  updateLicensingData(data) {
    log.file(JSON.stringify(data), "receiving licensing data");

    if (licensing.containsSubscriptionDataForRiseStorage(data)) {
      const previousAuthorized = config.isAuthorized();
      const currentAuthorized = licensing.isRiseStorageSubscriptionActive(data);

      // detect licensing change
      if (previousAuthorized !== currentAuthorized) {
        config.setAuthorized(currentAuthorized);

        // TODO: broadcast through WS

        return log.all(currentAuthorized ? "authorized" : "not_authorized", null, null, config.bqTableName);
      }
    }

    return Promise.resolve();
  }
};
