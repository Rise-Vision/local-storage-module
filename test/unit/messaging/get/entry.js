/* eslint-env mocha */
const assert = require("assert");
const entry = require("../../../../src/messaging/get/entry");

describe("GET entry", ()=> {
  describe("validate - direct caching", ()=> {
    it("should validate correct entry value", ()=> {
      assert.equal(entry.validateDirectCacheProcess(), false);
      assert.equal(entry.validateDirectCacheProcess({fileId: ""}), false);
      assert.equal(entry.validateDirectCacheProcess({fileId: "testing"}), true);
    });
  });
});