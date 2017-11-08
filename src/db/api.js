const database = require("./db/lokijs/database");

module.exports = {
  fileMetadata: {
    get(filePath, field = "") {
      if (!filePath) { throw Error("missing params"); }

      let metadata = database.getCollection("metadata"),
        item = metadata.by("filePath", filePath);

      return (!field) ? item : item[field];
    },
    put(entry) {
      if (!entry) { throw Error("missing params"); }

      return new Promise((res, rej)=>{
        let metadata = database.getCollection("metadata"),
          item = metadata.by("filePath", entry.filePath);

        if(!item) {
          item = metadata.insert({ filePath: entry.filePath });
        }

        item.status = entry.status;
        item.version = entry.version;
        item.token = entry.token;
        item.ospath = entry.ospath;

        try {
          metadata.update(item);
        } catch(err) {
          rej(err);
        }

        res();
      });
    }
  },
  owners: {
    get(filePath, field = "") {
      if (!filePath) { throw Error("missing params"); }

      let owners = database.getCollection("owners"),
        item = owners.by("filePath", filePath);

      return (!field) ? item : item[field];
    },
    put(entry) {
      if (!entry) { throw Error("missing params"); }

      return new Promise((res, rej)=>{
        let owners = database.getCollection("owners"),
          item = owners.by("filePath", entry.filePath),
          list;

        if(!item) {
          item = owners.insert({ filePath: entry.filePath });
          item.owners = [];
        }

        list = new Set(item.owners);
        list.add(entry.owner);

        item.owners = Array.from(list);

        try {
          owners.update(item);
        } catch(err) {
          rej(err);
        }

        res();
      });

    }
  },
  watchlist: {
    get(filePath, field = "") {
      if (!filePath) { throw Error("missing params"); }

      let watchlist = database.getCollection("watchlist"),
        item = watchlist.by("filePath", filePath);

      return (!field) ? item : item && item[field];
    },
    put(entry) {
      if (!entry) { throw Error("missing params"); }

      return new Promise((res, rej)=>{
        let watchlist = database.getCollection("watchlist"),
          item = watchlist.by("filePath", entry.filePath),
          list;

        if(!item) {
          item = watchlist.insert({ filePath: entry.filePath });
        }

        list = new Set(item.owners);
        list.add(entry.owner);

        item.version = entry.version;

        try {
          watchlist.update(item);
        } catch(err) {
          rej(err);
        }

        res();
      });
    }
  }

};