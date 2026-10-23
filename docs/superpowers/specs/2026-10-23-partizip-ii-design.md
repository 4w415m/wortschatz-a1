# Partizip II: teach the rule, not just the form

Date: 2026-10-23 · Status: shipped 2026-10-24 (main e5548bc); follow-up below

## Intent

The verb card currently shows the Perfekt as a finished fact ("Perfekt: hat
gemacht") and asks one ambiguous question about it ("Konjugation: regelmäßig /
unregelmäßig"). The learner gets all three parts of participle formation wrong:
where the ge- goes, whether the ending is -t or -en, and what happens to the
vowel. The spreadsheet `docs/superpowers/specs/2026-10-23-german-partizip-ii.xlsx` lays out the system as three
ordered steps plus the auxiliary, and splits "irregular" into the three groups
that actually behave differently: schwach, stark, gemischt.

This change makes the app teach and quiz that system on every verb card, adds
the Präteritum so the classic three principal parts (singen · sang · gesungen)
can be learned, and gives the rules a page of their own. It touches data,
tooling, and UI; it does not touch card ids or saved progress.

## Goals

- Every verb card asks the learner to produce the Partizip II, with wrong
  options built from the mistakes learners actually make: misplaced ge-, wrong
  ending, wrong vowel.
- Every verb card explains, after the flip, which type the verb is and why its
  participle looks the way it does, in one or two short lines derived from the
  data rather than written by hand.
- Every verb shows its Stammformen (Infinitiv · Präteritum · Partizip II) and
  its six Präteritum forms, shown at full strength: the learner wants to learn
  it even though A1 does not test it.
- Strong and mixed verbs show the vowel family they belong to, with other verbs
  from the same family as memory hooks.
- A rules page renders the spreadsheet's content from the live data: the three
  steps, the auxiliary rule, the type table with real counts, and the vowel
  families with the app's own verbs grouped under them.
- `check-data.mjs` catches a participle or Präteritum that follows none of the
  known patterns, and the snapshot pins everything derived so changes are
  reviewed on purpose.
- Three A1 verbs the spreadsheet or its rules call for join the list:
  erzählen, einsteigen, aussteigen. All three are in the official Goethe
  A1 word list (Start Deutsch 1 Wortliste); the spreadsheet's other five
  example verbs are not.

## Non-goals

- Typed answers. The app is tap-based; producing the participle is done by
  choosing among three forms.
- Quizzing the Präteritum. It is shown, not asked.
- Passive `worden`, Plusquamperfekt, the double infinitive of modals. A tip
  may mention them; the card does not teach them.
- Adding the spreadsheet's non-A1 example verbs (atmen, springen, steigen,
  reiten, schneiden, greifen, biegen).
- Changing noun, adjective or other cards.

## Anti-goals

Even if it works, this has failed if:

- a verb card needs more than four taps before it flips (today it is four);
- anything derivable gets stored in `verbs.json` (type, ending, ge- rule,
  vowel family, weak Präteritum);
- a headword changes, or saved progress stops matching its word;
- the rules page is a wall of prose nobody reads on a phone.

## Constraints

- Plain ES modules, no build step, no dependencies. New JS files go into the
  `FILES` list in `sw.js`, and `CACHE` is bumped on release.
- Mobile first: 540px max width, three options must fit in one row for forms
  as long as "zurückgekommen"; wrapping inside a button is acceptable.
- Card ids are `verbs:<infinitive>`; headwords are untouched.
- UI labels are German, as today (Perfekt mit, Kasus); explanations the
  learner must read are English, as the tips are, because an A1 learner cannot
  read German grammar prose.
- `node tools/check-data.mjs` must pass; deliberate derived-output changes are
  accepted with `--update` after reading the diff.

## What the learner sees

### Card front, recognition mode

Rows, in order. A row is left out where the question makes no sense for the
verb, exactly as today.

```
Was heißt das?
aufstehen

Perfekt mit    [ hat ]       [ ist ]
Kasus          (no row: aufstehen takes no object)
Typ            [ schwach ]   [ stark ]      [ gemischt ]
Partizip II    [ aufgesteht ][ aufgestanden ][ geaufstanden ]
```

- `Perfekt mit` and `Kasus` stay as they are.
- `Typ` replaces `Konjugation`. Three options, like `Kasus`. The right answer
  is derived (see Derivation). Asking the type first mirrors the spreadsheet's
  step 2: decide the group, then build the form.
- `Partizip II` replaces `Präfix`. Three forms, one right, two distractors
  built by applying a tempting wrong rule to this verb. The trennbar question
  is not lost: a prefixed verb always gets a misplaced-ge- distractor.
