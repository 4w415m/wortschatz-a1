/* What a verb's Partizip II tells the learner, derived from fields verbs.json
   already has: the stored participle, the flags, and the stem rules in
   conjugate.js. Nothing returned here is stored in the data.

   The spreadsheet view of the Perfekt: three ordered steps.
     1. Where does ge- go?  In front, after a separable prefix, or nowhere
        (verbs in -ieren and verbs with an unstressed, inseparable prefix).
     2. Which ending?       schwach -t/-et · gemischt -t · stark -en
     3. What happens to the stem?  Nothing for schwach; a vowel change,
        to be memorized, for stark and gemischt.
   A verb is schwach exactly when applying steps 1 and 2 to an unchanged stem
   reproduces its participle. */
import { splitSeparable, stemOf, needsE, praet3 } from "./conjugate.js";

/* Prefixes that are never stressed, so the participle takes no ge-. Shared
   with tools/check-data.mjs. */
export const INSEP_PREFIXES = ["be", "emp", "ent", "er", "ge", "miss", "ver", "zer", "unter", "über", "wieder"];

/* The closed set of mixed verbs (vowel change plus the weak -t): any other -t
   participle that is not the weak form is a typo. Base verbs only; mitbringen
   is checked through bringen. */
export const MIXED_BASES = new Set(["können", "müssen", "dürfen", "mögen", "wissen", "denken", "kennen", "bringen", "rennen"]);

/* "verstehen" yes, "gehen" and "geben" no: the prefix must leave a verb of at
   least four letters, which is what tells er-klären from Erde-like stems. */
const insepPrefixOf = (inf) =>
  INSEP_PREFIXES.find((p) => inf.startsWith(p) && inf.length >= p.length + 4) ?? null;
export const hasInsepPrefix = (inf) => insepPrefixOf(inf) !== null;

/* The verb without its separable prefix. An inseparable verb is its own base:
   verstehen does not share a participle shape with stehen. */
export const baseOf = (verb) => splitSeparable(verb)[1];

/* Step 1. kind: vorne · mitte · ieren · praefix. The prefix is checked before
   the -ieren ending: verlieren is ver-lier-en, not an -ieren verb. */
export function geRule(verb) {
  const [prefix, base] = splitSeparable(verb);
  const ip = verb.flags.includes("insep") ? insepPrefixOf(base) : null;
  if (ip) return { kind: "praefix", prefix: ip, label: "kein ge- (Präfix " + ip + "-)" };
  if (/ieren$/.test(base)) return { kind: "ieren", prefix: null, label: "kein ge- (-ieren)" };
  if (prefix) return { kind: "mitte", prefix, label: "ge- nach dem Präfix" };
  return { kind: "vorne", prefix: null, label: "ge- vorne" };
}

/* Steps 1 and 2 applied to an unchanged stem: what the participle would be if
   the verb were weak. */
export function weakForm(verb) {
  const [prefix, base] = splitSeparable(verb);
  const stem = stemOf(base);
  const { kind } = geRule(verb);
  const ge = kind === "ieren" || kind === "praefix" ? "" : "ge";
  return prefix + ge + stem + (needsE(stem) ? "et" : "t");
}

export function typeOf(verb) {
  if (!verb.partizip) return null;
  if (verb.partizip === weakForm(verb)) return "schwach";
  return verb.partizip.endsWith("t") ? "gemischt" : "stark";
}

/* -t · -et · -en, or -n after a vowel (getan, geschrien), where the -e- of
   -en is swallowed and the vowel belongs to the stem. */
export function ending(verb) {
  const t = typeOf(verb);
  if (!t) return null;
  if (t === "schwach") return needsE(stemOf(baseOf(verb))) ? "-et" : "-t";
  if (t === "gemischt") return "-t";
  return /(ie|[aouäöü])n$/.test(verb.partizip) ? "-n" : "-en";
}

