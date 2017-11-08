/* eslint-disable max-statements */

const database = require("./db/lokijs/database");

module.exports = {
  fileMetadata: {
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const metadata = database.getCollection("metadata");
      const item = metadata.by("filePath", filePath);

      return field ? item[field] : item;
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("metadata");

        let item = metadata.by("filePath", entry.filePath);

        if (!item) {
          item = metadata.insert({filePath: entry.filePath});
        }

        item.status = entry.status;
        item.version = entry.version;
        item.token = entry.token;
        item.ospath = entry.ospath;

        try {
          metadata.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });
    }
  },
  owners: {
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const owners = database.getCollection("owners");
      const item = owners.by("filePath", filePath);

      return field ? item[field] : item;
    },
    put(entry) {
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

    }
  },
  watchlist: {
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const watchlist = database.getCollection("watchlist");
      const item = watchlist.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const watchlist = database.getCollection("watchlist");

        let item = watchlist.by("filePath", entry.filePath);

        if (!item) {
          item = watchlist.insert({filePath: entry.filePath});
        }

        const list = new Set(item.owners);
        list.add(entry.owner);

        item.version = entry.version;

        try {
          watchlist.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });
    }
  }

};
