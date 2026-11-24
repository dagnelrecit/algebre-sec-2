/**
 * app.js — Espace élève : connexion, menu des modules, séries (drills), bilan, tableau de bord.
 */
import { CONFIG } from './config.js';
import { MODULES, MODULE_BY_ID, generate, pickMixed, themeLabel } from './gen/index.js';
import { checkAnswer } from './math/check.js';
import { tryParse, toLatex } from './math/expr.js';
import { renderMath, texSpan, inlineMath, escapeHtml, h, toast, fmtDuree, fmtDate, pct, latexToText } from './ui/render.js';
import { buildKeyboard, isTouch } from './ui/keyboard.js';
import * as store from './storage.js';
import * as B from './badges.js';
import { surveillerMisesAJour } from './maj.js';
import * as FB from './feedback.js';

const LOCAL = store.LOCAL;

const app = document.getElementById('app');
const state = { view: null, series: null, q: null, sessionAttempts: [], eleve: null, profil: null, etapeNip: null };

/* ================================================================== */
/* Statistiques à partir de l'historique                               */
/* ================================================================== */
export function computeStats(hist) {
  const byTheme = {}, byModule = {};
  let ok = 0, first = 0, time = 0, streak = 0, best = 0;
  for (const a of hist) {
    const key = `${a.module}/${a.theme}`;
    const success = a.resultat > 0;
    byTheme[key] = byTheme[key] || { n: 0, ok: 0, first: 0 };
    byModule[a.module] = byModule[a.module] || { n: 0, ok: 0, first: 0 };
    for (const s of [byTheme[key], byModule[a.module]]) { s.n++; if (success) s.ok++; if (a.resultat === 1) s.first++; }
    if (success) ok++;
    if (a.resultat === 1) first++;
    time += a.temps || 0;
    streak = success ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return { n: hist.length, ok, first, time, best, streak, byTheme, byModule };
}

const statsEleve = () => store.statsProfil(state.profil || store.profilVide());

/* ================================================================== */
/* Navigation                                                          */
/* ================================================================== */
function go(view, params = {}) {
  state.view = view;
  document.body.dataset.view = view;
  app.innerHTML = '';
  const views = { login: viewLogin, home: viewHome, setup: viewSetup, drill: viewDrill, summary: viewSummary, dashboard: viewDashboard };
  views[view](params);
  renderMath(app);
  updateHeader();
  window.scrollTo({ top: 0 });
  const focusable = app.querySelector('[autofocus]');
  if (focusable && !isTouch()) focusable.focus();
}

function updateHeader() {
  const e = state.eleve;
  const badge = document.getElementById('studentBadge');
  const nav = document.getElementById('studentNav');
  if (e && state.view !== 'login') {
    badge.hidden = false; nav.hidden = false;
    badge.textContent = store.codeAffiche(e.code);
    badge.title = 'Ton code';
    const p = state.profil || store.profilVide();
    const niv = B.progresNiveau(p.xp);
    document.getElementById('pastilleSerie').innerHTML = `🔥 <b>${B.serieJours(p.jours)}</b>`;
    document.getElementById('pastilleNiveau').innerHTML = `⭐ Niv. <b>${niv.n}</b>`;
    document.getElementById('pastilleNiveau').title = `${niv.xp} XP — prochain niveau à ${niv.haut} XP`;
  } else { badge.hidden = true; nav.hidden = true; }
  document.getElementById('enteteStats').hidden = badge.hidden;
}

/* ================================================================== */
/* Connexion                                                           */
/* ================================================================== */
function viewLogin() {
  state.eleve = null; state.profil = null; state.etapeNip = null; state.series = null; state.sessionAttempts = [];
  store.sessionOnglet(null);
  const codes = store.codesRecents();
  app.appendChild(h('section', { class: 'login-wrap' }, `
    <div class="login-hero">
      <h1>Prêt·e pour l'algèbre?</h1>
      <p>Des séries courtes, une rétroaction immédiate et la démarche complète quand tu te trompes.</p>
      <ul class="hero-list">
        <li><b>5 modules</b> du programme de 2<sup>e</sup> secondaire</li>
        <li><b>2 essais</b> par question, puis la démarche détaillée</li>
        <li><b>Ta progression</b> te suit sur tous tes appareils</li>
      </ul>
    </div>
    <div class="card login-card">
      <h2>Salut! 👋</h2>
      <p class="muted small">${!store.avecEcole() ? 'Entre ton numéro de groupe et tes initiales.' : 'Choisis ton école, puis entre ton numéro de groupe et tes initiales. Utilise <b>toujours le même code</b> : ta progression te suit sur tous les appareils.'}</p>
      <form id="loginForm" autocomplete="off" novalidate>
        <div id="etapeCode">
          ${!store.avecEcole() ? '' : `<label class="field"><span>École</span><select id="inEcole"><option value="">— Choisis ton école —</option>${store.ecoles().map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === store.prefs.get('ecole', '') ? 'selected' : ''}>${escapeHtml(e.nom)}</option>`).join('')}</select></label><p class="form-error" id="aucuneEcole" hidden>Aucune école n'est encore créée. Ton enseignant·e doit d'abord l'ajouter dans l'espace enseignant (onglet 🏛️ Écoles).</p>`}
          <div class="field-row">
            <label class="field"><span>Groupe</span><input id="inGroupe" inputmode="numeric" maxlength="4" placeholder="201"></label>
            <label class="field"><span>Initiales</span><input id="inInitiales" maxlength="5" placeholder="DL" autocapitalize="characters" style="text-transform:uppercase"></label>
          </div>
          <p class="aide">Ton code : <b id="apercuCode">—</b>. Si un ou une élève de ton groupe a les mêmes initiales, ajoute un chiffre (ex. DL2).</p>
          <button class="btn btn-primary btn-lg" type="submit" id="btnContinuer">Continuer →</button>
        </div>
        <div id="etapeNip" hidden>
          <p id="nipTitre" class="nip-titre"></p>
          <label class="field"><span>NIP (4 chiffres)</span><input id="inNip" class="nip-input" type="password" inputmode="numeric" maxlength="4"></label>
          <label class="field" id="champNip2"><span>Confirme ton NIP</span><input id="inNip2" class="nip-input" type="password" inputmode="numeric" maxlength="4"></label>
          <button class="btn btn-primary btn-lg" type="submit" id="btnEntrer">Entrer</button>
          <div class="actions spread">
            <button type="button" class="btn btn-ghost btn-sm" id="btnRetourCode">← Ce n'est pas moi</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btnNipOublie">NIP oublié?</button>
          </div>
        </div>
        <p class="form-error" id="loginError" role="alert"></p>
      </form>
      ${codes.length ? `<div class="anciens-codes"><p class="muted small">Déjà utilisé sur cet appareil${LOCAL ? '' : ' (ton NIP sera demandé)'} :</p>${codes.map((c) => `<span class="puce-code"><button type="button" data-code="${escapeHtml(c)}">${escapeHtml(store.codeAffiche(c))}</button><button type="button" class="retirer" data-retirer="${escapeHtml(c)}" aria-label="Retirer ce code de cet appareil">✕</button></span>`).join('')}</div>` : ''}
      <p class="privacy">🔒 Aucun nom n'est enregistré : seulement ton groupe et tes initiales (Loi 25).</p>
      ${LOCAL ? `<p class="mode-local">📴 Mode local : les résultats restent sur cet appareil.${store.raisonLocal() === 'invalide'
        ? '<br><b>L\'adresse du script Google dans <code>js/config.js</code> semble mal copiée</b> : elle doit commencer par <code>https://script.google.com/</code> et se terminer par <code>/exec</code>.'
        : '<br><span class="small">Pour brancher la feuille Google, colle l\'URL du script dans <code>js/config.js</code> (voir le README).</span>'}</p>` : ''}
    </div>`));
  const $ = (id) => document.getElementById(id);
  const err = (msg, champ) => { $('loginError').textContent = msg; if (champ) { champ.focus(); if (champ.select) champ.select(); } };
  const lireCode = () => {
    const ec = store.avecEcole() ? $('inEcole').value : 'LOCAL';
    const g = $('inGroupe').value.replace(/\D/g, '');
    const i = $('inInitiales').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return { ec, g, i, code: ec && g && i ? `${ec}-${g}-${i}` : '' };
  };
  const montrer = (etape, mode) => {
    $('etapeCode').hidden = etape !== 'code';
    $('etapeNip').hidden = etape !== 'nip';
    $('loginError').textContent = '';
    if (etape === 'nip') {
      const premiere = mode === 'register';
      const nom = escapeHtml(store.codeAffiche(state.etapeNip.code));
      $('nipTitre').innerHTML = premiere
        ? `Première connexion pour <b>${nom}</b> 🎉<br>Choisis un NIP de 4 chiffres. <b>Garde-le secret</b> : il protège ta progression.`
        : `Bon retour, <b>${nom}</b>!<br>Entre ton NIP.${mode === 'offline' ? ' <span class="muted">(hors ligne)</span>' : ''}`;
      $('champNip2').hidden = !premiere;
      $('inNip').value = ''; $('inNip2').value = '';
      $('btnNipOublie').hidden = premiere;
      $('inNip').focus();
    }
  };
  async function validerCode(codeImpose) {
    let code = codeImpose;
    if (!code) {
      const { ec, g, i, code: c } = lireCode();
      if (store.avecEcole() && !ec) return err('Choisis ton école.', $('inEcole'));
      if (!/^\d{1,4}$/.test(g)) return err('Entre ton numéro de groupe (des chiffres seulement).', $('inGroupe'));
      if (!/^[A-Z]{2,4}\d?$/.test(i)) return err('Entre 2 à 4 initiales (lettres), suivies au besoin d\'un chiffre.', $('inInitiales'));
      code = c;
      if (store.avecEcole()) store.prefs.set('ecole', ec);
    }
    if (LOCAL) return reussir(code, null);
    const btn = $('btnContinuer'); btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      const r = await store.verifierCode(code);
      state.etapeNip = { code, mode: r.mode };
      montrer('nip', r.mode);
    } catch (e) { err(e.message, $('inGroupe')); } finally { btn.disabled = false; btn.textContent = 'Continuer →'; }
  }
  async function validerNip() {
    const nip = $('inNip').value.trim();
    if (!/^\d{4}$/.test(nip)) return err('Ton NIP contient exactement 4 chiffres.', $('inNip'));
    const { code, mode } = state.etapeNip;
    if (mode === 'register' && $('inNip2').value.trim() !== nip) return err('Les deux NIP ne sont pas identiques.', $('inNip2'));
    const btn = $('btnEntrer'); btn.disabled = true; btn.textContent = 'Connexion…';
    try { reussir(code, await store.entrerNip(code, nip, mode)); }
    catch (e) { err(e.serveur || mode === 'offline' ? e.message : 'Impossible de joindre le serveur. Réessaie dans un instant.', $('inNip')); }
    finally { btn.disabled = false; btn.textContent = 'Entrer'; }
  }
  $('loginForm').addEventListener('input', () => { const c = lireCode().code; $('apercuCode').textContent = c ? store.codeAffiche(c) : '—'; $('loginError').textContent = ''; });
  $('loginForm').addEventListener('submit', (e) => { e.preventDefault(); if (!$('etapeNip').hidden) validerNip(); else validerCode(); });
  $('btnRetourCode').onclick = () => { state.etapeNip = null; montrer('code'); $('inGroupe').focus(); };
  $('btnNipOublie').onclick = () => err('Demande à ton enseignant·e de réinitialiser ton NIP. Ta progression sera conservée.');
  app.querySelector('.anciens-codes')?.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.retirer) { store.retirerCodeRecent(b.dataset.retirer); go('login'); return; }
    const c = store.decouperCode(b.dataset.code);
    if (store.avecEcole() && c.ecole !== 'LOCAL') $('inEcole').value = c.ecole;
    $('inGroupe').value = c.numero; $('inInitiales').value = c.initiales;
    validerCode(b.dataset.code);
  });
  if (!LOCAL) store.chargerEcoles().then((liste) => {
    const sel = $('inEcole'); if (!sel) return;
    $('aucuneEcole').hidden = liste.length > 0;
    const actuel = sel.value || store.prefs.get('ecole', '');
    sel.innerHTML = '<option value="">— Choisis ton école —</option>' + liste.map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === actuel ? 'selected' : ''}>${escapeHtml(e.nom)}</option>`).join('');
  });
}

