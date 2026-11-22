/**
 * maj.js — Détection des mises à jour du site.
 * Au chargement, on lit version.json; puis on le relit régulièrement (toutes les 3 minutes,
 * au retour sur l'onglet et au retour du réseau). Si le numéro change, un bandeau propose de recharger
 * et l'onglet arrête d'envoyer la progression (pour qu'une ancienne version n'écrase jamais la nouvelle).
 */
let versionChargee = null, perime = false;
const ecouteurs = new Set();
export const estPerime = () => perime;
export const surPerime = (fn) => ecouteurs.add(fn);

async function lireVersion() {
  try {
    const rep = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!rep.ok) return null;
    return (await rep.json()).version || null;
  } catch (e) { return null; } // hors ligne : on réessaiera
}

async function verifier() {
  if (perime) return;
  const v = await lireVersion();
  if (!v) return;
  if (versionChargee === null) { versionChargee = v; return; }
  if (v !== versionChargee) {
    perime = true;
    afficherBandeau();
    ecouteurs.forEach((fn) => fn());
  }
}

function afficherBandeau() {
  if (document.getElementById('bandeauMaj')) return;
  const b = document.createElement('div');
  b.id = 'bandeauMaj';
  b.className = 'bandeau-maj';
  b.setAttribute('role', 'alert');
  b.innerHTML = `<span>✨ Une nouvelle version d'Algèbre² est disponible. <span class="muted-inv">Tes réponses déjà données sont sauvegardées.</span></span>
    <button type="button" class="btn btn-sm" id="btnRecharger">Recharger</button>`;
  document.body.prepend(b);
  b.querySelector('#btnRecharger').onclick = () => location.reload();
}

export function surveillerMisesAJour() {
  verifier();
  setInterval(verifier, 3 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifier(); });
  window.addEventListener('online', verifier);
  window.addEventListener('focus', verifier);
}
