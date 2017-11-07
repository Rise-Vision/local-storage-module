const assert = require("assert"),
  database = require("../../../../src/db/lokijs/database"),
  simple = require("simple-mock");

describe("lokijs", ()=>{
  afterEach(()=>{
    simple.restore();
  });

  after(()=>{
    database.close();
  });

  it("adds all required collections", ()=>{
    // giving path that doesn't exists defaults to memory persistence
    database.start("test_dir")
      .then(()=>{
        assert(database.getCollection("metadata"));
        assert(database.getCollection("owners"));
        assert(database.getCollection("watchlist"));
      });
  });

});