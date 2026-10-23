import test from "node:test";
import assert from "node:assert/strict";
import { weakForm, typeOf, geRule, ending, segments, participleProblem, baseOf, hasInsepPrefix } from "../js/perfekt.js";

export const V = (o) => ({ flags: [], ...o });
export const F = {
  lernen: V({ infinitive: "lernen", aux: "hat", partizip: "gelernt" }),
  arbeiten: V({ infinitive: "arbeiten", aux: "hat", partizip: "gearbeitet" }),
  oeffnen: V({ infinitive: "öffnen", aux: "hat", partizip: "geöffnet" }),
  studieren: V({ infinitive: "studieren", aux: "hat", partizip: "studiert" }),
  verkaufen: V({ infinitive: "verkaufen", aux: "hat", partizip: "verkauft", flags: ["insep"] }),
  verstehen: V({ infinitive: "verstehen", aux: "hat", partizip: "verstanden", praet: "verstand", flags: ["insep"] }),
  aufstehen: V({ infinitive: "aufstehen", aux: "ist", partizip: "aufgestanden", praet: "stand", flags: ["sep"] }),
  einkaufen: V({ infinitive: "einkaufen", aux: "hat", partizip: "eingekauft", flags: ["sep"] }),
  anprobieren: V({ infinitive: "anprobieren", aux: "hat", partizip: "anprobiert", flags: ["sep"] }),
  singen: V({ infinitive: "singen", aux: "hat", partizip: "gesungen", praet: "sang" }),
  bleiben: V({ infinitive: "bleiben", aux: "ist", partizip: "geblieben", praet: "blieb" }),
  bringen: V({ infinitive: "bringen", aux: "hat", partizip: "gebracht", praet: "brachte" }),
  backen: V({ infinitive: "backen", aux: "hat", partizip: "gebacken", praet: "backte" }),
  tun: V({ infinitive: "tun", aux: "hat", partizip: "getan", praet: "tat" }),
  gefallen: V({ infinitive: "gefallen", aux: "hat", partizip: "gefallen", praet: "gefiel", flags: ["insep"] }),
  gehen: V({ infinitive: "gehen", aux: "ist", partizip: "gegangen", praet: "ging" }),
  haben: V({ infinitive: "haben", aux: "hat", partizip: "gehabt", praet: "hatte" }),
  sein: V({ infinitive: "sein", aux: "ist", partizip: "gewesen", praet: "war" }),
  koennen: V({ infinitive: "können", aux: "hat", partizip: "gekonnt", praet: "konnte", flags: ["modal"] }),
  wollen: V({ infinitive: "wollen", aux: "hat", partizip: "gewollt", flags: ["modal"] }),
  kennenlernen: V({ infinitive: "kennenlernen", aux: "hat", partizip: "kennengelernt", flags: ["sep"] }),
  moechten: V({ infinitive: "möchten", flags: ["modal"] }),
};

test("weakForm places ge- by stress and picks -t or -et", () => {
  assert.equal(weakForm(F.lernen), "gelernt");
  assert.equal(weakForm(F.arbeiten), "gearbeitet");
  assert.equal(weakForm(F.studieren), "studiert");
  assert.equal(weakForm(F.verkaufen), "verkauft");
  assert.equal(weakForm(F.verstehen), "versteht");
  assert.equal(weakForm(F.aufstehen), "aufgesteht");
  assert.equal(weakForm(F.singen), "gesingt");
  assert.equal(weakForm(F.gefallen), "gefallt");
  assert.equal(weakForm(F.gehen), "gegeht");
  assert.equal(weakForm(F.kennenlernen), "kennengelernt");
  assert.equal(weakForm(V({ infinitive: "frühstücken", partizip: "gefrühstückt" })), "gefrühstückt");
});

test("typeOf: three groups, null without a participle", () => {
  assert.equal(typeOf(F.lernen), "schwach");
  assert.equal(typeOf(F.haben), "schwach");
  assert.equal(typeOf(F.wollen), "schwach");
  assert.equal(typeOf(F.singen), "stark");
  assert.equal(typeOf(F.sein), "stark");
  assert.equal(typeOf(F.tun), "stark");
  assert.equal(typeOf(F.bringen), "gemischt");
  assert.equal(typeOf(F.koennen), "gemischt");
  assert.equal(typeOf(F.moechten), null);
});

test("geRule labels", () => {
  assert.equal(geRule(F.lernen).label, "ge- vorne");
  assert.equal(geRule(F.aufstehen).label, "ge- nach dem Präfix");
  assert.equal(geRule(F.studieren).label, "kein ge- (-ieren)");
  assert.equal(geRule(F.anprobieren).label, "kein ge- (-ieren)");
  assert.equal(geRule(F.verstehen).label, "kein ge- (Präfix ver-)");
  assert.equal(geRule(F.gefallen).label, "kein ge- (Präfix ge-)");
  assert.equal(geRule(F.gehen).label, "ge- vorne");
});

test("ending", () => {
  assert.equal(ending(F.lernen), "-t");
  assert.equal(ending(F.arbeiten), "-et");
  assert.equal(ending(F.singen), "-en");
  assert.equal(ending(F.bringen), "-t");
  assert.equal(ending(F.tun), "-n");
});

test("segments", () => {
  const seg = (v) => segments(v).map((s) => s.kind + ":" + s.text).join(" ");
  assert.equal(seg(F.lernen), "ge:ge stem:lern ending:t");
  assert.equal(seg(F.arbeiten), "ge:ge stem:arbeit ending:et");
  assert.equal(seg(F.aufstehen), "prefix:auf ge:ge stem:stand ending:en");
  assert.equal(seg(F.verkaufen), "prefix:ver stem:kauf ending:t");
  assert.equal(seg(F.studieren), "stem:studier ending:t");
  assert.equal(seg(F.gefallen), "prefix:ge stem:fall ending:en");
  assert.equal(seg(F.gehen), "ge:ge stem:gang ending:en");
  assert.equal(seg(F.kennenlernen), "prefix:kennen ge:ge stem:lern ending:t");
  assert.equal(seg(F.tun), "ge:ge stem:ta ending:n");
});

test("participleProblem catches typos and unknown -t forms", () => {
  assert.equal(participleProblem(F.lernen), null);
  assert.equal(participleProblem(F.singen), null);
  assert.equal(participleProblem(F.bringen), null);
  assert.equal(participleProblem(F.moechten), null);
  assert.match(participleProblem(V({ infinitive: "lernen", partizip: "gelernet" })), /gelernet/);
  assert.match(participleProblem(V({ infinitive: "spielen", partizip: "gespalt" })), /gespalt/);
});

test("baseOf and hasInsepPrefix", () => {
  assert.equal(baseOf(F.aufstehen), "stehen");
  assert.equal(baseOf(F.verstehen), "verstehen");
  assert.equal(baseOf(F.lernen), "lernen");
  assert.equal(hasInsepPrefix("verstehen"), true);
  assert.equal(hasInsepPrefix("frühstücken"), false);
  assert.equal(hasInsepPrefix("gehen"), false);
});
