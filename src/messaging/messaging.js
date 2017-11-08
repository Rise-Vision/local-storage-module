const commonConfig = require("common-display-module");
const ms = require("./messaging-service.js");
const watch = require("./watch/watch");

function messageReceiveHandler(message) {
  const forceRemoteWatchForNow = true;

  if (!message) {return;}
  if (!message.topic) {return;}

  if (message.topic.toUpperCase() === "WATCH") {
    return watch.process(message)
      .then(() => {
        if (forceRemoteWatchForNow) {
          ms.watch();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

module.exports = {
  broadcast(topic, data = {}) {
    commonConfig.broadcastMessage({
      from: "local-storage",
      topic: topic,
      data: data
    });
  },
  init() {
    return commonConfig.receiveMessages("local-storage").then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
