/**
 * frac.js — Fractions exactes (rationnels) pour éviter les erreurs d'arrondi.
 * Tous les calculs du moteur algébrique passent par cette classe.
 */

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}
export function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

export class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('Division par zéro');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
    if (Object.is(this.n, -0)) this.n = 0;
  }

  /** Crée une fraction à partir d'un nombre, d'une Frac ou d'une chaîne décimale ("2.4"). */
  static of(x) {
    if (x instanceof Frac) return x;
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Frac(x, 1);
      return Frac.fromDecimalString(String(x));
    }
    return Frac.fromDecimalString(String(x));
  }

  static fromDecimalString(s) {
    s = s.replace(',', '.');
    const neg = s.startsWith('-');
    if (neg) s = s.slice(1);
    const [ip, fp = ''] = s.split('.');
    const d = 10 ** fp.length;
    const n = parseInt(ip || '0', 10) * d + parseInt(fp || '0', 10);
    return new Frac(neg ? -n : n, d);
  }

  add(o) { o = Frac.of(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.of(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.of(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { o = Frac.of(o); return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return new Frac(Math.abs(this.n), this.d); }
  pow(e) { let r = new Frac(1); for (let i = 0; i < e; i++) r = r.mul(this); return r; }
  isZero() { return this.n === 0; }
  isOne() { return this.n === 1 && this.d === 1; }
  isInt() { return this.d === 1; }
  isNeg() { return this.n < 0; }
  eq(o) { o = Frac.of(o); return this.n === o.n && this.d === o.d; }
  cmp(o) { o = Frac.of(o); return this.n * o.d - o.n * this.d; }
  toNumber() { return this.n / this.d; }

  /** Vrai si la fraction s'écrit avec un nombre fini de décimales (≤ maxDigits). */
  isDecimal(maxDigits = 3) {
    let d = this.d;
    let twos = 0, fives = 0;
    while (d % 2 === 0) { d /= 2; twos++; }
    while (d % 5 === 0) { d /= 5; fives++; }
    return d === 1 && Math.max(twos, fives) <= maxDigits;
  }

  /** Écriture décimale à la québécoise (virgule). */
  toDecimalString() {
    const x = this.toNumber();
    return String(Math.round(x * 1000) / 1000).replace('.', ',');
  }

  /** Texte simple : "3", "-7/2" ou "2,5". */
  toString() {
    if (this.isInt()) return String(this.n);
    if (this.isDecimal()) return this.toDecimalString();
    return `${this.n}/${this.d}`;
  }

  /**
   * LaTeX : entier, décimal (2{,}4) ou fraction (\frac{7}{3}).
   * style: 'auto' (décimal si possible), 'frac' (toujours fraction)
   */
  toLatex(style = 'auto') {
    if (this.isInt()) return String(this.n);
    if (style === 'auto' && this.isDecimal()) return this.toDecimalString().replace(',', '{,}');
    const s = this.n < 0 ? '-' : '';
    return `${s}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }
}

export const ZERO = new Frac(0);
export const ONE = new Frac(1);
