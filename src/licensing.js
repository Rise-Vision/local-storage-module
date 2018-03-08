const licensing = require("common-display-module/licensing");
const broadcastIPC = require("./messaging/broadcast-ipc.js");
const util = require("util");
const config = require("./config/config");

// So we ensure it will only be sent once.
let initialRequestAlreadySent = false;

function getUserFriendlyStatus() {
  return config.isAuthorized() ? "authorized" : "unauthorized";
}

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
  clearInitialRequestSent() {initialRequestAlreadySent = false;},
  requestLicensingData() {
    return licensing.requestLicensingData(config.moduleName)
      .catch(err => {
        log.error({
          event_details: err ? err.stack || util.inspect(err, {depth: 1}) : "",
          version: config.getModuleVersion()
        }, "Error while requesting licensing data", config.bqTableName);
      });
  },
  sendLicensing() {
    broadcastIPC.licensingUpdate(config.isAuthorized(), getUserFriendlyStatus());
  },
  updateLicensingData(data) {
    log.file(JSON.stringify(data), "receiving licensing data");

    if (licensing.containsSubscriptionDataForRiseStorage(data)) {
      const previousAuthorized = config.isAuthorized();
      const currentAuthorized = licensing.isRiseStorageSubscriptionActive(data);

      // detect licensing change
      if (previousAuthorized !== currentAuthorized) {
        config.setAuthorized(currentAuthorized);

        module.exports.sendLicensing();

        log.all("storage subscription update", {event_details: getUserFriendlyStatus(), version: config.getModuleVersion()}, null, config.bqTableName);
      }
    }

    return Promise.resolve();
  }
};
