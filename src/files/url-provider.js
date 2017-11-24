const broadcastIPC = require("../../src/messaging/broadcast-ipc.js");
const request = require("request-promise-native");

const SUCCESS_CODE = 200;

const sendMessage = (token) => {
  const {data, hash} = token;
  const options = {
    uri: "https://services.risevision.com/urlprovider/",
    body: {
      data,
      hash
    },
    json: true,
    resolveWithFullResponse: true
  };

  return request.post(options);
};

const validateToken = (token) => {
  if (!token || !token.data || !token.data.timestamp || !token.data.filePath || !token.data.displayId || !token.hash) {
    throw Error("Invalid token provided");
  }

  return Promise.resolve(token);
};

const responseHandler = (response) => {
  if (response.statusCode !== SUCCESS_CODE) {
    return Promise.reject(new Error(`Invalid response with status code ${response.statusCode}`));
  }

  return response.body;
};

module.exports = {
  getURL(token) {
    return validateToken(token)
      .then(sendMessage)
      .then(responseHandler)
      .catch(err=>{
        broadcastIPC.broadcast("FILE-ERROR", {
          filePath: token.data.filePath,
          msg: "Could not retrieve signed URL",
          detail: err
        });
      });
  }
};