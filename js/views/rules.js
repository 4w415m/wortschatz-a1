/* The Perfekt rules, rendered from the live verb list: the three steps the
   participle is built in, the auxiliary, the three verb types with real
   counts, and the vowel families with this list's own verbs under them.
   German headings, English explanations, like the tips. rulesHtml() is pure
   and is also used as an overlay from a verb card. */
import { esc } from "../dom.js";
import { W } from "../data.js";
import { back } from "../router.js";
import { splitSeparable } from "../conjugate.js";
import { typeOf, family, baseOf } from "../perfekt.js";

const isCore = (v) => v.flags.includes("core");
/* Stable: core verbs first, list order kept within each half. */
const coreFirst = (list) => list.slice().sort((a, b) => isCore(b) - isCore(a));

/* "kommen (an-, mit-, zurück-)" when the base verb is in the list, else the
   derivatives in full: "umsteigen, einsteigen, aussteigen". */
function members(base, list) {
  const baseVerb = list.find((v) => v.infinitive === base);
  if (!baseVerb) return list.map((v) => esc(v.infinitive)).join(", ");
  const prefixes = list.filter((v) => v !== baseVerb).map((v) => splitSeparable(v)[0] + "-").sort();
  return esc(base) + (prefixes.length ? " (" + prefixes.map(esc).join(", ") + ")" : "");
}

export function rulesHtml(verbs) {
  const ex = (inf) => {
    const v = verbs.find((x) => x.infinitive === inf);
    return v ? esc(v.infinitive) + " → " + esc(v.partizip) : esc(inf);
  };
  const ofType = (t) => verbs.filter((v) => typeOf(v) === t);

  let h = '<div class="rules">';

  h += "<h2>Drei Schritte</h2>" +
    "<h3>1 · Wo steht ge-?</h3>" +
    "<p>ge- appears only when the first syllable is stressed.</p><ul>" +
    "<li>No prefix: ge- in front — " + ex("lernen") + "</li>" +
    "<li>Ends in -ieren: no ge- — " + ex("studieren") + "</li>" +
    "<li>Inseparable prefix (be-, emp-, ent-, er-, ge-, miss-, ver-, zer-): no ge- — " + ex("verstehen") + "</li>" +
    "<li>Separable prefix: ge- between prefix and stem — " + ex("aufstehen") + "</li></ul>" +
    "<h3>2 · Welche Endung?</h3><table>" +
    "<tr><td>schwach</td><td>-t, or -et after -d, -t and clusters</td><td>" + ex("arbeiten") + "</td></tr>" +
    "<tr><td>gemischt</td><td>-t, with a vowel change</td><td>" + ex("bringen") + "</td></tr>" +
    "<tr><td>stark</td><td>-en</td><td>" + ex("singen") + "</td></tr></table>" +
    "<h3>3 · Was passiert mit dem Stamm?</h3>" +
    "<p>Weak: nothing, the form is fully predictable. Strong and mixed: the vowel changes and must be learned; the families below make that faster.</p>";

  h += "<h2>haben oder sein</h2>" +
    "<p>haben by default, always with a direct object. sein for movement from A to B, for a change of state, and for sein, bleiben, werden.</p>" +
    '<p class="list">Mit sein in dieser Liste: ' +
    verbs.filter((v) => v.aux === "ist").map((v) => esc(v.infinitive)).join(" · ") + "</p>";

  h += "<h2>Drei Typen</h2><table>";
  for (const t of ["schwach", "stark", "gemischt"]) {
    const list = ofType(t);
    h += "<tr><td>" + t + "</td><td>" + list.length + "</td><td>" +
      coreFirst(list).slice(0, 3).map((v) => esc(v.infinitive)).join(", ") + "</td></tr>";
  }
  h += "</table><p>Ganz unregelmäßig: sein · haben · werden · tun</p>";

  /* family -> base -> verbs, strong verbs only; largest family first */
  const fams = new Map();
  for (const v of ofType("stark")) {
    const f = family(v), b = baseOf(v);
    if (!fams.has(f)) fams.set(f, new Map());
    const bases = fams.get(f);
    if (!bases.has(b)) bases.set(b, []);
    bases.get(b).push(v);
  }
  const line = (bases) => [...bases].map(([b, l]) => members(b, l)).join(" · ");
  const singles = [];
  h += "<h2>Vokalfamilien</h2><p>Infinitiv – Präteritum – Partizip II.</p>";
  for (const [f, bases] of [...fams].sort((a, b) => b[1].size - a[1].size)) {
    if (bases.size === 1) singles.push(esc(f) + " · " + line(bases));
    else h += "<h3>" + esc(f) + "</h3><p>" + line(bases) + "</p>";
  }
  if (singles.length) h += "<h3>Einzelgänger</h3><p>" + singles.join("<br>") + "</p>";
  h += "<h3>Gemischte Verben</h3><p>" +
    ofType("gemischt").map((v) => esc(v.infinitive) + " · " + esc(family(v))).join("<br>") + "</p>";

  return h + "</div>";
}

/* The page at #/regeln. */
export function rules(app) {
  app.innerHTML = '<div class="wrap panel"><div class="masthead"><h1>Regeln</h1>' +
    '<button class="iconbtn" data-back aria-label="Zurück">✕</button></div>' +
    rulesHtml(W.verbs) + "</div>";
  app.querySelector("[data-back]").onclick = () => back();
}