- The last answer flips the card, as today. A wrong pick in any row suggests
  "Nochmal", as today. `QUIZ_NAMES` gains `typ: "Typ"` and `pp: "Partizip II"`.
- Options are shuffled at display time; the distractor *set* is deterministic
  per verb so it can be pinned in the snapshot and reviewed.

Production mode (established cards) keeps its single cue; its text becomes
"Mit er/sie/es-Form, Präteritum und Perfekt."

### Card back

Everything that is there today stays. The single line "Perfekt: ist
aufgestanden" becomes a block, and the Präteritum row appears on every verb.

```
aufstehen
to get up
(present-tense table as today)

PERFEKT
ist  auf·ge·stand·en            ← form, large; segments distinguished
stark · ge- nach dem Präfix · -en
aufstehen · stand auf · aufgestanden        ← Stammformen
wie stehen, verstehen                       ← same vowel family, other base verbs

PRÄTERITUM
ich stand auf · du standest auf · er stand auf · wir standen auf · ihr standet auf · sie standen auf

IMPERATIV ...
tags: Kernverb · trennbar · Perfekt mit sein
(example, examplePerfekt, tip as today)
```

- The participle is shown segmented into prefix, ge-, stem, ending. Separators
  and colour are the builder's choice using the existing palette tokens; the
  segments must be tellable apart without colour alone.
- The reason line is derived: type · ge- rule · ending. Examples:
  - lernen: `schwach · ge- vorne · -t`
  - arbeiten: `schwach · ge- vorne · -et nach -t`
  - studieren: `schwach · kein ge- (-ieren) · -t`
  - verkaufen: `schwach · kein ge- (Präfix ver-) · -t`
  - bringen: `gemischt · ge- vorne · -t, Vokal ändert sich`
  - singen: `stark · ge- vorne · -en · i–a–u`
- The family line lists up to three other *base* verbs from the same
  Infinitiv–Präteritum–Partizip vowel family, core verbs first. Prefixed
  derivatives of the same base (kommen, ankommen, mitkommen) do not count as
  mates; a verb with no mates shows no line.
- The tag "unregelmäßig" becomes two: "Präsens unregelmäßig" (the verb has
  `stemChange` or `forms`) and the verb type ("stark" / "gemischt"); weak
  verbs get no type tag because the block already says schwach. "Perfekt mit
  sein" stays.
- With that, nothing reads the `irr` flag any more and everything it said is
  derivable, so it is removed from the 69 entries in phase 2, from the
  checker's `FLAGS`, and from the README. Card ids do not involve flags, so
  progress is unaffected.

### Rules page

The content is one function, `rulesHtml()`, in `js/views/rules.js`, rendered in
two places:

- as a route, `regeln` at `#/regeln`, reached from a link row under the Verben
  group on the home screen ("Regeln: Perfekt & Partizip II"); back goes
  through the router's `back()`;
- as a dismissable overlay inside the study view, opened by a `?` icon in the
  study top bar while the current card is a verb. It must not navigate:
  re-entering the study route rebuilds the queue and loses the current card,
  its picks and the session count. Closing the overlay returns to the card
  exactly as it was. Escape closes it on desktop.

Sections, German headings, English explanations, every example drawn from the
app's own list:

1. **Drei Schritte** — ge- placement (stress rule, four cases with one verb
   each), ending (type table: schwach -t/-et, gemischt -t, stark -en), stem
   (unchanged / memorize).
2. **haben oder sein** — the default and the sein cases, with the app's
   sein-verbs listed.
3. **Drei Typen** — schwach / stark / gemischt with live counts and three
   examples each, plus a short row for the four fully irregular verbs (sein,
   haben, werden, tun), the spreadsheet's "other irregular".
4. **Vokalfamilien** — every Infinitiv–Präteritum–Partizip pattern among the
   strong and mixed verbs, largest family first, each listing its base verbs
   with prefixed derivatives folded in ("kommen (an-, mit-, zurück-)").

Read-only; nothing on it is tappable except the back control.

## Data model

Fields added to a verb entry. Everything else is derived.

```json
"praet": "stand",     3rd-person-singular Präteritum of the BASE verb (no
                      separable prefix); present only where the weak rule
                      does not produce it — today the 72 strong, mixed and
                      irregular participles plus haben (hatte), 73 in all
```

- `praeteritum` (six forms) stays as a full override, used verbatim when
  present. It currently exists on sein, haben and möchten. The six-form rule
  below reproduces sein's and haben's arrays exactly from `war` and `hatte`,
  so both move to `praet`; möchten keeps its wollte array.
