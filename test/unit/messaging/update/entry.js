/* eslint-env mocha */
const assert = require("assert");
const simple = require("simple-mock");
const entry = require("../../../../src/messaging/update/entry");

describe("UPDATE entry", ()=> {

  describe("validateAndFilter", ()=> {
    afterEach(() => {
      simple.restore();
    });
  });


  it("should return false if files is not an Array of file objects with correct props", ()=> {
    assert.equal(entry.validateAndFilter(), false);
    assert.equal(entry.validateAndFilter([]), false);
    assert.equal(entry.validateAndFilter([{}]), false);
    assert.equal(entry.validateAndFilter([{filePath: "test-file-path"}]), false);
  });

  it("should return an array of filtered file objects", ()=>{
    const arr1 = [
      {filePath: "test-file-path1", version: "1.0.0", token: "abc123"},
      {filePath: "test-file-path1", version: "1.0.0", token: "def456"}
      ];
    const arr2 = [
      {filePath: "test-file-path1"},
      {filePath: "test-file-path2", version: "1.0.0", token: "abc123"}
      ];

    assert.deepEqual(entry.validateAndFilter(arr1), arr1);
    assert.deepEqual(entry.validateAndFilter(arr2), [arr2[1]]);
  });

});