function reussir(code, progressionServeur) {
  store.memoriserConnexion(code);
  const c = store.decouperCode(code);
  state.eleve = { code, ...c };
  const fusion = store.fusionnerProfils(store.lireProfil(code), progressionServeur);
  state.profil = Object.assign(store.profilVide(), fusion || {});
  const rattrapage = rattraperRecompenses(state.profil);
  store.sauverProfil(code, state.profil);
  if (LOCAL || (!rattrapage.xp && !rattrapage.badges.length && JSON.stringify(fusion) === JSON.stringify(progressionServeur))) store.store.del('alg:sale:' + code);
  go('home');
  store.planifierEnvoi(300);
  if (rattrapage.xp) setTimeout(() => toast(`<span class="toast-icone">⭐</span> +${rattrapage.xp} XP pour tes exercices déjà faits!`, 'trophee', 4000, true), 300);
  if (rattrapage.badges.length) setTimeout(() => annoncerBadges(rattrapage.badges, false), 900);
}

/**
 * Rattrapage (une seule fois par élève) : exercices faits avant l'ajout des récompenses.
 * Calcule l'XP à partir de l'historique (10 au 1er essai, 5 au 2e) et attribue les badges déjà mérités.
 */
function rattraperRecompenses(p) {
  const out = { xp: 0, badges: [] };
  if (!p.recompensesV1) {
    if (!p.xp) {
      const a = p.arch || {};
      out.xp = (a.first || 0) * 10 + Math.max(0, (a.ok || 0) - (a.first || 0)) * 5
        + (p.hist || []).reduce((s, h) => s + (h[3] === 1 ? 10 : h[3] === 2 ? 5 : 0), 0);
      p.xp = out.xp;
    }
    p.recompensesV1 = true;
  }
  out.badges = B.verifierBadges(p, store.statsProfil(p), {});
  if (out.xp || out.badges.length) store.store.set('alg:sale:' + state.eleve.code, !LOCAL);
  return out;
}

