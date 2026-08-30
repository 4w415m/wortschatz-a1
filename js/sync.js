import { SYNC_URL } from "./config.js";
import { S, fresh, save, replaceState, syncConfig, setSyncConfig } from "./state.js";

export const syncEnabled = () => !!SYNC_URL;

/* The code is the only credential: whoever holds it can read and overwrite that
   progress. 80 bits of randomness, in groups of four so it can be read aloud or
   typed on a phone without much pain. Crockford-style alphabet, no I/L/O/U. */
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

export function createCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
  return chars.match(/.{4}/g).join("-");
}

const normalise = (code) => code.trim().toLowerCase().replace(/[^0-9a-z]/g, "");

export function validCode(code) {
  const c = normalise(code);
  return c.length === 16 && [...c].every((ch) => ALPHABET.includes(ch));
}

/* ---- merge ----
   Two devices edit the same words offline, so neither copy is authoritative.
   Cards merge per word by last-touched time; everything else follows whichever
   copy was written most recently. Merging is commutative and idempotent, so
   syncing twice, or in either direction, lands on the same result. */
export function mergeStates(a, b) {
  if (!a) return b;
  if (!b) return a;

  const newer = (a.mt || 0) >= (b.mt || 0) ? a : b;
  const older = newer === a ? b : a;

  const cards = { ...older.cards };
  for (const [id, theirs] of Object.entries(newer.cards)) {
    const mine = cards[id];
    if (!mine) { cards[id] = theirs; continue; }
    /* Fall back to review count, then due date, when timestamps are missing or
       equal — cards written before v2 carry no m. */
    const t = theirs.m || 0, mm = mine.m || 0;
    if (t > mm) cards[id] = theirs;
    else if (t === mm) {
      if ((theirs.r || 0) > (mine.r || 0)) cards[id] = theirs;
      else if ((theirs.r || 0) === (mine.r || 0) && (theirs.d || 0) > (mine.d || 0)) cards[id] = theirs;
    }
  }

  /* A flag is a note to self that something looks wrong; keep every one raised
     on either device, and let the user clear them explicitly. */
  const flags = { ...older.flags, ...newer.flags };

  /* Same calendar day on both: take the higher count of each, which keeps the
     result stable no matter how often the two devices sync. */
  let day;
  if (a.day.d === b.day.d) {
    day = {
      d: a.day.d,
      nw: Math.max(a.day.nw, b.day.nw), rv: Math.max(a.day.rv, b.day.rv),
      ok: Math.max(a.day.ok, b.day.ok), tot: Math.max(a.day.tot, b.day.tot),
    };
  } else {
    day = a.day.d > b.day.d ? a.day : b.day;
  }

  const streak = (a.streak.last || "") >= (b.streak.last || "")
    ? { n: Math.max(a.streak.n, b.streak.n), last: a.streak.last }
    : { n: Math.max(a.streak.n, b.streak.n), last: b.streak.last };

  return {
    ...fresh(),
    v: Math.max(a.v || 1, b.v || 1),
    mt: Math.max(a.mt || 0, b.mt || 0),
    set: newer.set,
    cards, flags, day, streak,
  };
}

/* ---- transport ---- */

async function request(method, code, body) {
  if (!SYNC_URL) throw new Error("Sync ist nicht eingerichtet");
  const res = await fetch(`${SYNC_URL.replace(/\/$/, "")}/s/${normalise(code)}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Server antwortet ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const pull = (code) => request("GET", code);
export const push = (code, state) => request("PUT", code, state);

/* Pull, merge into local, push the result back. Returns the merged state. */
export async function syncNow(code = syncConfig().code) {
  if (!code) throw new Error("Kein Sync-Code");
  const remote = await pull(code);
  const merged = mergeStates(S, remote);
  replaceState(merged);
  await push(code, S);
  setSyncConfig({ ...syncConfig(), code, lastSync: Date.now() });
  return S;
}

export function forgetSync() {
  setSyncConfig({});
}
