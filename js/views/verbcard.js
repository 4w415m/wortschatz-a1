/* The answer side of a verb card, laid out as a "tense ladder": who the verb
   is, its three tenses each paired with a sentence, the tip, then the full
   tables for looking things up. A section whose data is missing is left out.
   Pure (verb and list in, HTML out), so the tests and check-data render it
   without a DOM. */
import { esc } from "../dom.js";
import { PERS, present, praeteritum, imperative, splitSeparable } from "../conjugate.js";
import { typeOf, segments, family, familyMates, ruleLine } from "../perfekt.js";

/* The Präteritum Germans use in everyday speech. For every other verb it is
   mostly a written form, and the card says so under its sentence. */
export const spokenPraet = (v) =>
  v.flags.includes("modal") || ["sein", "haben", "werden", "wissen"].includes(v.infinitive);
const WRITTEN = "Mostly written. In speech, use the Perfekt.";

const AUX_FORMS = { hat: ["habe", "hast", "hat", "haben", "habt"], ist: ["bin", "bist", "ist", "sind", "seid"] };

/* ---- the verb in its sentences ---- */

/* The words that count as this verb in a sentence of the given tense:
   praesens · praeteritum · perfekt. A separable prefix is handled apart. */
function verbWords(verb, tense) {
  const words = new Set();
  if (tense === "perfekt") {
    if (verb.partizip) [verb.partizip, ...AUX_FORMS[verb.aux]].forEach((w) => words.add(w));
    return words;
  }
  const [prefix, base] = splitSeparable(verb);
  const finite = (tense === "praesens" ? present(verb) : praeteritum(verb)).map((f) => f.split(" ")[0]);
  for (const f of finite) {
    words.add(f);
    if (prefix) words.add(prefix + f); /* a subordinate clause joins them: weil ich früh aufstehe */
  }
  if (tense === "praesens") {
    words.add(verb.infinitive); /* after a modal: Ich muss früh aufstehen */
    if (prefix) words.add(prefix + "zu" + base);
    /* lower-cased, or "Essen Sie" would claim the noun; a sentence-initial
       imperative still matches through the first-word rule */
    for (const f of imperative(verb) || []) words.add(f.split(" ")[0].toLowerCase());
  }
  return words;
}

const L = "A-Za-zÄÖÜäöüß";
const WORD = new RegExp("([" + L + "]+)");

/* The sentence, escaped, with the verb's own words in <b>. Matching is
   case-sensitive so the noun Essen is not the verb essen, except for a word
   that starts a sentence. A separable prefix counts only after the verb, in
   the same clause: at the clause end ("Kommst du mit mir mit?" leaves
   "mit mir" plain), or else when it is the only one there ("Kommst du mit
   ins Kino?"). */
