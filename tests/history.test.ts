import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHistoryDate } from "../src/lib/history";

test("yesterday uses calendar dates even when less than 24 hours elapsed", () => {
  const now = new Date(2026, 8, 18, 0, 5);
  assert.equal(formatHistoryDate(new Date(2026, 8, 17, 23, 55).toISOString(), now), "hier");
  assert.equal(formatHistoryDate(new Date(2026, 8, 18, 0, 1).toISOString(), now), "aujourd'hui");
});

test("calendar day comparison handles month and year boundaries", () => {
  assert.equal(formatHistoryDate(new Date(2025, 11, 31, 23).toISOString(), new Date(2026, 0, 1, 1)), "hier");
});

test("older and future dates are not labeled yesterday", () => {
  const now = new Date(2026, 8, 18, 12);
  assert.equal(formatHistoryDate(new Date(2026, 8, 1).toISOString(), now), "1 septembre");
  assert.equal(formatHistoryDate(new Date(2026, 8, 19).toISOString(), now), "19 septembre");
});

test("yesterday is correct across daylight-saving transitions", () => {
  assert.equal(formatHistoryDate(new Date(2026, 2, 28, 23).toISOString(), new Date(2026, 2, 29, 23)), "hier");
  assert.equal(formatHistoryDate(new Date(2026, 9, 24, 23).toISOString(), new Date(2026, 9, 25, 23)), "hier");
});
