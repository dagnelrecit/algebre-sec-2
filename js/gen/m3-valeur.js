/**
 * Module 3 — Valeur numérique d'une expression algébrique
 * Thèmes : une (1 variable), deux (2 variables), defi (3 variables, cubes, quotient, pièges −x²)
 */
import { Frac } from '../math/frac.js';
import { parse, toLatex, evaluate, sum } from '../math/expr.js';
import { valueSteps } from '../math/steps.js';
import { randInt, randNZ, choice, chance, makeQ, twoLetters, lettersIn } from './util.js';

const R = randNZ;
const val = () => (chance(0.6) ? -randInt(1, 6) : randInt(1, 7));

function q(src, env) {
  const ast = parse(src);
  const value = evaluate(ast, env);
  const { steps } = valueSteps(ast, env);
  const cond = Object.entries(env).map(([k, x]) => `\\(${k} = ${Frac.of(x).toLatex()}\\)`).join(' et ');
  return makeQ({
    prompt: `Calcule la valeur numérique de l'expression si ${cond}.`,
    tex: toLatex(ast), answerType: 'number', answer: value, answerTex: value.toLatex(),
    keys: [], steps, source: src, env,
  });
}

const UNE = [
  (v) => sum([[R(-9, 9), v], [R(-20, 20), '']]),
  (v) => sum([[R(-9, 9), `${v}^2`]]),
  (v) => sum([[R(-6, 6), `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]),
  (v) => `-${v}^2+${randInt(1, 9)}`,
  (v) => sum([[R(-5, 5), `${v}^3`], [R(-9, 9), '']]),
];
const DEUX = [
  (a, b) => sum([[R(-9, 9), `${a}^2`], [R(-9, 9), b], [R(-9, 9), '']]),
  (a, b) => sum([[R(-9, 9), a], [R(-9, 9), b], [R(-9, 9), '']]),
  (a, b) => sum([[R(-9, 9), `${a}${b}`], [R(-9, 9), a]]),
  (a, b) => sum([[1, `${a}^2`], [1, `${b}^2`]]),
  (a, b) => sum([[1, `${b}^3`], [R(-9, 9), `${a}${b}`], [R(-9, 9), '']]),
];

function genUne(d) {
  const v = choice(['x', 'a', 'n', 'y']);
  const t = d === 1 ? choice(UNE.slice(0, 3)) : choice(UNE);
  return q(t(v), { [v]: val() });
}
function genDeux() {
  const [a, b] = twoLetters();
  return q(choice(DEUX)(a, b), { [a]: val(), [b]: val() });
}
function genDefi() {
  const kind = randInt(1, 4);
  if (kind === 1) { // trois variables
    const env = { x: val(), y: val(), z: val() };
    return q(sum([[R(-9, 9), 'x'], [R(-9, 9), 'yz'], [R(-5, 5), 'x^2'], [R(-9, 9), '']]), env);
  }
  if (kind === 2) { // quotient à valeur entière (inspiré de la révision)
    for (let i = 0; i < 50; i++) {
      const env = { x: val(), y: val(), z: R(-4, 4) };
      const src = `(${sum([[R(2, 6), 'x']])}-(${sum([[R(2, 5), 'y'], [1, 'z'], [1, 'x^2']])}))/(${R(2, 4)}z)`;
      const value = evaluate(parse(src), env);
      if (value.isInt()) return q(src, env);
    }
  }
  if (kind === 3) { // piège −x² vs (−x)²
    const v = choice(['x', 'a', 'n']);
    return q(sum([[-1, `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]), { [v]: -randInt(2, 6) });
  }
  const v = choice(['x', 'b', 'm']);
  return q(sum([[R(-4, 4), `${v}^3`], [R(-6, 6), `${v}^2`], [R(-9, 9), v], [R(-9, 9), '']]), { [v]: -randInt(1, 4) });
}

export const THEMES = {
  une: { label: 'Expression à une variable', gen: genUne },
  deux: { label: 'Expression à deux variables', gen: genDeux },
  defi: { label: 'Défi : 3 variables, quotients et pièges', gen: genDefi },
};
