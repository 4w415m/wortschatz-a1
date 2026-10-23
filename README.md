# Wortschatz A1

An offline-capable German A1 vocabulary trainer with spaced repetition.
No build step, no dependencies — plain ES modules served as static files.

**Live:** https://4w415m.github.io/wortschatz-a1/

## Layout

```
index.html            shell only
css/app.css
js/
  app.js              boot + error handling
  router.js           view registry (keeps views from importing each other)
  dom.js              h() / esc() / toast()
  categories.js       the six word groups
  data.js             loads data/*.json, builds the word index
  state.js            persistence, day rollover, v1→v2 migration
  srs.js              scheduling
  conjugate.js        present tense, imperative and Präteritum
  perfekt.js          participle analysis: type, ge- rule, segments, vowel family, distractors
  sync.js             sync codes, merge, transport
  views/              home.js · study.js · settings.js · rules.js
data/*.json           the word lists
worker/               Cloudflare Worker for cross-device sync
tools/check-data.mjs  validates data/ and pins what the verb modules derive
tools/verbs.snapshot.txt  that output, one line per verb
tests/*.test.mjs      unit tests for conjugate.js, perfekt.js and the rules page (node --test)
tools/extract-data.mjs  one-off converter from the original single-file version
```

## Running locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. ES modules and `fetch` need a real origin, so
opening `index.html` from the filesystem will not work.

After changing any cached file, bump `CACHE` in `sw.js` — otherwise returning
visitors keep the old version.

## The word lists

`data/*.json` is the source of truth. Each entry is keyed by its headword, and
card ids are `"<category>:<headword>"` — so adding, removing, or reordering
words leaves existing progress pointing at the right entries. Headwords must
stay unique within a category.

Every entry also carries an `example` (`{ de, en }`, one A1-level sentence with
its translation) and a `tip` (a short English usage note, or `null`). Both are
shown on the answer side of the card. Tips should say something the card does
not already show: a gender rule, the case a verb takes, a false friend, why the
Perfekt uses *sein*.

### Verbs

A verb entry looks like this; every field after `en` is optional.

```json
{
  "infinitive": "anmelden",
  "en": "to register, to sign up",
  "stemChange": ["du form", "er form"],   only where the present is irregular
  "forms": ["ich", "du", "er", "wir", "ihr", "sie"],   full set: sein, modals, wissen
  "aux": "hat", "partizip": "angemeldet",  the Perfekt; absent only on möchten
  "praet": "stand",                       er/sie/es Präteritum of the base verb, only
                                          where the weak rule (stem + -te) does not
                                          give it: strong and mixed verbs, and haben
  "praeteritum": [six forms],             full six-form override; only möchten (wollte)
  "imperative": "Nimm",                   the du form of the base verb, only where
                                          it cannot be derived (e → i keeps the
                                          change, a → ä drops it); sein has all three
  "reflexive": "akk",                     shown as "sich anmelden", conjugated with
                                          mich/dich/sich, or "dat" for mir/dir/sich
  "takes": "für + Akkusativ",             printed after the headword as written;
                                          also decides the Kasus row on the front
  "third": true,                          used only in the third person: the table
                                          shows es / sie, no imperative
  "flags": ["sep"],                       core · modal · sep · insep
  "example": { "de": "…", "en": "…" },
  "examplePerfekt": { "de": "…", "en": "…" },   the same idea in the past; on
                                          möchten it uses wollte instead
  "tip": "…"
}
```

`insep` marks a prefix that does not separate (bezahlen, verstehen). Together
with the inseparable-prefix list in `perfekt.js` it decides that the participle
takes no ge-, and it prints the "nicht trennbar" tag. Separable verbs are split
by the prefix list in `conjugate.js`; `check-data.mjs` fails if a `sep` verb has
a prefix that list does not know, or an `insep` verb a prefix the other list
does not know.

The rules themselves have a page, `#/regeln`, rendered from the live list by
`views/rules.js`: the three steps, haben or sein, the three types with their
counts, and the vowel families with this list's verbs under them. It is linked
from the Verben group on the home screen and opens as a sheet over any verb
card (the `?` in the top bar), so looking something up never ends the session.

