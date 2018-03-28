/* eslint-disable max-statements */

const database = require("./lokijs/database");

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
      clear("last_changed");
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
    lastChanged() {
      const entries = allEntries("last_changed");

      const entry = entries.length === 0 ?
        database.getCollection("last_changed").insert({lastChanged: '0'}) : entries[0];

      return entry.lastChanged;
    },
    setLastChanged(lastChanged = "0") {
      const previous = module.exports.watchlist.lastChanged();

      if (Number(previous) >= Number(lastChanged)) {
        return;
      }

      setAll("last_changed", {lastChanged});
    }
  }

};
