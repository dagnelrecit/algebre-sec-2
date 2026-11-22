/**
 * figures.js — Schémas SVG générés dynamiquement (périmètre, aire, valeur de x).
 * Les étiquettes reçoivent du texte déjà mis en forme (voir util.pretty).
 * Les couleurs utilisent des variables CSS pour suivre le thème de l'application.
 */
const W = 360, H = 240;

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function label(x, y, text, { anchor = 'middle', cls = 'fig-label', rotate = 0 } = {}) {
  const r = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" class="${cls}"${r}>${esc(text)}</text>`;
}
function wrap(inner, title = '', h = H) {
  return `<svg class="figure" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
function poly(points, cls = 'fig-shape') {
  return `<polygon points="${points.map(p => p.join(',')).join(' ')}" class="${cls}"/>`;
}
/** Petit trait de « côtés isométriques » au milieu d'un segment */
function tick(p, q, n = 1) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len * 7, ny = dx / len * 7;
  const ux = dx / len * 4, uy = dy / len * 4;
  let s = '';
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2);
    s += `<line x1="${mx + ux * o - nx}" y1="${my + uy * o - ny}" x2="${mx + ux * o + nx}" y2="${my + uy * o + ny}" class="fig-tick"/>`;
  }
  return s;
}
/** Étiquette placée à l'extérieur d'un côté (le polygone doit être donné dans le sens horaire) */
function sideLabel(p, q, text, offset = 16) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  const nx = dy / len, ny = -dx / len; // normale extérieure (sens horaire à l'écran)
  const ax = Math.abs(nx) > 0.6 ? (nx > 0 ? 'start' : 'end') : 'middle';
  return label(mx + nx * offset, my + ny * offset, text, { anchor: ax });
}
function rightAngle(c, ux, uy, vx, vy, s = 11) {
  return `<polyline points="${c[0] + ux * s},${c[1] + uy * s} ${c[0] + ux * s + vx * s},${c[1] + uy * s + vy * s} ${c[0] + vx * s},${c[1] + vy * s}" class="fig-thin"/>`;
}

/* ------------------------------------------------------------------ */
export function rectangle(Ltxt, ltxt, { square = false } = {}) {
  const w = square ? 140 : 200, h = square ? 140 : 110;
  const x0 = (W - w) / 2, y0 = (H - h) / 2;
  const A = [x0, y0], B = [x0 + w, y0], C = [x0 + w, y0 + h], D = [x0, y0 + h];
  let s = poly([A, B, C, D]);
  s += rightAngle(D, 1, 0, 0, -1) + rightAngle(B, -1, 0, 0, 1);
  s += sideLabel(D, A, ltxt) + sideLabel(A, B, Ltxt);
  if (square) s += tick(A, B) + tick(B, C) + tick(C, D) + tick(D, A);
  return wrap(s, square ? 'Carré' : 'Rectangle');
}

export function triangle(a, b, c) {
  const A = [70, 195], B = [180, 45], C = [300, 195];
  let s = poly([A, B, C]);
  s += sideLabel(A, B, a) + sideLabel(B, C, b) + sideLabel(C, A, c);
  return wrap(s, 'Triangle');
}

export function isoTriangle(equal, base) {
  const A = [90, 200], B = [180, 40], C = [270, 200];
  let s = poly([A, B, C]) + tick(A, B) + tick(B, C);
  s += sideLabel(A, B, equal) + sideLabel(B, C, equal) + sideLabel(C, A, base);
  return wrap(s, 'Triangle isocèle');
}

export function triangleArea(base, height) {
  const A = [60, 200], B = [220, 40], C = [300, 200];
  const Hf = [220, 200];
  let s = poly([A, B, C]);
  s += `<line x1="${B[0]}" y1="${B[1]}" x2="${Hf[0]}" y2="${Hf[1]}" class="fig-dash"/>`;
  s += rightAngle(Hf, 0, -1, -1, 0);
  s += sideLabel(C, A, base) + label(Hf[0] - 10, (B[1] + Hf[1]) / 2, height, { anchor: 'end' });
  return wrap(s, 'Triangle (base et hauteur)');
}

export function trapezoidArea(B, b, h) {
  const P = [[110, 55], [250, 55], [310, 195], [50, 195]];
  let s = poly(P);
  s += `<line x1="110" y1="55" x2="110" y2="195" class="fig-dash"/>` + rightAngle([110, 195], 0, -1, 1, 0);
  s += sideLabel(P[0], P[1], b) + sideLabel(P[2], P[3], B) + label(118, 125, h, { anchor: 'start' });
  return wrap(s, 'Trapèze');
}

export function trapezoidPerim(top, right, bottom, left) {
  const P = [[110, 55], [250, 55], [310, 195], [50, 195]];
  let s = poly(P);
  s += sideLabel(P[0], P[1], top) + sideLabel(P[1], P[2], right) + sideLabel(P[2], P[3], bottom) + sideLabel(P[3], P[0], left);
  return wrap(s, 'Trapèze');
}

export function parallelogram(base, side) {
  const P = [[110, 60], [300, 60], [250, 185], [60, 185]];
  let s = poly(P);
  s += tick(P[0], P[1], 1) + tick(P[2], P[3], 1) + tick(P[1], P[2], 2) + tick(P[3], P[0], 2);
  s += sideLabel(P[2], P[3], base) + sideLabel(P[3], P[0], side);
  return wrap(s, 'Parallélogramme');
}

const POLY_NAMES = { 5: 'Pentagone régulier', 6: 'Hexagone régulier', 8: 'Octogone régulier' };
export function regularPolygon(n, side) {
  const cx = W / 2, cy = H / 2 + 6, r = 88;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  let s = poly(pts);
  for (let i = 0; i < n; i++) s += tick(pts[i], pts[(i + 1) % n]);
  s += sideLabel(pts[0], pts[1], side, 18);
  s += label(cx, cy, POLY_NAMES[n] || `Polygone régulier (${n} côtés)`, { cls: 'fig-caption' });
  return wrap(s, POLY_NAMES[n] || 'Polygone régulier');
}

/** Figure en L : labels = [haut, droite-haut, marche, droite-bas, bas, gauche] (sens horaire) */
export function lShape(labels) {
  const P = [[70, 40], [170, 40], [170, 120], [290, 120], [290, 200], [70, 200]];
  let s = poly(P);
  for (let i = 0; i < 6; i++) s += sideLabel(P[i], P[(i + 1) % 6], labels[i]);
  [[P[1], -1, 0, 0, 1], [P[3], -1, 0, 0, 1], [P[4], -1, 0, 0, -1], [P[5], 1, 0, 0, -1], [P[0], 1, 0, 0, 1]].forEach(([c, ...u]) => { s += rightAngle(c, ...u); });
  return wrap(s, 'Figure composée');
}

/** Ajoute un encadré « P = … » au-dessus de la figure */
export function withCaption(svg, caption) {
  return svg.replace('</svg>', `${label(W - 12, 18, caption, { anchor: 'end', cls: 'fig-caption fig-strong' })}</svg>`);
}
