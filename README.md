# Algèbre² — Entraînement en algèbre (2e secondaire)

Application Web statique (HTML, CSS, JavaScript) hébergée gratuitement sur **GitHub Pages**, avec une **feuille Google** comme base de données (via Google Apps Script).
Elle fonctionne **exactement comme l'application IrregularVerbs** : écoles, comptes enseignants, NIP des élèves, progression sur tous les appareils. Elle utilise toutefois **sa propre feuille Google**, avec ses propres enseignants.

---

## 📁 Contenu du dossier

```
index.html            ← application élève
enseignant.html       ← espace enseignant (identifiant + NIP)
css/style.css         ← design (clair/sombre, responsive)
js/config.js          ← ⚠️ LE fichier à modifier (URL du script)
js/app.js             ← logique élève (séries, rétroaction, bilan)
js/teacher.js         ← logique enseignant
js/storage.js         ← connexion, progression, envoi hors ligne
js/math/              ← moteur algébrique (correction, démarches)
js/gen/               ← générateurs des 5 modules + schémas SVG
data/enonces.js       ← ✏️ banques d'énoncés modifiables (module 4)
lib/katex/            ← affichage mathématique (inclus : fonctionne sur un réseau filtré)
sw.js, manifest.webmanifest, assets/  ← mode hors ligne et application installable
apps-script/Code.gs   ← code à coller dans Google Apps Script
tests/                ← tests automatiques (facultatif, avec Node.js)
```

---

## Étape 1 — Créer la base de données (Google Sheets), environ 10 minutes

> ⚠️ Crée une **nouvelle** feuille Google : ne réutilise pas celle des verbes irréguliers.

1. Va sur <https://sheets.google.com> et crée une **feuille vide**. Nomme-la par exemple « Algèbre² — résultats ».
2. Menu **Extensions › Apps Script**.
3. Efface le contenu de `Code.gs`, colle **tout** le contenu du fichier `apps-script/Code.gs`, puis clique sur 💾 **Enregistrer**.
4. Retourne dans la feuille et **recharge la page** (F5). Un menu **« Algèbre² »** apparaît à droite d'« Aide ».
5. Menu **Algèbre² › 1. Préparer la feuille**. Google demande une autorisation la première fois :
   *Continuer › choisis ton compte › Paramètres avancés › Accéder au projet (non sécurisé) › Autoriser*. C'est normal : c'est ton propre script.
6. Menu **Algèbre² › 2. Définir ou changer le NIP administrateur**, puis choisis un NIP de 4 à 8 chiffres. Sur le site, tu te connecteras avec l'identifiant **admin** et ce NIP.
7. Dans Apps Script : **Déployer › Nouveau déploiement**
   - Type (⚙️) : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - Clique sur **Déployer** et copie l'**URL de l'application Web** (elle se termine par `/exec`).

> 💡 **Test rapide :** colle l'URL suivie de `?action=ping` dans ton navigateur. Tu dois voir `{"ok":true,"message":"Le script fonctionne.", "app":"algebre2", …}`.

> ⚠️ **Si tu modifies `Code.gs` plus tard :** *Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version › Déployer*. L'URL reste la même.

## Étape 2 — Brancher le site sur la feuille

Ouvre `js/config.js` et remplace `VOTRE_URL_ICI` par ton URL :

```js
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfy…/exec";
```

## Étape 3 — Mettre en ligne sur GitHub Pages, environ 5 minutes

1. Connecte-toi à <https://github.com> et clique sur **New repository**. Nom suggéré : `algebre-sec2`. Choisis **Public** et clique sur **Create repository**.
2. Clique sur **uploading an existing file**, glisse **tout le contenu** du dossier (pas le dossier lui-même : `index.html` doit être à la racine), puis **Commit changes**.
3. Va dans **Settings › Pages**. Sous *Branch*, choisis **main** et **/(root)**, puis clique sur **Save**.
4. Après 1 ou 2 minutes, ton site est en ligne à l'adresse `https://TON-NOM.github.io/algebre-sec2/`.
5. L'espace enseignant se trouve à `…/algebre-sec2/enseignant.html` (il y a aussi un lien discret au bas de l'application).

> Pour mettre le site à jour, téléverse le fichier modifié dans GitHub. Si les élèves voient encore l'ancienne version, change `VERSION` dans `sw.js` (ex. `alg2-v2`).

## Étape 4 — Première utilisation (administrateur)

