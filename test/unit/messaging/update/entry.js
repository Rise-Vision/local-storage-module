/* eslint-env mocha */
const assert = require("assert");
const simple = require("simple-mock");
const gcsValidator = require("gcs-filepath-validator");
const entry = require("../../../../src/messaging/update/entry");

describe("UPDATE entry", ()=> {

  describe("validate", ()=> {
    beforeEach(()=>{
      simple.mock(gcsValidator, "validateFilepath").returnWith(true);
    });

    afterEach(() => {
      simple.restore();
    });
  });

  it("should validate correct entry value", ()=> {
    assert.equal(entry.validate(), false);
    assert.equal(entry.validate({filePath: "test-file"}), false);
    assert.equal(entry.validate({filePath: "test-file", version: "test-version"}), false);
    assert.equal(entry.validate({filePath: "test-file", version: "test-version", token: {}}), false);
    assert.equal(entry.validate({filePath: "test-file", version: "test-version", token: {hash: "abc123", data: {timestamp: Date.now(), filePath: "test-file", displayId: "test-display"}}}), false);
  });

});
