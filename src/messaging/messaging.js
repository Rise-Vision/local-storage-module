const commonConfig = require("common-display-module");
const ms = require("./messaging-service.js");

function messageReceiveHandler(message) {
  const forceRemoteWatchForNow = true;

  switch (message.topic) {
    case "watch":
      console.log(`watch message received! ${JSON.stringify(message.data)}`);

      if (forceRemoteWatchForNow) {ms.watch();}
      break;
    default:
      break;
  }
}

module.exports = {
  init() {
    return commonConfig.receiveMessages("local-storage").then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
