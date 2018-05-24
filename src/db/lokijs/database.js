const COLLECTIONS = ["metadata", "last_changed", "owners", "watchlist"];

const commonConfig = require("common-display-module");
const config = require("../../../src/config/config");
const loki = require("lokijs");
const path = require("path");
const fileSystem = require("../../files/file-system");

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
    metadata.find({status: "CURRENT"})
    .filter(entry => {
      const pathInCache = fileSystem.getPathInCache(entry.filePath, entry.version);
      return cached.indexOf(pathInCache) < 0;
    })
    .forEach(entry => {
      log.file(JSON.stringify(entry), "File not found in cache dir. Removing it from database");
      metadata.remove(entry)
    });
  })
  .catch(() => log.warning("Error when reading cache dir to sync metadata database", config.bqTableName));
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
    return initLokijs(dirPath, saveInterval).then(() => syncCacheMetadataWithFileSystem());
  },
  getCollection(name) {
    return db.getCollection(name);
  },
  syncCacheMetadataWithFileSystem
};