- Nothing is stored for type, ending, ge- rule, vowel family or distractors.
- New verbs: `erzählen` (hat erzählt, insep, weak, person in Dativ and thing in
  Akkusativ), `einsteigen` (ist eingestiegen, sep, strong, `in + Akkusativ`),
  `aussteigen` (ist ausgestiegen, sep, strong, `aus + Dativ`). Each gets the
  full set of required fields: example, examplePerfekt, tip, flags, praet.
  Glosses must not collide with umsteigen's.

## Derivation

Lives beside the conjugator (a new `js/perfekt.js` or inside `conjugate.js`,
builder's choice) and is the single source for the card, the rules page and
the checker.

**Weak form.** `prefix + ge + stem + (-et | -t)`, where ge- is dropped for a
base ending in -ieren, or for a base that carries the `insep` flag *and*
starts with a known inseparable prefix (be-, emp-, ent-, er-, ge-, miss-,
ver-, zer-, unter-, über-, wieder-; the list the checker's `INSEP` regex
already holds, shared from one place). -et follows the conjugator's existing
`needsE(stem)` (stem in -d, -t, or consonant + m/n). Today this reproduces
96 of 168 participles exactly and none wrongly.

`frühstücken` currently carries `insep` only so the old Präfix row could ask
"nicht trennbar"; that row goes, so the flag comes off and the verb is a plain
weak verb (ge- in front, gefrühstückt). From then on `insep` means exactly
"has a prefix that does not separate", which is what decides the ge- rule and
the "nicht trennbar" tag; the README's description of the flag is updated to
say so. The checker errors on an `insep` verb whose base has no listed prefix.

**Type.**
- schwach: the stored participle equals the weak form.
- gemischt: otherwise, and the participle ends in -t.
- stark: otherwise (ends in -en, or -n after a vowel as in getan).
So haben, wollen, sollen are schwach; können, müssen, dürfen, mögen, wissen,
denken, kennen, bringen, rennen are gemischt; sein, werden, tun are stark.

**ge- rule**, one of: `ge- vorne` · `ge- nach dem Präfix` · `kein ge-
(-ieren)` · `kein ge- (Präfix X)`.

**Ending**: -t, -et, -en, read off the participle.

**Vowel family.** The vowel (or diphthong) of the base stem in Infinitiv,
Präteritum and Partizip, e.g. `i–a–u`. Only strong and mixed verbs have one.
Families are kept apart by type: a strong verb's mates are strong verbs, a
mixed verb's mates are mixed verbs, so stehen (e–a–a, -en) never shares a hook
with denken (e–a–a, -t). The ending is one of the three things being learned
and the hook must not blur it; the spreadsheet's Vowel Patterns sheet is
strong-only for the same reason. The family key uses the base verb, so
prefixed derivatives join their base; inseparable verbs (verstehen, bekommen)
count as their own base, as their participles do not carry ge-.

On the rules page the Vokalfamilien section lists the strong families largest
first, then one row "Einzelgänger" for strong verbs whose pattern no other
base verb shares (sein, backen, schreien ...), then the mixed verbs as a
group of their own with their patterns.

**Präteritum, six forms** from `praet` (or the weak 3rd singular `stem + te /
ete`):
- ich and er/sie/es: `praet` as stored.
- du: `+st`; `+est` after -d, -t, -s, -ß.
- wir and sie: `+n` if `praet` ends in -e, else `+en`.
- ihr: `+t`; `+et` after -d, -t.
Reflexive pronouns and separable prefixes are attached as in the present tense.
Where this gives a wrong form, the verb gets a six-form `praeteritum`
override; the snapshot diff is where that is noticed.

**Distractors.** Two wrong forms per verb, chosen by what is most tempting for
its class, in this priority, skipping any that equals the right form or the
other distractor:

| Verb class | First distractor | Second distractor |
|---|---|---|
| separable and -ieren | ge- after the prefix: angeprobiert | wrong ending, i.e. the infinitive: anprobieren |
| separable, any other type | ge- in front: geaufstanden | weak form if strong (aufgesteht), else wrong ending (eingekaufen) |
| inseparable or -ieren | ge- added: geverkauft, gestudiert | weak form if strong (versteht), else wrong ending (verkaufen, studieren) |
| plain strong | weak form: gesingt | wrong vowel: Präteritum vowel (gesangen), else infinitive vowel (gesingen) |
| plain mixed | weak form: gebringt | wrong ending: gebrachen |
| plain weak, -et | wrong ending: gearbeiten | ending dropped: gearbeit |
| plain weak, -t | wrong ending: gelernen | no ge-: lernt |

When a row cannot supply two distinct wrong forms, fall through the
generators in this fixed global order and take the first that is new and not
the right form: weak form · misplaced ge- · wrong ending · wrong vowel ·
ending dropped · no ge- (bare infinitive as participle). backen, whose
Präteritum is the modern `backte`, is the case that needs it: its vowel never
changes, so it gets `gebackt` and then `backen`.

A distractor may coincide with another verb's real participle (gelegen for
legen): that is exactly the confusion worth training.