1. Ouvre `enseignant.html` et connecte-toi : identifiant **admin** et ton NIP.
2. Onglet **🏛️ Écoles** : ajoute tes écoles avec un code court (ex. `ESL`) et le nom visible par les élèves.
3. Onglet **🧑‍🏫 Enseignants** : crée les comptes (nom, identifiant, NIP de départ), puis transmets l'identifiant et le NIP.
4. Chaque enseignant crée ses groupes dans **🏫 Mes groupes** en choisissant l'école.

---

## 👩‍🏫 Utilisation en classe

### Pour les élèves
- **Connexion** : l'élève choisit son **école** dans la liste, puis entre son numéro de groupe et ses initiales. Son code est par exemple École du Lac · `201-DL`. Si deux élèves d'un groupe ont les mêmes initiales, l'un ou l'une ajoute un chiffre (`DL2`). Aucun nom complet n'est enregistré (Loi 25).
- **NIP personnel** : à la première connexion, l'élève choisit un NIP de 4 chiffres. Ce NIP est ensuite demandé à chaque connexion, ce qui empêche un autre élève d'utiliser son code. En cas d'oubli, l'enseignant le réinitialise dans la fiche de l'élève, et la progression est conservée.
- **Progression sur tous les appareils** : la progression (réussite par thème, meilleure série) est sauvegardée dans la feuille Google. L'élève la retrouve sur n'importe quel Chromebook, ordinateur ou iPad.
- Sur un **appareil partagé**, les codes déjà utilisés apparaissent comme raccourcis, mais le NIP est toujours demandé. La session se ferme à la fermeture du navigateur.
- **Hors ligne** : si le Wi-Fi coupe, l'élève continue. Les réponses s'envoient automatiquement au retour du réseau (indicateur ☁️ / ⏳ en haut à droite).
- **Accessibilité** : bouton **Aa** (lecture facilitée), mode sombre 🌙, clavier mathématique virtuel. Sur iPad, le clavier natif ne cache pas la question.

