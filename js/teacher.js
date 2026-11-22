/**
 * teacher.js — Espace enseignant (enseignant.html), sur le modèle de l'application des verbes :
 * identifiant + NIP, onglets Élèves, Thèmes difficiles, Mes groupes, Écoles*, Enseignants*, Mon compte (* administrateur).
 */
import { CONFIG } from './config.js';
import { MODULES, MODULE_BY_ID, themeLabel } from './gen/index.js';
import { h, escapeHtml as e, toast, fmtDuree, fmtDate, pct } from './ui/render.js';
import * as S from './storage.js';
import * as B from './badges.js';
import { surveillerMisesAJour } from './maj.js';

const app = document.getElementById('app');
const T = {
  token: null, session: null, lignes: [], groupes: [], ecoles: [], orphelins: [], enseignants: [],
  tab: 'eleves', f: { groupe: '', eleve: '', module: '', du: '', au: '' },
};
try { const v = JSON.parse(sessionStorage.getItem('alg:ens') || 'null'); if (v) { T.token = v.token; T.session = v.session; } } catch (err) { /* rien */ }

S.initApparence(document.getElementById('btnTheme'), document.getElementById('btnLecture'));
surveillerMisesAJour();

/* ---------- Outils ---------- */
const nomEcole = (id) => (T.ecoles.find((x) => x.id === id) || {}).nom || S.nomEcole(id);
function nomGroupe(g) {
  const [ec, num] = String(g).split('-');
  return ec === 'LOCAL' ? `Groupe ${num}` : `${nomEcole(ec)} · ${num}`;
}
const ini = (code) => S.initialesAffichees((S.decouperCode(code) || {}).initiales || code);
const tauxClasse = (r) => (r >= 80 ? 'good' : r < 60 ? 'weak' : 'mid');
const apiT = (action, data = {}, delai) => S.api(action, { token: T.token, ...data }, delai);

/** Bouton à confirmer en deux clics (pas de boîte de dialogue). */
function deuxClics(btn, action, texte = 'Confirmer?') {
  let arme = false, minuterie;
  const libelle = btn.textContent;
  btn.addEventListener('click', async () => {
    if (!arme) { arme = true; btn.textContent = texte; btn.classList.add('arme'); minuterie = setTimeout(() => { arme = false; btn.textContent = libelle; btn.classList.remove('arme'); }, 4000); return; }
    clearTimeout(minuterie); btn.disabled = true;
    try { await action(); } catch (err) { toast(err.message, 'err'); btn.disabled = false; btn.textContent = libelle; btn.classList.remove('arme'); arme = false; }
  });
}

function majEntete() {
  const qui = document.getElementById('qui'), out = document.getElementById('btnDeconnexion');
  const connecte = !!T.session;
  qui.hidden = !connecte; out.hidden = !connecte;
  if (connecte) qui.textContent = `${T.session.role === 'admin' ? '🛡️' : '🧑‍🏫'} ${T.session.nom}`;
  out.onclick = async () => {
    if (!S.LOCAL && T.token) { try { await apiT('logout'); } catch (err) { /* rien */ } }
    sessionStorage.removeItem('alg:ens'); T.token = null; T.session = null; vueConnexion();
  };
}

/* ================= Connexion ================= */
function vueConnexion() {
  majEntete();
  app.innerHTML = `
    <form class="card login-card narrow" id="fNip" autocomplete="on">
      <div style="font-size:2.4rem" aria-hidden="true">🔐</div>
      <h1>Espace enseignant</h1>
      <p class="muted">Connecte-toi avec ton identifiant et ton NIP.</p>
      <label class="field"><span>Identifiant</span><input id="inId" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="ex. dcyr" ${S.LOCAL ? 'value="admin"' : ''}></label>
      <label class="field"><span>NIP</span><input id="inNip" class="nip-input" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password"></label>
      <p class="form-error" id="err" role="alert"></p>
      <button class="btn btn-primary btn-lg" id="btnNip">Entrer</button>
      <p class="aide" style="margin-top:.8rem">${S.LOCAL ? '📴 Mode local : NIP défini dans <code>js/config.js</code> (NIP_LOCAL). Seuls les résultats de cet appareil sont visibles.' : 'Pas de compte? Demande-le à l\'administrateur de l\'application.'}</p>
    </form>`;
  const f = app.querySelector('#fNip');
  (S.LOCAL ? f.querySelector('#inNip') : f.querySelector('#inId')).focus();
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = f.querySelector('#inId').value.trim(), nip = f.querySelector('#inNip').value.trim();
    const btn = f.querySelector('#btnNip'); btn.disabled = true;
    try {
      if (S.LOCAL) {
        if (nip !== String(CONFIG.NIP_LOCAL)) throw new Error('NIP incorrect.');
        T.session = { id: 'admin', role: 'admin', nom: 'Mode local' }; T.token = 'local';
      } else {
        const r = await S.api('login', { identifiant: id, pin: nip });
        T.token = r.token; T.session = r.session;
      }
      sessionStorage.setItem('alg:ens', JSON.stringify({ token: T.token, session: T.session }));
      charger();
    } catch (err) { f.querySelector('#err').textContent = err.message; btn.disabled = false; }
  });
}

