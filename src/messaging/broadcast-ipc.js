const commonConfig = require("common-display-module");
const config = require("../../src/config/config");

module.exports = {
  broadcast(topic, data = {}) {
    commonConfig.broadcastMessage({
      from: config.moduleName,
      topic,
      data
    });
  }
}
