/* Present-tense conjugation for the A1 verb list. */

export const PERS = ["ich", "du", "er/sie", "wir", "ihr", "sie/Sie"];

const PREFIX = ["auf", "aus", "ein", "mit", "ab", "an", "zu", "vor", "fern", "statt", "um",
  "zurück", "weg", "los", "her", "hin", "nach", "bei", "fest", "frei", "weiter"]
  .sort((a, b) => b.length - a.length); /* longest first, so "zurück" beats "zu" */

function splitSeparable(inf) {
  for (const p of PREFIX) {
    if (inf.startsWith(p) && inf.length > p.length + 3) return [p, inf.slice(p.length)];
  }
  return ["", inf];
}

/* Returns the six present-tense forms, in PERS order.
   verb.forms       — full irregular set, used verbatim (sein, haben, ...)
   verb.stemChange  — [du, er/sie] overrides on an otherwise regular verb
   Separable prefixes are split off, conjugated, then appended: "steht ... auf". */
export function present(verb) {
  if (verb.forms) return verb.forms.slice();

  const separable = verb.flags.includes("sep");
  const [prefix, base] = separable ? splitSeparable(verb.infinitive) : ["", verb.infinitive];

  const isEln = /eln$/.test(base);
  const stem = /(eln|ern)$/.test(base) ? base.slice(0, -1)
    : base.endsWith("en") ? base.slice(0, -2)
    : base.replace(/n$/, "");

  /* arbeiten -> du arbeitest: a spoken -e- appears after -d/-t and some clusters */
  const needsE = /[dt]$/.test(stem) || /[bcdfgkpstwz][mn]$/.test(stem);
  /* heißen -> du heißt: the -s- of -st merges into an existing sibilant */
  const sibilant = /[sßxz]$/.test(stem);

  const forms = [
    isEln ? base.slice(0, -3) + "le" : stem + "e",
    needsE ? stem + "est" : (sibilant ? stem + "t" : stem + "st"),
    needsE ? stem + "et" : stem + "t",
    base,
    needsE ? stem + "et" : stem + "t",
    base,
  ];

  if (verb.stemChange) {
    const [du, er] = verb.stemChange;
    if (du) forms[1] = du;
    if (er) forms[2] = er;
  }

  return prefix ? forms.map((f) => f + " " + prefix) : forms;
}
