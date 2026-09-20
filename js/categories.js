/* The six word groups, in display order. `head` names the field that carries the
   headword — it is what card ids are built from, so it must stay stable. */
export const CATS = [
  { k: "nouns",        head: "singular",   nm: "Nomen",                              desc: "Artikel, Plural und Bedeutung" },
  { k: "verbs",        head: "infinitive", nm: "Verben",                             desc: "Konjugation, Perfekt, Imperativ · Kernverben zuerst" },
  { k: "adjectives",   head: "word",       nm: "Adjektive",                          desc: "meist als Gegensatzpaar" },
  { k: "prepositions", head: "word",       nm: "Präpositionen",                      desc: "mit Fall: Dativ, Akkusativ, Wechsel" },
  { k: "function",     head: "word",       nm: "Pronomen, Artikel, Konjunktionen",   desc: "kleine Wörter, größte Wirkung" },
  { k: "other",        head: "word",       nm: "Adverbien, Zahlen, Fragewörter",     desc: "heute, sehr, wie viele, bitte" },
];

export const CAT = Object.fromEntries(CATS.map((c) => [c.k, c]));

export const catName = (k) => (k === "all" ? "Alles gemischt" : CAT[k].nm);

/* The headword, for compact listings like the flagged-words table. */
export const headword = (w) => w[CAT[w.cat].head];

/* Compact one-line form, used in the flagged-words list. */
export const summary = (w) => (w.cat === "nouns" ? w.gender + " " + w.singular : headword(w));
