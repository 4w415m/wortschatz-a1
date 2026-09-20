/* Checks data/*.json and pins the conjugator's output.

     node tools/check-data.mjs            report problems, exit 1 on errors
     node tools/check-data.mjs --update   rewrite tools/verbs.snapshot.txt

   The snapshot holds every verb's present tense and imperative. A rule change
   in conjugate.js or a data edit that alters either shows up here as a diff,
   so it can be checked on purpose rather than noticed on a card. */
import { readFileSync, writeFileSync } from "node:fs";
import { CATS } from "../js/categories.js";
import { present, imperative, splitSeparable } from "../js/conjugate.js";

const root = new URL("..", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const errors = [], warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ---- every category ---- */
for (const cat of CATS) {
  const rows = read(`data/${cat.k}.json`);
  const seen = new Set();
  rows.forEach((w, i) => {
    const head = w[cat.head];
    const at = `${cat.k}[${i}] ${head ?? "?"}`;
    if (!head) err(at + ": no headword");
    if (seen.has(head)) err(at + ": duplicate headword");
    seen.add(head);
    if (!w.en) err(at + ": no en");
    if (!w.example || !w.example.de || !w.example.en) err(at + ": example needs de and en");
    if (!("tip" in w)) err(at + ": no tip field");
  });
}

/* ---- verbs ---- */
const verbs = read("data/verbs.json");
const FLAGS = new Set(["core", "irr", "sep", "insep", "modal"]);
const INSEP = /^(be|ge|er|ver|zer|ent|emp|miss|unter|über|wieder).{4,}$/;
const lastVowel = (s) => (s.match(/[aeiouäöü]+/g) || []).pop();
const glosses = {}, senses = {};

for (const v of verbs) {
  const at = "verbs " + v.infinitive;
  const has = (f) => v.flags.includes(f);
  for (const f of v.flags) if (!FLAGS.has(f)) err(at + ": unknown flag " + f);
  if ("perfect" in v) err(at + ": old `perfect` field; use aux + partizip");
  if (v.forms && v.forms.length !== 6) err(at + ": forms needs 6 entries");
  if (v.stemChange && v.stemChange.length !== 2) err(at + ": stemChange is [du, er]");
  if (!!v.aux !== !!v.partizip) err(at + ": aux and partizip go together");
  if (v.aux && !["hat", "ist"].includes(v.aux)) err(at + ": aux is hat or ist");
  if (!v.partizip && !has("modal")) err(at + ": no Perfekt");
  if (v.praeteritum && v.praeteritum.length !== 6) err(at + ": praeteritum needs 6 entries");
  if (v.reflexive && !["akk", "dat"].includes(v.reflexive)) err(at + ": reflexive is akk or dat");
  if (Array.isArray(v.imperative) && v.imperative.length !== 3) err(at + ": imperative array is [du, ihr, Sie]");
  if (v.takes !== undefined && typeof v.takes !== "string") err(at + ": takes is a string");
  if (has("sep") && has("insep")) err(at + ": both sep and insep");
  if (has("sep") && !splitSeparable(v)[0]) err(at + ": separable, but no prefix in conjugate.js matches");
  if (!has("sep") && !has("insep") && INSEP.test(v.infinitive)) warn(at + ": looks prefixed; add the insep flag?");

  /* e -> i/ie keeps the change in the imperative (Nimm!) while a -> ä drops it
     (Fahr!), so only the first kind needs the form written down. */
  if (v.stemChange && !v.imperative && !v.third && !has("modal")) {
    const er = v.stemChange[1].replace(/e?t$/, "");
    const base = splitSeparable(v)[1].replace(/e?n$/, "");
    if (!/[äöü]/.test(er) && lastVowel(er) !== lastVowel(base)) err(at + ": e→i stem change needs an imperative");
  }

  (glosses[v.en] = glosses[v.en] || []).push(v.infinitive);
  /* First clause of the gloss, commas inside brackets left alone: the bracket
     is what tells "to open (standard word)" from "to open (everyday, separable)". */
  const sense = v.en.replace(/\([^)]*\)/g, (m) => m.replace(/[,;]/g, " ")).split(/[,;]/)[0].trim();
  (senses[sense] = senses[sense] || []).push(v.infinitive);
}
for (const [g, vs] of Object.entries(glosses)) {
  if (vs.length > 1) err(`verbs: identical gloss "${g}": ${vs.join(", ")} (production mode cannot tell them apart)`);
}
for (const [s, vs] of Object.entries(senses)) {
  if (vs.length > 1) warn(`verbs: shared first sense "${s}": ${vs.join(", ")}`);
}

/* ---- snapshot ---- */
const lines = verbs.map((v) => {
  const imp = imperative(v);
  return [v.infinitive, present(v).join(" · "),
    "imperativ: " + (imp ? imp.join(" · ") : "-")].join(" | ");
});
const snapshot = new URL("tools/verbs.snapshot.txt", root);
if (process.argv.includes("--update")) {
  writeFileSync(snapshot, lines.join("\n") + "\n");
  console.log("snapshot written:", lines.length, "verbs");
} else {
  let old = null;
  try { old = readFileSync(snapshot, "utf8").trimEnd().split("\n"); } catch { err("no snapshot; run with --update"); }
  if (old) {
    const key = (l) => l.split(" | ")[0];
    const was = new Map(old.map((l) => [key(l), l]));
    const now = new Map(lines.map((l) => [key(l), l]));
    for (const [k, l] of now) {
      if (!was.has(k)) warn("snapshot: new verb " + k + " (run --update)");
      else if (was.get(k) !== l) err("snapshot differs for " + k + "\n    was: " + was.get(k) + "\n    now: " + l);
    }
    for (const k of was.keys()) if (!now.has(k)) warn("snapshot: verb gone: " + k + " (run --update)");
  }
}

for (const w of warnings) console.log("warn  " + w);
for (const e of errors) console.log("ERROR " + e);
console.log(`${verbs.length} verbs, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
