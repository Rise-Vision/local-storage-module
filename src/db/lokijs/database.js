const COLLECTIONS = ["metadata", "runtime_info", "owners", "watchlist"];

const commonConfig = require("common-display-module");
const config = require("../../../src/config/config");
const loki = require("lokijs");
const path = require("path");
const fileSystem = require("../../files/file-system");
const logger = require("../../logger");

const defaultSaveInterval = 4000;

let db = null;

function initCollections() {
  COLLECTIONS.forEach((collName)=>{
    const collection = db.getCollection(collName);

    if (!collection) {
      db.addCollection(collName, {
        unique: ["filePath"]
      });
    }
  });
}

function initLokijs(dirPath, saveInterval) {
  return new Promise((res, rej)=>{
    try {
      const dbPath = path.join(dirPath || commonConfig.getModuleDir(), config.moduleName, `${config.moduleName}.db`);

      db = new loki(dbPath, {
        autoload: true,
        autoloadCallback: ()=>{
          initCollections();
          res();
        },
        autosave: true,
        autosaveInterval: saveInterval,
        env: "NODEJS"
      });
    } catch (err) {
      rej(err);
    }
  });
}

function syncCacheMetadataWithFileSystem() {
  const metadata = db.getCollection("metadata");

  return fileSystem.readCacheDir().then(cached => {
    metadata.find({status: {'$in': ["CURRENT", "UNKNOWN"]}})
    .filter(entry => {
      const pathInCache = fileSystem.getPathInCache(entry.filePath, entry.version);
      return cached.indexOf(pathInCache) < 0;
    })
    .forEach(entry => {
      logger.file(JSON.stringify(entry), "File not found in cache dir. Marking it as unknown in the database");
      metadata.update(Object.assign({}, entry, {status: "UNKNOWN", version: "0"}));
    });
  })
  .catch(() => logger.warning("Error when reading cache dir to sync metadata database"));
}

// eslint-disable-line TODO remove this on next release
function clearPendingEntries() {
  const metadata = db.getCollection("metadata");
  metadata.find({status: "PENDING"})
  .forEach(entry => {
    logger.file(JSON.stringify(entry), "Marking PENDING as UNKNOWN in the database");
    metadata.update(Object.assign({}, entry, {status: "UNKNOWN"}));
  });
}

module.exports = {
  close(cb) {
    if (db) {
      db.close(cb);
    }
  },
  destroy(cb = ()=>{}) {
    if (db) {
      db.deleteDatabase(cb);
    }
  },
  start(dirPath = null, saveInterval = defaultSaveInterval) {
    return initLokijs(dirPath, saveInterval)
      .then(() => syncCacheMetadataWithFileSystem())
      .then(() => clearPendingEntries());
  },
  getCollection(name) {
    return db.getCollection(name);
  },
  syncCacheMetadataWithFileSystem
};
