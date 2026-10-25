import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verbBackHtml, marked } from "../js/views/verbcard.js";

const V = (o) => ({ flags: [], ...o });
const ex = (de, en = "…") => ({ de, en });

const rufen = V({ infinitive: "rufen", en: "to call out", aux: "hat", partizip: "gerufen", praet: "rief" });
const anrufen = V({
  infinitive: "anrufen", en: "to phone, to call", takes: "+ Akkusativ", pattern: "jemanden anrufen",
  aux: "hat", partizip: "angerufen", praet: "rief", flags: ["sep"],
  example: ex("Ich rufe dich heute Abend an.", "I'll call you this evening."),
  examplePraet: ex("Am Abend rief Lena ihre Mutter an.", "In the evening Lena called her mother."),
  examplePerfekt: ex("Ich habe dich gestern angerufen.", "I called you yesterday."),
  tip: "Takes Akkusativ directly (Ich rufe dich an), no preposition.",
});
const anmelden = V({
  infinitive: "anmelden", en: "to register, to sign up", reflexive: "akk", takes: "für + Akkusativ",
  pattern: "sich für etwas anmelden", aux: "hat", partizip: "angemeldet", flags: ["sep"],
  example: ex("Ich melde mich für den Deutschkurs an."),
  examplePraet: ex("Im Mai meldete sich Anna für den Kurs an."),
  examplePerfekt: ex("Ich habe mich für den Kurs angemeldet."),
  tip: null,
});
const sein = V({
  infinitive: "sein", en: "to be", forms: ["bin", "bist", "ist", "sind", "seid", "sind"],
  aux: "ist", partizip: "gewesen", praet: "war", imperative: ["Sei", "Seid", "Seien Sie"],
  takes: "+ Nominativ", pattern: "Lehrer sein", flags: ["core"],
  example: ex("Ich bin Lehrerin und meine Schwester ist Ärztin."),
  examplePraet: ex("Gestern war ich den ganzen Tag müde."),
  examplePerfekt: ex("Ich bin schon einmal in Berlin gewesen."),
  tip: "The past is usually war.",
});
const koennen = V({
  infinitive: "können", en: "can, to be able to", forms: ["kann", "kannst", "kann", "können", "könnt", "können"],
  aux: "hat", partizip: "gekonnt", praet: "konnte", flags: ["core", "modal"],
  example: ex("Ich kann gut schwimmen."), examplePraet: ex("Als Kind konnte ich nicht schwimmen."),
  examplePerfekt: ex("Das habe ich nicht gekonnt."), tip: null,
});
const moechten = V({
  infinitive: "möchten", en: "would like", forms: ["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"],
  praeteritum: ["wollte", "wolltest", "wollte", "wollten", "wolltet", "wollten"], flags: ["modal"],
  example: ex("Ich möchte einen Kaffee."), examplePraet: ex("Ich wollte nur einen Kaffee."), tip: null,
});
const regnen = V({
  infinitive: "regnen", en: "to rain", third: true, aux: "hat", partizip: "geregnet",
  example: ex("Heute regnet es."), examplePraet: ex("Den ganzen Tag regnete es."),
  examplePerfekt: ex("Gestern hat es geregnet."), tip: null,
});
const lernen = V({
  infinitive: "lernen", en: "to learn", aux: "hat", partizip: "gelernt",
  example: ex("Ich lerne Deutsch."), examplePerfekt: ex("Ich habe viel gelernt."), tip: null,
});
const LIST = [rufen, anrufen, anmelden, sein, koennen, moechten, regnen, lernen];
const back = (v) => verbBackHtml(v, LIST);

/* ---- marking the verb in a sentence ---- */

test("marks the conjugated form and the separable prefix at the clause end", () => {
  assert.equal(marked(anrufen, "Ich rufe dich heute Abend an.", "praesens"),
    "Ich <b>rufe</b> dich heute Abend <b>an</b>.");
  assert.equal(marked(anrufen, "Am Abend rief Lena ihre Mutter an.", "praeteritum"),
    "Am Abend <b>rief</b> Lena ihre Mutter <b>an</b>.");
});

test("leaves a preposition that only looks like the prefix alone", () => {
  const mitkommen = V({ infinitive: "mitkommen", aux: "ist", partizip: "mitgekommen", praet: "kam", flags: ["sep"] });
  assert.equal(marked(mitkommen, "Kommst du mit mir mit?", "praesens"), "<b>Kommst</b> du mit mir <b>mit</b>?");
});

