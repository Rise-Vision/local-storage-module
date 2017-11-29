const config = require("../config/config");
const broadcastIPC = require("../messaging/broadcast-ipc.js");
const request = require("request-promise-native");
const fileSystem = require("./file-system");
const fs = require("fs");
const commonConfig = require("common-display-module");

const twoMinTimeout = 60 * 2; // eslint-disable-line no-magic-numbers

const requestFile = (signedURL) => {
  const proxy = commonConfig.getProxyAgents();
  const options = {
    uri: signedURL,
    timeout: config.secondMillis * twoMinTimeout,
    resolveWithFullResponse: true,
    proxy: proxy.httpsAgent || proxy.httpAgent || null
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
  writeToDisk(filePath, response) {
    if (!filePath || !response) {throw Error("Invalid write to disk params")}

    const fileSize = response.headers["content-length"];
    const pathInDownload = fileSystem.getPathInDownload(filePath);

    fileSystem.addToDownloadTotalSize(fileSize);

    return new Promise((res, rej) => {
      const file = fs.createWriteStream(pathInDownload);
      const handleError = (err) => {
        fileSystem.deleteFileFromDownload(filePath);
        fileSystem.removeFromDownloadTotalSize(fileSize);

        broadcastIPC.broadcast("FILE-ERROR", {
          filePath,
          msg: "File I/O Error",
          detail: err
        });

        rej(new Error("File I/O Error"));
      };

      file.on("finish", () => {
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
      }).on("error", (err) => {
        handleError(err);
      });

      response.pipe(file);
    });


  }
};
