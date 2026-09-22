import { localDateKey, nextReminderAt, validSchedule } from "../../src/lib/push/schedule";

export interface Env { FIREBASE_SERVICE_ACCOUNT: string; REMINDERS_ENABLED?: string; }
type Value = { stringValue?: string; timestampValue?: string; arrayValue?: { values?: Value[] } };
type Document = { name: string; fields: Record<string, Value>; updateTime: string };
const PROJECT = "liela-9426c";
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const API = `https://firestore.googleapis.com/v1/${ROOT}`;
export const BATCH_SIZE = 3;
const DEVICE_LIMIT = 3;
const MAX_LATENESS = 15 * 60_000;
const DEVICE_MAX_AGE = 30 * 86400_000;
const str = (value: string): Value => ({ stringValue: value });
const timestamp = (value: Date): Value => ({ timestampValue: value.toISOString() });
class HttpError extends Error {
  constructor(public status: number, public unregistered = false, public remoteCode = "") { super(`Remote service returned HTTP ${status}`); }
}
async function request(url: string, token: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: { status?: string; details?: { errorCode?: string }[] } } | null;
    throw new HttpError(response.status, data?.error?.details?.some(d => d.errorCode === "UNREGISTERED") === true, data?.error?.status);
  }
  return response.json();
}
async function query(token: string, parent: string, structuredQuery: unknown): Promise<Document[]> {
  const rows = await request(`${parent}:runQuery`, token, { structuredQuery }) as { document?: Document }[];
  return rows.flatMap(row => row.document ? [row.document] : []);
}
async function commit(token: string, document: Document, fields?: Record<string, Value>) {
  try {
    await request(`${API}:commit`, token, { writes: [fields ? {
      update: { name: document.name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: document.updateTime },
    } : { delete: document.name, currentDocument: { updateTime: document.updateTime } }] });
    return true;
  } catch (error) {
    // A settings edit, deletion or another cron invocation won the race.
    if (error instanceof HttpError && ([404, 409, 412].includes(error.status) || error.remoteCode === "FAILED_PRECONDITION")) return false;
    throw error;
  }
}
function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
let access: { credential: string; token: string; until: number } | undefined;
async function accessToken(env: Env) {
  if (access?.credential === env.FIREBASE_SERVICE_ACCOUNT && access.until > Date.now()) return access.token;
  let account: { project_id?: string; client_email?: string; private_key?: string };
  try { account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT); } catch { throw new Error("FIREBASE_SERVICE_ACCOUNT must contain valid JSON"); }
  if (account.project_id !== PROJECT || !account.client_email?.endsWith(`@${PROJECT}.iam.gserviceaccount.com`) || !account.private_key) throw new Error("Service account must belong to liela-9426c");
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: account.client_email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64url(new Uint8Array(signature))}` }), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new HttpError(response.status);
  const result = await response.json() as { access_token: string; expires_in: number };
  if (!result.access_token || !result.expires_in) throw new Error("Missing OAuth access token");
  access = { credential: env.FIREBASE_SERVICE_ACCOUNT, token: result.access_token, until: Date.now() + (result.expires_in - 120) * 1000 };
  return access.token;
}

/** Bounded reads; claim the next date BEFORE sending, never retry an ambiguous send. */
export async function runReminders(token: string, now = new Date()) {
  const due = await query(token, API, {
    from: [{ collectionId: "reminderSchedules" }],
    where: { fieldFilter: { field: { fieldPath: "nextAt" }, op: "LESS_THAN_OR_EQUAL", value: timestamp(now) } },
    orderBy: [{ field: { fieldPath: "nextAt" }, direction: "ASCENDING" }], limit: BATCH_SIZE,
  });
  const counts = { due: due.length, sent: 0, skipped: 0, failed: 0 };
  for (const document of due.slice(0, BATCH_SIZE)) {
    const fields = document.fields;
    const uid = fields.userId?.stringValue;
    if (!uid || document.name !== `${ROOT}/reminderSchedules/${uid}`) { await commit(token, document); counts.skipped++; continue; }
    const schedule = { time: fields.time?.stringValue || "", days: (fields.days?.arrayValue?.values || []).map(v => v.stringValue || ""), timeZone: fields.timeZone?.stringValue || "" };
    if (!validSchedule(schedule) || !schedule.days.length) { await commit(token, document); counts.skipped++; continue; }
    const slot = localDateKey(now, schedule.timeZone);
    const next = nextReminderAt(schedule, now, slot);
    const dueAt = new Date(fields.nextAt?.timestampValue || "");
    if (!next || !Number.isFinite(dueAt.getTime())) { await commit(token, document); counts.skipped++; continue; }
    // Validate that a due timestamp actually matches the configured local time/day.
    const expected = nextReminderAt(schedule, new Date(dueAt.getTime() - 1000));
    const eligible = fields.lastAttemptDate?.stringValue !== slot && now.getTime() - dueAt.getTime() <= MAX_LATENESS && expected?.getTime() === dueAt.getTime();
    if (!eligible) { await commit(token, document, { nextAt: timestamp(next) }); counts.skipped++; continue; }
    const devices = await query(token, `${API}/users/${encodeURIComponent(uid)}`, {
      from: [{ collectionId: "pushDevices" }], orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "DESCENDING" }], limit: DEVICE_LIMIT,
    });
    if (!devices.length) { await commit(token, document); counts.skipped++; continue; }
    if (!await commit(token, document, { nextAt: timestamp(next), lastAttemptDate: str(slot), lastAttemptAt: timestamp(now) })) { counts.skipped++; continue; }
    for (const device of devices.slice(0, DEVICE_LIMIT)) {
      const fid = device.fields.fid?.stringValue;
      const age = now.getTime() - new Date(device.fields.updatedAt?.timestampValue || "").getTime();
      if (!fid || device.fields.userId?.stringValue !== uid || !Number.isFinite(age) || age > DEVICE_MAX_AGE) { await commit(token, device); continue; }
      try {
        await request(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, token, { message: {
          fid, data: { userId: uid, slot }, webpush: { headers: { TTL: "900", Urgency: "normal" } },
        } });
        counts.sent++;
      } catch (error) {
        if (error instanceof HttpError && error.unregistered) await commit(token, device);
        else if (error instanceof HttpError && [401, 403, 429].includes(error.status)) throw error;
        else counts.failed++; // Do not retry after FCM may already have accepted the message.
      }
    }
  }
  return counts;
}
const worker = {
  fetch() { return new Response("Not found", { status: 404 }); },
  async scheduled(_event: unknown, env: Env) {
    if (env.REMINDERS_ENABLED !== "true") return;
    // No credential, user id or device id in logs.
    console.log(JSON.stringify(await runReminders(await accessToken(env))));
  },
};

export default worker;
