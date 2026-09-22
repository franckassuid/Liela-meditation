import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { localDateKey, nextReminderAt, REMINDER_DAYS } from "../src/lib/push/schedule";
import worker, { BATCH_SIZE, runReminders } from "../workers/reminders/index";
const daily = { time: "09:30", days: [...REMINDER_DAYS], timeZone: "Europe/Paris" };
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("reminders follow local time, selected weekdays and DST without an early catch-up", () => {
  assert.equal(nextReminderAt(daily, new Date("2026-09-22T07:29:00Z"))?.toISOString(), "2026-09-22T07:30:00.000Z");
  assert.equal(nextReminderAt(daily, new Date("2026-09-22T07:30:20Z"))?.toISOString(), "2026-09-23T07:30:00.000Z");
  assert.equal(nextReminderAt({ ...daily, days: ["lun"] }, new Date("2026-09-22T07:29:00Z"))?.toISOString(), "2026-09-28T07:30:00.000Z");
  assert.equal(nextReminderAt(daily, new Date("2026-10-24T08:00:00Z"))?.toISOString(), "2026-10-25T08:30:00.000Z");
  assert.equal(nextReminderAt({ ...daily, time: "02:30" }, new Date("2026-03-29T00:00:00Z"))?.toISOString(), "2026-03-30T00:30:00.000Z");
  assert.equal(localDateKey(nextReminderAt({ ...daily, time: "02:30" }, new Date("2026-10-25T00:40:00Z"), "2026-10-25")!, daily.timeZone), "2026-10-26");
  assert.equal(nextReminderAt({ ...daily, timeZone: "bogus" }, new Date()), null);
  assert.equal(nextReminderAt({ ...daily, days: [] }, new Date()), null);
});
const root = "projects/liela-9426c/databases/(default)/documents";
const value = (stringValue: string) => ({ stringValue });
const document = () => ({ name: `${root}/reminderSchedules/alice`, updateTime: "2026-09-21T10:00:00Z", fields: {
  userId: value("alice"), time: value("09:30"), timeZone: value("Europe/Paris"), days: { arrayValue: { values: REMINDER_DAYS.map(value) } }, nextAt: { timestampValue: "2026-09-22T07:30:00Z" },
} });
type Doc = ReturnType<typeof document>;
function fixture(options: { conflict?: boolean; fcmStatus?: number; unregistered?: boolean; due?: Doc[]; emptyDevices?: boolean } = {}) {
  const calls: { url: string; body: Record<string, any> }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body));
    calls.push({ url, body });
    if (url.endsWith("documents:runQuery")) return Response.json((options.due || [document()]).map(document => ({ document })));
    if (url.endsWith("/users/alice:runQuery")) return Response.json(options.emptyDevices ? [] : [{ document: { name: `${root}/users/alice/pushDevices/fid`, updateTime: "2026-09-21T10:00:00Z", fields: { userId: value("alice"), fid: value("fid"), updatedAt: { timestampValue: "2026-09-21T10:00:00Z" } } } }]);
    if (url.endsWith(":commit")) return Response.json({}, { status: options.conflict ? 409 : 200 });
    if (url.endsWith("messages:send")) return Response.json(options.unregistered ? { error: { details: [{ errorCode: "UNREGISTERED" }] } } : {}, { status: options.fcmStatus || 200 });
    throw new Error(`Unexpected endpoint: ${url}`);
  };
  return calls;
}
const now = new Date("2026-09-22T07:30:20Z");
test("the server claims tomorrow before sending one data-only FCM message", async () => {
  const calls = fixture();
  assert.deepEqual(await runReminders("test", now), { due: 1, sent: 1, skipped: 0, failed: 0 });
  assert.equal(calls.length, 4);
  const claim = calls[2].body.writes[0];
  assert.equal(claim.currentDocument.updateTime, document().updateTime);
  assert.equal(claim.update.fields.nextAt.timestampValue, "2026-09-23T07:30:00.000Z");
  assert.equal(claim.update.fields.lastAttemptDate.stringValue, "2026-09-22");
  assert.deepEqual(calls[3].body.message.data, { userId: "alice", slot: "2026-09-22" });
  assert.equal(calls[3].body.message.notification, undefined);
  assert.equal(calls[0].body.structuredQuery.limit, BATCH_SIZE);
});
test("concurrent cron or settings edits cannot send after a failed claim", async () => {
  const calls = fixture({ conflict: true });
  assert.equal((await runReminders("test", now)).sent, 0);
  assert.equal(calls.some(call => call.url.endsWith("messages:send")), false);
});
test("a server already attempted today never sends a second reminder after rescheduling", async () => {
  const due = document();
  Object.assign(due.fields, { lastAttemptDate: value("2026-09-22") });
  const calls = fixture({ due: [due] });
  assert.equal((await runReminders("test", now)).skipped, 1);
  assert.equal(calls.length, 2);
});
test("stale or forged timestamps are advanced without sending", async () => {
  for (const time of ["2026-09-21T07:30:00Z", "2026-09-22T07:30:15Z"]) {
    const due = document(); due.fields.nextAt.timestampValue = time;
    const calls = fixture({ due: [due] });
    assert.equal((await runReminders("test", now)).sent, 0);
    assert.equal(calls.length, 2);
  }
});
test("an ambiguous FCM error is not retried; only UNREGISTERED removes the device", async () => {
  let calls = fixture({ fcmStatus: 503 });
  assert.equal((await runReminders("test", now)).failed, 1);
  assert.equal(calls.length, 4);
  calls = fixture({ fcmStatus: 404, unregistered: true });
  await runReminders("test", now);
  assert.equal(calls.length, 5);
  assert.match(calls[4].body.writes[0].delete, /pushDevices/);
  calls = fixture({ fcmStatus: 404 });
  await runReminders("test", now);
  assert.equal(calls.length, 4);
});
test("no-device schedules are removed; each invocation is capped at three users", async () => {
  let calls = fixture({ emptyDevices: true });
  assert.equal((await runReminders("test", now)).sent, 0);
  assert.match(calls[2].body.writes[0].delete, /reminderSchedules/);
  calls = fixture({ due: Array.from({ length: 8 }, document) });
  await runReminders("test", now);
  assert.equal(calls.filter(call => call.url.endsWith("messages:send")).length, 3);
});
test("disabled workers make no requests and reject a credential from the wrong project", async () => {
  let count = 0; globalThis.fetch = async () => { count++; throw new Error("unexpected network call"); };
  await worker.scheduled({}, { FIREBASE_SERVICE_ACCOUNT: "" });
  assert.equal(count, 0);
  await assert.rejects(worker.scheduled({}, { REMINDERS_ENABLED: "true", FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: "wrong" }) }), /liela-9426c/);
  assert.equal(count, 0);
  assert.equal(worker.fetch().status, 404);
});
