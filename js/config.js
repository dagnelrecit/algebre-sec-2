/* ============================================================
   CONFIGURATION — le seul fichier à modifier après le déploiement
   ============================================================ */

// Colle ici l'URL de ton application Web Google Apps Script
// (elle se termine par /exec). Tant que la valeur reste
// "VOTRE_URL_ICI", l'application fonctionne en « mode local » :
// les élèves pratiquent, mais rien n'est envoyé à la feuille Google.
// ⚠️ Utilise la feuille Google d'Algèbre² (pas celle des verbes irréguliers).
export const GOOGLE_SCRIPT_URL = "VOTRE_URL_ICI";

export const CONFIG = {
  QUESTIONS_PAR_SERIE: 10,   // choix proposé par défaut (5, 10, 15 ou 20)
  ESSAIS_PAR_QUESTION: 2,    // essais avant d'afficher la démarche
  NIP_LOCAL: '2468',         // NIP de l'espace enseignant en MODE LOCAL seulement
  NOM_APP: 'Algèbre²',
  SOUS_TITRE: 'Entraînement — 2e secondaire',
};
