/* eslint-env mocha */
/* eslint-disable function-paren-newline, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const logger = require("../../../../src/logger");
const db = require("../../../../src/db/api");
const watch = require("../../../../src/messaging/watch/watch");
const watchlist = require("../../../../src/messaging/watch/watchlist");

describe("watchlist - unit", () => {

  beforeEach(() => simple.mock(logger, "file"));

  afterEach(() => simple.restore());

  describe("WATCHLIST-COMPARE", () => {
    beforeEach(() => {
      simple.mock(commonMessaging, "sendToMessagingService").returnWith();
    });

    it("requests WATCHLIST-COMPARE", ()=> {
      simple.mock(db.watchlist, "lastChanged").returnWith(123456);

      watchlist.requestWatchlistCompare();

      assert(commonMessaging.sendToMessagingService.callCount, 1);
      assert.deepEqual(commonMessaging.sendToMessagingService.lastCall.args[0], {
        topic: "WATCHLIST-COMPARE", lastChanged: 123456
      });
    });
  })

  describe("WATCHLIST-RESULT", () => {
    beforeEach(() => {
      simple.mock(db.owners, "get").returnWith({owners: ['licensing']});
      simple.mock(db.fileMetadata, "put").resolveWith();
      simple.mock(db.fileMetadata, "getAllFolders").returnWith([]);
      simple.mock(db.watchlist, "put").resolveWith();
      simple.mock(db.watchlist, "setLastChanged").returnWith();
      simple.mock(watch, "requestMSUpdate").resolveWith();
    });

    it("rewatches folders that are present in local metadata but missing from remote watchlist", ()=>{
      const folderPath = "my-bucket/my-folder/";

      simple.mock(db.fileMetadata, "getAllFolders").reset();
      simple.mock(db.fileMetadata, "getAllFolders")
      .returnWith([{filePath: folderPath, version: "0"}]);

      const testEntries = [
        {filePath: "bucket/my-test-file", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {
        "bucket/file2": "3",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(()=>{
        assert(watch.requestMSUpdate.lastCall.args[0].filePath, folderPath);
      });

    });
    it("refreshes the watchlist when there are changes", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {
        "bucket/file1": "2",
        "bucket/file2": "3",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // two files were updated
        assert.equal(watch.requestMSUpdate.callCount, 2);
        watch.requestMSUpdate.calls.forEach(call =>{
          const message = call.args[0];
          const metaData = call.args[1];

          assert.deepEqual(message, {
            topic: "WATCH", filePath: metaData.filePath
          });
          assert.equal(metaData.status, "UNKNOWN");

          switch (metaData.filePath) {
            case "bucket/file1": return assert.equal(metaData.version, "1");
            case "bucket/file2": return assert.equal(metaData.version, "2");
            default: assert.fail(metaData.filePath);
          }
        });

        // no file was deleted
        assert(!db.fileMetadata.put.called);

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
    });

    it("refreshes the watchlist when there are changes and deletions", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {
        "bucket/file1": "2",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // just one file was updated
        assert.equal(watch.requestMSUpdate.callCount, 1);
        assert.deepEqual(watch.requestMSUpdate.lastCall.args[0], {
          topic: "WATCH",
          filePath: "bucket/file1"
        });
        assert.deepEqual(watch.requestMSUpdate.lastCall.args[1], {
          filePath: "bucket/file1",
          status: "UNKNOWN",
          version: "1"
        });

        // one file was deleted
        assert.equal(db.fileMetadata.put.callCount, 1);
        assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
          filePath: "bucket/file2", status: "UNKNOWN", version: "2"
        });

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
    });

    it("refreshes the watchlist when there are changes and additions", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.owners, "get").returnWith({owners: ["licensing"]});
      simple.mock(db.owners, "put").returnWith();
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {
        "bucket/file1": "2",
        "bucket/file2": "3",
        "bucket/file3": "3",
        "bucket/dir/file4": "1"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // two files were updated and one added
        assert.equal(watch.requestMSUpdate.callCount, 3);
        watch.requestMSUpdate.calls.forEach(call =>{
          const message = call.args[0];
          const metaData = call.args[1];

          assert.deepEqual(message, {
            topic: "WATCH", filePath: metaData.filePath
          });
          assert.equal(metaData.status, "UNKNOWN");

          switch (metaData.filePath) {
            case "bucket/file1": return assert.equal(metaData.version, "1");
            case "bucket/file2": return assert.equal(metaData.version, "2");
            case "bucket/dir/file4": return assert.equal(metaData.version, "0");
            default: assert.fail(metaData.filePath);
          }
        });

        assert.equal(db.owners.put.callCount, 1);
        assert.deepEqual(db.owners.put.lastCall.args[0], {
          filePath: "bucket/dir/file4",
          owners: ["licensing"]
        });

        // addition inserts into metadata and watchlist
        assert.equal(db.fileMetadata.put.callCount, 1);
        assert.deepEqual(db.fileMetadata.put.lastCall.args[0], {
          filePath: "bucket/dir/file4",
          version: "0",
          status: "UNKNOWN"
        });

        assert.equal(db.watchlist.put.callCount, 1);
        assert.equal(db.watchlist.put.lastCall.args[0].filePath, "bucket/dir/file4");
        assert.equal(db.watchlist.put.lastCall.args[0].version, "0");

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
    });

    it("refreshes the watchlist when there are no changes", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {
        "bucket/file1": "1",
        "bucket/file2": "2",
        "bucket/file3": "3"
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        assert(!watch.requestMSUpdate.called);
        assert(!db.fileMetadata.put.called);

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
      });
    });

    it("rewatches local files and folders missing from remote watchlist when remote returns empty watchlist and version 0", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      const remoteWatchlist = {};

      return watchlist.refresh(remoteWatchlist, "0")
      .then(() => {
        assert.equal(db.fileMetadata.put.called, true);

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 0);
      });
    });

    it("does not refresh anything if there is no remote watchlist provided", () => {
      const testEntries = [
        {filePath: "bucket/file1", status: "CURRENT", version: "1"},
        {filePath: "bucket/file2", status: "CURRENT", version: "2"},
        {filePath: "bucket/file3", status: "CURRENT", version: "3"}
      ];

      simple.mock(db.fileMetadata, "get").callFn(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      simple.mock(db.watchlist, "allEntries").returnWith(testEntries);

      return watchlist.refresh({}, 123456)
      .then(() => {
        assert(!watch.requestMSUpdate.called);
        assert(!db.fileMetadata.put.called);
        assert(!db.watchlist.setLastChanged.called);
      });
    });

  });

});