/* ================= Chargement ================= */
async function charger() {
  majEntete();
  app.innerHTML = '<div class="card loading">Chargement des résultats…</div>';
  try {
    if (S.LOCAL) {
      T.lignes = S.tentativesLocales().map(normaliser);
      T.groupes = [...new Set(T.lignes.map((l) => l.groupe))].map((g) => ({ groupe: g, enseignant: 'admin', nomEnseignant: 'Mode local', resultats: T.lignes.filter((l) => l.groupe === g).length }));
      T.ecoles = []; T.orphelins = []; T.enseignants = [];
    } else {
      const admin = T.session.role === 'admin';
      const [res, grp, ens] = await Promise.all([apiT('getResults', {}, 45000), apiT('listGroups'), admin ? apiT('listTeachers') : Promise.resolve(null)]);
      T.lignes = (res.lignes || []).map(normaliser);
      T.groupes = grp.groupes || []; T.ecoles = grp.ecoles || []; T.orphelins = grp.orphelins || [];
      T.enseignants = ens ? ens.enseignants : (grp.enseignants || []);
    }
    vueTableau();
  } catch (err) {
    if (/session expirée/i.test(err.message)) { sessionStorage.removeItem('alg:ens'); T.session = null; toast(err.message, 'warn'); vueConnexion(); return; }
    app.innerHTML = `<div class="card"><p class="form-error">Impossible de charger les données : ${e(err.message)}</p><button class="btn btn-primary" id="re">Réessayer</button></div>`;
    app.querySelector('#re').onclick = charger;
  }
}
function normaliser(a) {
  const c = S.decouperCode(a.code) || {};
  return { ...a, groupe: a.groupe || c.groupe || '', initiales: c.initiales || '', resultat: Number(a.resultat) || 0, temps: Number(a.temps) || 0, essais: Number(a.essais) || 0 };
}

/* ================= Tableau de bord ================= */
const ONGLETS = [
  ['eleves', '👥 Élèves'], ['themes', '🔥 Thèmes difficiles'], ['groupes', '🏫 Mes groupes', 'cloud'],
  ['ecoles', '🏛️ Écoles', 'admin'], ['enseignants', '🧑‍🏫 Enseignants', 'admin'], ['compte', '⚙️ Mon compte'],
];
function vueTableau() {
  const admin = T.session.role === 'admin';
  app.innerHTML = `
    <div class="teacher-head">
      <div><p class="eyebrow">Espace enseignant</p><h1>Bonjour ${e(T.session.nom)}</h1></div>
      <button class="btn btn-ghost" id="btnActualiser">↻ Actualiser</button>
    </div>
    <nav class="tabs" role="tablist">${ONGLETS.filter(([, , cond]) => !cond || (cond === 'admin' ? admin && !S.LOCAL : !S.LOCAL))
      .map(([id, lib]) => `<button role="tab" data-tab="${id}" aria-selected="${T.tab === id}" class="${T.tab === id ? 'active' : ''}">${lib}</button>`).join('')}</nav>
    <div id="corps"></div>`;
  app.querySelector('#btnActualiser').onclick = charger;
  app.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { T.tab = b.dataset.tab; vueTableau(); }; });
  ({ eleves: ongletEleves, themes: ongletThemes, groupes: ongletGroupes, ecoles: ongletEcoles, enseignants: ongletEnseignants, compte: ongletCompte })[T.tab]();
}

