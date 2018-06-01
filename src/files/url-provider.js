const request = require("request-promise-native");
const commonConfig = require("common-display-module");
const util = require("util");
const broadcastIPC = require("../../src/messaging/broadcast-ipc");

const SUCCESS_CODE = 200;

const sendMessage = (token) => {
  const {data, hash} = token;
  const proxy = commonConfig.getProxyAgents();
  const options = {
    uri: "https://services.risevision.com/urlprovider/",
    body: {
      data,
      hash
    },
    json: true,
    resolveWithFullResponse: true,
    proxy: (proxy.httpsAgent && proxy.httpsAgent.proxyUri) || (proxy.httpAgent && proxy.httpAgent.proxyUri) || null // eslint-disable-line no-extra-parens
  };
  return request.post(options);
};

const validateToken = (token) => {
  if (!token || !token.data || !token.data.timestamp || !token.data.filePath || !token.data.displayId || !token.hash) {
    throw Error("Invalid token provided");
  }

  return Promise.resolve(token);
};

const handleResponse = (response, displayId) => {
  if (response.statusCode !== SUCCESS_CODE) {
    return Promise.reject(new Error(`Invalid response with status code ${response.statusCode}`));
  }
  const url = response.body;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}displayId=${displayId}`;
};

module.exports = {
  getURL(token) {
    return validateToken(token)
      .then(sendMessage)
      .then(response => handleResponse(response, token.data.displayId))
      .catch(err=>{
        broadcastIPC.fileError({
          filePath: token.data.filePath,
          msg: "Could not retrieve signed URL",
          detail: err ? err.stack || util.inspect(err, {depth: 1}) : ""
        });
        return Promise.reject(err);
      });
  }
};
