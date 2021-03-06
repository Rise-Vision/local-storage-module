/* eslint-disable max-params */
const request = require("request");
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

  const options = {
    uri: urlParse(signedURL),
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
    const hashHeader = response.headers["x-goog-hash"];

    fileSystem.addToDownloadTotalSize(fileSize);

    return fileSystem.writeStreamToDownloadFolder(response, filePath, version)
    .then(() => fileSystem.checkDownloadFileIntegrity(hashHeader, filePath, version))
    .then(() => {
      return fileSystem.moveFileFromDownloadToCache(filePath, version)
      .then(() => fileSystem.removeFromDownloadTotalSize(fileSize));
    })
    .then(logDownloadedFile)
    .catch(err => {
      handleError(err);
      throw err;
    });

    function logDownloadedFile() {
      const localPath = fileSystem.getPathInCache(filePath, version);
      const eventDetails = JSON.stringify({
        filePath, fileSize, version, localPath
      });

      logger.all("downloaded file", {
        file_path: filePath,
        event_details: eventDetails
      });
    }

    function handleError(err) {
      logger.file(err && err.stack ? err.stack : err)
      fileSystem.deleteFileFromDownload(filePath, version);
      fileSystem.removeFromDownloadTotalSize(fileSize);

      broadcastIPC.fileError({
        filePath,
        msg: "File I/O Error",
        detail: err ? err.message || util.inspect(err, {depth: 1}) : ""
      });
    }
  }
};
