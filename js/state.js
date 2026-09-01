import { toast } from "./dom.js";

export const DAY = 864e5;
const KEY = "wortschatz-a1-v1";
const VERSION = 2;

/* Progress for one card:
   i interval (days) · e ease · d due (ms) · r reviews · l lapses
   s stage (1 = learning, 2 = review) · step learning step · m last modified (ms) */

export let S = null;

/* Kept out of S on purpose: the sync code is a secret, and S is what the backup
   textarea exports. Keeping them separate means a backup can be pasted anywhere
   without handing over write access to your synced progress. */
const SYNC_KEY = "wortschatz-a1-sync";

export function today(at = Date.now()) {
  const d = new Date(at);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export function fresh() {
  return {
    v: VERSION,
    mt: 0,
    cards: {},
    flags: {},
    set: { newPerDay: 30, maxRev: 120 },
    day: { d: today(), nw: 0, rv: 0, ok: 0, tot: 0, done: 0 },
    streak: { n: 0, last: "" },
  };
}

/* localStorage throws in private-mode Safari and when quota is exhausted; mem
   keeps the session usable (and syncable) even when nothing can be persisted. */
let mem = null;
let storageOK = true;

function readRaw() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/* touch=false persists without claiming a newer edit: opening the app is not a
   change, and stamping mt here would let the last device opened win the merge. */
export function save({ touch = true } = {}) {
  if (touch) S.mt = Date.now();
  const json = JSON.stringify(S);
  mem = json;
  try {
    localStorage.setItem(KEY, json);
  } catch {
    if (storageOK) { storageOK = false; toast("Fortschritt wird nicht gespeichert"); }
  }
}

/* v1 keyed cards by array position ("nouns:12"); v2 keys them by headword.
   The map is only fetched when there is v1 data to convert. */
async function migrate(state) {
  if (state.v >= VERSION) return state;
  const ids = Object.keys(state.cards);
  if (!ids.length && !Object.keys(state.flags).length) return { ...state, v: VERSION };

  let map;
  try {
    const res = await fetch("data/legacy-ids.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    map = await res.json();
  } catch {
    /* Better to keep the old keys than to drop progress on the floor; they simply
       will not match any word until the map loads on a later visit. */
    toast("Fortschritt konnte nicht umgestellt werden");
    return state;
  }

  const cards = {}, flags = {};
  for (const [old, card] of Object.entries(state.cards)) {
    if (map[old]) cards[map[old]] = card;
  }
  for (const old of Object.keys(state.flags)) {
    if (map[old]) flags[map[old]] = 1;
  }
  return { ...state, v: VERSION, cards, flags };
}

/* Roll the day counters over, and settle the streak, when the date has changed. */
function rollDay(state) {
  if (state.day.d === today()) return state;
  const yesterday = today(Date.now() - DAY);
  if (state.day.rv + state.day.nw > 0 && state.streak.last !== state.day.d) {
    state.streak.n = (state.streak.last === yesterday || state.streak.last === "")
      ? state.streak.n + 1 : 1;
    state.streak.last = state.day.d;
  }
  if (state.streak.last !== today() && state.streak.last !== yesterday) {
    state.streak.n = state.streak.last ? 0 : state.streak.n;
  }
  state.day = { d: today(), nw: 0, rv: 0, ok: 0, tot: 0, done: 0 };
  return state;
}

export async function initState() {
  const raw = readRaw() ?? mem;
  let state = fresh();
  if (raw) {
    try { state = Object.assign(fresh(), JSON.parse(raw)); }
    catch { toast("Gespeicherter Fortschritt war beschädigt"); }
  }
  S = rollDay(await migrate(state));
  save({ touch: false });
  return S;
}

/* Reload from storage without re-running migration — used when returning home. */
export function refresh() {
  const raw = readRaw() ?? mem;
  if (raw) {
    try { S = rollDay(Object.assign(fresh(), JSON.parse(raw))); } catch { /* keep S */ }
  }
  return S;
}

export function replaceState(next) {
  S = Object.assign(fresh(), next);
  save();
  return S;
}

export function resetState() {
  S = fresh();
  save();
  return S;
}

export const card = (id) => S.cards[id] || null;

/* ---- sync config (separate key, see note above) ---- */

export function syncConfig() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; }
  catch { return {}; }
}

export function setSyncConfig(cfg) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}
