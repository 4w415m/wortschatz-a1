/* Present tense and imperative for the A1 verb list. */

export const PERS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

const REFLEXIVE = {
  akk: ["mich", "dich", "sich", "uns", "euch", "sich"],
  dat: ["mir", "dir", "sich", "uns", "euch", "sich"],
};

const PREFIX = ["auf", "aus", "ein", "mit", "ab", "an", "zu", "vor", "fern", "statt", "um",
  "zurück", "weg", "los", "her", "hin", "nach", "bei", "fest", "frei", "weiter", "kennen", "weh"]
  .sort((a, b) => b.length - a.length); /* longest first, so "zurück" beats "zu" */

/* [prefix, base] for a separable verb, ["", infinitive] otherwise. The base must
   be at least three letters so "wehtun" still splits. */
export function splitSeparable(verb) {
  const inf = verb.infinitive;
  if (verb.flags.includes("sep")) {
    for (const p of PREFIX) {
      if (inf.startsWith(p) && inf.length >= p.length + 3) return [p, inf.slice(p.length)];
    }
  }
  return ["", inf];
}

const isEln = (base) => /eln$/.test(base);
const stemOf = (base) =>
  /(eln|ern)$/.test(base) ? base.slice(0, -1)
    : base.endsWith("en") ? base.slice(0, -2)
    : base.replace(/n$/, "");

/* arbeiten -> du arbeitest: a spoken -e- appears after -d/-t and some clusters */
const needsE = (stem) => /[dt]$/.test(stem) || /[bcdfgkpstwz][mn]$/.test(stem);
/* heißen -> du heißt: the -s- of -st merges into an existing sibilant */
const sibilant = (stem) => /[sßxz]$/.test(stem);

/* The six forms a fully regular verb with this base would have. */
function regular(base) {
  const stem = stemOf(base);
  const e = needsE(stem), s = sibilant(stem);
  return [
    isEln(base) ? base.slice(0, -3) + "le" : stem + "e",
    e ? stem + "est" : (s ? stem + "t" : stem + "st"),
    e ? stem + "et" : stem + "t",
    base,
    e ? stem + "et" : stem + "t",
    base,
  ];
}

/* Forms of the base verb alone: no prefix, no reflexive pronoun.
   verb.forms       — full irregular set, used verbatim (sein, modals, ...)
   verb.stemChange  — [du, er/sie/es] overrides on an otherwise regular verb */
function bare(verb) {
  if (verb.forms) return verb.forms.slice();
  const [, base] = splitSeparable(verb);
  const forms = regular(base);
  if (verb.stemChange) {
    const [du, er] = verb.stemChange;
    if (du) forms[1] = du;
    if (er) forms[2] = er;
  }
  return forms;
}

/* "setze mich", "stehe auf", "melde mich an": pronoun first, then the prefix.
   i is the person, in PERS order. */
function dressOne(verb, form, i) {
  const [prefix] = splitSeparable(verb);
  const refl = verb.reflexive ? REFLEXIVE[verb.reflexive] : null;
  return form + (refl ? " " + refl[i] : "") + (prefix ? " " + prefix : "");
}
const dress = (verb, forms) => forms.map((f, i) => dressOne(verb, f, i));

/* Returns the six present-tense forms, in PERS order. */
export const present = (verb) => dress(verb, bare(verb));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* [du, ihr, Sie] imperatives, or null where the verb has none worth learning
   (modals, third-person-only verbs, wissen).
   verb.imperative — the du form of the base verb where it is not derivable
   (Nimm, Sieh, Hilf ...), or all three forms for sein. */
export function imperative(verb) {
  if (verb.third || verb.flags.includes("modal")) return null;
  if (verb.forms && !verb.imperative) return null;
  if (Array.isArray(verb.imperative)) return verb.imperative.slice();

  const [prefix, base] = splitSeparable(verb);
  const stem = stemOf(base);
  const refl = verb.reflexive ? REFLEXIVE[verb.reflexive] : null;
  const tail = prefix ? " " + prefix : "";

  /* The -e is compulsory after -d/-t and consonant clusters (Arbeite, Öffne),
     after -ern (Wandere) and after an unstressed -ig (Entschuldige), but not
     after a stem like zeig- or steig-, where "ig" is really ei + g. */
  const du = verb.imperative
    || (isEln(base) ? base.slice(0, -3) + "le"
      : /ern$/.test(base) || needsE(stem) || /[^aeiouäöü]ig$/.test(stem) ? stem + "e"
      : stem);

  return [
    cap(du) + (refl ? " " + refl[1] : "") + tail,
    cap(bare(verb)[4]) + (refl ? " " + refl[4] : "") + tail,
    cap(base) + " Sie" + (refl ? " sich" : "") + tail,
  ];
}
