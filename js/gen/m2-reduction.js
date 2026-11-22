/**
 * Module 2 — Réduction d'expressions algébriques
 * Thèmes : addsous (termes semblables, signe − devant la parenthèse), multdiv (× et ÷, distributivité), chaines
 * Chaque gabarit renvoie une expression en syntaxe texte; le moteur calcule la réponse et la démarche.
 * Symboles : « / » s'affiche en fraction, « ÷ » s'affiche avec le signe ÷, « * » s'affiche ×.
 */
import { parse, toLatex, Poly, sum, par, mono } from '../math/expr.js';
import { reductionSteps } from '../math/steps.js';
import { randInt, randNZ, choice, chance, makeQ, letter, twoLetters, LETTRES_SIMPLES, lettersIn } from './util.js';

const R = (a, b) => randNZ(a, b);

/* ---------- Addition / soustraction ---------- */
const ADDSOUS = {
  1: [
    (v) => `${par(sum([[randInt(1, 9), v], [randInt(1, 9), '']]))}+${par(sum([[randInt(1, 9), v], [randInt(1, 9), '']]))}`,
    (v) => sum([[randInt(2, 9), v], [randInt(1, 9), ''], [randInt(1, 9), v], [randInt(1, 9), '']]),
    (v) => sum([[R(-9, 9), v], [R(-9, 9), ''], [R(-9, 9), v]]),
    (v) => sum([[randInt(2, 12), v], [-randInt(1, 9), v], [R(-9, 9), '']]),
  ],
  2: [
    (v) => `${par(sum([[R(-9, 12), v], [R(-9, 9), '']]))}-${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
    (v) => `${randInt(5, 20)}-${par(sum([[R(2, 9), v], [R(-9, 9), '']]))}`,
    (v) => `${sum([[R(2, 12), v]])}-${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
    (v) => { const [a, b] = twoLetters(); return sum([[R(-9, 9), a], [R(-9, 9), b], [R(-9, 9), ''], [R(-9, 9), a], [R(-9, 9), b]]); },
    (v) => `${sum([[randInt(2, 9), v]])}-${par(sum([[-randInt(2, 9), v]]))}`,
    (v) => `${sum([[randInt(2, 9), v]])}-${par(sum([[randInt(1, 5), v], [-randInt(2, 6), v]]))}`,
  ],
  3: [
    (v) => sum([[R(-9, 15), v], [R(-6, 6), `${v}^2`], [R(-9, 15), v], [R(-20, 40), ''], [R(-6, 6), `${v}^2`], [R(-20, 40), '']]),
    (v) => `${par(sum([[R(-9, 12), v], [R(-9, 9), '']]))}-${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}-${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
    (v) => `${par(sum([[R(-9, 9), `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]))}-${par(sum([[R(-9, 9), `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]))}`,
    () => { const [a, b] = twoLetters(); const d = () => { let x; do { x = R(-90, 90); } while (x % 10 === 0); return (x / 10).toString(); }; return `${d()}${a}+${d()}${b}+${d()}${a}+${d()}${b}`.replace(/\+-/g, '-'); },
    () => { const [a, b] = twoLetters(); return `${R(2, 9)}${a}^2${b}-${R(2, 9)}${b}${a}^2+${R(2, 9)}${a}${b}^2-${R(2, 9)}${b}^2${a}`; },
  ],
};

/* ---------- Multiplication / division ---------- */
const MULTDIV = {
  1: [
    (v) => `${randInt(2, 9)}${par(sum([[randInt(1, 9), v], [randInt(1, 9), '']]))}`,
    (v) => { const k = randInt(2, 6); return `${par(sum([[k * randInt(1, 9), v], [k * randInt(1, 9), '']]))}÷${k}`; },
    (v) => `${randInt(2, 9)}*${randInt(2, 9)}${v}`,
    (v) => { const k = randInt(2, 9); return `${k * randInt(2, 9)}${v}÷${k}`; },
  ],
  2: [
    () => { const [a, b] = twoLetters(); return `${-randInt(2, 9)}${par(sum([[R(-9, 9), a], [R(-9, 9), b]]))}`; },
    (v) => { const k = randInt(2, 6); return `${par(sum([[k * R(-9, 9), v], [k * R(-9, 9), '']]))}/${k}`; },
    (v) => { const b = R(-9, 9); return `${mono(R(-9, 9), v)}*${b < 0 ? par(mono(b, v)) : mono(b, v)}`; },
    () => { const [a, b] = twoLetters(); const k = R(-9, 9); return `${mono(R(-9, 9), a)}*${k < 0 ? par(mono(k, b)) : mono(k, b)}`; },
    (v) => `${R(-9, 9)}${par(sum([[R(-9, 9), `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]))}`,
  ],
  3: [
    (v) => `${-randInt(2, 6)}${par(sum([[R(-9, 9), `${v}^3`], [R(-9, 9), `${v}^2`], [R(-9, 9), v]]))}`,
    () => { const [a, b] = twoLetters(); const k = randInt(3, 9); return `${par(sum([[k * R(-15, 15), a], [k * R(-15, 15), b]]))}/${k}`; },
    (v) => { const k = randInt(2, 6); return `${k * R(-9, 9)}${v}^2/${par(`${k}${v}`)}`; },
    () => { const [a, b] = twoLetters(); const k = -randInt(2, 6); return `${par(sum([[k * R(-9, 9), `${a}${b}^2`], [k * R(-9, 9), `${a}${b}`], [k * R(-9, 9), '']]))}/${par(k)}`; },
    (v) => { const w = v === 'y' ? 'x' : 'y'; return `${R(2, 5)}${v}${par(sum([[R(-9, 9), `${v}${w}`], [R(-9, 9), w], [R(-9, 9), '']]))}`; },
  ],
};

/* ---------- Chaînes d'opérations ---------- */
const CHAINES = {
  1: [
    (v) => `${randInt(2, 6)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}${sum([[0, ''], [R(-9, 9), v], [R(-20, 20), '']]).replace(/^(?!-)/, '+')}`,
    (v) => `${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}+${randInt(2, 5)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
  ],
  2: [
    (v) => `${randInt(2, 6)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}-${randInt(2, 6)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
    (v) => { const k = randInt(2, 5); const t = sum([[R(-9, 9), v]]); return `${par(sum([[k * R(-9, 9), v], [k * R(-9, 9), '']]))}÷${k}${t.startsWith('-') ? t : '+' + t}`; },
    (v) => `${randInt(10, 30)}-${par(sum([[R(2, 9), v], [R(-9, 9), '']]))}+${randInt(2, 5)}${v}`,
    (v) => `${randInt(2, 4)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}+${randInt(2, 4)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
  ],
  3: [
    (v) => `${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}+${randInt(2, 4)}${par(sum([[R(-9, 9), ''], [R(-9, 9), v]]))}+${randInt(2, 4)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}`,
    (v) => { const k1 = randInt(2, 4), k2 = randInt(2, 4); return `${par(sum([[k1 * R(-9, 9), v], [k1 * R(-5, 5), `${v}^2`]]))}÷${k1}+${par(sum([[k2 * R(-9, 9), v], [k2 * R(-5, 5), `${v}^2`]]))}÷${k2}`; },
    () => { const [a, b] = twoLetters(); return `${randInt(2, 5)}${par(sum([[R(-9, 9), `${a}${b}`], [1, `${a}^2`]]))}-${randInt(2, 5)}${par(sum([[R(-9, 9), `${a}^2`], [R(-9, 9), `${a}${b}`]]))}`; },
    (v) => { const k = randInt(2, 4); return `${-randInt(2, 6)}${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}-${par(sum([[R(-9, 9), v], [R(-9, 9), '']]))}+${par(sum([[k * R(-9, 9), v], [k * R(-9, 9), '']]))}/${k}`; },
  ],
};

function build(templates, d, themeLabel) {
  const v = letter(LETTRES_SIMPLES);
  let src, poly, guard = 0;
  do {
    src = choice(templates[d] || templates[1])(v);
    poly = Poly.parse(src);
  } while ((poly.isZero() || poly.size() < 1) && guard++ < 20);
  const ast = parse(src);
  const { steps } = reductionSteps(ast);
  return makeQ({
    prompt: 'Réduis l\'expression algébrique.',
    tex: toLatex(ast), answerType: 'expr', answer: poly, answerTex: poly.toLatex(),
    keys: lettersIn(src), steps, source: src,
  });
}

export const THEMES = {
  addsous: { label: 'Addition et soustraction de termes semblables', gen: (d) => build(ADDSOUS, d) },
  multdiv: { label: 'Multiplication, division et distributivité', gen: (d) => build(MULTDIV, d) },
  chaines: { label: 'Chaînes d\'opérations', gen: (d) => build(CHAINES, d) },
};