test("a prefix pushed before a direction phrase still counts when it is the only one in the clause", () => {
  const mitkommen = V({ infinitive: "mitkommen", aux: "ist", partizip: "mitgekommen", praet: "kam", flags: ["sep"] });
  assert.equal(marked(mitkommen, "Kommst du morgen mit ins Kino?", "praesens"), "<b>Kommst</b> du morgen <b>mit</b> ins Kino?");
  const ankommen = V({ infinitive: "ankommen", aux: "ist", partizip: "angekommen", praet: "kam", flags: ["sep"] });
  assert.equal(marked(ankommen, "Ich bin müde, weil ich an der Uni ankomme.", "praesens"),
    "Ich bin müde, weil ich an der Uni <b>ankomme</b>.");
});

test("matches case-sensitively except for the first word", () => {
  const essen = V({ infinitive: "essen", stemChange: ["isst", "isst"], aux: "hat", partizip: "gegessen", praet: "aß" });
  assert.equal(marked(essen, "Das Essen ist kalt, aber ich esse es.", "praesens"),
    "Das Essen ist kalt, aber ich <b>esse</b> es.");
  assert.equal(marked(essen, "Isst du gern Fisch?", "praesens"), "<b>Isst</b> du gern Fisch?");
});

test("leaves the reflexive pronoun and other verbs unmarked", () => {
  assert.equal(marked(anmelden, "Ich melde mich für den Deutschkurs an.", "praesens"),
    "Ich <b>melde</b> mich für den Deutschkurs <b>an</b>.");
  const aufstehen = V({ infinitive: "aufstehen", aux: "ist", partizip: "aufgestanden", praet: "stand", flags: ["sep"] });
  assert.equal(marked(aufstehen, "Ich muss morgen früh aufstehen.", "praesens"),
    "Ich muss morgen früh <b>aufstehen</b>.");
  assert.equal(marked(aufstehen, "Ich bin müde, weil ich früh aufstehe.", "praesens"),
    "Ich bin müde, weil ich früh <b>aufstehe</b>.");
});

test("marks the Perfekt as its own auxiliary plus the participle", () => {
  assert.equal(marked(anrufen, "Ich habe dich gestern angerufen.", "perfekt"),
    "Ich <b>habe</b> dich gestern <b>angerufen</b>.");
  assert.equal(marked(sein, "Ich bin schon einmal in Berlin gewesen.", "perfekt"),
    "Ich <b>bin</b> schon einmal in Berlin <b>gewesen</b>.");
  assert.equal(marked(lernen, "Das ist neu, ich habe es gelernt.", "perfekt"),
    "Das ist neu, ich <b>habe</b> es <b>gelernt</b>.");
});

test("escapes the sentence", () => {
  assert.equal(marked(lernen, "Ich lerne <b>", "praesens"), "Ich <b>lerne</b> &lt;b&gt;");
});

/* ---- the card back ---- */

test("sections come in the design's order", () => {
  const h = back(anrufen);
  const at = (c) => h.indexOf('class="' + c + '"');
  assert.ok(at("verb-id") >= 0 && at("verb-id") < at("tense-ladder"));
  assert.ok(at("tense-ladder") < at("usage") && at("usage") < at("conj-tables"));
});

test("identity: tags, headword, meaning, pattern with placeholders in italics and the case pill", () => {
  const h = back(anrufen);
  assert.match(h, /<p class="verb-tags"><span>trennbar<\/span><\/p>/);
  assert.match(h, /class="headword">anrufen</);
  assert.match(h, /class="meaning" lang="en">to phone, to call</);
  assert.match(h, /<span class="pattern-de"><i>jemanden<\/i> anrufen<\/span><span class="case-pill">\+ Akkusativ<\/span>/);
  assert.match(back(sein), /<span class="tag-core">Kernverb<\/span>/);
  assert.match(back(koennen), /<span>Modalverb<\/span>/);
  assert.match(back(sein), /<span>Präsens unregelmäßig<\/span>/);
});

test("a reflexive headword shows sich muted", () => {
  assert.match(back(anmelden), /class="headword"><span class="refl">sich<\/span> anmelden</);
  assert.match(back(anmelden), /<span class="pattern-de">sich für <i>etwas<\/i> anmelden<\/span>/);
});

test("no takes, no tags, no tip: those parts are left out", () => {
  const h = back(lernen);
  assert.doesNotMatch(h, /verb-pattern/);
  assert.doesNotMatch(h, /verb-tags/);
  assert.doesNotMatch(h, /class="usage"/);
});