/* ---------- Filtres communs ---------- */
function filtrer() {
  const f = T.f;
  const du = f.du ? new Date(f.du + 'T00:00:00') : null, au = f.au ? new Date(f.au + 'T23:59:59') : null;
  return T.lignes.filter((a) => (!f.groupe || a.groupe === f.groupe) && (!f.eleve || a.code === f.eleve) && (!f.module || a.module === f.module)
    && (!du || new Date(a.date) >= du) && (!au || new Date(a.date) <= au));
}
function filtresHtml() {
  const f = T.f;
  const groupes = [...new Set([...T.groupes.map((g) => g.groupe), ...T.lignes.map((l) => l.groupe)])].filter(Boolean).sort();
  const eleves = [...new Set(T.lignes.filter((a) => !f.groupe || a.groupe === f.groupe).map((a) => a.code))].sort();
  return `<div class="card filters">
    <label>Groupe<select data-f="groupe"><option value="">Tous</option>${groupes.map((g) => `<option value="${e(g)}" ${f.groupe === g ? 'selected' : ''}>${e(nomGroupe(g))}</option>`).join('')}</select></label>
    <label>Élève<select data-f="eleve"><option value="">Tous</option>${eleves.map((c) => `<option value="${e(c)}" ${f.eleve === c ? 'selected' : ''}>${e(f.groupe ? ini(c) : S.codeAffiche(c))}</option>`).join('')}</select></label>
    <label>Module<select data-f="module"><option value="">Tous</option>${MODULES.map((m) => `<option value="${m.id}" ${f.module === m.id ? 'selected' : ''}>${m.num}. ${e(m.titre)}</option>`).join('')}</select></label>
    <label>Du<input type="date" data-f="du" value="${e(f.du)}"></label>
    <label>Au<input type="date" data-f="au" value="${e(f.au)}"></label>
    <button class="btn btn-ghost" id="fReset">Réinitialiser</button>
  </div>`;
}
function lierFiltres(corps, redessiner) {
  corps.querySelectorAll('[data-f]').forEach((el) => { el.onchange = () => { T.f[el.dataset.f] = el.value; if (el.dataset.f === 'groupe') T.f.eleve = ''; redessiner(); }; });
  corps.querySelector('#fReset').onclick = () => { T.f = { groupe: '', eleve: '', module: '', du: '', au: '' }; redessiner(); };
}

function agreger(lignes) {
  const par = new Map();
  for (const a of lignes) {
    if (!par.has(a.code)) par.set(a.code, { code: a.code, groupe: a.groupe, n: 0, ok: 0, first: 0, temps: 0, last: '', themes: {} });
    const s = par.get(a.code);
    s.n++; if (a.resultat > 0) s.ok++; if (a.resultat === 1) s.first++; s.temps += a.temps;
    if (!s.last || a.date > s.last) s.last = a.date;
    const k = `${a.module}/${a.theme}`;
    (s.themes[k] = s.themes[k] || { n: 0, ok: 0 }).n++; if (a.resultat > 0) s.themes[k].ok++;
  }
  return [...par.values()].map((s) => ({ ...s, faibles: Object.entries(s.themes).filter(([, t]) => t.n >= 3 && t.ok / t.n < 0.6).sort((x, y) => x[1].ok / x[1].n - y[1].ok / y[1].n).map(([k]) => k) }))
    .sort((a, b) => a.groupe.localeCompare(b.groupe) || a.code.localeCompare(b.code));
}
const etiquetteTheme = (k) => { const [m, t] = k.split('/'); return `M${MODULE_BY_ID[m]?.num || '?'} · ${themeLabel(m, t)}`; };