## Tooling

- `check-data.mjs`: error if a participle is neither the weak form nor ends in
  -en/-n nor belongs to a base verb in the short explicit list of mixed verbs
  (catches `gelernet`); error if a non-weak verb lacks `praet` and
  `praeteritum`; warning if a weak verb carries `praet` it does not need.
- Snapshot line per verb grows three fields: Perfekt (`ist aufgestanden ·
  stark · e–a–a`), Präteritum (six forms), Distraktoren (the two forms, in
  priority order). `--update` after reading the diff, as today.

## Phasing

Each phase ships on its own and bumps `CACHE`.

1. Derivation module, `praet` for the 72 non-weak verbs, three new verbs,
   checker and snapshot. No visible change yet.
2. Card front (Typ, Partizip II rows) and card back (Perfekt block,
   Präteritum on every verb, split tags).
3. Rules page, home link, study-bar icon.
4. Tip trim: the 57 tips that state the Perfekt rule in words now duplicate
   the block. Remove only the duplicated clause and keep what the block cannot
   say. Example, verkaufen: "Inseparable prefix ver-: no ge- in the Perfekt
   (hat verkauft); stress falls on -kau-." becomes "Stress falls on -kau-,
   not on ver-; an unstressed prefix is why there is no ge-."

## Decisions

Decided by the owner in conversation:

- All three parts trip them up (ge-, ending, vowel), so both the front quiz and
  the back explanation carry weight; neither is secondary.
- Präteritum is added and shown at full strength, not dimmed.
- Add erzählen, einsteigen, aussteigen; skip the other five spreadsheet verbs.

My calls, open to veto:

- Front rows are `Typ` + `Partizip II` (pick the form), replacing
  `Konjugation` + `Präfix`. Alternative considered: keep `Präfix` and add a
  `ge-` row (vorne / Mitte / keins); rejected because it is a fifth tap and
  the misplaced-ge- distractor tests the same thing while the learner produces
  the form.
- Six Präteritum forms on every verb, weak ones included. Alternative:
  Stammformen only for weak verbs.
- `praet` stored only where not derivable, same policy as `stemChange`.
- Rules page: German headings, English explanations, nothing tappable.
- Reason line and tags in German, since they sit next to German labels.

Settled after the builder check (a reviewer read the document as an
implementer would):

- The rules content opens as an overlay from a card and as a route from home,
  so consulting it never resets the study session.
- "No ge-" is decided by the `insep` flag together with the inseparable-prefix
  list; frühstücken loses its `insep` flag.
- Vowel families never mix strong and mixed verbs.
- Separable -ieren verbs get their own distractor row; a global fallback
  order covers verbs whose rules collapse (backen, Präteritum backte).
- The `irr` flag is removed in phase 2.

## Left to the builder

- Exact visual treatment of the segmented participle and the Perfekt block.
- Whether the derivation lives in `conjugate.js` or a new module.
- The explicit mixed-verb list and how it is shared between checker and app.
- Wording of the rules page within the constraints above.
- The 72 `praet` values and the three new entries (checked against Duden).

## Follow-up, 2026-10-24

Decided after the whole-branch review, with the owner:

- **Back gesture closes the sheet.** Opening the rules sheet from a card pushes
  a history entry of its own; the platform back gesture (popstate) closes the
  sheet and leaves the card untouched. Closing by ✕, backdrop or Escape pops
  that entry again so history stays consistent.
- **Drei Typen examples skip verbs with an irregular present** (`forms` or
  `stemChange`), so the table shows machen, sagen, lernen rather than haben,
  wollen, sollen next to the "Ganz unregelmäßig" line.
- **The rules page derives its prefix list from `INSEP_PREFIXES`**, so it names
  unter-, über- and wieder- like the cards do.
- **Copy:** "haben by default; a verb with a direct object always takes haben",
  and passieren is covered by "for something that happens".
- **-eln and -ern verbs** get the wrong form a learner would actually write,
  gewechseln rather than gewechselen: the wrong -en ending is spelled -n after
  -el and -er.
- Deferred on purpose: ß in vowel-swapped wrong forms, dialog focus management.
- The source spreadsheet lives beside this document.
