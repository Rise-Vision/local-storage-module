const commonConfig = require("common-display-module");
const deleteFile = require("./delete/delete");
const update = require("./update/update");
const watch = require("./watch/watch");

function handleWatch(message) {
  return watch.process(message)
    .catch((err) => {
      console.log(err);
    });
}

function handleWatchResult(message) {
  return watch.msResult(message)
    .catch((err) => {
      console.log(err);
    });
}

function handleMSFileUpdate(message) {
  if (!message.type) {return;}

  if (message.type === "add" || message.type === "update") {
    return update.process(message)
      .catch((err) => {
        console.log(err);
      });
  }

  if (message.type === "delete") {
    return deleteFile.process(message)
      .catch((err) => {
        console.log(err);
      });
  }
}

function messageReceiveHandler(message) {
  if (!message) {return;}
  if (!message.topic) {return;}

  if (message.topic.toUpperCase() === "WATCH") {
    return handleWatch(message);
  } else if (message.topic.toUpperCase() === "WATCH-RESULT") {
    return handleWatchResult(message);
  } else if (message.topic.toUpperCase() === "MSFILEUPDATE") {
    return handleMSFileUpdate(message);
  }
}

module.exports = {
  init() {
    return commonConfig.receiveMessages("local-storage").then((receiver) => {
      receiver.on("message", messageReceiveHandler);
    });
  }
};
