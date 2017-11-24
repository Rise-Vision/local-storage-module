const config = require("../config/config");
const broadcastIPC = require("../messaging/broadcast-ipc.js");
const request = require("request-promise-native");

const twoMinTimeout = 60 * 2; // eslint-disable-line no-magic-numbers

const requestFile = (signedURL) => {
  const options = {
    uri: signedURL,
    timeout: config.secondMillis * twoMinTimeout,
    resolveWithFullResponse: true
  };

  return request.get(options);
};

module.exports = {
  request(filePath, signedURL) {
    if (!filePath || !signedURL) {throw Error("Invalid file request params");}

    return requestFile(signedURL)
      .catch(err=> {
        broadcastIPC.broadcast("FILE-ERROR", {
          filePath,
          msg: "File's host server could not be reached",
          detail: err
        });

        return Promise.reject(new Error("File's host server could not be reached"));
      });
  },
  writeToDisk(response) {
    console.log(JSON.stringify(response));
  }
};
