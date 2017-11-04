const commonConfig = require("common-display-module");

function messageReceiveHandler(message) {
  switch (message.topic) {
    case "watch":
      console.log(`watch message received! ${message.data}`);
      break;
    default:
      break;
  }
}

module.exports = {
  init() {
    commonConfig.receiveMessages("local-storage").then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
