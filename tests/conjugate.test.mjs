import test from "node:test";
import assert from "node:assert/strict";
import { regularPraet3, praet3, praeteritum } from "../js/conjugate.js";

const V = (o) => ({ flags: [], ...o });

test("regularPraet3 adds -te, or -ete after -d/-t and clusters", () => {
  assert.equal(regularPraet3(V({ infinitive: "lernen" })), "lernte");
  assert.equal(regularPraet3(V({ infinitive: "arbeiten" })), "arbeitete");
  assert.equal(regularPraet3(V({ infinitive: "regnen" })), "regnete");
  assert.equal(regularPraet3(V({ infinitive: "wechseln" })), "wechselte");
  assert.equal(regularPraet3(V({ infinitive: "einkaufen", flags: ["sep"] })), "kaufte");
});

test("praet3 prefers the stored form", () => {
  assert.equal(praet3(V({ infinitive: "aufstehen", flags: ["sep"], praet: "stand" })), "stand");
  assert.equal(praet3(V({ infinitive: "möchten", flags: ["modal"], praeteritum: ["wollte", "wolltest", "wollte", "wollten", "wolltet", "wollten"] })), "wollte");
  assert.equal(praet3(V({ infinitive: "lernen" })), "lernte");
});

test("praeteritum: weak verbs", () => {
  assert.deepEqual(praeteritum(V({ infinitive: "lernen" })),
    ["lernte", "lerntest", "lernte", "lernten", "lerntet", "lernten"]);
  assert.deepEqual(praeteritum(V({ infinitive: "arbeiten" })),
    ["arbeitete", "arbeitetest", "arbeitete", "arbeiteten", "arbeitetet", "arbeiteten"]);
});

test("praeteritum: strong endings, with -est/-et after d, t, s, ß", () => {
  assert.deepEqual(praeteritum(V({ infinitive: "singen", praet: "sang" })),
    ["sang", "sangst", "sang", "sangen", "sangt", "sangen"]);
  assert.deepEqual(praeteritum(V({ infinitive: "essen", praet: "aß" })),
    ["aß", "aßest", "aß", "aßen", "aßt", "aßen"]);
  assert.deepEqual(praeteritum(V({ infinitive: "finden", praet: "fand" })),
    ["fand", "fandest", "fand", "fanden", "fandet", "fanden"]);
  assert.deepEqual(praeteritum(V({ infinitive: "lesen", praet: "las" })),
    ["las", "lasest", "las", "lasen", "last", "lasen"]);
});

test("praeteritum: a stem in -e takes -st, -n, -t", () => {
  assert.deepEqual(praeteritum(V({ infinitive: "werden", praet: "wurde" })),
    ["wurde", "wurdest", "wurde", "wurden", "wurdet", "wurden"]);
  assert.deepEqual(praeteritum(V({ infinitive: "schreien", praet: "schrie" })),
    ["schrie", "schriest", "schrie", "schrien", "schriet", "schrien"]);
  assert.deepEqual(praeteritum(V({ infinitive: "bringen", praet: "brachte" })),
    ["brachte", "brachtest", "brachte", "brachten", "brachtet", "brachten"]);
});

test("praeteritum reproduces sein and haben from war and hatte", () => {
  assert.deepEqual(praeteritum(V({ infinitive: "sein", praet: "war" })),
    ["war", "warst", "war", "waren", "wart", "waren"]);
  assert.deepEqual(praeteritum(V({ infinitive: "haben", praet: "hatte" })),
    ["hatte", "hattest", "hatte", "hatten", "hattet", "hatten"]);
});

test("praeteritum is dressed with prefix and reflexive pronoun", () => {
  assert.deepEqual(praeteritum(V({ infinitive: "aufstehen", flags: ["sep"], praet: "stand" })),
    ["stand auf", "standest auf", "stand auf", "standen auf", "standet auf", "standen auf"]);
  assert.deepEqual(praeteritum(V({ infinitive: "anmelden", flags: ["sep"], reflexive: "akk" })),
    ["meldete mich an", "meldetest dich an", "meldete sich an", "meldeten uns an", "meldetet euch an", "meldeten sich an"]);
});

test("praeteritum returns a stored six-form array verbatim", () => {
  const w = ["wollte", "wolltest", "wollte", "wollten", "wolltet", "wollten"];
  const got = praeteritum(V({ infinitive: "möchten", flags: ["modal"], praeteritum: w }));
  assert.deepEqual(got, w);
  assert.notEqual(got, w);
});