/* The participle cut into prefix · ge · stem · ending, for the card to colour.
   A separable prefix and an inseparable one are both "prefix". */
export function segments(verb) {
  if (!verb.partizip) return null;
  const [sep] = splitSeparable(verb);
  const rule = geRule(verb);
  const out = [];
  let rest = verb.partizip;
  const take = (kind, text) => { out.push({ kind, text }); rest = rest.slice(text.length); };
  if (sep && rest.startsWith(sep)) take("prefix", sep);
  if (rule.kind === "praefix" && rest.startsWith(rule.prefix)) take("prefix", rule.prefix);
  if ((rule.kind === "vorne" || rule.kind === "mitte") && rest.startsWith("ge")) take("ge", "ge");
  const end = ending(verb).slice(1);
  out.push({ kind: "stem", text: rest.slice(0, rest.length - end.length) });
  out.push({ kind: "ending", text: end });
  return out;
}

/* A -t participle that is not the weak form must belong to a known mixed verb;
   anything else is a typo like "gelernet". */
export function participleProblem(verb) {
  if (!verb.partizip) return null;
  if (typeOf(verb) === "gemischt" && !MIXED_BASES.has(baseOf(verb))) {
    return "participle " + verb.partizip + " is neither the weak form " + weakForm(verb) +
      ", nor strong (-en), nor a known mixed verb";
  }
  return null;
}

/* ---- vowel families ---- */

const VOWELS = /(ie|ei|eu|äu|au|[aeiouäöü])/g;
const lastVowel = (s) => (s.match(VOWELS) || []).pop() ?? null;

/* The stem vowel of a Präteritum form: brachte and wurde carry an ending -e
   that is not the vowel we want, schrie does not. */
const praetVowel = (p) => lastVowel(p.replace(/te$/, "").replace(/([^aeiouäöü])e$/, "$1"));

/* "i–a–u": the stem vowel in Infinitiv, Präteritum and Partizip. Only strong
   and mixed verbs have one; a weak verb's vowel never moves. */
export function family(verb) {
  const t = typeOf(verb);
  if (!t || t === "schwach") return null;
  const stem = segments(verb).find((s) => s.kind === "stem").text;
  return [lastVowel(stemOf(baseOf(verb))), praetVowel(praet3(verb)), lastVowel(stem)].join("–");
}

/* Up to three verbs that change their vowel the same way, as memory hooks.
   Same type only: stehen and denken share e–a–a but not their ending, and the
   ending is one of the things being learned. One verb per base, the base verb
   itself where the list has it; prefixed derivatives of this verb's own base
   are not mates, except that a separable verb names its base first. */
export function familyMates(verb, verbs) {
  const fam = family(verb);
  if (!fam) return [];
  const t = typeOf(verb), myBase = baseOf(verb);
  const byBase = new Map();
  for (const v of verbs) {
    if (v.infinitive === verb.infinitive || typeOf(v) !== t || family(v) !== fam) continue;
    const b = baseOf(v);
    if (!byBase.has(b) || v.infinitive === b) byBase.set(b, v);
  }
  let baseFirst = null;
  const rest = [];
  for (const [b, v] of byBase) {
    if (b !== myBase) rest.push(v);
    else if (v.infinitive === b && verb.infinitive !== b) baseFirst = v;
  }
  const isCore = (v) => v.flags.includes("core");
  rest.sort((a, b) => (isCore(b) - isCore(a)) || (verbs.indexOf(a) - verbs.indexOf(b)));
  return (baseFirst ? [baseFirst] : []).concat(rest).slice(0, 3).map((v) => v.infinitive);
}

/* ---- text for the card ---- */

/* Infinitiv · Präteritum (er/sie/es) · Partizip II: "aufstehen · stand auf · aufgestanden". */
export function stammformen(verb) {
  if (!verb.partizip) return null;
  const [prefix] = splitSeparable(verb);
  return [verb.infinitive, praet3(verb) + (prefix ? " " + prefix : ""), verb.partizip];
}