/* ================================================================== */
/* Menu principal                                                      */
/* ================================================================== */
function viewHome() {
  const stats = statsEleve();
  const cards = MODULES.map(m => {
    const s = stats.byModule[m.id];
    const rate = s ? pct(s.ok, s.n) : null;
    return `<button class="module-card" data-module="${m.id}" style="--mc:${m.couleur}">
      <span class="module-num">${m.num}</span>
      <span class="module-body"><b>${escapeHtml(m.titre)}</b><small>${escapeHtml(m.resume)}</small></span>
      <span class="module-stat">${rate === null ? '<em>Nouveau</em>' : `<span class="mini-bar"><span style="width:${rate}%"></span></span>${rate} %`}</span>
    </button>`;
  }).join('');
  app.appendChild(h('section', { class: 'home' }, `
    <div class="home-head">
      <div><h1>Choisis ton entraînement</h1><p class="muted">Pratique un module précis ou relève le défi mixte.</p></div>
      <div class="home-kpis">
        <div class="kpi"><b>${stats.n}</b><span>exercices</span></div>
        <div class="kpi"><b>${stats.n ? pct(stats.ok, stats.n) + ' %' : '—'}</b><span>réussite</span></div>
        <div class="kpi"><b>${stats.best}</b><span>meilleure série</span></div>
      </div>
    </div>
    ${(() => { const p = state.profil || store.profilVide(); const niv = B.progresNiveau(p.xp); const sj = B.serieJours(p.jours);
      return `<div class="card niveau-carte">
        <div class="niveau-badge">⭐<b>${niv.n}</b></div>
        <div class="niveau-info"><div class="niveau-ligne"><b>Niveau ${niv.n}</b><span class="muted small">${niv.xp} XP · encore ${niv.haut - niv.xp} XP pour le niveau ${niv.n + 1}</span></div>
          <span class="jauge-xp"><span style="width:${niv.pct}%"></span></span>
          <span class="muted small">${sj > 1 ? `🔥 ${sj} jours de suite : continue!` : sj === 1 ? '🔥 Tu as pratiqué aujourd\'hui. Reviens demain pour allonger ta série!' : 'Un peu chaque jour, c\'est la clé : commence ta série 🔥'}</span></div>
      </div>`; })()}
    <div class="modules">${cards}
      <button class="module-card mixte" data-mixte="1">
        <span class="module-num">★</span>
        <span class="module-body"><b>Défi mixte</b><small>Questions de tous les modules, avec plus de questions dans tes thèmes à travailler</small></span>
        <span class="module-stat">Go!</span>
      </button>
    </div>
    <h2 class="titre-section">🏅 Mes badges <span class="muted small">${(state.profil?.badges || []).length} / ${B.BADGES.length}</span></h2>
    <div class="badges">${B.BADGES.map((b) => { const a = (state.profil?.badges || []).includes(b.id);
      return `<div class="badge-carte ${a ? 'obtenu' : ''}" title="${escapeHtml(b.desc)}"><span aria-hidden="true">${a ? b.icone : '🔒'}</span><b>${escapeHtml(b.nom)}</b><small>${escapeHtml(b.desc)}</small></div>`; }).join('')}</div>`));
  app.querySelectorAll('[data-module]').forEach(b => b.addEventListener('click', () => go('setup', { moduleId: b.dataset.module })));
  app.querySelector('[data-mixte]').addEventListener('click', () => go('setup', { mixte: true }));
}

