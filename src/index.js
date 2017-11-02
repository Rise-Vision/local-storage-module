const commonConfig = require("common-display-module");

commonConfig.receiveMessages("local-storage").then((receiver) => {

  receiver.on("message", (message) => {
    switch(message.topic) {
      case "watch":
        console.log(`watch message received! ${message.data}`);
        break;
    }
  });

});
