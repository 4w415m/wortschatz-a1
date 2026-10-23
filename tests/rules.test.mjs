import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesHtml } from "../js/views/rules.js";
import { typeOf } from "../js/perfekt.js";

const verbs = JSON.parse(readFileSync(new URL("../data/verbs.json", import.meta.url), "utf8"))
  .map((v) => ({ ...v, cat: "verbs" }));
const html = rulesHtml(verbs);

test("has the four sections and the sub-sections", () => {
  for (const h of ["Drei Schritte", "Wo steht ge-?", "Welche Endung?", "Was passiert mit dem Stamm?",
    "haben oder sein", "Drei Typen", "Vokalfamilien", "Einzelgänger", "Gemischte Verben"]) {
    assert.match(html, new RegExp(h.replace("?", "\\?")));
  }
});

test("type counts are the live counts", () => {
  const n = (t) => verbs.filter((v) => typeOf(v) === t).length;
  assert.match(html, new RegExp("schwach[^0-9]*" + n("schwach")));
  assert.match(html, new RegExp("stark[^0-9]*" + n("stark")));
  assert.match(html, new RegExp("gemischt[^0-9]*" + n("gemischt")));
});

test("families group by pattern and fold derivatives", () => {
  const iau = html.split("i–a–u")[1].split("<h3")[0];
  for (const v of ["singen", "trinken", "finden"]) assert.match(iau, new RegExp(v));
  assert.doesNotMatch(iau, /wissen/);
  assert.match(html, /kommen \(an-, mit-, zurück-\)/);
  assert.match(html, /Einzelgänger[\s\S]*?ei–a–e · sein/);
  assert.match(html, /Gemischte Verben[\s\S]*?denken[\s\S]*?e–a–a/);
});

test("the sein list and the examples come from the data", () => {
  assert.match(html, /Mit sein in dieser Liste[\s\S]*?aufstehen[\s\S]*?umsteigen/);
  assert.match(html, /verstehen → verstanden/);
  assert.equal((html.match(/<div class="rules">/g) || []).length, 1);
});
