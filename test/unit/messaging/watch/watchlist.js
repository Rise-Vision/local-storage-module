/* eslint-env mocha */
/* eslint-disable function-paren-newline, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");

const db = require("../../../../src/db/api");
const update = require("../../../../src/messaging/update/update");
const watchlist = require("../../../../src/messaging/watch/watchlist");

global.log = {file: ()=>{}, debug: ()=>{}, error: ()=>{}, all: () => {}};

describe("watchlist - unit", () => {

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
      simple.mock(db.watchlist, "setLastChanged").returnWith();
      simple.mock(update, "update").resolveWith();
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
        assert.equal(update.update.callCount, 2);
        update.update.calls.forEach(call =>{
          const entry = call.args[0];

          assert.equal(entry.status, "CURRENT");

          switch (entry.filePath) {
            case "bucket/file1": return assert.equal(entry.version, "2");
            case "bucket/file2": return assert.equal(entry.version, "3");
            default: assert.fail(entry.filePath);
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
        assert.equal(update.update.callCount, 1);
        assert.deepEqual(update.update.lastCall.args[0], {
          filePath: "bucket/file1", status: "CURRENT", version: "2"
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
        assert(!update.update.called);
        assert(!db.fileMetadata.put.called);

        assert.equal(db.watchlist.setLastChanged.callCount, 1);
        assert.equal(db.watchlist.setLastChanged.lastCall.args[0], 123456);
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
        assert(!update.update.called);
        assert(!db.fileMetadata.put.called);
        assert(!db.watchlist.setLastChanged.called);
      });
    });

  });

});
