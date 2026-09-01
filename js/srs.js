import { CATS } from "./categories.js";
import { W } from "./data.js";
import { S, DAY, card, save } from "./state.js";

/* Spaced repetition, SM-2 shaped: ease grows on easy answers, shrinks on hard
   ones, and a lapse drops the card back into the learning stage.
   Grades: 0 Nochmal · 1 Schwer · 2 Gut · 3 Leicht */

const stamp = (c) => { c.m = Date.now(); return c; };

/* Cards handled today, counted independently of the new-word budget.
   Must run before nw/rv are touched for the current card: a day recorded before
   this counter existed seeds itself from the old rv+nw derivation, and seeding
   afterwards would count the card in flight twice. */
function markDone() {
  if (S.day.done === undefined) S.day.done = S.day.rv + S.day.nw;
  S.day.done++;
}

/* Spread reviews so cards learned together do not all fall due the same day. */
const fuzz = (i) => (i <= 2 ? i : i * (0.95 + Math.random() * 0.1));

/* First contact with a word: the learner places it themselves.
 *
 * countsAsNew is what the daily limit actually meters. "Kannte ich" is exempt:
 * the limit exists to cap the review load you are signing up for, and a word
 * you already know schedules one review a week out and little else. Charging it
 * a full slot rate-limits you on words you never had to learn.
 *
 * days === 0 means the card starts in the learning stage and comes back within
 * the same session, rather than being scheduled out. */
export const TRIAGE = {
  known: { days: 7, ease: 2.6, label: "Kannte ich",   countsAsNew: false },
  shaky: { days: 3, ease: 2.3, label: "Wackelig",     countsAsNew: true },
  new:   { days: 0, ease: 2.5, label: "Neu für mich", countsAsNew: true },
};

export const triageHint = (kind) =>
  TRIAGE[kind].days === 0 ? "kommt morgen wieder"
    : "kommt in " + TRIAGE[kind].days + " Tagen wieder";

export function triage(id, kind) {
  const now = Date.now();
  const t = TRIAGE[kind];
  S.cards[id] = stamp(t.days === 0
    ? { i: 0, e: t.ease, d: now, r: 0, l: 0, s: 1, step: 0 }
    : { i: t.days, e: t.ease, d: now + t.days * DAY, r: 1, l: 0, s: 2 });
  /* nw meters the new-word budget; done counts work actually put in. They are
     different questions -- "Kannte ich" is exempt from the budget but is still
     a card the learner dealt with today. */
  markDone();
  if (t.countsAsNew) S.day.nw++;
  save();
}

export function grade(id, g) {
  const c = S.cards[id], now = Date.now();
  /* Counted for every grade, including repeats of a card still in the learning
     stage, which increment neither rv nor nw. */
  markDone();
  /* Captured before the card moves: a lapse drops s to 1, and a graduating
     learner rises to 2, but neither should be counted as a review of the
     other kind. Only cards already in review count toward r and the day's
     review tally. */
  const wasReview = c.s === 2;
  S.day.tot++;
  if (g > 0) S.day.ok++;

  if (c.s === 1) {
    /* learning: two passes graduate the card, "Leicht" graduates it at once */
    if (g === 0) { c.step = 0; c.d = now; }
    else {
      c.step = (c.step || 0) + 1;
      if (c.step >= 2 || g === 3) { c.s = 2; c.i = g === 3 ? 4 : 1; c.d = now + fuzz(c.i) * DAY; }
      else c.d = now;
    }
  } else if (g === 0) {
    /* lapse: back to learning, keep a fraction of the interval */
    c.l++;
    c.e = Math.max(1.3, c.e - 0.2);
    c.s = 1; c.step = 0; c.d = now;
    c.i = Math.max(1, c.i * 0.3);
  } else {
    if (g === 1) { c.i = Math.max(1, c.i * 1.2); c.e = Math.max(1.3, c.e - 0.15); }
    if (g === 2) { c.i = Math.max(1, c.i * c.e); }
    if (g === 3) { c.i = Math.max(2, c.i * c.e * 1.3); c.e = Math.min(2.8, c.e + 0.15); }
    c.d = now + fuzz(c.i) * DAY;
  }

  if (wasReview) {
    c.r++;
    if (c.s === 2) S.day.rv++;
  }
  stamp(c);
  save();
}