### Les 5 modules
| Module | Thèmes |
|---|---|
| 1. Anatomie | nombre de termes et nom (monôme, binôme, trinôme, polynôme) · coefficient (y compris le coefficient invisible), variables, exposant · terme constant · degré · termes semblables (piège `ba²` = `a²b`, « lequel n'est pas semblable? ») |
| 2. Réduction | addition et soustraction (signe − devant la parenthèse) · multiplication, division, distributivité · chaînes d'opérations |
| 3. Valeur numérique | 1 variable · 2 variables · défi (3 variables, quotient, piège `−x²`) |
| 4. Modélisation | traduction (banque) · problèmes en contexte (âges, argent, consécutifs) · périmètre et aire avec schéma |
| 5. Équations | N1 une étape · N2 deux étapes · N3 inconnue des deux côtés · N4 parenthèses · N5 complexes (fractions) · géométrie (trouver x avec le périmètre). Des **décimales** apparaissent aux niveaux 2, 3 et 5 (ex. `3,5x − 7 + 2x = 16,1`) |

- **Séries** de 5, 10, 15 ou 20 questions. La difficulté est progressive (facile → difficile) ou fixe.
- **2 essais par question**, puis la **démarche étape par étape** : termes semblables en couleur, opération inverse faite des deux côtés, **validation** de la solution.
- **Correction tolérante** : l'ordre des termes est libre, la virgule décimale et `x = 4` sont acceptés, et `1x` est accepté avec un rappel. Une réponse équivalente mais **non réduite** est signalée comme telle.
- **Défi mixte** : il pige davantage dans les thèmes les moins réussis par l'élève. **M'exercer sur mes erreurs** propose de nouvelles questions semblables.

### Rôles : administrateur et enseignants
| | Administrateur (`admin`) | Enseignant |
|---|---|---|
| Résultats visibles | tous les groupes | **ses groupes seulement** |
| Créer / supprimer des groupes | tous | les siens |
| Comptes enseignants (ajouter, désactiver, nouveau NIP) | ✅ | ❌ |
| Réattribuer un groupe, gérer les résultats « orphelins » | ✅ | ❌ |
| Gérer les écoles (ajouter, renommer, désactiver) | ✅ | ❌ |
| Réinitialiser le NIP d'un élève | tous | ses élèves |
| Export CSV, changer son NIP | ✅ | ✅ |

- Dans une même école, un numéro de groupe n'appartient qu'à un seul enseignant, mais deux écoles peuvent chacune avoir un groupe 201.
- Un élève qui entre un groupe qui n'existe pas est bloqué avec un message.
- Le tri des données se fait dans le script Google : un enseignant ne reçoit jamais les résultats des autres groupes.
- Les NIP sont hachés (jamais en clair). Après 5 essais ratés, l'identifiant est bloqué 5 minutes. La session enseignant expire après 6 heures d'inactivité ou à la fermeture de l'onglet.

### Pour l'enseignant (identifiant + NIP)
- **👥 Élèves** : exercices, taux de réussite, réussite du 1er coup, temps moyen, thèmes en difficulté et carte de chaleur groupe × module. Filtres par groupe, élève, module et période.
- **Fiche élève** (clic sur un élève) : état du compte (NIP défini ou non), bouton **Réinitialiser le NIP**, réussite par thème et toutes les réponses données.
- **🔥 Thèmes difficiles** : thèmes à cibler en mini-leçon et carte de chaleur thème × groupe.
- **🏫 Mes groupes** : création, effacement des résultats (le groupe est gardé) ou suppression complète, avec confirmation en deux clics.
- **⚙️ Mon compte** : export CSV (détaillé ou sommaire, compatible Excel) et changement de son NIP.

---

## ✏️ Ajouter ou modifier des banques d'énoncés

Ouvre `data/enonces.js`. Chaque énoncé est une ligne comme celle-ci :

```js
{ texte: '{a} de moins que le triple d\'un nombre {v}', reponse: '3{v}-{a}', niveau: 2 },
```

| Champ | Rôle |
|---|---|
| `texte` | Énoncé affiché (mets `\'` devant chaque apostrophe) |
| `reponse` | Expression attendue « à la calculatrice » : `*` multiplier, `/` diviser, `^2` carré, parenthèses permises |
| `niveau` | 1, 2 ou 3 (la difficulté progressive pige dans les niveaux) |
| `reduit` | `true` : l'élève doit donner l'expression **réduite** (sinon, toute expression équivalente est acceptée) |

Paramètres aléatoires : `{a}` `{b}` `{c}` `{d}` donnent des nombres de 2 à 9 (tous différents), et `{v}` `{w}` des lettres.
La correction est **algébrique** : pour `5({v}+{w})`, la réponse `5x+5y` est aussi acceptée.

Les autres modules sont générés par programme : les gabarits se trouvent dans `js/gen/m2-reduction.js`, `m3-valeur.js` et `m5-equations.js` (un gabarit par ligne).

**Vérifier après une modification** (facultatif, avec [Node.js](https://nodejs.org)) :
```bash
node tests/generators.test.mjs   # génère des milliers de questions et vérifie chaque réponse
node tests/engine.test.mjs       # moteur de correction
node tests/appsscript.test.cjs   # script Google (simulé)
```

## ⚙️ Réglages (`js/config.js`)
| Réglage | Par défaut | Effet |
|---|---|---|
| `QUESTIONS_PAR_SERIE` | 10 | Choix proposé par défaut |
| `ESSAIS_PAR_QUESTION` | 2 | Essais avant d'afficher la démarche |
| `NIP_LOCAL` | 2468 | NIP de l'espace enseignant en **mode local** seulement (sans feuille Google) |

## ❓ Dépannage
| Problème | Solution |
|---|---|
| « 📴 Local » s'affiche | L'URL n'est pas configurée dans `js/config.js`. |
| « Aucun NIP administrateur » | Dans la feuille : menu *Algèbre² › Définir ou changer le NIP administrateur*. |
| Un enseignant a oublié son NIP | L'administrateur entre un nouveau NIP dans l'onglet Enseignants. |
| L'administrateur a oublié son NIP | Dans la feuille : menu *Algèbre² › Définir ou changer le NIP administrateur*. |
| « Ce groupe n'existe pas dans cette école » | L'enseignant doit d'abord créer ce groupe dans **Mes groupes**, dans la bonne école. |
| Un élève a oublié son NIP | Dans la fiche de l'élève : **Réinitialiser le NIP**. L'élève en choisit un nouveau, et sa progression est conservée. |
| « Ce code a déjà un NIP » à la première connexion | Un autre élève du groupe a les mêmes initiales : ajouter un chiffre (ex. AB2). |
| 🔑 « Reconnecte-toi » | La session de l'élève a expiré (après 180 jours ou une réinitialisation du NIP). Il se reconnecte avec son NIP, et les réponses en attente partent automatiquement. |
| Les résultats n'arrivent pas | Vérifie que le déploiement est bien « Qui a accès : **Tout le monde** » et que l'URL se termine par `/exec`. |
| Une modification de `Code.gs` ne s'applique pas | Publie une **nouvelle version** du déploiement (voir l'étape 1). |