export function marked(verb, sentence, tense) {
  const words = verbWords(verb, tense);
  const [prefix] = tense === "perfekt" ? [""] : splitSeparable(verb);
  const parts = sentence.split(WORD); /* odd indices are words, even ones the gaps */
  const bold = new Set();
  let clause = { seen: false, atEnd: false, others: [] };
  const close = () => {
    if (!clause.atEnd && clause.others.length === 1) bold.add(clause.others[0]);
    clause = { seen: false, atEnd: false, others: [] };
  };
  for (let i = 1; i < parts.length; i += 2) {
    const p = parts[i], next = parts[i + 1];
    const starts = i === 1 || /[.!?:]\s*["„“»«]?\s*$/.test(parts[i - 1]);
    if (words.has(p) || (starts && words.has(p[0].toLowerCase() + p.slice(1)))) {
      bold.add(i);
      clause.seen = true;
    } else if (prefix && p === prefix && clause.seen) {
      if (/^\s*[.,!?;:“”"»«)]/.test(next) || (i + 1 === parts.length - 1 && !next.trim())) {
        bold.add(i);
        clause.atEnd = true;
      } else clause.others.push(i);
    }
    if (/[.,;:!?]/.test(next)) close();
  }
  close();
  return parts.map((p, i) => (bold.has(i) ? "<b>" + esc(p) + "</b>" : esc(p))).join("");
}

/* ---- pieces ---- */

/* A dressed form with its detached prefix in blue: "rufe <an>". */
function formHtml(verb, form) {
  const [prefix] = splitSeparable(verb);
  if (prefix && form.endsWith(" " + prefix)) {
    return esc(form.slice(0, -prefix.length - 1)) + ' <span class="sep-prefix">' + esc(prefix) + "</span>";
  }
  return esc(form);
}

const SEG = { prefix: "seg-prefix", ge: "seg-ge", stem: "seg-stem", ending: "seg-end" };
/* an·ge·ruf·en: the dots carry the cut, so it reads without colour. */
const participleHtml = (verb) =>
  '<span class="participle">' +
  segments(verb).map((s) => '<span class="' + SEG[s.kind] + '">' + esc(s.text) + "</span>")
    .join('<span class="seg-dot" aria-hidden="true">·</span>') +
  "</span>";

/* "jemanden anrufen", the placeholder words set in italics. */
const PLACEHOLDERS = new Set(["jemanden", "jemandem", "jemand", "etwas"]);
const patternHtml = (p) => p.split(" ").map((w) => (PLACEHOLDERS.has(w) ? "<i>" + esc(w) + "</i>" : esc(w))).join(" ");

const exampleHtml = (verb, e, tense) =>
  '<p class="example-de" lang="de">' + marked(verb, e.de, tense) + "</p>" +
  '<p class="example-en" lang="en">' + esc(e.en) + "</p>";

const rung = (label, form, body, mod = "") =>
  '<div class="rung' + mod + '"><span class="rung-label">' + label + "</span>" +
  '<div class="rung-body"><p class="rung-form">' + form + "</p>" + body + "</div></div>";

/* A verb used only in the third person is shown with es (es regnet). */
const persons = (verb) => (verb.third ? [["es", 2], ["sie", 5]] : PERS.map((p, i) => [p, i]));

/* ---- the four sections ---- */

function identity(verb) {
  const tags = [];
  if (verb.flags.includes("core")) tags.push('<span class="tag-core">Kernverb</span>');
  if (verb.flags.includes("sep")) tags.push("<span>trennbar</span>");
  if (verb.flags.includes("insep")) tags.push("<span>nicht trennbar</span>");
  if (verb.flags.includes("modal")) tags.push("<span>Modalverb</span>");
  else if (verb.stemChange || verb.forms) tags.push("<span>Präsens unregelmäßig</span>");

  let h = '<section class="verb-id">';
  if (tags.length) h += '<p class="verb-tags">' + tags.join("") + "</p>";
  h += '<h2 class="headword">' + (verb.reflexive ? '<span class="refl">sich</span> ' : "") + esc(verb.infinitive) + "</h2>";
  h += '<p class="meaning" lang="en">' + esc(verb.en) + "</p>";
  if (verb.takes) {
    const pattern = verb.pattern ?? (verb.reflexive ? "sich " : "") + verb.infinitive;
    h += '<p class="verb-pattern"><span class="pattern-de">' + patternHtml(pattern) + "</span>" +
      '<span class="case-pill">' + esc(verb.takes) + "</span></p>";
  }
  return h + "</section>";
}

function ladder(verb, verbs) {
  const who = '<span class="rung-person">' + (verb.third ? "es" : "er") + "</span>";
  const t = typeOf(verb);
  let h = '<section class="tense-ladder" aria-label="Zeitformen">';

  if (t) {
    const fam = family(verb), mates = familyMates(verb, verbs);
    h += '<p class="ladder-meta"><b>' + t + "</b>" +
      (fam ? " · " + esc(fam.split("–").join(" – ")) : "") +
      (mates.length ? " wie " + mates.map(esc).join(", ") : "") + "</p>";
  }

  h += rung("Präsens", who + formHtml(verb, present(verb)[2]),
    verb.example ? exampleHtml(verb, verb.example, "praesens") : "");

  const spoken = spokenPraet(verb), ep = verb.examplePraet;
  h += rung("Präteritum", who + formHtml(verb, praeteritum(verb)[2]),
    ep ? exampleHtml(verb, ep, "praeteritum") + (spoken ? "" : '<p class="rung-note" lang="en">' + WRITTEN + "</p>")
      : spoken ? "" : '<p class="rung-none" lang="en">' + WRITTEN + "</p>");

  if (verb.partizip) {
    h += rung("Perfekt",
      who + '<span class="aux">' + esc(verb.aux) + "</span> " + (verb.reflexive ? "sich " : "") + participleHtml(verb),
      verb.examplePerfekt ? exampleHtml(verb, verb.examplePerfekt, "perfekt") : "", " rung--perfekt");
    /* browsers may break after a hyphen, which would strand "-" from "en" */
    h += '<p class="pp-note" lang="en">' +
      esc(ruleLine(verb)).replace(/-[a-zäöüß]+/g, '<span class="nb">$&</span>') + "</p>";
  }
  return h + "</section>";
}

const usage = (verb) =>
  verb.tip ? '<section class="usage" aria-label="Tipp"><p class="tipbox" lang="en">' +
    '<span class="tip-label">Tipp</span>' + esc(verb.tip) + "</p></section>" : "";

function tables(verb) {
  const pr = present(verb), pt = praeteritum(verb), imp = imperative(verb);
  const head = (cols) => '<thead><tr><th scope="col"><span class="visually-hidden">Person</span></th>' +
    cols.map((c) => '<th scope="col">' + c + "</th>").join("") + "</tr></thead>";
  let h = '<section class="conj-tables" aria-label="Konjugation">' +
    '<table class="conj"><colgroup><col class="conj-person"><col><col></colgroup>' + head(["Präsens", "Präteritum"]) +
    "<tbody>" + persons(verb).map(([p, i]) =>
      '<tr><th scope="row">' + p + "</th><td>" + formHtml(verb, pr[i]) + "</td><td>" + formHtml(verb, pt[i]) + "</td></tr>"
    ).join("") + "</tbody></table>";
  if (imp) {
    h += '<table class="conj conj--imp"><colgroup><col class="conj-person"><col></colgroup>' + head(["Imperativ"]) +
      "<tbody>" + ["du", "ihr", "Sie"].map((p, i) =>
        '<tr><th scope="row">' + p + "</th><td>" + formHtml(verb, imp[i]) + "!</td></tr>"
      ).join("") + "</tbody></table>";
  }
  return h + "</section>";
}

export const verbBackHtml = (verb, verbs) =>
  '<div class="vback">' + identity(verb) + ladder(verb, verbs) + usage(verb) + tables(verb) + "</div>";