/* One line saying why the participle looks the way it does. */
export function reason(verb) {
  const t = typeOf(verb);
  if (!t) return null;
  const ge = geRule(verb).label, e = ending(verb);
  if (t === "schwach") {
    const stem = stemOf(baseOf(verb));
    return "schwach · " + ge + " · " + (e === "-et" ? "-et nach -" + stem.slice(-1) : "-t");
  }
  if (t === "gemischt") return "gemischt · " + ge + " · -t, Vokal ändert sich";
  return "stark · " + ge + " · " + e + " · " + family(verb);
}

/* ---- distractors ----
   Two wrong participles for the card front, each the result of applying a
   tempting wrong rule to this verb: ge- in the wrong place, the wrong ending,
   the wrong vowel, or treating a strong verb as weak. A distractor may be
   another verb's real participle (gelegen for legen): that confusion is the
   point. The set is deterministic so the snapshot can pin it. */

/* The participle rebuilt from its segments, with one piece swapped. */
const rebuild = (segs, swap) =>
  segs.map((s) => (swap[s.kind] !== undefined ? swap[s.kind] : s.text)).join("");

export function distractors(verb) {
  if (!verb.partizip) return null;
  const pp = verb.partizip;
  const [sep, base] = splitSeparable(verb);
  const t = typeOf(verb), rule = geRule(verb), e = ending(verb);
  const segs = segments(verb);
  const stem = segs.find((s) => s.kind === "stem").text;
  const hasGe = segs.some((s) => s.kind === "ge");
  const withoutGe = segs.filter((s) => s.kind !== "ge").map((s) => s.text).join("");

  const weak = weakForm(verb);
  const geMisplaced = sep ? "ge" + sep + withoutGe.slice(sep.length)
    : rule.kind === "praefix" || rule.kind === "ieren" ? "ge" + pp
    : hasGe ? withoutGe : null;
  /* A learner who treats wechseln as strong writes gewechseln, not gewechselen:
     after -el and -er the wrong -en is spelled -n, as in the infinitive. */
  const wrongEnding = rebuild(segs, { ending: /^e?n$/.test(e.slice(1)) ? (needsE(stem) ? "et" : "t")
    : /(eln|ern)$/.test(base) ? "n" : "en" });
  const wrongVowel = (() => {
    if (t === "schwach") return null;
    const swapVowel = (v) => rebuild(segs, { stem: stem.replace(new RegExp("(" + VOWELS.source + ")(?!.*" + VOWELS.source + ")"), v) });
    const a = swapVowel(praetVowel(praet3(verb)));
    if (a !== pp) return a;
    const b = swapVowel(lastVowel(stemOf(base)));
    return b !== pp ? b : null;
  })();
  const dropEnding = rebuild(segs, { ending: "" });
  const noGe = hasGe ? withoutGe : verb.infinitive;

  let row;
  if (sep && /ieren$/.test(base)) row = [sep + "ge" + pp.slice(sep.length), verb.infinitive];
  else if (sep || rule.kind === "praefix" || rule.kind === "ieren") row = [geMisplaced, t === "stark" ? weak : wrongEnding];
  else if (t === "stark") row = [weak, wrongVowel];
  else if (t === "gemischt") row = [weak, wrongEnding];
  else if (e === "-et") row = [wrongEnding, dropEnding];
  else row = [wrongEnding, noGe];

  const out = [];
  for (const c of row.concat([weak, geMisplaced, wrongEnding, wrongVowel, dropEnding, noGe])) {
    if (c && c !== pp && !out.includes(c)) out.push(c);
    if (out.length === 2) break;
  }
  return out;
}

/* The three options for the Partizip II row, right answer first; the view shuffles. */
export const ppOptions = (verb) => [verb.partizip, ...distractors(verb)];