/* ================================================================== */
/* Configuration d'une série                                           */
/* ================================================================== */
function viewSetup({ moduleId, mixte }) {
  const stats = statsEleve();
  const nDefault = store.prefs.get('nQuestions', CONFIG.QUESTIONS_PAR_SERIE);
  let choicesHtml;
  if (mixte) {
    choicesHtml = `<fieldset class="chips"><legend>Modules inclus</legend>${MODULES.map(m => `
      <label class="chip"><input type="checkbox" name="mod" value="${m.id}" checked><span>${m.num}. ${escapeHtml(m.titre)}</span></label>`).join('')}</fieldset>`;
  } else {
    const m = MODULE_BY_ID[moduleId];
    const ids = Object.keys(m.themes);
    let defaults = new Set(ids);
    if (m.id === 'm5') {
      const next = ids.find(t => { const s = stats.byTheme[`m5/${t}`]; return !s || s.n < 5 || s.first / s.n < 0.8; }) || 'n1';
      defaults = new Set([next]);
    }
    choicesHtml = `<fieldset class="chips"><legend>${m.id === 'm5' ? 'Niveaux' : 'Thèmes'} <button type="button" class="link" id="toggleAll">tout sélectionner</button></legend>${ids.map(t => {
      const s = stats.byTheme[`${m.id}/${t}`];
      const tag = s && s.n >= 3 ? `<em class="${s.ok / s.n >= 0.8 ? 'good' : s.ok / s.n < 0.6 ? 'weak' : ''}">${pct(s.ok, s.n)} %</em>` : '';
      return `<label class="chip"><input type="checkbox" name="theme" value="${t}" ${defaults.has(t) ? 'checked' : ''}><span>${escapeHtml(m.themes[t].label)} ${tag}</span></label>`;
    }).join('')}</fieldset>`;
  }
  const m = moduleId ? MODULE_BY_ID[moduleId] : null;
  app.appendChild(h('section', { class: 'setup' }, `
    <button class="btn btn-ghost back" id="back">← Modules</button>
    <div class="card setup-card" style="--mc:${m ? m.couleur : 'var(--accent)'}">
      <p class="eyebrow">${m ? `Module ${m.num}` : 'Défi mixte'}</p>
      <h1>${escapeHtml(m ? m.titre : 'Défi mixte')}</h1>
      <form id="setupForm">
        ${choicesHtml}
        ${m && m.id === 'm5' ? '' : `<fieldset class="chips"><legend>Difficulté</legend>
          ${[['prog', 'Progressive (recommandé)'], ['1', 'Facile'], ['2', 'Moyen'], ['3', 'Difficile']].map(([v, l], i) => `
          <label class="chip"><input type="radio" name="diff" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>`}
        <fieldset class="chips"><legend>Nombre de questions</legend>
          ${[5, 10, 15, 20].map(n => `<label class="chip"><input type="radio" name="n" value="${n}" ${n === nDefault ? 'checked' : ''}><span>${n}</span></label>`).join('')}</fieldset>
        <p class="form-error" id="setupError"></p>
        <button class="btn btn-primary btn-lg" type="submit">Lancer la série →</button>
      </form>
    </div>`));
  document.getElementById('back').onclick = () => go('home');
  const ta = document.getElementById('toggleAll');
  if (ta) ta.onclick = () => { const boxes = app.querySelectorAll('input[name=theme]'); const all = [...boxes].every(b => b.checked); boxes.forEach(b => { b.checked = !all; }); };
  document.getElementById('setupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const n = Number(fd.get('n'));
    store.prefs.set('nQuestions', n);
    const diff = fd.get('diff') || 'prog';
    if (mixte) {
      const mods = fd.getAll('mod');
      if (!mods.length) { document.getElementById('setupError').textContent = 'Choisis au moins un module.'; return; }
      startSeries({ mode: 'mixte', modules: mods, n, diff });
    } else {
      const themes = fd.getAll('theme');
      if (!themes.length) { document.getElementById('setupError').textContent = 'Choisis au moins un thème.'; return; }
      startSeries({ mode: 'module', moduleId, themes, n, diff });
    }
  });
}

/* ================================================================== */
/* Série                                                               */
/* ================================================================== */
function startSeries(cfg) {
  const stats = statsEleve().byTheme;
  const plan = [];
  if (cfg.mode === 'module') {
    let bag = [];
    for (let i = 0; i < cfg.n; i++) {
      if (!bag.length) bag = [...cfg.themes].sort(() => Math.random() - 0.5);
      plan.push({ m: cfg.moduleId, t: bag.pop() });
    }
    // Module 5 : on garde l'ordre croissant des niveaux choisis
    if (cfg.moduleId === 'm5') plan.sort((a, b) => a.t.localeCompare(b.t));
  } else if (cfg.mode === 'mixte') {
    for (let i = 0; i < cfg.n; i++) plan.push(pickMixed(stats, cfg.modules));
  } else if (cfg.mode === 'erreurs' || cfg.mode === 'cible') {
    cfg.items.forEach(it => plan.push(it));
  }
  state.series = {
    id: store.uid(), cfg, plan, index: 0, results: [], streak: 0, best: 0, start: Date.now(), xp: 0, nouveauxBadges: [], niveauAvant: B.niveau(state.profil?.xp), complete: false, termine: false,
  };
  nextQuestion();
}

function difficultyFor(i, n, cfg, item) {
  if (item.d) return item.d;
  if (cfg.diff && cfg.diff !== 'prog') return Number(cfg.diff);
  return Math.min(3, 1 + Math.floor((i * 3) / n));
}

function nextQuestion() {
  const S = state.series;
  if (S.index >= S.plan.length) { S.complete = true; terminerSerie(); store.viderFile(); go('summary'); return; }
  const item = S.plan[S.index];
  const d = difficultyFor(S.index, S.plan.length, S.cfg, item);
  const q = generate(item.m, item.t, d);
  state.q = { ...q, attempts: 0, shownAt: performance.now(), done: false, lastInput: '', wrongChoices: new Set(), selected: new Set() };
  go('drill');
}

function viewDrill() {
  const S = state.series, q = state.q;
  const m = MODULE_BY_ID[q.module];
  const progress = Math.round((S.index / S.plan.length) * 100);
  const sec = h('section', { class: 'drill', style: `--mc:${m.couleur}` });
  sec.innerHTML = `
    <div class="drill-top">
      <button class="btn btn-ghost" id="quit" title="Quitter la série">✕ Quitter</button>
      <div class="drill-title"><span class="pill">Module ${m.num}</span> ${escapeHtml(q.themeLabel)}${q.module !== 'm5' ? ` <span class="diff d${q.difficulty}">${'●'.repeat(q.difficulty)}${'○'.repeat(3 - q.difficulty)}</span>` : ''}</div>
      <div class="drill-count"><b>${S.index + 1}</b> / ${S.plan.length}</div>
      <div class="streak ${S.streak >= 3 ? 'hot' : ''}" title="Bonnes réponses de suite">⚡ ${S.streak}</div>
    </div>
    <div class="progress"><span style="width:${progress}%"></span></div>
    ${FB.INTENTIONS[`${q.module}/${q.theme}`] ? `<p class="intention">🎯 ${escapeHtml(FB.INTENTIONS[`${q.module}/${q.theme}`])}</p>` : ''}
    <article class="card qcard">
      <p class="qprompt">${inlineMath(q.prompt)}</p>
      ${q.tex ? `<div class="qtex">${texSpan(q.tex, true)}</div>` : ''}
      ${q.svg ? `<div class="qfig">${q.svg}</div>` : ''}
      <div id="answerZone"></div>
      <div id="feedback" class="feedback" aria-live="polite"></div>
    </article>`;
  app.appendChild(sec);
  document.getElementById('quit').onclick = () => {
    if (S.results.length === 0 || confirm('Quitter la série? Tes réponses déjà données sont conservées.')) { terminerSerie(); store.viderFile(); S.results.length ? go('summary') : go('home'); }
  };
  buildAnswerZone();
}

function buildAnswerZone() {
  const q = state.q;
  const zone = document.getElementById('answerZone');
  zone.innerHTML = '';
  if (q.answerType === 'choice' || q.answerType === 'multi') {
    const multi = q.answerType === 'multi';
    const wrap = h('div', { class: `choices ${multi ? 'multi' : ''}`, role: multi ? 'group' : 'radiogroup' });
    q.choices.forEach((c, i) => {
      const b = h('button', { type: 'button', class: 'choice', 'data-i': i }, `<span class="choice-key">${multi ? '' : String.fromCharCode(65 + i)}</span>${c.tex ? texSpan(c.tex) : c.html}`);
      b.addEventListener('click', () => {
        if (q.done || q.wrongChoices.has(i)) return;
        if (multi) { q.selected.has(i) ? q.selected.delete(i) : q.selected.add(i); b.classList.toggle('selected'); }
        else submit(i);
      });
      wrap.appendChild(b);
    });
    zone.appendChild(wrap);
    if (multi) {
      const act = h('div', { class: 'actions' });
      const btn = h('button', { class: 'btn btn-primary', id: 'checkBtn' }, 'Vérifier');
      btn.onclick = () => submit([...q.selected]);
      act.appendChild(btn); zone.appendChild(act);
    }
    renderMath(zone);
    return;
  }
  const mode = q.answerType === 'expr' ? 'expr' : q.answerType === 'vars' ? 'vars' : q.answerType === 'number' ? 'number' : 'int';
  const placeholder = { expr: 'Écris ton expression…', number: q.variable ? `${q.variable} = …` : 'Écris un nombre…', int: 'Écris un nombre entier…', vars: 'ex. : xy' }[mode];
  const row = h('div', { class: 'input-row' });
  const prefix = q.variable ? `<span class="input-prefix">${texSpan(`${q.variable} =`)}</span>` : '';
  row.innerHTML = `${prefix}<input id="answer" class="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${placeholder}" aria-label="Ta réponse" autofocus>
    <button class="btn btn-primary" id="checkBtn">Vérifier</button>`;
  zone.appendChild(row);
  const preview = h('div', { class: 'preview', id: 'preview', 'aria-hidden': 'true' });
  zone.appendChild(preview);
  const input = row.querySelector('input');
  const touchOnly = isTouch() && store.prefs.get('kbVirtuelSeul', true);
  if (touchOnly) input.setAttribute('inputmode', 'none');
  else if (mode === 'number' || mode === 'int') input.setAttribute('inputmode', 'decimal');
  const kb = buildKeyboard(input, { vars: q.keys && q.keys.length ? q.keys : (mode === 'expr' ? ['x'] : []), mode, onEnter: () => submit(input.value) });
  zone.appendChild(kb);
  if (isTouch()) {
    const t = h('button', { type: 'button', class: 'link kb-toggle' }, touchOnly ? '⌨︎ Utiliser le clavier de l\'appareil' : '⌨︎ Utiliser seulement le clavier virtuel');
    t.onclick = () => { store.prefs.set('kbVirtuelSeul', !touchOnly); buildAnswerZone(); renderMath(zone); };
    zone.appendChild(t);
  }
  input.addEventListener('input', () => updatePreview(input.value, mode));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(input.value); } });
  row.querySelector('#checkBtn').onclick = () => submit(input.value);
  if (q.lastInput) { input.value = q.lastInput; updatePreview(q.lastInput, mode); }
  setTimeout(() => { if (!isTouch()) input.focus(); else input.focus({ preventScroll: true }); }, 30);
}

function updatePreview(value, mode) {
  const p = document.getElementById('preview');
  if (!p) return;
  if (!value.trim() || mode === 'vars' || mode === 'int') { p.innerHTML = ''; return; }
  const r = tryParse(value.replace(/^\s*[a-z]\s*=\s*/i, ''));
  if (r.error) { p.innerHTML = `<span class="muted">…</span>`; return; }
  p.innerHTML = `<span class="muted">Aperçu :</span> ${texSpan(toLatex(r.ast))}`;
  renderMath(p);
}

/* ------------------------------------------------------------------ */
const BRAVO = ['Bravo!', 'Exact!', 'Excellent!', 'Bien joué!', 'Parfait!', 'C\'est ça!'];
const RETRY = ['Pas tout à fait…', 'Presque…', 'Ce n\'est pas ça…'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function submit(input) {
  const q = state.q;
  if (q.done) { nextAfterFeedback(); return; }
  const r = checkAnswer(q, input);
  const fb = document.getElementById('feedback');
  if (r.status === 'invalid') {
    fb.className = 'feedback fb-invalid';
    fb.innerHTML = `<p>✎ ${escapeHtml(r.message)}</p>`;
    return;
  }
  q.attempts++;
  q.lastInput = typeof input === 'string' ? input : '';
  const max = CONFIG.ESSAIS_PAR_QUESTION;
  if (r.status === 'correct') { finish(true, input, r); return; }
  // Rétroaction : diagnostic précis seulement s'il est sans ambiguïté, sinon indice de processus
  const diag = FB.diagnostiquer(q, input);
  if (diag && !q.diag1) q.diag1 = diag.code;
  q.dernierDiag = diag;
  if (q.attempts < max) {
    fb.className = 'feedback fb-retry';
    const conseil = diag ? diag.msg : (r.status === 'nonreduit' ? r.hint : (FB.indiceProcessus(q) || r.hint || 'Vérifie ta démarche et essaie encore.'));
    const etape = FB.premiereEtape(q);
    fb.innerHTML = `<p class="fb-title">${pick(RETRY)} <span class="muted">Essai ${q.attempts + 1} sur ${max}</span></p>
      ${r.status === 'nonreduit' && diag ? `<p>${escapeHtml(r.hint)}</p>` : ''}
      <p class="fb-diag">💡 ${escapeHtml(conseil)}</p>
      ${etape ? `<button type="button" class="link" id="voirEtape">Besoin d'un coup de pouce? Voir la 1<sup>re</sup> étape</button><div id="etapeBox"></div>` : ''}`;
    const ve = document.getElementById('voirEtape');
    if (ve) ve.onclick = () => {
      q.indiceUtilise = true;
      ve.remove();
      document.getElementById('etapeBox').innerHTML = `<ol class="steps"><li><div class="step-label">${inlineMath(etape.label)}</div>${etape.tex ? `<div class="step-tex">${texSpan(etape.tex, true)}</div>` : ''}</li></ol>`;
      renderMath(document.getElementById('etapeBox'));
      const inp = document.getElementById('answer'); if (inp && !isTouch()) inp.focus();
    };
    if (q.answerType === 'choice') {
      q.wrongChoices.add(input);
      const b = app.querySelector(`.choice[data-i="${input}"]`);
      if (b) { b.classList.add('wrong'); b.disabled = true; }
    } else if (q.answerType === 'multi') {
      app.querySelectorAll('.choice').forEach(b => b.classList.add('shake'));
      setTimeout(() => app.querySelectorAll('.choice').forEach(b => b.classList.remove('shake')), 400);
    } else {
      const inp = document.getElementById('answer');
      inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400);
      inp.select();
    }
    return;
  }
  finish(false, input, r);
}

function stepsHtml(steps) {
  return `<ol class="steps">${steps.map(s => `
    <li class="${s.final ? 'final' : ''}">
      <div class="step-label">${inlineMath(s.label)}</div>
      ${s.tex ? `<div class="step-tex">${texSpan(s.tex, true)}</div>` : ''}
      ${s.note ? `<div class="step-note">${inlineMath(escapeHtml(s.note))}</div>` : ''}
    </li>`).join('')}</ol>`;
}

function answerToText(q, input) {
  if (q.answerType === 'choice') return q.choices[input] ? (q.choices[input].tex || q.choices[input].html) : '';
  if (q.answerType === 'multi') return (input || []).map(i => q.choices[i].tex || q.choices[i].html).join(' ; ');
  return String(input ?? '');
}
function expectedText(q) {
  if (q.answerType === 'choice') return q.choices[q.answer].tex || q.choices[q.answer].html;
  if (q.answerType === 'multi') return q.answer.map(i => q.choices[i].tex || q.choices[i].html).join(' ; ');
  if (q.answer && q.answer.toString) return q.answer.toString();
  return String(q.answer);
}
function questionText(q) {
  const p = q.prompt.replace(/<[^>]+>/g, '').replace(/\\\(|\\\)/g, '');
  let detail = '';
  if (q.tex) detail = latexToText(q.tex);
  else if (q.svg && q.source) detail = 'figure : ' + q.source;
  else if (q.choices) detail = q.choices.map(c => (c.tex ? latexToText(c.tex) : c.html)).join(' | ');
  return (p + (detail ? ` [${detail}]` : '')).slice(0, 400);
}

function finish(success, input, r) {
  const q = state.q, S = state.series;
  q.done = true;
  const temps = Math.round((performance.now() - q.shownAt) / 1000);
  const resultat = success ? q.attempts : 0;
  S.results.push({ q, success, resultat, input, temps, diag: q.diag1 || null });
  if (success) { S.streak++; S.best = Math.max(S.best, S.streak); } else S.streak = 0;
  const att = {
    id: store.uid(), date: new Date().toISOString(), module: q.module, theme: q.theme, themeLabel: q.themeLabel,
    niveau: q.module === 'm5' ? q.theme : q.difficulty, question: questionText(q), reponse: answerToText(q, input).slice(0, 200),
    attendu: expectedText(q).slice(0, 200), resultat, essais: q.attempts, temps, serie: S.id, mode: S.cfg.mode, erreur: q.diag1 || '',
  };
  store.enregistrerTentative(state.eleve.code, att);
  store.ajouterAuProfil(state.profil, att);
  state.profil.best = Math.max(state.profil.best || 0, S.best);
  const xp = B.xpReponse(q, resultat);
  const nivAvant = B.niveau(state.profil.xp);
  state.profil.xp = (state.profil.xp || 0) + xp;
  S.xp += xp;
  const nouveaux = B.verifierBadges(state.profil, statsEleve(), { serieMax: S.best });
  store.sauverProfil(state.eleve.code, state.profil);
  state.sessionAttempts.push(att);
  annoncerBadges(nouveaux);
  if (B.niveau(state.profil.xp) > nivAvant) annoncerNiveau();
  updateHeader();

  // Marque les choix
  if (q.answerType === 'choice' || q.answerType === 'multi') {
    const good = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
    app.querySelectorAll('.choice').forEach(b => {
      const i = Number(b.dataset.i);
      b.disabled = true;
      if (good.has(i)) b.classList.add('correct');
      else if ((Array.isArray(input) && input.includes(i)) || input === i) b.classList.add('wrong');
    });
  } else {
    const inp = document.getElementById('answer');
    if (inp) { inp.readOnly = true; inp.classList.add(success ? 'ok' : 'ko'); }
    const kb = app.querySelector('.mathkb'); if (kb) kb.classList.add('dim');
  }
  const top = app.querySelector('.streak');
  if (top) { top.textContent = `⚡ ${S.streak}`; top.classList.toggle('hot', S.streak >= 3); }

  const fb = document.getElementById('feedback');
  const notes = (r && r.notes) || [];
  if (success) {
    fb.className = 'feedback fb-ok';
    const proc = q.attempts === 1 ? FB.felicitation(q) : null;
    fb.innerHTML = `<p class="fb-title">✓ ${pick(BRAVO)} ${proc ? `<span class="fb-proc">${escapeHtml(proc)}</span>` : ''} ${q.attempts > 1 ? '<span class="muted">(au 2e essai)</span>' : ''} <span class="xp-gain">+${xp} XP</span></p>
      ${notes.map(n => `<p class="fb-note">${escapeHtml(n)}</p>`).join('')}
      <details class="steps-box"><summary>Voir la démarche</summary>${stepsHtml(q.steps)}</details>`;
  } else {
    fb.className = 'feedback fb-ko';
    fb.innerHTML = `<p class="fb-title">La bonne réponse : ${texSpan(q.answerTex || '')}</p>
      ${q.dernierDiag ? `<p class="fb-diag">💡 ${escapeHtml(q.dernierDiag.msg)}</p>` : (r && r.hint ? `<p>${escapeHtml(r.hint)}</p>` : '')}
      <div class="steps-box open"><p class="steps-head">Démarche étape par étape</p>${stepsHtml(q.steps)}</div>`;
  }
  const act = h('div', { class: 'actions' });
  const last = S.index + 1 >= S.plan.length;
  const nb = h('button', { class: 'btn btn-primary', id: 'nextBtn' }, last ? 'Voir mon bilan →' : 'Question suivante →');
  nb.onclick = nextAfterFeedback;
  act.appendChild(nb);
  fb.appendChild(act);
  const chk = document.getElementById('checkBtn'); if (chk) chk.hidden = true;
  renderMath(fb);
  setTimeout(() => nb.focus({ preventScroll: !success }), 50);
  if (!success) fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextAfterFeedback() {
  state.series.index++;
  nextQuestion();
}

function annoncerBadges(liste, memoriser = true) {
  if (!liste.length) return;
  if (memoriser && state.series) state.series.nouveauxBadges.push(...liste);
  B.confettis();
  liste.forEach((b, i) => setTimeout(() => toast(`<span class="toast-icone">${b.icone}</span> Nouveau badge : <b>${escapeHtml(b.nom)}</b>`, 'trophee', 3500, true), 300 + i * 900));
}
function annoncerNiveau() {
  B.confettis();
  toast(`<span class="toast-icone">⭐</span> Niveau <b>${B.niveau(state.profil.xp)}</b> atteint!`, 'trophee', 3500, true);
}

/** Fin de série : bonus d'XP et badges de fin (seulement si la série est terminée au complet). */
function terminerSerie() {
  const S = state.series;
  if (!S || S.termine || !S.results.length) return;
  S.termine = true;
  if (!S.complete) return;
  const n = S.results.length;
  const premiers = S.results.filter((r) => r.resultat === 1).length;
  const second = S.results.filter((r) => r.resultat === 2).length;
  const score = Math.round(((premiers + second * 0.5) / n) * 100);
  const bonus = B.xpFinSerie(n, premiers);
  const nivAvant = B.niveau(state.profil.xp);
  state.profil.xp += bonus; S.xp += bonus; S.bonus = bonus;
  const nouveaux = B.verifierBadges(state.profil, statsEleve(), { serieMax: S.best, fin: { mode: S.cfg.mode, n, premiers, score } });
  store.sauverProfil(state.eleve.code, state.profil);
  if (B.niveau(state.profil.xp) > nivAvant) setTimeout(annoncerNiveau, 600);
  S.nouveauxBadges.push(...nouveaux);
  setTimeout(() => { annoncerBadges(nouveaux, false); if (score >= 90 && !nouveaux.length) B.confettis(); }, 400);
}

/* ================================================================== */
/* Bilan de série                                                      */
/* ================================================================== */
function viewSummary() {
  const S = state.series;
  const n = S.results.length;
  const first = S.results.filter(r => r.resultat === 1).length;
  const second = S.results.filter(r => r.resultat === 2).length;
  const fails = S.results.filter(r => !r.success);
  const score = n ? Math.round(((first + second * 0.5) / n) * 100) : 0;
  const time = S.results.reduce((s, r) => s + r.temps, 0);
  const msg = score >= 90 ? 'Superbe maîtrise!' : score >= 70 ? 'Très bon travail!' : score >= 50 ? 'Tu progresses, continue!' : 'Reprends les démarches et réessaie : c\'est comme ça qu\'on apprend.';
  app.appendChild(h('section', { class: 'summary' }, `
    <div class="card summary-card">
      <div class="score-ring" style="--p:${score}"><span>${score}<small>%</small></span></div>
      <div>
        <h1>${msg}</h1>
        <div class="summary-stats">
          <span class="tag ok">✓ ${first} du premier coup</span>
          <span class="tag mid">↻ ${second} au 2e essai</span>
          <span class="tag ko">✕ ${fails.length} à revoir</span>
          <span class="tag">⏱ ${fmtDuree(time)}</span>
          <span class="tag">⚡ meilleure série : ${S.best}</span>
          <span class="tag xp">⭐ +${S.xp} XP${S.bonus ? ` <small>(dont ${S.bonus} de bonus)</small>` : ''}</span>
        </div>
        ${S.complete ? '' : '<p class="note-interrompue">⏸️ Série interrompue : tes réponses comptent, mais le bonus d\'XP et les badges de fin de série se gagnent en terminant la série au complet.</p>'}
        ${(() => { const niv = B.progresNiveau(state.profil.xp); return `<div class="niveau-mini"><span><b>Niveau ${niv.n}</b>${niv.n > S.niveauAvant ? ' <span class="tag ok">Nouveau niveau! 🎉</span>' : ''}</span><span class="jauge-xp"><span style="width:${niv.pct}%"></span></span><span class="muted small">${niv.xp} / ${niv.haut} XP</span></div>`; })()}
      </div>
    </div>
    ${S.nouveauxBadges.length ? `<div class="card"><h2>🏅 Badge${S.nouveauxBadges.length > 1 ? 's' : ''} débloqué${S.nouveauxBadges.length > 1 ? 's' : ''}!</h2><div class="badges">${S.nouveauxBadges.map((b) => `<div class="badge-carte obtenu nouveau"><span aria-hidden="true">${b.icone}</span><b>${escapeHtml(b.nom)}</b><small>${escapeHtml(b.desc)}</small></div>`).join('')}</div></div>` : ''}
    ${(() => { const pe = FB.prochaineEtape(S.results); if (!pe) return '';
      return `<div class="card prochaine ${pe.type}"><h2>${pe.type === 'reussite' ? '🌟 Ce que tu maîtrises' : '🧭 Ta prochaine étape'}</h2>
        <p class="pe-texte">${escapeHtml(pe.texte)}</p>${pe.rappel ? `<p class="muted">${escapeHtml(pe.rappel)}</p>` : ''}
        ${pe.pratique ? '<button class="btn btn-accent" id="pratiquer">Pratiquer ce point (5 questions)</button>' : ''}</div>`; })()}
    <div class="summary-actions">
      ${fails.length ? '<button class="btn btn-accent" id="redo">M\'exercer sur mes erreurs</button>' : ''}
      <button class="btn btn-primary" id="again">Nouvelle série</button>
      <button class="btn btn-ghost" id="menu">Menu des modules</button>
    </div>
    <div class="card">
      <h2>Détail de la série</h2>
      <ol class="review">${S.results.map((r, i) => `
        <li class="${r.success ? 'ok' : 'ko'}">
          <span class="rv-icon">${r.resultat === 1 ? '✓' : r.resultat === 2 ? '↻' : '✕'}</span>
          <span class="rv-q"><small>${escapeHtml(r.q.themeLabel)}</small><span class="rv-text">${r.q.tex ? texSpan(r.q.tex) : inlineMath(r.q.prompt.replace(/<[^>]+>/g, '').slice(0, 140))}</span></span>
          <span class="rv-a">${texSpan(r.q.answerTex || '')}</span>
        </li>`).join('')}</ol>
    </div>`));
  document.getElementById('menu').onclick = () => go('home');
  const parent = S.cfg.parent || S.cfg;
  document.getElementById('again').onclick = () => startSeries(parent);
  const pr = document.getElementById('pratiquer');
  if (pr) { const pe = FB.prochaineEtape(S.results); pr.onclick = () => startSeries({ mode: 'cible', parent, items: Array.from({ length: 5 }, () => ({ ...pe.pratique })) }); }
  const redo = document.getElementById('redo');
  if (redo) redo.onclick = () => startSeries({
    mode: 'erreurs', parent,
    items: fails.map(f => ({ m: f.q.module, t: f.q.theme, d: f.q.difficulty })),
  });
}

/* ================================================================== */
/* Tableau de bord élève                                               */
/* ================================================================== */
function viewDashboard() {
  const st = statsEleve();
  const sess = computeStats(state.sessionAttempts);
  const modulesHtml = MODULES.map(m => {
    const s = st.byModule[m.id];
    const themes = Object.keys(m.themes).map(t => {
      const ts = st.byTheme[`${m.id}/${t}`];
      if (!ts) return `<tr class="untried"><td>${escapeHtml(m.themes[t].label)}</td><td colspan="2" class="muted">pas encore essayé</td></tr>`;
      const r = pct(ts.ok, ts.n);
      const cls = ts.n < 3 ? '' : r >= 80 ? 'good' : r < 60 ? 'weak' : 'mid';
      return `<tr><td>${escapeHtml(m.themes[t].label)}</td><td>${ts.n}</td><td><span class="rate ${cls}">${r} %</span>${cls === 'weak' ? ' <em class="weak-tag">à travailler</em>' : ''}</td></tr>`;
    }).join('');
    return `<div class="card dash-mod" style="--mc:${m.couleur}">
      <h3><span class="module-num sm">${m.num}</span>${escapeHtml(m.titre)} <span class="muted">${s ? pct(s.ok, s.n) + ' %' : ''}</span></h3>
      <table class="tbl"><thead><tr><th>Thème</th><th>Essais</th><th>Réussite</th></tr></thead><tbody>${themes}</tbody></table>
    </div>`;
  }).join('');
  const recent = [...state.sessionAttempts].reverse().slice(0, 30);
  app.appendChild(h('section', { class: 'dashboard' }, `
    <button class="btn btn-ghost back" id="back">← Modules</button>
    <h1>Mon tableau de bord</h1>
    <div class="kpis">
      <div class="kpi big"><b>${st.n}</b><span>exercices au total</span></div>
      <div class="kpi big"><b>${st.n ? pct(st.ok, st.n) : 0} %</b><span>taux de réussite</span></div>
      <div class="kpi big"><b>${st.n ? pct(st.first, st.n) : 0} %</b><span>réussis du 1<sup>er</sup> coup</span></div>
      <div class="kpi big"><b>${st.best}</b><span>meilleure série ⚡</span></div>
      <div class="kpi big"><b>${st.n ? fmtDuree(st.time / st.n) : '—'}</b><span>temps moyen</span></div>
    </div>
    <div class="card">
      <h2>Aujourd'hui (cette session)</h2>
      ${sess.n ? `<p>${sess.n} exercices · ${pct(sess.ok, sess.n)} % de réussite · série en cours : ⚡ ${sess.streak}</p>
      <ol class="history">${recent.map(a => `<li class="${a.resultat ? 'ok' : 'ko'}"><span>${a.resultat === 1 ? '✓' : a.resultat === 2 ? '↻' : '✕'}</span><span>${escapeHtml(themeLabel(a.module, a.theme))}</span><span class="muted">${fmtDate(a.date).split(' ')[1] || ''}</span></li>`).join('')}</ol>`
      : '<p class="muted">Aucun exercice pour l\'instant dans cette session.</p>'}
    </div>
    <div class="dash-grid">${modulesHtml}</div>
    <p class="muted small">${LOCAL ? 'Mode local : historique conservé sur cet appareil.' : 'Ta progression est sauvegardée en ligne : tu la retrouves sur tous tes appareils.'}</p>`));
  document.getElementById('back').onclick = () => go('home');
}

/* ================================================================== */
/* Démarrage                                                           */
/* ================================================================== */
function initChrome() {
  document.getElementById('appName').textContent = CONFIG.NOM_APP;
  document.getElementById('appSub').textContent = CONFIG.SOUS_TITRE;
  store.initApparence(document.getElementById('btnTheme'), document.getElementById('btnLecture'));
  document.getElementById('navDash').onclick = () => go('dashboard');
  document.getElementById('navHome').onclick = () => go('home');
  document.getElementById('navLogout').onclick = () => {
    if (state.view === 'drill' && !window.confirm('Changer d\'élève? La série en cours sera interrompue.')) return;
    store.viderFile(); go('login');
  };
  const sync = document.getElementById('syncStatus');
  store.surSync((st) => {
    if (st.mode === 'local') { sync.textContent = '📴 Local'; sync.title = 'Mode local : les résultats restent sur cet appareil'; return; }
    if (st.relogin) { sync.textContent = '🔑 Reconnecte-toi'; sync.title = 'Ta session a expiré : reconnecte-toi pour envoyer tes résultats'; return; }
    if (st.enCours) { sync.textContent = '⏳ Envoi…'; return; }
    if (st.attente) { sync.textContent = `⏳ ${st.attente}`; sync.title = `${st.attente} réponse(s) en attente d'envoi (elles partiront au retour du réseau)`; return; }
    sync.textContent = '☁️'; sync.title = 'Résultats synchronisés';
  });
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && state.view === 'drill' && state.q && state.q.done && document.activeElement?.id !== 'nextBtn') {
      e.preventDefault(); nextAfterFeedback();
    }
  });
  window.addEventListener('pagehide', () => { store.viderFile(); });
  store.enregistrerServiceWorker();
  surveillerMisesAJour();
}

initChrome();
(() => {
  const code = store.sessionOnglet();
  if (code && store.decouperCode(code)) { reussir(code, null); return; }
  go('login');
})();