/* ---------- 👥 Élèves ---------- */
function ongletEleves() {
  const corps = document.getElementById('corps');
  const lignes = filtrer();
  const rangs = agreger(lignes);
  const n = lignes.length, ok = lignes.filter((a) => a.resultat > 0).length, first = lignes.filter((a) => a.resultat === 1).length;
  const tm = n ? lignes.reduce((s, a) => s + a.temps, 0) / n : 0;
  const groupes = [...new Set(lignes.map((a) => a.groupe))].sort();
  corps.innerHTML = `${filtresHtml()}
    <div class="kpis">
      <div class="kpi big"><b>${rangs.length}</b><span>élèves actifs</span></div>
      <div class="kpi big"><b>${n}</b><span>exercices complétés</span></div>
      <div class="kpi big"><b>${pct(ok, n)} %</b><span>taux de réussite</span></div>
      <div class="kpi big"><b>${pct(first, n)} %</b><span>réussis du 1<sup>er</sup> coup</span></div>
      <div class="kpi big"><b>${fmtDuree(tm)}</b><span>temps moyen / question</span></div>
    </div>
    <div class="card"><h2>Réussite par groupe et par module</h2>
      ${groupes.length ? `<div class="tbl-wrap"><table class="tbl heatmap"><thead><tr><th>Groupe</th>${MODULES.map((m) => `<th title="${e(m.titre)}">M${m.num}</th>`).join('')}</tr></thead><tbody>
      ${groupes.map((g) => `<tr><th>${e(nomGroupe(g))}</th>${MODULES.map((m) => {
        const ma = lignes.filter((a) => a.groupe === g && a.module === m.id);
        if (!ma.length) return '<td class="heat none">—</td>';
        const r = pct(ma.filter((a) => a.resultat > 0).length, ma.length);
        return `<td class="heat" style="--r:${r}" title="${ma.length} exercices">${r} %</td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune donnée pour ces filtres.</p>'}
    </div>
    <div class="card">
      <h2>Résultats par élève <span class="muted small">— clique sur un élève pour ouvrir sa fiche</span></h2>
      ${rangs.length ? `<div class="tbl-wrap"><table class="tbl students">
        <thead><tr><th>Groupe</th><th>Élève</th><th>Exercices</th><th>Réussite</th><th>1<sup>er</sup> coup</th><th>Temps moyen</th><th>Thèmes en difficulté</th><th>Dernière activité</th></tr></thead>
        <tbody>${rangs.map((r) => { const t = pct(r.ok, r.n); return `<tr class="clickable" data-code="${e(r.code)}">
          <td>${e(nomGroupe(r.groupe))}</td><td><b>${e(ini(r.code))}</b></td><td>${r.n}</td>
          <td><span class="rate ${tauxClasse(t)}">${t} %</span></td><td>${pct(r.first, r.n)} %</td><td>${fmtDuree(r.temps / r.n)}</td>
          <td>${r.faibles.length ? r.faibles.slice(0, 3).map((k) => `<span class="weak-tag">${e(etiquetteTheme(k))}</span>`).join(' ') : '<span class="muted">—</span>'}</td>
          <td class="muted">${fmtDate(r.last)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Aucune tentative pour ces filtres.</p>'}
    </div>
    <div id="fiche"></div>`;
  lierFiltres(corps, ongletEleves);
  corps.querySelectorAll('tr[data-code]').forEach((tr) => { tr.onclick = () => ficheEleve(tr.dataset.code, lignes); });
}

async function ficheEleve(code, lignes) {
  const box = document.getElementById('fiche');
  const miens = lignes.filter((a) => a.code === code).sort((a, b) => (a.date < b.date ? 1 : -1));
  const themes = {};
  miens.forEach((a) => { const k = `${a.module}/${a.theme}`; const t = themes[k] = themes[k] || { n: 0, ok: 0, t: 0 }; t.n++; t.t += a.temps; if (a.resultat > 0) t.ok++; });
  box.innerHTML = `<div class="card detail">
    <div class="card-head"><h2>${e(ini(code))} — ${e(nomGroupe((S.decouperCode(code) || {}).groupe || ''))}</h2><button class="btn btn-ghost" id="fermer">Fermer</button></div>
    ${S.LOCAL ? '' : '<p id="etatCompte" class="muted">Vérification du compte…</p>'}
    <div class="t-grid">
      <div><h3>Par thème</h3><table class="tbl"><thead><tr><th>Thème</th><th>Essais</th><th>Réussite</th><th>Temps moy.</th></tr></thead><tbody>
        ${Object.entries(themes).sort().map(([k, t]) => { const r = pct(t.ok, t.n); return `<tr><td>${e(etiquetteTheme(k))}</td><td>${t.n}</td><td><span class="rate ${tauxClasse(r)}">${r} %</span></td><td>${fmtDuree(t.t / t.n)}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div><h3>Dernières réponses</h3><div class="tbl-wrap tall"><table class="tbl small"><thead><tr><th>Date</th><th>Question</th><th>Réponse</th><th>Attendu</th><th></th></tr></thead><tbody>
        ${miens.slice(0, 80).map((a) => `<tr><td class="muted">${fmtDate(a.date)}</td><td>${e(a.question)}</td><td>${e(a.reponse)}</td><td>${e(a.attendu)}</td><td>${a.resultat === 1 ? '✓' : a.resultat === 2 ? '↻' : '✕'}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div></div>`;
  box.querySelector('#fermer').onclick = () => { box.innerHTML = ''; };
  box.scrollIntoView({ behavior: 'smooth' });
  if (S.LOCAL) return;
  try {
    const info = await apiT('studentInfo', { code });
    const p = box.querySelector('#etatCompte');
    const pr = info.progression || {};
    p.innerHTML = `Compte : ${info.nipDefini ? '🔑 NIP défini' : '⚠️ aucun NIP (l\'élève en choisira un à sa prochaine connexion)'}${info.maj ? ` · progression mise à jour le ${fmtDate(info.maj)}` : ''}<br>⭐ Niveau ${B.niveau(pr.xp)} (${pr.xp || 0} XP) · 🔥 ${B.serieJours(pr.jours)} jour(s) de suite · 🏅 ${(pr.badges || []).length} badge(s) ${(pr.badges || []).map((id) => (B.BADGES.find((b) => b.id === id) || {}).icone || '').join(' ')} `;
    if (info.nipDefini) {
      const b = h('button', { class: 'btn btn-sm btn-ghost danger' }, 'Réinitialiser le NIP');
      p.appendChild(b);
      deuxClics(b, async () => { await apiT('resetStudentPin', { code }); toast('NIP réinitialisé : l\'élève en choisira un nouveau. Sa progression est conservée.', 'ok', 5000); ficheEleve(code, lignes); });
    }
  } catch (err) { box.querySelector('#etatCompte').textContent = err.message; }
}

/* ---------- 🔥 Thèmes difficiles ---------- */
function ongletThemes() {
  const corps = document.getElementById('corps');
  const lignes = filtrer();
  const groupes = [...new Set(lignes.map((a) => a.groupe))].sort();
  const cles = [];
  MODULES.forEach((m) => Object.keys(m.themes).forEach((t) => cles.push(`${m.id}/${t}`)));
  const stat = (filtre) => { const l = lignes.filter(filtre); return { n: l.length, ok: l.filter((a) => a.resultat > 0).length }; };
  const lignesThemes = cles.map((k) => ({ k, ...stat((a) => `${a.module}/${a.theme}` === k) })).filter((x) => x.n);
  const pires = [...lignesThemes].filter((x) => x.n >= 5).sort((a, b) => a.ok / a.n - b.ok / b.n).slice(0, 8);
  corps.innerHTML = `${filtresHtml()}
    <div class="card"><h2>À cibler en mini-leçon</h2>
      ${pires.length ? `<ul class="hard">${pires.map((x) => { const r = pct(x.ok, x.n); return `<li><span>${e(etiquetteTheme(x.k))} <span class="muted small">(${x.n} essais)</span></span><span class="mini-bar"><span style="width:${r}%"></span></span><b>${r} %</b></li>`; }).join('')}</ul>` : '<p class="muted">Pas encore assez de données (5 essais par thème).</p>'}
    </div>
    <div class="card"><h2>Carte de chaleur : thème × groupe</h2>
      ${lignesThemes.length ? `<div class="tbl-wrap"><table class="tbl heatmap"><thead><tr><th>Thème</th>${groupes.map((g) => `<th>${e(nomGroupe(g))}</th>`).join('')}</tr></thead><tbody>
      ${lignesThemes.map((x) => `<tr><th>${e(etiquetteTheme(x.k))}</th>${groupes.map((g) => { const s = stat((a) => a.groupe === g && `${a.module}/${a.theme}` === x.k); if (!s.n) return '<td class="heat none">—</td>'; const r = pct(s.ok, s.n); return `<td class="heat" style="--r:${r}" title="${s.n} essais">${r} %</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Aucune donnée pour ces filtres.</p>'}
    </div>`;
  lierFiltres(corps, ongletThemes);
}

/* ---------- 🏫 Mes groupes ---------- */
function ongletGroupes() {
  const corps = document.getElementById('corps');
  const admin = T.session.role === 'admin';
  const actives = T.ecoles.filter((x) => x.actif);
  const proprios = [{ identifiant: 'admin', nom: 'Administrateur' }, ...T.enseignants.filter((x) => x.actif)];
  corps.innerHTML = `
    <form class="card form-inline" id="fGroupe">
      <h2>Créer un groupe</h2>
      ${actives.length ? `
      <label>École<select name="ecole" required>${actives.map((x) => `<option value="${e(x.id)}">${e(x.nom)}</option>`).join('')}</select></label>
      <label>Numéro<input name="numero" inputmode="numeric" maxlength="4" placeholder="201" required></label>
      ${admin ? `<label>Enseignant<select name="proprietaire">${proprios.map((p) => `<option value="${e(p.identifiant)}">${e(p.nom)}</option>`).join('')}</select></label>` : ''}
      <button class="btn btn-primary">Créer</button>
      <p class="muted small">Les élèves choisissent l'école dans une liste, puis entrent ce numéro et leurs initiales. Dans une école, un numéro n'appartient qu'à un seul enseignant.</p>`
      : `<p class="mode-local">${admin ? 'Crée d\'abord une école dans l\'onglet 🏛️ Écoles.' : 'Aucune école active : demande à l\'administrateur d\'en créer une.'}</p>`}
    </form>
    <div class="card"><h2>${admin ? 'Tous les groupes' : 'Mes groupes'}</h2>
      ${T.groupes.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Groupe</th><th>Enseignant</th><th>Tentatives</th><th>Actions</th></tr></thead><tbody>
      ${T.groupes.slice().sort((a, b) => a.groupe.localeCompare(b.groupe)).map((g) => `<tr>
        <td><b>${e(nomGroupe(g.groupe))}</b> <span class="muted small">${e(g.groupe)}</span></td>
        <td>${admin ? `<select data-reattribuer="${e(g.groupe)}">${proprios.map((p) => `<option value="${e(p.identifiant)}" ${p.identifiant === g.enseignant ? 'selected' : ''}>${e(p.nom)}</option>`).join('')}</select>` : e(g.nomEnseignant)}</td>
        <td>${g.resultats}</td>
        <td class="actions-cell"><button class="btn btn-sm btn-ghost danger" data-effacer="${e(g.groupe)}">Effacer les résultats</button><button class="btn btn-sm btn-ghost danger" data-supprimer="${e(g.groupe)}">Supprimer le groupe</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Aucun groupe pour l\'instant.</p>'}
      <p class="muted small">« Effacer les résultats » garde le groupe et les NIP des élèves. « Supprimer le groupe » retire aussi les comptes élèves. Pense à exporter le CSV avant (⚙️ Mon compte).</p>
    </div>
    ${admin && T.orphelins.length ? `<div class="card"><h2>Résultats orphelins</h2><p class="muted small">Tentatives dont le groupe n'existe plus : attribue-les à un enseignant pour les revoir, ou efface-les.</p>
      <table class="tbl"><tbody>${T.orphelins.map((o) => `<tr><td>${e(o.groupe)}</td><td>${o.resultats} tentatives</td><td><select data-reattribuer="${e(o.groupe)}"><option value="">Attribuer à…</option>${proprios.map((p) => `<option value="${e(p.identifiant)}">${e(p.nom)}</option>`).join('')}</select></td><td><button class="btn btn-sm btn-ghost danger" data-effacer="${e(o.groupe)}">Effacer</button></td></tr>`).join('')}</tbody></table></div>` : ''}`;
  const f = corps.querySelector('#fGroupe');
  if (f.querySelector('[name=numero]')) f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    try { await apiT('createGroup', d); toast(`Groupe ${d.numero} créé.`, 'ok'); charger(); } catch (err) { toast(err.message, 'err'); }
  });
  corps.querySelectorAll('[data-reattribuer]').forEach((sel) => { sel.onchange = async () => { if (!sel.value) return; try { await apiT('reassignGroup', { groupe: sel.dataset.reattribuer, proprietaire: sel.value }); toast('Groupe réattribué.', 'ok'); charger(); } catch (err) { toast(err.message, 'err'); } }; });
  corps.querySelectorAll('[data-effacer]').forEach((b) => deuxClics(b, async () => { const r = await apiT('deleteGroup', { groupe: b.dataset.effacer, resultatsSeulement: true }); toast(`${r.supprimees} tentative(s) effacée(s).`, 'ok'); charger(); }));
  corps.querySelectorAll('[data-supprimer]').forEach((b) => deuxClics(b, async () => { await apiT('deleteGroup', { groupe: b.dataset.supprimer }); toast('Groupe supprimé.', 'ok'); charger(); }, 'Supprimer vraiment?'));
}

/* ---------- 🏛️ Écoles (administrateur) ---------- */
function ongletEcoles() {
  const corps = document.getElementById('corps');
  corps.innerHTML = `
    <form class="card form-inline" id="fEcole"><h2>Ajouter une école</h2>
      <label>Code court<input name="id" maxlength="6" placeholder="ESL" style="text-transform:uppercase" required></label>
      <label>Nom visible par les élèves<input name="nom" maxlength="80" placeholder="École secondaire du Lac" required></label>
      <button class="btn btn-primary">Ajouter</button>
      <p class="muted small">Le code (2 à 6 lettres ou chiffres) fait partie du code des élèves (ex. ESL-201-DL) : il ne change plus. Le nom peut être modifié.</p>
    </form>
    <div class="card"><h2>Écoles</h2>
      ${T.ecoles.length ? `<table class="tbl"><thead><tr><th>Code</th><th>Nom</th><th>Groupes</th><th>Active</th><th></th></tr></thead><tbody>
      ${T.ecoles.map((x) => `<tr><td><code class="code">${e(x.id)}</code></td>
        <td><input class="inline-input" data-renommer="${e(x.id)}" value="${e(x.nom)}" maxlength="80"></td><td>${x.groupes}</td>
        <td><label class="switch"><input type="checkbox" data-active="${e(x.id)}" ${x.actif ? 'checked' : ''}><span>${x.actif ? 'oui' : 'non'}</span></label></td>
        <td>${x.groupes ? '' : `<button class="btn btn-sm btn-ghost danger" data-suppr="${e(x.id)}">Supprimer</button>`}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Aucune école. Ajoute tes écoles avant de créer des groupes.</p>'}
    </div>`;
  corps.querySelector('#fEcole').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target));
    try { await apiT('saveSchool', { nouveau: true, id: d.id.toUpperCase(), nom: d.nom }); toast('École ajoutée.', 'ok'); charger(); } catch (err) { toast(err.message, 'err'); }
  });
  corps.querySelectorAll('[data-renommer]').forEach((inp) => { inp.onchange = async () => { try { await apiT('saveSchool', { id: inp.dataset.renommer, nom: inp.value }); toast('Nom modifié.', 'ok'); } catch (err) { toast(err.message, 'err'); } }; });
  corps.querySelectorAll('[data-active]').forEach((cb) => { cb.onchange = async () => { try { await apiT('saveSchool', { id: cb.dataset.active, actif: cb.checked }); charger(); } catch (err) { toast(err.message, 'err'); } }; });
  corps.querySelectorAll('[data-suppr]').forEach((b) => deuxClics(b, async () => { await apiT('deleteSchool', { id: b.dataset.suppr }); toast('École supprimée.', 'ok'); charger(); }));
}

/* ---------- 🧑‍🏫 Enseignants (administrateur) ---------- */
function ongletEnseignants() {
  const corps = document.getElementById('corps');
  corps.innerHTML = `
    <form class="card form-inline" id="fEns"><h2>Ajouter un enseignant</h2>
      <label>Nom<input name="nom" maxlength="60" placeholder="Mme Roy" required></label>
      <label>Identifiant<input name="identifiant" maxlength="20" placeholder="mroy" autocapitalize="off" required></label>
      <label>NIP de départ<input name="pin" inputmode="numeric" maxlength="8" placeholder="4 à 8 chiffres" required></label>
      <button class="btn btn-primary">Ajouter</button>
      <p class="muted small">Transmets l'identifiant et le NIP à l'enseignant : il pourra changer son NIP dans ⚙️ Mon compte. Chaque enseignant ne voit que ses groupes.</p>
    </form>
    <div class="card"><h2>Comptes enseignants</h2>
      ${T.enseignants.length ? `<table class="tbl"><thead><tr><th>Nom</th><th>Identifiant</th><th>Groupes</th><th>Actif</th><th>Nouveau NIP</th><th></th></tr></thead><tbody>
      ${T.enseignants.map((x) => `<tr><td>${e(x.nom)}</td><td><code>${e(x.identifiant)}</code></td><td>${(x.groupes || []).map((g) => e(nomGroupe(g))).join(', ') || '—'}</td>
        <td><label class="switch"><input type="checkbox" data-actif="${e(x.identifiant)}" ${x.actif ? 'checked' : ''}><span>${x.actif ? 'oui' : 'non'}</span></label></td>
        <td><form class="mini-form" data-nip="${e(x.identifiant)}"><input name="pin" inputmode="numeric" maxlength="8" placeholder="NIP"><button class="btn btn-sm btn-ghost">OK</button></form></td>
        <td>${(x.groupes || []).length ? '' : `<button class="btn btn-sm btn-ghost danger" data-suppr="${e(x.identifiant)}">Supprimer</button>`}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Aucun compte enseignant pour l\'instant.</p>'}
    </div>`;
  corps.querySelector('#fEns').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target));
    try { await apiT('saveTeacher', { nouveau: true, ...d, identifiant: d.identifiant.toLowerCase() }); toast('Compte créé.', 'ok'); charger(); } catch (err) { toast(err.message, 'err'); }
  });
  corps.querySelectorAll('[data-actif]').forEach((cb) => { cb.onchange = async () => { try { await apiT('saveTeacher', { identifiant: cb.dataset.actif, actif: cb.checked }); charger(); } catch (err) { toast(err.message, 'err'); } }; });
  corps.querySelectorAll('form[data-nip]').forEach((f) => f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try { await apiT('saveTeacher', { identifiant: f.dataset.nip, pin: f.pin.value.trim() }); toast('Nouveau NIP enregistré.', 'ok'); f.reset(); } catch (err) { toast(err.message, 'err'); }
  }));
  corps.querySelectorAll('[data-suppr]').forEach((b) => deuxClics(b, async () => { await apiT('deleteTeacher', { identifiant: b.dataset.suppr }); toast('Compte supprimé.', 'ok'); charger(); }));
}

/* ---------- ⚙️ Mon compte ---------- */
function ongletCompte() {
  const corps = document.getElementById('corps');
  const lignes = filtrer();
  corps.innerHTML = `
    <div class="card"><h2>Exporter les résultats (CSV, compatible Excel)</h2>
      <p class="muted small">L'export suit les filtres de l'onglet 👥 Élèves (actuellement : ${lignes.length} tentative${lignes.length > 1 ? 's' : ''}).</p>
      <div class="actions" style="justify-content:flex-start"><button class="btn btn-primary" id="csvDetail">⬇ CSV détaillé (une ligne par question)</button><button class="btn btn-ghost" id="csvSommaire">⬇ CSV sommaire (une ligne par élève)</button></div>
    </div>
    ${S.LOCAL ? '' : `<form class="card form-inline" id="fMonNip"><h2>Changer mon NIP</h2>
      <label>Nouveau NIP<input name="n1" type="password" inputmode="numeric" maxlength="8" required></label>
      <label>Confirme<input name="n2" type="password" inputmode="numeric" maxlength="8" required></label>
      <button class="btn btn-primary">Enregistrer</button></form>`}`;
  corps.querySelector('#csvDetail').onclick = () => exporterDetail(lignes);
  corps.querySelector('#csvSommaire').onclick = () => exporterSommaire(agreger(lignes));
  const f = corps.querySelector('#fMonNip');
  if (f) f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (f.n1.value !== f.n2.value) { toast('Les deux NIP ne sont pas identiques.', 'err'); return; }
    try { await apiT('changePin', { nouveau: f.n1.value }); toast('NIP modifié.', 'ok'); f.reset(); } catch (err) { toast(err.message, 'err'); }
  });
}

/* ---------- CSV : point-virgule + BOM pour Excel en français ---------- */
const cell = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function telecharger(nom, rangees) {
  const blob = new Blob(['﻿' + rangees.map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: nom });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const jour = () => new Date().toISOString().slice(0, 10);
function exporterDetail(lignes) {
  const res = { 0: 'Échec', 1: 'Réussi (1er essai)', 2: 'Réussi (2e essai)' };
  telecharger(`algebre-detaille-${jour()}.csv`, [
    ['Date', 'Groupe', 'Élève (code)', 'Module', 'Thème', 'Niveau', 'Question', 'Réponse de l\'élève', 'Réponse attendue', 'Résultat', 'Essais', 'Temps (s)', 'Mode'],
    ...lignes.map((a) => [fmtDate(a.date), nomGroupe(a.groupe), a.code, `M${MODULE_BY_ID[a.module]?.num || ''} ${MODULE_BY_ID[a.module]?.titre || a.module}`, themeLabel(a.module, a.theme), a.niveau,
      String(a.question).replace(/^'/, ''), String(a.reponse).replace(/^'/, ''), String(a.attendu).replace(/^'/, ''), res[a.resultat] ?? a.resultat, a.essais, a.temps, a.mode])]);
}
function exporterSommaire(rangs) {
  telecharger(`algebre-sommaire-${jour()}.csv`, [
    ['Groupe', 'Élève (code)', 'Exercices', 'Réussite (%)', '1er coup (%)', 'Temps moyen (s)', 'Thèmes en difficulté', 'Dernière activité', ...MODULES.map((m) => `M${m.num} réussite (%)`)],
    ...rangs.map((r) => [nomGroupe(r.groupe), r.code, r.n, pct(r.ok, r.n), pct(r.first, r.n), Math.round(r.temps / r.n), r.faibles.map(etiquetteTheme).join(', '), fmtDate(r.last),
      ...MODULES.map((m) => { const ts = Object.entries(r.themes).filter(([k]) => k.startsWith(m.id + '/')); const n = ts.reduce((s, [, t]) => s + t.n, 0); return n ? pct(ts.reduce((s, [, t]) => s + t.ok, 0), n) : ''; })])]);
}

/* ---------- Démarrage ---------- */
if (T.session && (T.token || S.LOCAL)) charger(); else vueConnexion();
