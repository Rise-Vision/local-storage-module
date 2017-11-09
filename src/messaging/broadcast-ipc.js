const commonConfig = require("common-display-module");

module.exports = {
  broadcast(topic, data = {}) {
    commonConfig.broadcastMessage({
      from: "local-storage",
      topic,
      data
    });
  }
}
