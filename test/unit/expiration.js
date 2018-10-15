/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");

const db = require("../../src/db/api");

const expiration = require("../../src/expiration");

describe('Expiration', () => {

  afterEach(() => simple.restore());

  it("does not indicate a metadata entry should be expired if it doesn't have a watchSequence field", () => {
    const shouldBeExpired = expiration.shouldBeExpired({});

    assert(!shouldBeExpired);
  });

  it("does not indicate a metadata entry should be expired if its watchSequence field value is close to the runtime sequence value", () => {
    simple.mock(db.watchlist, "runtimeSequence").returnWith(0);

    const shouldBeExpired = expiration.shouldBeExpired({watchSequence: 1});

    assert(!shouldBeExpired);
  });

  it("indicates a metadata entry should be expired if its watchSequence field value is MAX_EXPIRE_COUNT less than the runtime sequence value", () => {
    simple.mock(db.watchlist, "runtimeSequence").returnWith(6);

    const shouldBeExpired = expiration.shouldBeExpired({watchSequence: 1});

    assert(shouldBeExpired);
  });

});