test("the ladder: meta line, three rungs with forms and sentences, then the ge- rule", () => {
  const h = back(anrufen);
  assert.match(h, /<p class="ladder-meta"><b>stark<\/b> · u – ie – u wie rufen<\/p>/);
  assert.match(h, /<span class="rung-person">er<\/span>ruft <span class="sep-prefix">an<\/span>/);
  assert.match(h, /<span class="rung-person">er<\/span>rief <span class="sep-prefix">an<\/span>/);
  assert.match(h, /<span class="aux">hat<\/span> <span class="participle"><span class="seg-prefix">an<\/span><span class="seg-dot" aria-hidden="true">·<\/span><span class="seg-ge">ge<\/span><span class="seg-dot" aria-hidden="true">·<\/span><span class="seg-stem">ruf<\/span><span class="seg-dot" aria-hidden="true">·<\/span><span class="seg-end">en<\/span><\/span>/);
  assert.match(h, /Ich <b>rufe<\/b> dich heute Abend <b>an<\/b>\./);
  assert.match(h, /Am Abend <b>rief<\/b> Lena ihre Mutter <b>an<\/b>\./);
  assert.match(h, /Ich <b>habe<\/b> dich gestern <b>angerufen<\/b>\./);
  /* an ending is never split at its hyphen across two lines */
  assert.match(h, /<p class="pp-note" lang="en">ge- goes after the prefix; strong verbs end in <span class="nb">-en<\/span>\.<\/p>/);
  assert.equal(h.match(/class="rung[ "]/g).length, 3);
});

test("a weak verb's meta line is just its type", () => {
  assert.match(back(lernen), /<p class="ladder-meta"><b>schwach<\/b><\/p>/);
});

test("written Präteritum keeps the note under its sentence; spoken Präteritum has none", () => {
  const note = "Mostly written. In speech, use the Perfekt.";
  assert.match(back(anrufen), new RegExp('class="rung-note" lang="en">' + note.replace(/\./g, "\\.")));
  assert.doesNotMatch(back(sein), /Mostly written/);
  assert.doesNotMatch(back(koennen), /Mostly written/);
  assert.match(back(lernen), new RegExp('class="rung-none" lang="en">' + note.replace(/\./g, "\\.")));
});

test("a reflexive Perfekt carries sich", () => {
  assert.match(back(anmelden), /<span class="aux">hat<\/span> sich <span class="participle">/);
  assert.match(back(anmelden), /<span class="rung-person">er<\/span>meldet sich <span class="sep-prefix">an<\/span>/);
});

test("möchten: no Perfekt rung, no meta, no rule; its wollte sentence sits on the Präteritum rung", () => {
  const h = back(moechten);
  assert.doesNotMatch(h, /rung--perfekt/);
  assert.doesNotMatch(h, /ladder-meta|pp-note/);
  assert.match(h, /<span class="rung-person">er<\/span>wollte</);
  assert.match(h, /Ich <b>wollte<\/b> nur einen Kaffee\./);
});

test("conjugation table pairs Präsens and Präteritum per person, prefix in blue", () => {
  const h = back(anrufen);
  assert.match(h, /<th scope="col">Präsens<\/th><th scope="col">Präteritum<\/th>/);
  assert.match(h, /<tr><th scope="row">ich<\/th><td>rufe <span class="sep-prefix">an<\/span><\/td><td>rief <span class="sep-prefix">an<\/span><\/td><\/tr>/);
  assert.match(h, /<tr><th scope="row">sie\/Sie<\/th><td>rufen <span class="sep-prefix">an<\/span><\/td><td>riefen <span class="sep-prefix">an<\/span><\/td><\/tr>/);
  assert.match(h, /<th scope="col">Imperativ<\/th>/);
  assert.match(h, /<tr><th scope="row">du<\/th><td>Ruf <span class="sep-prefix">an<\/span>!<\/td><\/tr>/);
  assert.match(h, /<tr><th scope="row">Sie<\/th><td>Rufen Sie <span class="sep-prefix">an<\/span>!<\/td><\/tr>/);
});

test("third-person-only verbs: es and sie rows, es on the rungs, no Imperativ", () => {
  const h = back(regnen);
  const persons = [...h.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.deepEqual(persons, ["es", "sie"]);
  assert.match(h, /<span class="rung-person">es<\/span>regnet</);
  assert.doesNotMatch(h, /Imperativ/);
});

test("modal verbs have no Imperativ table", () => {
  assert.doesNotMatch(back(koennen), /Imperativ/);
  assert.match(back(sein), /<td>Seien Sie!<\/td>/);
});

/* ---- the real list ---- */

test("every verb in the data renders, with the verb marked in each sentence", () => {
  const verbs = JSON.parse(readFileSync(new URL("../data/verbs.json", import.meta.url), "utf8"));
  for (const v of verbs) {
    const h = verbBackHtml(v, verbs);
    const sentences = [...h.matchAll(/<p class="example-de" lang="de">(.*?)<\/p>/g)].map((m) => m[1]);
    assert.equal(sentences.length, v.partizip ? 3 : 2, v.infinitive + ": sentence count");
    for (const s of sentences) assert.match(s, /<b>/, v.infinitive + ": nothing marked in " + s);
  }
});
