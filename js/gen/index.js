/**
 * Registre des modules et thèmes. Point d'entrée unique pour générer une question.
 */
import { THEMES as M1 } from './m1-anatomie.js';
import { THEMES as M2 } from './m2-reduction.js';
import { THEMES as M3 } from './m3-valeur.js';
import { THEMES as M4 } from './m4-modelisation.js';
import { THEMES as M5 } from './m5-equations.js';
import { choice } from './util.js';

export const MODULES = [
  { id: 'm1', num: 1, titre: 'Anatomie d\'une expression', resume: 'Termes, coefficients, degré, termes semblables', themes: M1, couleur: 'var(--m1)' },
  { id: 'm2', num: 2, titre: 'Réduction d\'expressions', resume: 'Termes semblables, signes, distributivité', themes: M2, couleur: 'var(--m2)' },
  { id: 'm3', num: 3, titre: 'Valeur numérique', resume: 'Substituer et calculer, nombres négatifs', themes: M3, couleur: 'var(--m3)' },
  { id: 'm4', num: 4, titre: 'Traduction et modélisation', resume: 'Énoncés, problèmes, périmètre et aire', themes: M4, couleur: 'var(--m4)' },
  { id: 'm5', num: 5, titre: 'Résolution d\'équations', resume: 'Niveaux 1 à 5 et géométrie', themes: M5, couleur: 'var(--m5)', progressive: false },
];
export const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));

export function themeLabel(moduleId, themeId) {
  return MODULE_BY_ID[moduleId]?.themes[themeId]?.label || themeId;
}

/**
 * Génère une question.
 * @param {string} moduleId
 * @param {string} themeId
 * @param {number} difficulty 1 à 3 (ignoré pour le module 5 dont les thèmes SONT des niveaux)
 */
export function generate(moduleId, themeId, difficulty = 2) {
  const mod = MODULE_BY_ID[moduleId];
  const theme = mod.themes[themeId];
  for (let i = 0; i < 10; i++) {
    try {
      const q = theme.gen(difficulty);
      return { ...q, module: moduleId, theme: themeId, themeLabel: theme.label, difficulty, uid: Math.random().toString(36).slice(2) };
    } catch (e) {
      console.warn('Générateur : nouvel essai', moduleId, themeId, e);
    }
  }
  throw new Error(`Impossible de générer une question (${moduleId}/${themeId})`);
}

/**
 * Défi mixte : choisit un module/thème au hasard, en favorisant les thèmes les moins réussis.
 * stats : { 'm2/addsous': {n, ok} }
 */
export function pickMixed(stats = {}, allowed = null) {
  const all = [];
  for (const m of MODULES) for (const t of Object.keys(m.themes)) {
    if (allowed && !allowed.includes(m.id)) continue;
    const s = stats[`${m.id}/${t}`];
    const rate = s && s.n >= 3 ? s.ok / s.n : 0.6;
    all.push({ m: m.id, t, w: 0.4 + (1 - rate) * 1.6 });
  }
  const total = all.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of all) { r -= x.w; if (r <= 0) return x; }
  return choice(all);
}
