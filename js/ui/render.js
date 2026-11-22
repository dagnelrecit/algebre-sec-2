/**
 * render.js — Affichage mathématique (KaTeX inclus dans /lib/katex) et petits outils DOM.
 * Si KaTeX ne se charge pas, un rendu texte de secours est utilisé.
 */

/** Convertit du LaTeX simple en texte lisible (secours sans KaTeX). */
export function latexToText(latex) { return fallbackText(latex).replace(/\s+/g, ' ').trim(); }
function fallbackText(latex) {
  return latex
    .replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\checkmark/g, '✓')
    .replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³').replace(/\^\{([^}]*)\}/g, '^$1')
    .replace(/\{,\}/g, ',').replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\[a-z]+/g, ' ').replace(/[{}]/g, '');
}

/** Rend un élément à partir de son attribut data-tex. */
export function renderTexEl(el) {
  const latex = el.dataset.tex;
  const display = el.dataset.display === '1';
  if (window.katex) {
    try { window.katex.render(latex, el, { throwOnError: false, displayMode: display, strict: 'ignore', trust: false }); return; } catch (e) { /* secours */ }
  }
  el.textContent = fallbackText(latex);
}

/** Rend tous les éléments [data-tex] d'un conteneur. */
export function renderMath(root = document) {
  root.querySelectorAll('[data-tex]').forEach(renderTexEl);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escAttr = escapeHtml;

/** Balise de LaTeX à rendre. */
export function texSpan(latex, display = false, cls = '') {
  return `<span class="tex ${cls}" data-tex="${escAttr(latex)}"${display ? ' data-display="1"' : ''}></span>`;
}

/** Convertit un texte contenant des segments \( … \) en HTML avec spans KaTeX. */
export function inlineMath(html) {
  return String(html ?? '').replace(/\\\((.+?)\\\)/g, (_, l) => texSpan(l));
}

/** Créateur d'élément compact */
export function h(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
  }
  if (html) el.innerHTML = html;
  return el;
}

export function toast(msg, kind = 'info', ms = 2600, html = false) {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(box); }
  const t = h('div', { class: `toast toast-${kind}` }, html ? msg : escapeHtml(msg));
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}

export function fmtDuree(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return `${sec} s`;
  return `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`;
}
export function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('fr-CA') + ' ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}
export function pct(ok, n) { return n ? Math.round((100 * ok) / n) : 0; }
