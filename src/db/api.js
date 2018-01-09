/* eslint-disable max-statements */

const database = require("./lokijs/database");

module.exports = {
  fileMetadata: {
    clear: ()=>database.getCollection("metadata").clear(),
    allEntries: ()=>database.getCollection("metadata").find(),
    setAll(updateObj) {
      database.getCollection("metadata")
      .findAndUpdate({}, (doc)=>Object.assign(doc, updateObj));
    },
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const metadata = database.getCollection("metadata");
      const item = metadata.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

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
    clear: ()=>database.getCollection("owners").clear(),
    get(filePath) {
      if (!filePath) {throw Error("missing params");}

      const owners = database.getCollection("owners");
      const item = owners.by("filePath", filePath);

      return item;
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
    clear: ()=>database.getCollection("watchlist").clear(),
    allEntries: ()=>database.getCollection("watchlist").find(),
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
    }
  },
  directCacheFileMetadata: {
    clear: ()=>database.getCollection("directcachemetadata").clear(),
    allEntries: ()=>database.getCollection("directcachemetadata").find(),
    setAll(updateObj) {
      database.getCollection("directcachemetadata")
      .findAndUpdate({}, (doc)=>Object.assign(doc, updateObj));
    },
    get(fileId, field = "") {
      if (!fileId) {throw Error("missing params");}

      const metadata = database.getCollection("directcachemetadata");
      const item = metadata.by("fileId", fileId);

      return field ? item && item[field] : item;
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("directcachemetadata");

        let item = metadata.by("fileId", entry.fileId);

        if (!item) {
          item = metadata.insert({fileId: entry.fileId});
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
    delete(fileId) {
      if (!fileId) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("directcachemetadata");
        const item = metadata.by("componentId", fileId);

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
  }
};
