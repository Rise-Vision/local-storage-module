const commonConfig = require("common-display-module");
const watch = require("./watch/watch");

function messageReceiveHandler(message) {
  if (!message) {return;}
  if (!message.topic) {return;}

  if (message.topic.toUpperCase() === "WATCH") {
    return watch.process(message)
    .catch((err) => {
      console.log(err);
    });
  } else if (message.topic.toUpperCase() === "WATCH-RESULT") {
    return watch.msResult(message)
    .catch((err) => {
      console.log(err);
    });
  }
}

module.exports = {
  init() {
    return commonConfig.receiveMessages("local-storage").then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