Everything else about the Perfekt is derived, not stored: `perfekt.js` works
out whether a verb is schwach, stark or gemischt (the participle either is the
weak form, or ends in -t, or does not), where its ge- goes, which ending it
takes, its Infinitiv–Präteritum–Partizip vowel family, and the two wrong forms
the card offers next to the right one.

The front of a verb card asks for the Perfekt auxiliary, the case the verb
takes (Akkusativ, Dativ, or both for geben-type verbs; no row where `takes`
is Nominativ or absent), the verb type (schwach, stark or gemischt), and the
participle itself, picked from the right form and two wrong ones built from
typical mistakes (a misplaced ge-, the wrong ending, the wrong vowel). The
last answer flips the card. Each row is derived from the fields above, so a
data fix changes the quiz too. Whether the present tense is irregular is not
stored either: a verb with `stemChange` or `forms` gets the "Präsens
unregelmäßig" tag on the back.

The original version stored progress by array position, which meant any edit to
a list silently reassigned someone's progress to different words.
`data/legacy-ids.json` maps those old ids onto the new ones, and `state.js`
applies it once on first load.

## Cross-device sync

Optional and off by default. Deploy `worker/` (see `worker/README.md`), set
`SYNC_URL` in `js/config.js`, and a sync section appears in Settings: generate a
code on one device, enter it on another.

Merging happens on the client and is per-word: each card keeps whichever copy
was touched last, so two devices used offline both keep their work. The merge is
commutative and idempotent — syncing repeatedly, or in either direction, gives
the same result.

The sync code is a bearer credential. Anyone holding it can read and overwrite
that progress, there is no recovery if it is lost, and it is deliberately stored
outside the backup blob so exporting a backup does not hand over write access.

## Provenance

Everything below `data/` started as a mechanical conversion of the original
single-file app by `tools/extract-data.mjs`. The conjugation and scheduling
rewrites were checked against the original implementation: identical output for
all 129 verbs, and identical card state across 7200 graded transitions.

The word lists have since diverged from that conversion, so `extract-data.mjs`
no longer reproduces them. All 754 entries were reviewed against Duden and the
Goethe A1 list, which corrected 27 fields (16 plurals wrongly marked as absent,
7 notes that named only one of the cases a form covers, and 4 glosses), and
every entry gained an example sentence and a tip. Headwords were deliberately
left untouched: card ids are built from them, so changing one would orphan
saved progress.

The verb list then grew from 129 to 169 entries and changed shape: `perfect`
became `aux` + `partizip`, and the fields listed above were added. The 40 new
verbs are ones the existing tips already named (abholen, zuhören, umsteigen,
bedeuten …) plus common A1 syllabus verbs that were missing (möchten,
kennenlernen, regnen, lassen, mitnehmen, tun, wehtun …). Glosses that were
identical between two verbs (öffnen / aufmachen, beginnen / anfangen) were
told apart, since production mode shows only the English. The rewritten
conjugator gives the same present tense as before for all 129 original verbs,
except setzen, which now carries its reflexive pronouns.

Three more A1 verbs followed, erzählen, einsteigen and aussteigen, all on the
Goethe A1 list, for 172 in all; and every strong and mixed verb gained its
Präteritum (`praet`), so the three principal parts can be shown. The list was
then completed against the official Goethe A1 word list (Start Deutsch 1
Wortliste): the 27 verbs it has that the app lacked, plus sterben, which the
list carries only as gestorben, bring it to 200.

## Checking the data

```sh
node tools/check-data.mjs
```

Reports schema problems (a `sep` verb with an unknown prefix, an `insep` verb
without one, a missing imperative on an e → i verb, two verbs with the same
gloss, a Perfekt sentence that does not contain the verb's auxiliary and
participle, a participle that is neither the weak form nor strong nor one of
the known mixed verbs, a strong or mixed verb without `praet`, a file under
`js/` missing from the service worker's cache list) and diffs every verb's
present tense, imperative, Perfekt with its type and vowel family, Präteritum
and quiz distractors against `tools/verbs.snapshot.txt`. After a deliberate
change, `--update` rewrites the snapshot; the diff it prints first is the
review.

```sh
node --test tests/*.test.mjs
```

Unit tests for the derivations in `conjugate.js` and `perfekt.js`.
