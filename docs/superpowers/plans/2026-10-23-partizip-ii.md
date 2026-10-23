# Partizip II Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every verb card teach and quiz how its Partizip II is built (ge- placement, ending, stem), show the Präteritum and principal parts, and give the rules a page of their own.

**Architecture:** All grammar facts are derived at runtime from fields `verbs.json` already has, by two pure modules: `js/conjugate.js` gains the Präteritum, a new `js/perfekt.js` analyses the participle (type, ge- rule, ending, segments, vowel family, distractors). The study view and a new rules view render what those modules return; `tools/check-data.mjs` validates the data through the same modules and pins their output in the snapshot. Only one new field is stored, `praet`, and only where it cannot be computed.

**Tech Stack:** Plain ES modules, no build step, no dependencies. Node 24 for tooling and tests (`node:test`, `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-10-23-partizip-ii-design.md`

## Global Constraints

- No build step, no dependencies; browser code is plain ES modules served as static files.
- Every new file under `js/` is added to `FILES` in `sw.js`; `CACHE` is bumped once per phase (v12, v13, v14, v15).
- Card ids are `verbs:<infinitive>`; no headword changes, no card-id changes.
- Nothing derivable is stored in `data/verbs.json`: no type, ending, ge- rule, family, distractors, or regular Präteritum.
- `data/verbs.json` is written back with `JSON.stringify(rows, null, 2) + "\n"`; confirm this round-trips byte-identically before the first scripted edit (Task 5, step 1).
- UI labels are German (Perfekt mit, Kasus, Typ, Partizip II); explanations the learner reads are English.
- A verb card never needs more than four taps before it flips.
- `node tools/check-data.mjs` passes (0 errors) at the end of every task; `node --test tests/*.test.mjs` passes at the end of every task from Task 1 on.
- Commit messages follow the repo's style: an imperative sentence, no type prefix, ending with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` line.

## Review Focus

1. A participle typo in the data (gelernet) must fail the checker, not silently classify as gemischt. Pinned in Task 2 (`participleProblem`) and wired in Task 5.
2. For every verb in the data both distractors must exist, differ from each other and from the right form; otherwise a quiz row shows two identical buttons or marks the right answer wrong. Pinned by the whole-list property test in Task 4.
3. Präteritum endings after -s/-ß/-d/-t stems and after a stem in -e (aß, standest, schriest, wurdest), and the dressing of a separable reflexive verb (meldete mich an). Pinned in Task 1.
4. Opening the rules overlay mid-card must leave the card, its picks and the "übrig" count untouched, and the 1–4 keyboard grades must not fire while it is open. Manual verification in Task 11; no automated DOM tests exist in this project.
5. A new module missing from the service worker's `FILES` works online and breaks offline. Pinned by the `sw.js` coverage check in Task 5.

---

## Phase 1 — derivation, data, tooling

### Task 1: Präteritum in the conjugator, and the test harness

**Files:**
- Modify: `js/conjugate.js`
- Create: `tests/conjugate.test.mjs`

**Interfaces:**
- Consumes: existing private helpers `splitSeparable`, `stemOf`, `needsE`, `dress` in `js/conjugate.js`.
- Produces (all exported from `js/conjugate.js`):
  - `stemOf(base: string): string` and `needsE(stem: string): boolean` — the existing helpers, now exported for `perfekt.js`.
  - `regularPraet3(verb): string` — the weak 3rd-person-singular Präteritum of the base verb: `stem + (needsE(stem) ? "ete" : "te")`.
  - `praet3(verb): string` — `verb.praet ?? (verb.praeteritum ? verb.praeteritum[2] : regularPraet3(verb))`.
  - `praeteritum(verb): string[]` — six forms in `PERS` order, dressed with reflexive pronoun and separable prefix like `present()`; `verb.praeteritum` is returned verbatim (a copy) when present.

- [ ] **Step 1: Write the failing tests**

```js
// tests/conjugate.test.mjs
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/*.test.mjs`
Expected: failures with "does not provide an export named 'regularPraet3'".

- [ ] **Step 3: Implement in `js/conjugate.js`**

Export `stemOf` and `needsE`. Add `regularPraet3`, `praet3`, `praeteritum`. The six forms from `p = praet3(verb)`:

```
ich, er/sie/es:  p
du:              p + (/[dtsß]$/.test(p) ? "est" : "st")
wir, sie/Sie:    p + (p.endsWith("e") ? "n" : "en")
ihr:             p + (/[dt]$/.test(p) ? "et" : "t")
```

then `dress(verb, forms)`. Update the file's header comment to say present tense, imperative and Präteritum.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/conjugate.js tests/conjugate.test.mjs
git commit -m "Derive the Präteritum from one stored form; add a test harness"
```

### Task 2: Participle analysis — weak form, type, ge- rule, ending, segments

**Files:**
- Create: `js/perfekt.js`
- Create: `tests/perfekt.test.mjs`

**Interfaces:**
- Consumes: `splitSeparable`, `stemOf`, `needsE`, `praet3` from `js/conjugate.js`.
- Produces (exported from `js/perfekt.js`):
  - `INSEP_PREFIXES: string[]` = `["be","emp","ent","er","ge","miss","ver","zer","unter","über","wieder"]`.
  - `MIXED_BASES: Set<string>` = `können, müssen, dürfen, mögen, wissen, denken, kennen, bringen, rennen`.
  - `hasInsepPrefix(infinitive: string): boolean` — starts with one of `INSEP_PREFIXES` and is at least four letters longer than it (the checker's old `.{4,}` rule).
  - `baseOf(verb): string` — `splitSeparable(verb)[1]`; inseparable verbs are their own base.
  - `weakForm(verb): string` — spec "Weak form": prefix + ge + stem + -t/-et; no ge- when the base ends in -ieren, or the verb has flag `insep` and `hasInsepPrefix(base)`.
  - `geRule(verb): { kind: "vorne"|"mitte"|"ieren"|"praefix", prefix: string|null, label: string }` — labels exactly `ge- vorne`, `ge- nach dem Präfix`, `kein ge- (-ieren)`, `kein ge- (Präfix ver-)`.
  - `typeOf(verb): "schwach"|"stark"|"gemischt"|null` — null without a participle; `schwach` when `partizip === weakForm(verb)`; `gemischt` when it ends in -t; else `stark`.
  - `ending(verb): "-t"|"-et"|"-en"|"-n"|null` — for schwach, `-et` iff `needsE(stemOf(base))`; otherwise `-en`, or `-n` when the participle ends in a vowel + n (getan).
  - `segments(verb): {kind: "prefix"|"ge"|"stem"|"ending", text: string}[]` — in order; a separable prefix and an inseparable prefix are both `prefix`; `ge` only when the ge- rule puts one there.
  - `participleProblem(verb): string|null` — a message when the participle is neither the weak form, nor -en/-n, nor a -t form whose `baseOf` is in `MIXED_BASES`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/perfekt.test.mjs
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/*.test.mjs`
Expected: `tests/perfekt.test.mjs` fails to load (module not found).

- [ ] **Step 3: Implement `js/perfekt.js`**

Header comment: what the module derives and that nothing it returns is stored. `segments` is the one algorithm the tests do not fully determine: strip the separable prefix, then the inseparable prefix when `geRule(...).kind === "praefix"`, then `ge` when the rule puts one there, then the ending text (`en`, `n`, `et` or `t` per `ending(verb)`); what remains is the stem.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/perfekt.js tests/perfekt.test.mjs
git commit -m "Derive each verb's participle type, ge- rule, ending and segments"
```

### Task 3: Vowel families, principal parts, reason line

**Files:**
- Modify: `js/perfekt.js`
- Modify: `tests/perfekt.test.mjs`

**Interfaces:**
- Consumes: Task 2 exports; `praet3` from `js/conjugate.js`.
- Produces (exported from `js/perfekt.js`):
  - `family(verb): string|null` — `"i–a–u"` style (en dash U+2013 between vowels), the last vowel group of the infinitive stem, of `praet3(verb)`, and of the participle stem segment; null for schwach or without participle. Vowel groups: `ie ei eu äu au` first, then single vowels.
  - `familyMates(verb, verbs): string[]` — up to three infinitives: same `typeOf`, same `family`, one per `baseOf`, skipping this verb's own base except that a separable verb lists its base verb first when the base is in the list; `core` verbs before others, then list order. For a base that is not itself in the list, its first derivative stands in.
  - `stammformen(verb): string[]|null` — `[infinitive, praet3 + (" " + separable prefix if any), partizip]`; null without participle.
  - `reason(verb): string|null` — exactly: schwach `"schwach · <ge label> · -t"` or `"schwach · <ge label> · -et nach -<last stem letter>"`; gemischt `"gemischt · <ge label> · -t, Vokal ändert sich"`; stark `"stark · <ge label> · <ending> · <family>"`.

- [ ] **Step 1: Write the failing tests** (append to `tests/perfekt.test.mjs`)

```js
import { family, familyMates, stammformen, reason } from "../js/perfekt.js";

test("family: Infinitiv–Präteritum–Partizip vowels, null for weak", () => {
  assert.equal(family(F.singen), "i–a–u");
  assert.equal(family(F.aufstehen), "e–a–a");
  assert.equal(family(F.verstehen), "e–a–a");
  assert.equal(family(F.bringen), "i–a–a");
  assert.equal(family(F.sein), "ei–a–e");
  assert.equal(family(F.tun), "u–a–a");
  assert.equal(family(V({ infinitive: "verlieren", partizip: "verloren", praet: "verlor", flags: ["insep"] })), "ie–o–o");
  assert.equal(family(V({ infinitive: "heißen", partizip: "geheißen", praet: "hieß" })), "ei–ie–ei");
  assert.equal(family(V({ infinitive: "laufen", partizip: "gelaufen", praet: "lief" })), "au–ie–au");
  assert.equal(family(F.lernen), null);
});

test("familyMates never mixes types, folds derivatives, puts a separable verb's base first", () => {
  const stehen = V({ infinitive: "stehen", partizip: "gestanden", praet: "stand" });
  const denken = V({ infinitive: "denken", partizip: "gedacht", praet: "dachte" });
  const list = [F.lernen, stehen, F.verstehen, denken, F.aufstehen];
  assert.deepEqual(familyMates(F.aufstehen, list), ["stehen", "verstehen"]);
  assert.deepEqual(familyMates(stehen, list), ["verstehen"]);
  assert.deepEqual(familyMates(denken, list), []);

  const kommen = V({ infinitive: "kommen", partizip: "gekommen", praet: "kam", flags: ["core"] });
  const ankommen = V({ infinitive: "ankommen", partizip: "angekommen", praet: "kam", flags: ["sep"] });
  const mitkommen = V({ infinitive: "mitkommen", partizip: "mitgekommen", praet: "kam", flags: ["sep"] });
  const bekommen = V({ infinitive: "bekommen", partizip: "bekommen", praet: "bekam", flags: ["insep"] });
  assert.deepEqual(familyMates(kommen, [kommen, ankommen, mitkommen, bekommen]), ["bekommen"]);
  assert.deepEqual(familyMates(ankommen, [kommen, ankommen, mitkommen, bekommen]), ["kommen", "bekommen"]);
});

test("familyMates caps at three, core first, one per base", () => {
  const schreiben = V({ infinitive: "schreiben", partizip: "geschrieben", praet: "schrieb" });
  const scheinen = V({ infinitive: "scheinen", partizip: "geschienen", praet: "schien", flags: ["core"] });
  const umsteigen = V({ infinitive: "umsteigen", partizip: "umgestiegen", praet: "stieg", flags: ["sep"] });
  const einsteigen = V({ infinitive: "einsteigen", partizip: "eingestiegen", praet: "stieg", flags: ["sep"] });
  const unterschreiben = V({ infinitive: "unterschreiben", partizip: "unterschrieben", praet: "unterschrieb", flags: ["insep"] });
  const list = [schreiben, F.bleiben, scheinen, umsteigen, einsteigen, unterschreiben];
  assert.deepEqual(familyMates(schreiben, list), ["scheinen", "bleiben", "umsteigen"]);
});

test("stammformen", () => {
  assert.deepEqual(stammformen(F.aufstehen), ["aufstehen", "stand auf", "aufgestanden"]);
  assert.deepEqual(stammformen(F.lernen), ["lernen", "lernte", "gelernt"]);
  assert.equal(stammformen(F.moechten), null);
});

test("reason", () => {
  assert.equal(reason(F.lernen), "schwach · ge- vorne · -t");
  assert.equal(reason(F.arbeiten), "schwach · ge- vorne · -et nach -t");
  assert.equal(reason(F.oeffnen), "schwach · ge- vorne · -et nach -n");
  assert.equal(reason(F.studieren), "schwach · kein ge- (-ieren) · -t");
  assert.equal(reason(F.verkaufen), "schwach · kein ge- (Präfix ver-) · -t");
  assert.equal(reason(F.bringen), "gemischt · ge- vorne · -t, Vokal ändert sich");
  assert.equal(reason(F.singen), "stark · ge- vorne · -en · i–a–u");
  assert.equal(reason(F.tun), "stark · ge- vorne · -n · u–a–a");
  assert.equal(reason(F.moechten), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/*.test.mjs`
Expected: failures with "does not provide an export named 'family'".

- [ ] **Step 3: Implement in `js/perfekt.js`**

Vowel group regex `/(ie|ei|eu|äu|au|[aeiouäöü])/g`, take the last match of the string; the participle's vowel comes from its `stem` segment, the infinitive's from `stemOf(baseOf(verb))`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/perfekt.js tests/perfekt.test.mjs
git commit -m "Group strong and mixed verbs into vowel families; derive the reason line"
```

### Task 4: Distractors

**Files:**
- Modify: `js/perfekt.js`
- Modify: `tests/perfekt.test.mjs`

**Interfaces:**
- Consumes: Task 2–3 exports.
- Produces (exported from `js/perfekt.js`):
  - `distractors(verb): [string, string]|null` — two wrong forms in priority order per the spec table and fallback; null without participle.
  - `ppOptions(verb): string[]` — `[verb.partizip, ...distractors(verb)]`, unshuffled.

- [ ] **Step 1: Write the failing tests** (append)

```js
import { readFileSync } from "node:fs";
import { distractors, ppOptions } from "../js/perfekt.js";

test("distractors follow the spec table", () => {
  assert.deepEqual(distractors(F.anprobieren), ["angeprobiert", "anprobieren"]);
  assert.deepEqual(distractors(F.aufstehen), ["geaufstanden", "aufgesteht"]);
  assert.deepEqual(distractors(F.einkaufen), ["geeinkauft", "eingekaufen"]);
  assert.deepEqual(distractors(F.verstehen), ["geverstanden", "versteht"]);
  assert.deepEqual(distractors(F.verkaufen), ["geverkauft", "verkaufen"]);
  assert.deepEqual(distractors(F.studieren), ["gestudiert", "studieren"]);
  assert.deepEqual(distractors(F.singen), ["gesingt", "gesangen"]);
  assert.deepEqual(distractors(F.bleiben), ["gebleibt", "gebleiben"]);
  assert.deepEqual(distractors(F.bringen), ["gebringt", "gebrachen"]);
  assert.deepEqual(distractors(F.koennen), ["gekönnt", "gekonnen"]);
  assert.deepEqual(distractors(F.arbeiten), ["gearbeiten", "gearbeit"]);
  assert.deepEqual(distractors(F.lernen), ["gelernen", "lernt"]);
  assert.deepEqual(distractors(F.backen), ["gebackt", "backen"]);
  assert.deepEqual(distractors(V({ infinitive: "legen", partizip: "gelegt" })), ["gelegen", "legt"]);
  assert.equal(distractors(F.moechten), null);
});

test("ppOptions puts the right form first", () => {
  assert.deepEqual(ppOptions(F.singen), ["gesungen", "gesingt", "gesangen"]);
});

test("every verb in the data gets two distinct wrong forms", () => {
  const verbs = JSON.parse(readFileSync(new URL("../data/verbs.json", import.meta.url), "utf8"));
  for (const v of verbs) {
    if (!v.partizip) continue;
    const d = distractors(v);
    assert.equal(d.length, 2, v.infinitive);
    assert.ok(d[0] && d[1], v.infinitive);
    assert.notEqual(d[0], d[1], v.infinitive);
    assert.notEqual(d[0], v.partizip, v.infinitive);
    assert.notEqual(d[1], v.partizip, v.infinitive);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/*.test.mjs`
Expected: failures with "does not provide an export named 'distractors'".

- [ ] **Step 3: Implement in `js/perfekt.js`**

Six private generators, each returning a string or null:

- `weak` — `weakForm(verb)`.
- `geMisplaced` — separable: `"ge" + prefix + rest without its ge` (geaufstanden); inseparable or -ieren: `"ge" + partizip`; plain: partizip without its leading ge.
- `wrongEnding` — swap the ending on the participle: -en/-n → `-t`/`-et` by `needsE` of the stem segment; -t/-et → `-en`.
- `wrongVowel` — non-weak only: replace the last vowel group of the stem segment with the Präteritum's vowel; if that equals the participle, with the infinitive's vowel; else null.
- `dropEnding` — participle minus its ending text.
- `noGe` — participle without its leading ge, else the infinitive.

Row by class, then the fixed fallback order `weak, geMisplaced, wrongEnding, wrongVowel, dropEnding, noGe`; take the first two candidates that are non-null, not the participle, and not each other:

| class | row |
|---|---|
| separable and base ends in -ieren | `prefix + "ge" + rest`, infinitive |
| separable | geMisplaced, stark ? weak : wrongEnding |
| inseparable (`geRule.kind === "praefix"`) or -ieren | geMisplaced, stark ? weak : wrongEnding |
| plain stark | weak, wrongVowel |
| plain gemischt | weak, wrongEnding |
| plain schwach, ending -et | wrongEnding, dropEnding |
| plain schwach, ending -t | wrongEnding, noGe |

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/perfekt.js tests/perfekt.test.mjs
git commit -m "Build two tempting wrong participles for every verb"
```

### Task 5: Checker rules, snapshot columns, and the stored Präteritum

**Files:**
- Modify: `tools/check-data.mjs`
- Modify: `data/verbs.json`
- Modify: `tools/verbs.snapshot.txt` (regenerated)
- Modify: `sw.js` (`FILES` only)

**Interfaces:**
- Consumes: `praeteritum`, `regularPraet3` from `js/conjugate.js`; `typeOf`, `participleProblem`, `hasInsepPrefix`, `INSEP_PREFIXES`, `family`, `distractors` from `js/perfekt.js`.
- Produces: a snapshot line per verb of the form
  `inf | present | imperativ: … | perfekt: ist aufgestanden · stark · e–a–a | präteritum: stand auf · standest auf · … | distraktoren: geaufstanden · aufgesteht`
  with `–` in the perfekt and distraktoren fields of a verb without participle, and `–` for a null family.

- [ ] **Step 1: Confirm the data round-trips**

Run:
```bash
node -e 'const fs=require("fs");const f=fs.readFileSync("data/verbs.json","utf8");console.log(JSON.stringify(JSON.parse(f),null,2)+"\n"===f?"identical":"DIFFERS")'
```
Expected: `identical`. If it differs, stop and report; every scripted edit below depends on it.

- [ ] **Step 2: Extend `tools/check-data.mjs`**

Replace the `INSEP` regex with `hasInsepPrefix` (same warning as before). Add, per verb:

- `const p = participleProblem(v); if (p) err(at + ": " + p);`
- `if (has("insep") && !hasInsepPrefix(v.infinitive)) err(at + ": insep, but no inseparable prefix (" + INSEP_PREFIXES.join(", ") + ")");`
- `if (v.praet !== undefined && typeof v.praet !== "string") err(at + ": praet is a string");`
- `if (v.partizip && typeOf(v) !== "schwach" && !v.praet && !v.praeteritum) err(at + ": strong or mixed verb needs praet");`
- `if (v.praet && v.praet === regularPraet3(v)) warn(at + ": praet is the regular form; drop it");`

Add a service-worker coverage check after the verb loop: every `*.js` under `js/` (use `readdirSync(dir, { recursive: true })`) must appear in `sw.js` as `./js/<path>`; `err` for each missing file. Extend the snapshot `lines` with the three fields above, and update the header comment (snapshot now also pins Perfekt, Präteritum and distractors).

- [ ] **Step 3: Run the checker to see the new rules bite**

Run: `node tools/check-data.mjs | grep -c "needs praet"`
Expected: `71` (the 72 strong and mixed verbs minus sein, which still has its six-form array). The full output also carries one `insep, but no inseparable prefix` error for frühstücken and one `sw.js` error for `js/perfekt.js`.

- [ ] **Step 4: Edit the data with a script**

Write a throwaway Node script (not committed) that loads `data/verbs.json`, applies the edits below, and writes it back with `JSON.stringify(rows, null, 2) + "\n"`. Place `praet` right after `partizip` in each entry.

`praet` values, by infinitive:

```
sein war · werden wurde · können konnte · müssen musste · dürfen durfte · mögen mochte
haben hatte · gehen ging · kommen kam · sehen sah · geben gab · wissen wusste
finden fand · nehmen nahm · sprechen sprach · heißen hieß · essen aß · trinken trank
schlafen schlief · fahren fuhr · laufen lief · fliegen flog · lesen las · schreiben schrieb
verstehen verstand · denken dachte · kennen kannte · bleiben blieb · stehen stand
sitzen saß · liegen lag · schließen schloss · beginnen begann · helfen half
bringen brachte · tragen trug · bekommen bekam · vergessen vergaß · treffen traf
schwimmen schwamm · singen sang · backen backte · waschen wusch · ziehen zog
gefallen gefiel · verlieren verlor · gewinnen gewann · unterschreiben unterschrieb
lassen ließ · tun tat · rufen rief · scheinen schien · rennen rannte · schreien schrie
aufstehen stand · anfangen fing · einladen lud · anrufen rief · mitkommen kam
mitbringen brachte · ankommen kam · abfahren fuhr · aussehen sah · fernsehen sah
stattfinden fand · umziehen zog · anziehen zog · ausziehen zog · mitnehmen nahm
zurückkommen kam · umsteigen stieg · anhalten hielt · wehtun tat
```

Also: delete the `praeteritum` arrays of sein and haben (möchten keeps its); remove `"insep"` from frühstücken's flags. Add `"./js/perfekt.js"` to `FILES` in `sw.js` after `"./js/conjugate.js"`.

- [ ] **Step 5: Run the checker; only the snapshot format should differ**

Run: `node tools/check-data.mjs | grep -v "snapshot differs" | grep -c ERROR`
Expected: `0`.

- [ ] **Step 6: Regenerate the snapshot and read the diff**

Run: `node tools/check-data.mjs --update && git diff --stat tools/verbs.snapshot.txt && git diff tools/verbs.snapshot.txt | grep "^+" | grep -E "präteritum: (aß|stand|las|schrie|wurde|meldete)" `
Expected: the six-form lines for essen, aufstehen, lesen, schreien, werden and anmelden read as in Task 1's tests. Then `node tools/check-data.mjs` prints `169 verbs, 0 errors, 0 warnings`.

- [ ] **Step 7: Run the tests**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 8: Commit**

```bash
git add tools/check-data.mjs tools/verbs.snapshot.txt data/verbs.json sw.js
git commit -m "Store the Präteritum where it cannot be derived; pin Perfekt, Präteritum and distractors in the snapshot"
```

### Task 6: Three new verbs, README, cache bump (end of phase 1)

**Files:**
- Modify: `data/verbs.json`
- Modify: `tools/verbs.snapshot.txt` (regenerated)
- Modify: `README.md` (Layout, Verbs schema, Checking the data, Provenance)
- Modify: `sw.js` (`CACHE` → `wortschatz-a1-v12`)

- [ ] **Step 1: Append the three entries** to `data/verbs.json` (after wehtun, via the same scripted round-trip):

```json
{
  "infinitive": "erzählen",
  "en": "to tell (a story, what happened)",
  "aux": "hat",
  "partizip": "erzählt",
  "takes": "+ Dativ + Akkusativ",
  "flags": ["insep"],
  "example": { "de": "Erzähl mir von deinem Wochenende!", "en": "Tell me about your weekend!" },
  "examplePerfekt": { "de": "Oma hat uns eine Geschichte erzählt.", "en": "Grandma told us a story." },
  "tip": "Person in the Dativ, story in the Akkusativ: Ich erzähle dir eine Geschichte. erzählen von + Dativ = tell about. sagen is for a single remark."
},
{
  "infinitive": "einsteigen",
  "en": "to get on, to get in (a bus, a car)",
  "aux": "ist",
  "partizip": "eingestiegen",
  "praet": "stieg",
  "takes": "in + Akkusativ",
  "flags": ["sep"],
  "example": { "de": "Wir steigen in den Bus ein.", "en": "We get on the bus." },
  "examplePerfekt": { "de": "Sie ist in das falsche Auto eingestiegen.", "en": "She got into the wrong car." },
  "tip": "Direction, so in + Akkusativ: in den Zug einsteigen. Opposite: aussteigen; to change is umsteigen."
},
{
  "infinitive": "aussteigen",
  "en": "to get off, to get out (of a bus, a car)",
  "aux": "ist",
  "partizip": "ausgestiegen",
  "praet": "stieg",
  "takes": "aus + Dativ",
  "flags": ["sep"],
  "example": { "de": "Wo muss ich aussteigen?", "en": "Where do I have to get off?" },
  "examplePerfekt": { "de": "Wir sind an der Haltestelle ausgestiegen.", "en": "We got off at the stop." },
  "tip": "aus + Dativ: aus dem Bus aussteigen. Announcements use the noun: Ausstieg in Fahrtrichtung rechts."
}
```

- [ ] **Step 2: Run the checker**

Run: `node tools/check-data.mjs`
Expected: three `warn snapshot: new verb … (run --update)` lines, `172 verbs, 0 errors, 3 warnings`.

- [ ] **Step 3: Regenerate the snapshot and re-run**

Run: `node tools/check-data.mjs --update && node tools/check-data.mjs && node --test tests/*.test.mjs`
Expected: `172 verbs, 0 errors, 0 warnings` and `ℹ fail 0`.

- [ ] **Step 4: Update `README.md`**

- Layout: add `js/perfekt.js` ("participle analysis: type, ge- rule, segments, vowel family, distractors"), `tests/` ("node --test"), and extend the `conjugate.js` line to "present tense, imperative and Präteritum".
- Verbs schema: add `"praet": "stand"` with the comment from the spec (3rd-person-singular Präteritum of the base verb, only where the weak rule does not produce it); change the `praeteritum` comment to "full six-form override; only möchten (wollte)".
- Replace the `insep` paragraph: `insep` marks a prefix that does not separate; together with the inseparable-prefix list in `perfekt.js` it decides that the participle gets no ge-, and it prints the "nicht trennbar" tag.
- Checking the data: list the new rules (participle neither weak nor strong nor a known mixed verb; strong or mixed verb without `praet`; `insep` without a listed prefix; a `js/` file missing from `sw.js`) and the extended snapshot; add `node --test tests/*.test.mjs`.
- Provenance: one sentence that the list grew to 172 with erzählen, einsteigen, aussteigen, all on the Goethe A1 list.

- [ ] **Step 5: Bump the cache**

In `sw.js` set `CACHE = "wortschatz-a1-v12"`.

- [ ] **Step 6: Commit**

```bash
git add data/verbs.json tools/verbs.snapshot.txt README.md sw.js
git commit -m "Add erzählen, einsteigen, aussteigen; document praet and the new checks"
```

## Phase 2 — the card

### Task 7: Card front — Typ and Partizip II rows

**Files:**
- Modify: `js/views/study.js:186-207` (QUIZ_NAMES, verbRows), `:251` (production cue)
- Modify: `js/categories.js` (verbs `desc`)
- Modify: `css/app.css` (`.quiz .qo button`)

**Interfaces:**
- Consumes: `typeOf`, `ppOptions` from `../perfekt.js`.
- Produces: `verbPicks` keys `aux`, `kasus`, `typ`, `pp`.

- [ ] **Step 1: Rewrite the rows**

`QUIZ_NAMES = { aux: "Perfekt", kasus: "Kasus", typ: "Typ", pp: "Partizip II" }`. In `verbRows`, delete the `reg` and `sep` rows and add, when `w.partizip`:

```js
rows.push({ k: "typ", label: "Typ", opts: ["schwach", "stark", "gemischt"], right: typeOf(w) });
rows.push({ k: "pp", label: "Partizip II", opts: shuffle(ppOptions(w)), right: w.partizip });
```

with a local `shuffle(arr)` (Fisher–Yates on a copy). Update the comment above `verbRows` to describe the four rows. Change the production cue to `" Mit er/sie/es-Form, Präteritum und Perfekt."`. In `categories.js` set the verbs `desc` to `"Perfekt, Präteritum, Imperativ · Kernverben zuerst"`.

- [ ] **Step 2: Fit long forms**

Add `.quiz .qo button.pp{font-size:13.5px;padding:11px 2px}` and give the Partizip II row's buttons that class, so three forms as long as "zurückgekommen" sit in one row at 360px width; wrapping inside a button is acceptable, overflow is not.

- [ ] **Step 3: Verify in the browser**

Run: `python3 -m http.server 8000` and open `http://localhost:8000/#/study/verbs` at a 360px-wide viewport.
Expected: a verb card shows rows Perfekt mit, Kasus (where the verb takes a case), Typ, Partizip II; a wrong pick turns red and the right answer green; the last pick flips the card; the back's hint names "Typ" or "Partizip II" after a wrong pick. Find möchten (or set `newPerDay` high and tap through): it shows the Kasus row only. Three buttons of zurückgekommen's row stay in one line.

- [ ] **Step 4: Checks still pass**

Run: `node tools/check-data.mjs && node --test tests/*.test.mjs`
Expected: `172 verbs, 0 errors, 0 warnings`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/views/study.js js/categories.js css/app.css
git commit -m "Ask for the verb type and the participle itself instead of regelmäßig and trennbar"
```

### Task 8: Card back — Perfekt block, Präteritum on every verb, split tags

**Files:**
- Modify: `js/views/study.js:115-150` (verb branch of `backHtml`)
- Modify: `css/app.css` (replace `.perf`, extend `.praet`)

**Interfaces:**
- Consumes: `segments`, `reason`, `stammformen`, `familyMates`, `typeOf` from `../perfekt.js`; `praeteritum`, `PERS` from `../conjugate.js`; `W` from `../data.js`.

- [ ] **Step 1: Replace the Perfekt line and the Präteritum condition**

Replace lines 132–136 with:

```html
<div class="perfekt">
  <div class="lbl">Perfekt</div>
  <div class="form"><span class="aux">ist</span> <span class="pp"><span class="seg prefix">auf</span><span class="seg ge">ge</span><span class="seg stem">stand</span><span class="seg ending">en</span></span></div>
  <div class="why">stark · ge- nach dem Präfix · -en · e–a–a</div>
  <div class="stamm">aufstehen · stand auf · aufgestanden</div>
  <div class="mates">wie stehen, verstehen</div>
</div>
```

built from `segments(w)`, `reason(w)`, `stammformen(w)` and `familyMates(w, W.verbs)`; omit `.mates` when there are none; omit the whole block when `w.partizip` is absent (möchten). Then always append the Präteritum row from `praeteritum(w)` in the existing `.praet` format; for `w.third` show only `es <forms[2]> · sie <forms[5]>`.

- [ ] **Step 2: Split the tags**

Replace the `irr` tag line with:

```js
if (w.stemChange || w.forms) tags += '<span class="tag">Präsens unregelmäßig</span>';
const t = typeOf(w);
if (t === "stark" || t === "gemischt") tags += '<span class="tag">' + t + "</span>";
```

- [ ] **Step 3: Style**

In `css/app.css` replace `.perf`/`.perf em` with `.perfekt` rules: `.lbl` like `.ex .lbl`; `.form` serif 20px with `.aux` in `--amber`; `.seg + .seg::before{content:"·";color:var(--dim);margin:0 1px}` so segments read without colour; `.seg.ge{color:var(--amber)}`, `.seg.ending{color:var(--das)}`, `.seg.prefix{color:var(--der)}`; `.why`, `.stamm`, `.mates` 13.5px muted. The card back must still fit a 360px phone without horizontal scroll.

- [ ] **Step 4: Verify in the browser**

Open `http://localhost:8000/#/study/verbs`, flip aufstehen, lernen, verkaufen, bringen, möchten, regnen.
Expected: aufstehen shows `ist auf·ge·stand·en`, the reason line, Stammformen, "wie stehen, verstehen", six Präteritum forms ending in "auf", and the tags trennbar, stark, Perfekt mit sein. lernen shows `ge·lern·t`, no mates line, Präteritum lernte…. möchten shows no Perfekt block and the wollte Präteritum. regnen shows `es regnete · sie regneten`.

- [ ] **Step 5: Checks still pass**

Run: `node tools/check-data.mjs && node --test tests/*.test.mjs`
Expected: `172 verbs, 0 errors, 0 warnings`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/views/study.js css/app.css
git commit -m "Explain each participle on the card back; show the Präteritum for every verb"
```

### Task 9: Remove the `irr` flag, cache bump (end of phase 2)

**Files:**
- Modify: `data/verbs.json` (69 entries)
- Modify: `tools/check-data.mjs:37` (`FLAGS`)
- Modify: `README.md` (flags line, any mention of `irr`)
- Modify: `sw.js` (`CACHE` → `wortschatz-a1-v13`)

- [ ] **Step 1: Confirm nothing reads the flag**

Run: `grep -rn '"irr"' js/ tools/`
Expected: only `tools/check-data.mjs:37`.

- [ ] **Step 2: Remove it from the checker first**

Delete `"irr"` from `FLAGS`. Run `node tools/check-data.mjs | grep -c "unknown flag irr"`.
Expected: `69`.

- [ ] **Step 3: Strip it from the data** with the scripted round-trip (`v.flags = v.flags.filter((f) => f !== "irr")`), then run `node tools/check-data.mjs`.
Expected: `172 verbs, 0 errors, 0 warnings` and no snapshot diff (the flag never reached the snapshot).

- [ ] **Step 4: README and cache**

Flags line becomes `core · modal · sep · insep`; remove the `irr` mentions; the "front of a verb card" paragraph now describes the four rows (Perfekt auxiliary, case, type, participle). Set `CACHE = "wortschatz-a1-v13"`.

- [ ] **Step 5: Commit**

```bash
git add data/verbs.json tools/check-data.mjs README.md sw.js
git commit -m "Drop the irr flag; irregularity is now derived"
```

## Phase 3 — the rules page

### Task 10: `rulesHtml`

**Files:**
- Create: `js/views/rules.js`
- Create: `tests/rules.test.mjs`

**Interfaces:**
- Consumes: `esc` from `../dom.js`; `typeOf`, `family`, `baseOf`, `geRule`, `reason` from `../perfekt.js`; `praet3` from `../conjugate.js`.
- Produces: `rulesHtml(verbs): string` — the sections below as one HTML string with a single root `<div class="rules">`; `rules(app)` (Task 11) wraps it as a page.

Sections, headings in German, copy in English (this copy is fixed; examples that name verbs are looked up in `verbs` and rendered as `infinitive → partizip`):

1. `<h2>Drei Schritte</h2>`
   - `<h3>1 · Wo steht ge-?</h3>` "ge- appears only when the first syllable is stressed." Four lines: "No prefix: ge- in front — lernen → gelernt"; "Ends in -ieren: no ge- — studieren → studiert"; "Inseparable prefix (be-, emp-, ent-, er-, ge-, miss-, ver-, zer-): no ge- — verstehen → verstanden"; "Separable prefix: ge- between prefix and stem — aufstehen → aufgestanden".
   - `<h3>2 · Welche Endung?</h3>` a three-row table: schwach `-t`, or `-et` after -d, -t and clusters (arbeiten → gearbeitet); gemischt `-t` with a vowel change (bringen → gebracht); stark `-en` (singen → gesungen).
   - `<h3>3 · Was passiert mit dem Stamm?</h3>` "Weak: nothing, the form is fully predictable. Strong and mixed: the vowel changes and must be learned; the families below make that faster."
2. `<h2>haben oder sein</h2>` "haben by default, always with a direct object. sein for movement from A to B, for a change of state, and for sein, bleiben, werden." Then "Mit sein in dieser Liste:" and every verb with `aux === "ist"`, list order.
3. `<h2>Drei Typen</h2>` a table: schwach / stark / gemischt, each with its count among `verbs` and its first three verbs (core first, then list order). Below it one line: "Ganz unregelmäßig: sein · haben · werden · tun".
4. `<h2>Vokalfamilien</h2>` "Infinitiv – Präteritum – Partizip II." For each family among the stark verbs, largest first, a `<h3>` with the pattern and one line of its members, one per base: the base verb if present, else its derivatives in full; derivatives of a present base folded as "kommen (an-, mit-, zurück-)". Families with one base go together under `<h3>Einzelgänger</h3>` as "pattern · verb". Then `<h3>Gemischte Verben</h3>` listing each gemischt verb with its pattern.

- [ ] **Step 1: Write the failing tests**

```js
// tests/rules.test.mjs
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/*.test.mjs`
Expected: `tests/rules.test.mjs` fails to load.

- [ ] **Step 3: Implement `rulesHtml` in `js/views/rules.js`**

Pure string building with `esc`; no DOM access at module scope (the test imports it under Node). Also export `rules(app)` as a stub that Task 11 fills: `app.innerHTML = '<div class="wrap panel">…' + rulesHtml(W.verbs) + '</div>'`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/views/rules.js tests/rules.test.mjs
git commit -m "Render the Partizip II rules from the live verb list"
```

### Task 11: Route, home link, study overlay, cache bump (end of phase 3)

**Files:**
- Modify: `js/views/rules.js` (`rules(app)`)
- Modify: `js/router.js:26-30` (`parse`)
- Modify: `js/app.js:29-31` (register)
- Modify: `js/views/home.js:42` (link row after the Verben button)
- Modify: `js/views/study.js:97-101` (`?` button), keydown handler at the end of the file
- Modify: `css/app.css` (`.rules`, `.rules-link`, `.sheet`, `.sheet-body`)
- Modify: `sw.js` (`FILES` + `./js/views/rules.js`; `CACHE` → `wortschatz-a1-v14`)
- Modify: `README.md` (Layout: `views/rules.js`; a paragraph on the rules page)

- [ ] **Step 1: Route**

In `router.js` `parse`, add `if (parts[0] === "regeln") return { name: "regeln" };`. In `app.js`, `register("regeln", () => rules(app));`. `rules(app)` renders `<div class="wrap panel"><div class="masthead"><h1>Regeln</h1><button class="iconbtn" data-back aria-label="Zurück">✕</button></div>` + `rulesHtml(W.verbs)`, with `data-back` calling the router's `back()`.

- [ ] **Step 2: Home link**

In `home.js`, after the Verben `catButton`, add `<button class="rules-link" data-go="regeln">Regeln: Perfekt &amp; Partizip II ›</button>`; wire `data-go` buttons to `go(name)` (the settings gear already uses `data-go="settings"`; generalise the selector).

- [ ] **Step 3: Study overlay**

In `drawCard`, when `w.cat === "verbs"`, add `<button class="iconbtn" data-rules aria-label="Regeln">?</button>` before the flag button. `openRules()` appends to `app`:

```html
<div class="sheet" role="dialog" aria-label="Regeln"><div class="sheet-body">
  <button class="iconbtn" data-close aria-label="Schließen">✕</button>
  …rulesHtml(W.verbs)…
</div></div>
```

Close on `data-close`, on a tap of the backdrop (`e.target === sheet`), and on Escape. At the top of the existing keydown handler: `const sheet = document.querySelector(".sheet"); if (sheet) { if (e.key === "Escape") sheet.remove(); return; }`.

- [ ] **Step 4: Style**

`.sheet{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;z-index:10}`, `.sheet-body{background:var(--surface);width:100%;max-width:540px;max-height:88vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 18px 28px}`, `.rules h2/h3` in the panel's type scale, `.rules table` compact, `.rules-link` a full-width muted text button under the category card.

- [ ] **Step 5: Service worker and README**

Add `"./js/views/rules.js"` to `FILES`; set `CACHE = "wortschatz-a1-v14"`. README: add `views/rules.js` to Layout and a short paragraph under "The word lists → Verbs" saying the rules page is derived from the data and reachable from home and from a verb card.

- [ ] **Step 6: Verify in the browser**

Open `http://localhost:8000/`.
Expected: the link under Verben opens `#/regeln`; its ✕ and the browser back both return home. Open a verb card, answer one row, tap `?`: the overlay shows the rules over the card; press `1`: nothing is graded; press Escape: the overlay closes and the card still shows the answered row and the same "übrig" count. Reload on `#/regeln` renders the page directly. Go offline (DevTools) after one load: `#/regeln` still renders.

- [ ] **Step 7: Checks still pass**

Run: `node tools/check-data.mjs && node --test tests/*.test.mjs`
Expected: `172 verbs, 0 errors, 0 warnings`, `ℹ fail 0`.

- [ ] **Step 8: Commit**

```bash
git add js/views/rules.js js/router.js js/app.js js/views/home.js js/views/study.js css/app.css sw.js README.md
git commit -m "Add a rules page for the Perfekt, reachable from home and from any verb card"
```

## Phase 4 — tips

### Task 12: Trim tips that now duplicate the card

**Files:**
- Modify: `tools/check-data.mjs` (new warning)
- Modify: `data/verbs.json` (tips of 52 verbs)
- Modify: `sw.js` (`CACHE` → `wortschatz-a1-v15`)

- [ ] **Step 1: Add the warning**

Per verb with a participle: warn when `tip` contains a Perfekt form (`/\b(hat|ist|bin|bist|sind|seid|habe|hast|haben|habt)\s+<partizip>\b/i`) or the phrase `no ge-` (case-insensitive): `warn(at + ": tip restates the Perfekt; the card shows it now")`.

Run: `node tools/check-data.mjs | grep -c "restates the Perfekt"`
Expected: `52`.

- [ ] **Step 2: Edit the 52 tips**

Through the scripted round-trip or by hand, one verb at a time. Remove only the clause that restates the auxiliary, the ge- rule or the participle; keep every other fact, and keep the sentence grammatical. Where the whole tip was the Perfekt rule, replace it with the thing the card cannot say (a usage note, a false friend, a collocation). Reference rewrite, verkaufen: "Inseparable prefix ver-: no ge- in the Perfekt (hat verkauft); stress falls on -kau-." → "Stress falls on -kau-, not on ver-; an unstressed prefix is why there is no ge-."

- [ ] **Step 3: Verify**

Run: `node tools/check-data.mjs && node --test tests/*.test.mjs`
Expected: `172 verbs, 0 errors, 0 warnings`, `ℹ fail 0`. Spot-check in the browser that gehen, bleiben and verstehen read well on the card back next to the Perfekt block.

- [ ] **Step 4: Cache and commit**

Set `CACHE = "wortschatz-a1-v15"`.

```bash
git add tools/check-data.mjs data/verbs.json sw.js
git commit -m "Trim tips that repeat what the Perfekt block now shows"
```
