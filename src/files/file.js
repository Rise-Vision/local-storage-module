const config = require("../config/config");
const broadcastIPC = require("../messaging/broadcast-ipc.js");
const request = require("request");
const fileSystem = require("./file-system");
const fs = require("fs");
const commonConfig = require("common-display-module");
const util = require("util");

const twoMinTimeout = 60 * 2; // eslint-disable-line no-magic-numbers
const requestRetries = 2;

const requestFile = (signedURL) => {
  const proxy = commonConfig.getProxyAgents();
  const options = {
    uri: signedURL,
    timeout: config.secondMillis * twoMinTimeout,
    resolveWithFullResponse: true,
    proxy: proxy.httpsAgent || proxy.httpAgent || null
  };

  return new Promise((res, rej)=>{
    const req = request.get(options);
    req.pause();
    req.on("response", resp=>{
      res(resp);
    });
    req.on("error", err=>{
      rej(err);
    });
  });
};

module.exports = {
  request(filePath, signedURL, retries = requestRetries) {
    if (!filePath || !signedURL) {throw Error("Invalid file request params");}

    return requestFile(signedURL)
    .catch(err=> {
      if (retries > 0) {
        return module.exports.request(filePath, signedURL, retries - 1);
      }

      broadcastIPC.broadcast("FILE-ERROR", {
        filePath,
        msg: "File's host server could not be reached",
        detail: err ? err.message || util.inspect(err, {depth: 1}) : ""
      });

      return Promise.reject(new Error("File's host server could not be reached"));
    });
  },
  writeToDisk(filePath, response) {
    if (!filePath || !response) {throw Error("Invalid write to disk params")}

    const fileSize = response.headers["content-length"];
    const pathInDownload = fileSystem.getPathInDownload(filePath);

    fileSystem.addToDownloadTotalSize(fileSize);

    return new Promise((res, rej) => {
      const file = fs.createWriteStream(pathInDownload)
      .on("finish", () => {
        file.close(() => {
          fileSystem.moveFileFromDownloadToCache(filePath)
          .then(() => {
            fileSystem.removeFromDownloadTotalSize(fileSize);
            res();
          })
          .catch(err=>{
            handleError(err);
          })
        });
      })
      .on("error", (err) => {
        handleError(err);
      });

      response.pipe(file);

      function handleError(err) {
        fileSystem.deleteFileFromDownload(filePath);
        fileSystem.removeFromDownloadTotalSize(fileSize);

        broadcastIPC.broadcast("FILE-ERROR", {
          filePath,
          msg: "File I/O Error",
          detail: err ? err.message || util.inspect(err, {depth: 1}) : ""
        });

        rej(new Error("File I/O Error"));
      }
    });
  }
};
