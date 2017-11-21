const broadcastIPC = require("../../src/messaging/broadcast-ipc.js");
const request = require("request-promise-native");

const sendMessage = (token) => {
  const {data, hash} = token;
  const options = {
    uri: "https://services.risevision.com/urlprovider/",
    body: {
      data,
      hash
    },
    json: true
  };

  return request.post(options);
};

const validateToken = (token) => {
  if (!token || !token.data.timestamp || !token.data.filePath || !token.data.displayId || !token.hash) {
    throw Error("Invalid token provided");
  }

  return Promise.resolve(token);
};

module.exports = {
  getURL(token) {
    return validateToken(token)
      .then(sendMessage)
      .catch(error=>{
        broadcastIPC.broadcast("FILE-ERROR", {
          filePath: token.data.filePath,
          error
        });

        return Promise.reject(error);
      });
  }
};
