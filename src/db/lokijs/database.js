const COLLECTION_METADATA = "metadata",
  COLLECTION_OWNERS = "owners",
  COLLECTION_WATCH_LIST = "watchlist";

const commonConfig = require("common-display-module"),
  loki = require("lokijs"),
  path = require("path");

const defaultSaveInterval = 4000;

let db = null;

const initCollections = () => {
  [COLLECTION_METADATA, COLLECTION_OWNERS, COLLECTION_WATCH_LIST].forEach((collName)=>{
    const collection = db.getCollection(collName);

    if (!collection) {
      db.addCollection(collName, {
        unique: ["filePath"]
      });
    }
  });
};

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
    return new Promise((res, rej)=>{
      try {
        const dbPath = path.join(dirPath || commonConfig.getModulePath("local-storage"), "local-storage.db");

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
  },
  getCollection(name) {
    return db.getCollection(name);
  }
};
