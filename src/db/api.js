/* eslint-disable max-statements */

const database = require("./lokijs/database");

const MAX_EXPIRE_COUNT = 5;

function allEntries(collection) {
  return database.getCollection(collection).find();
}

function clear(collection) {
  database.getCollection(collection).clear();
}

function setAll(collection, updateObj) {
  database.getCollection(collection)
  .findAndUpdate({}, (doc)=>Object.assign(doc, updateObj));
}

module.exports = {
  fileMetadata: {
    clear: ()=>clear("metadata"),
    allEntries: ()=>allEntries("metadata"),
    setAll: (updateObj)=>setAll("metadata", updateObj),
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const metadata = database.getCollection("metadata");
      const item = metadata.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    put(entry) {
      if (!entry || !entry.filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("metadata");

        let item = metadata.by("filePath", entry.filePath);

        if (!item) {
          item = metadata.insert({filePath: entry.filePath});
        }

        Object.assign(item, entry);
        try {
          metadata.update(item);
        } catch (err) {
          rej(err);
        }

        res(entry);
      });
    },
    getFolderFiles(folderPath) {
      return database.getCollection("metadata").where(entry => {
        return entry.filePath.startsWith(folderPath) && !entry.filePath.endsWith("/");
      })
    },
    getStale: ()=>database.getCollection("metadata").find({status: "STALE"}),
    delete(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("metadata");
        const item = metadata.by("filePath", filePath);

        if (item) {
          try {
            metadata.remove(item);
          } catch (err) {
            rej(err);
          }
        }

        res();
      });
    },
    updateWatchSequence(filePath) {
      const metadata = module.exports.fileMetadata.get(filePath);

      if (!metadata) {
        return Promise.reject(Error(`filePath not in local database ${filePath}`));
      }

      const watchSequence = module.exports.watchlist.runtimeSequence();

      return module.exports.fileMetadata.put({filePath, watchSequence});
    }
  },
  owners: {
    clear: ()=>clear("owners"),
    get(filePath) {
      if (!filePath) {throw Error("missing params");}

      const owners = database.getCollection("owners");
      const item = owners.by("filePath", filePath);

      return item;
    },
    put(entry) {
      if (!entry || !entry.filePath || !entry.owners) {
        throw Error("missing params");
      }

      const owners = database.getCollection("owners");

      let item = owners.by("filePath", entry.filePath);

      if (!item) {
        item = owners.insert({filePath: entry.filePath});
      }

      item.owners = entry.owners;

      owners.update(item);
    },
    addToSet(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const owners = database.getCollection("owners");

        let item = owners.by("filePath", entry.filePath);

        if (!item) {
          item = owners.insert({filePath: entry.filePath});
          item.owners = [];
        }

        const list = new Set(item.owners);
        list.add(entry.owner);

        item.owners = Array.from(list);

        try {
          owners.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });

    },
    delete(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const owners = database.getCollection("owners");
        const item = owners.by("filePath", filePath);

        if (item) {
          try {
            owners.remove(item);
          } catch (err) {
            rej(err);
          }
        }

        res();
      });
    }
  },
  watchlist: {
    clear() {
      clear("watchlist");
      clear("parameters");
    },
    allEntries: ()=>allEntries("watchlist"),
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const watchlist = database.getCollection("watchlist");
      const item = watchlist.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    delete(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const watchlist = database.getCollection("watchlist");
        const item = watchlist.by("filePath", filePath);

        if (item) {
          try {
            watchlist.remove(item);
          } catch (err) {
            rej(err);
          }
        }

        res();
      });
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const watchlist = database.getCollection("watchlist");

        let item = watchlist.by("filePath", entry.filePath);

        if (!item) {
          item = watchlist.insert({filePath: entry.filePath});
        }

        item.version = entry.version;

        try {
          watchlist.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });
    },
    parameters() {
      const entries = allEntries("parameters");

      if (entries.length > 0) {
        return entries[0];
      }

      const parameters = database.getCollection("parameters");
      return parameters.insert({lastChanged: '0', runtimeSequence: 1});
    },
    setParameter(key, value) {
      const parameters = module.exports.watchlist.parameters();

      const entry = {
        lastChanged: parameters.lastChanged,
        runtimeSequence: parameters.runtimeSequence,
        [key]: value
      };

      setAll("parameters", entry);
    },
    lastChanged() {
      return module.exports.watchlist.parameters().lastChanged;
    },
    setLastChanged(lastChanged = "0") {
      const previous = module.exports.watchlist.lastChanged();

      if (Number(previous) >= Number(lastChanged)) {
        return;
      }

      module.exports.watchlist.setParameter('lastChanged', lastChanged);
    },
    runtimeSequence() {
      return module.exports.watchlist.parameters().runtimeSequence;
    },
    increaseRuntimeSequence() {
      const currentSequence = module.exports.watchlist.runtimeSequence();
      const nextSequence = currentSequence + 1;

      module.exports.watchlist.setParameter('runtimeSequence', nextSequence);
    },
    shouldBeExpired(metadataEntry) {
      const {watchSequence} = metadataEntry;

      if (!watchSequence) {
        return false;
      }

      const currentSequence = module.exports.watchlist.runtimeSequence();

      return watchSequence + MAX_EXPIRE_COUNT <= currentSequence;
    }
  }

};
