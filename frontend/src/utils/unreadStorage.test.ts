import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLastViewedMapString,
  sanitizeLastViewedMap,
  type LastViewedMap,
} from "./unreadStorage";

test("sanitizeLastViewedMap filters invalid entries and coerces numbers", () => {
  const input = {
    a: 1700000000000,
    b: -5,
    c: "not-a-number",
    d: 123.9,
    e: Number.POSITIVE_INFINITY,
  } as unknown as Record<string, unknown>;

  const result = sanitizeLastViewedMap(input);
  const expected: LastViewedMap = {
    a: 1700000000000,
    d: 123,
  };

  assert.deepStrictEqual(result, expected);
});

test("parseLastViewedMapString returns empty object for invalid JSON or null", () => {
  assert.deepStrictEqual(parseLastViewedMapString(null), {});
  assert.deepStrictEqual(parseLastViewedMapString("not json"), {});
});

test("parseLastViewedMapString validates structure", () => {
  const json = JSON.stringify({ a: 1, b: -1, c: "x" });
  assert.deepStrictEqual(parseLastViewedMapString(json), { a: 1 });
});

