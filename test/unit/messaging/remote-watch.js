/* eslint-env mocha */
const assert = require("assert");
const ms = require("../../../src/messaging/messaging-service.js");

describe("Messaging Service WATCH", ()=>{
  it("exists", ()=>{
    assert(ms.watch);
  });
});
