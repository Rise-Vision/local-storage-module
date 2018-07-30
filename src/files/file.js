const request = require("request");
const fs = require("fs");
const proxy = require("common-display-module/proxy");
const util = require("util");
const fileSystem = require("./file-system");
const config = require("../config/config");
const broadcastIPC = require("../messaging/broadcast-ipc");
const logger = require("../logger");
const urlParse = require('url').parse;

const twoMinTimeout = 60 * 2; // eslint-disable-line no-magic-numbers
const defaultRetryTimeout = 3000;
const requestRetries = 4;

const requestFile = (signedURL) => {

  // As per https://github.com/request/request/issues/2390 we need to manually undo the ' escape
  const uri = urlParse(signedURL);
  uri.pathname = uri.pathname.replace(/%27/g, "'")
  uri.path = uri.path.replace(/%27/g, "'")
  uri.href = uri.href.replace(/%27/g, "'")

  const options = {
    uri,
    timeout: config.secondMillis * twoMinTimeout,
    resolveWithFullResponse: true,
    proxy: proxy.getProxyUri()
  };

  return new Promise((res, rej)=>{
    logger.file(`Downloading ${signedURL}`);

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
  request(filePath, signedURL, retries = requestRetries, retryTimeout = defaultRetryTimeout) { // eslint-disable-line max-params
    if (!filePath || !signedURL) {throw Error("Invalid file request params");}

    return requestFile(signedURL)
    .catch(err=> {
      if (retries > 0) {
        return new Promise((resolve) => setTimeout(resolve, retryTimeout))
        .then(() => module.exports.request(filePath, signedURL, retries - 1, retryTimeout));
      }

      broadcastIPC.fileError({
        filePath,
        msg: "File's host server could not be reached",
        detail: err ? err.message || util.inspect(err, {depth: 1}) : ""
      });

      return Promise.reject(new Error("File's host server could not be reached"));
    });
  },
  writeToDisk(filePath, version, response) {
    if (!filePath || !response) {throw Error("Invalid write to disk params")}

    const fileSize = response.headers["content-length"];
    const pathInDownload = fileSystem.getPathInDownload(filePath, version);

    logger.file(`Writing ${pathInDownload} for ${filePath}`);

    fileSystem.addToDownloadTotalSize(fileSize);

    return new Promise((res, rej) => {
      const file = fs.createWriteStream(pathInDownload)
      .on("finish", () => {
        file.close(() => {
          fileSystem.moveFileFromDownloadToCache(filePath, version)
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
        logger.file(err && err.stack ? err.stack : err)
        fileSystem.deleteFileFromDownload(filePath, version);
        fileSystem.removeFromDownloadTotalSize(fileSize);

        broadcastIPC.fileError({
          filePath,
          msg: "File I/O Error",
          detail: err ? err.message || util.inspect(err, {depth: 1}) : ""
        });

        rej(new Error("File I/O Error"));
      }
    });
  }
};