/* The interval each grade would produce, shown on the buttons. */
export function nextIvl(id, g) {
  const c = card(id);
  if (!c) return "";
  if (g === 0) return "jetzt";
  if (c.s === 1) {
    if (g === 3) return "4 T";
    return (c.step || 0) + 1 >= 2 ? "1 T" : "jetzt";
  }
  const i = g === 1 ? Math.max(1, c.i * 1.2)
    : g === 2 ? Math.max(1, c.i * c.e)
    : Math.max(2, c.i * c.e * 1.3);
  if (i < 30) return Math.round(i) + " T";
  return i < 365 ? Math.round(i / 30) + " Mo" : Math.round(i / 365) + " J";
}

/* Counts behind the progress bar: new / learning / young (<21d) / mature. */
export function stats(k) {
  const keys = k === "all" ? CATS.map((c) => c.k) : [k];
  const s = { nw: 0, lr: 0, yg: 0, mt: 0, total: 0 };
  for (const kk of keys) {
    for (const w of W[kk]) {
      const c = card(w.id);
      if (!c) s.nw++;
      else if (c.s === 1) s.lr++;
      else if (c.i < 21) s.yg++;
      else s.mt++;
      s.total++;
    }
  }
  return s;
}

export function dueCount(k) {
  const now = Date.now();
  const keys = k === "all" ? CATS.map((c) => c.k) : [k];
  let d = 0;
  for (const kk of keys) for (const w of W[kk]) {
    const c = card(w.id);
    if (c && c.d <= now) d++;
  }
  return d;
}

/* Due cards first (oldest due first), with the day's new words dealt evenly
   through them so a session is not front-loaded with unfamiliar material. */
export function buildQueue(k) {
  const now = Date.now();
  const keys = k === "all" ? CATS.map((c) => c.k) : [k];
  let due = [], fresh = [];

  for (const kk of keys) for (const w of W[kk]) {
    const c = card(w.id);
    if (!c) fresh.push(w);
    else if (c.d <= now) due.push(w);
  }

  due.sort((a, b) => card(a.id).d - card(b.id).d);
  due = due.slice(0, Math.max(0, S.set.maxRev - S.day.rv));
  fresh = fresh.slice(0, Math.max(0, S.set.newPerDay - S.day.nw));

  const q = due.slice();
  fresh.forEach((w, i) => {
    const at = Math.round((i + 1) * (q.length + fresh.length) / (fresh.length + 1));
    q.splice(Math.min(q.length, at), 0, w);
  });
  return q;
}

/* ---- why a session ended ----
   "Nothing to do" has several different causes, and the difference matters:
   a daily cap is a choice the learner made and can change, whereas an empty
   queue really does mean come back later. */

export const newAllowanceLeft = () => Math.max(0, S.set.newPerDay - S.day.nw);

/* Words in this category never studied yet. */
export function unseenCount(k) {
  const keys = k === "all" ? CATS.map((c) => c.k) : [k];
  let n = 0;
  for (const kk of keys) for (const w of W[kk]) if (!card(w.id)) n++;
  return n;
}

/* When the earliest not-yet-due card comes back, or null if none. */
export function nextDueAt(k) {
  const keys = k === "all" ? CATS.map((c) => c.k) : [k];
  const now = Date.now();
  let soonest = null;
  for (const kk of keys) for (const w of W[kk]) {
    const c = card(w.id);
    if (c && c.d > now && (soonest === null || c.d < soonest)) soonest = c.d;
  }
  return soonest;
}
