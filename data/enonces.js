/**
 * BANQUES D'ÉNONCÉS — Module 4 (Traduction et modélisation)
 * =========================================================
 * Ce fichier peut être modifié SANS toucher au reste de l'application.
 *
 * Chaque énoncé est un objet :
 *   texte   : l'énoncé affiché à l'élève
 *   reponse : l'expression attendue, écrite « à la calculatrice »
 *             (* pour multiplier, / pour diviser, ^2 pour un carré, parenthèses permises)
 *   niveau  : 1 (simple), 2 (intermédiaire) ou 3 (complexe)
 *   reduit  : true si l'élève doit donner l'expression RÉDUITE (sinon, toute expression équivalente est acceptée)
 *
 * Paramètres aléatoires (facultatifs) que vous pouvez utiliser dans texte ET reponse :
 *   {a} {b} {c} {d} : nombres entiers différents entre 2 et 9
 *   {v} {w}         : lettres variables différentes (x, n, a, y, m, p…)
 * Sans paramètre, l'énoncé est toujours le même (ex. : « La somme des carrés de a et de b »).
 *
 * Correction : l'application compare les expressions algébriquement.
 * Ainsi, pour « Le produit de 5 par la somme de a et de b », 5(a+b) et 5a+5b sont acceptées,
 * mais (a+b)^2 ne sera jamais confondu avec a^2+b^2.
 */

export const TRADUCTION = [
  // ---- Niveau 1 : une opération ----
  { texte: 'La somme de {v} et de {a}', reponse: '{v}+{a}', niveau: 1 },
  { texte: 'La différence entre {v} et {a}', reponse: '{v}-{a}', niveau: 1 },
  { texte: 'Le double de {v}', reponse: '2{v}', niveau: 1 },
  { texte: 'Le triple d\'un nombre {v}', reponse: '3{v}', niveau: 1 },
  { texte: 'Le quotient de {v} par {a}', reponse: '{v}/{a}', niveau: 1 },
  { texte: 'Le produit des nombres {v} et {w}', reponse: '{v}*{w}', niveau: 1 },
  { texte: 'Le carré d\'un nombre {v}', reponse: '{v}^2', niveau: 1 },
  { texte: 'Le cube d\'un nombre {v}', reponse: '{v}^3', niveau: 1 },
  { texte: 'La moitié d\'un nombre {v}', reponse: '{v}/2', niveau: 1 },
  { texte: 'Le nombre consécutif au nombre {v}', reponse: '{v}+1', niveau: 1 },
  { texte: 'Le nombre qui précède le nombre {v}', reponse: '{v}-1', niveau: 1 },
  { texte: '{a} de plus qu\'un nombre {v}', reponse: '{v}+{a}', niveau: 1 },
  { texte: '{a} de moins qu\'un nombre {v}', reponse: '{v}-{a}', niveau: 1 },
  { texte: 'L\'âge de Claire dans {a} ans si {v} est son âge actuel', reponse: '{v}+{a}', niveau: 1 },
  { texte: 'L\'âge de Hugo il y a {a} ans si {v} est son âge actuel', reponse: '{v}-{a}', niveau: 1 },

  // ---- Niveau 2 : deux opérations ----
  { texte: '{a} de moins que le triple d\'un nombre {v}', reponse: '3{v}-{a}', niveau: 2 },
  { texte: '{a} augmenté du triple de {v}', reponse: '{a}+3{v}', niveau: 2 },
  { texte: 'La somme de {v} et du double de {w}', reponse: '{v}+2{w}', niveau: 2 },
  { texte: 'Le produit de {a} par la somme de {v} et de {w}', reponse: '{a}({v}+{w})', niveau: 2 },
  { texte: 'La somme des carrés de a et de b', reponse: 'a^2+b^2', niveau: 2 },
  { texte: 'Le carré de la somme de a et de b', reponse: '(a+b)^2', niveau: 2 },
  { texte: 'La somme du double de a et du quart de b', reponse: '2a+b/4', niveau: 2 },
  { texte: 'Le double du carré de {v} augmenté du triple de {v}', reponse: '2{v}^2+3{v}', niveau: 2 },
  { texte: 'Le carré de {v} augmenté du produit des nombres m et n', reponse: '{v}^2+m*n', niveau: 2 },
  { texte: 'Le nombre pair consécutif au nombre 2n', reponse: '2n+2', niveau: 2 },
  { texte: 'Le nombre consécutif au carré du nombre n', reponse: 'n^2+1', niveau: 2 },
  { texte: 'Le nombre qui précède le cube du nombre n', reponse: 'n^3-1', niveau: 2 },
  { texte: 'Le nombre qui précède le nombre p + {a}', reponse: 'p+{a}-1', niveau: 2 },
  { texte: 'L\'âge d\'un père qui a {a} ans de plus que le triple de l\'âge {v} de son fils', reponse: '3{v}+{a}', niveau: 2 },
  { texte: 'Le double d\'un nombre {v}, diminué de {a}', reponse: '2{v}-{a}', niveau: 2 },
  { texte: 'Le double de la différence entre un nombre {v} et {a}', reponse: '2({v}-{a})', niveau: 2 },
  { texte: 'Le périmètre d\'un rectangle de longueur a et de largeur b', reponse: '2a+2b', niveau: 2 },

  // ---- Niveau 3 : plusieurs opérations ----
  { texte: 'Le produit des nombres m et n diminué de la somme de ces deux nombres', reponse: 'm*n-(m+n)', niveau: 3 },
  { texte: 'Le double de la différence entre les carrés de a et de b', reponse: '2(a^2-b^2)', niveau: 3 },
  { texte: 'Le tiers du cube de x augmenté de son double', reponse: 'x^3/3+2x', niveau: 3 },
  { texte: 'La somme du cube d\'un nombre x et de son double', reponse: 'x^3+2x', niveau: 3 },
  { texte: 'Le nombre impair qui précède le nombre impair 2n − 5', reponse: '2n-7', niveau: 3 },
  { texte: 'La somme des aires d\'un carré de côté a et d\'un rectangle de longueur a et de largeur b', reponse: 'a^2+a*b', niveau: 3 },
  { texte: 'Le prix d\'un kilogramme de chocolat qui coûte 0,50 $ de plus que le double du prix p d\'un kilogramme de pommes', reponse: '2p+0.5', niveau: 3 },
  { texte: 'L\'argent dépensé par Claude s\'il a dépensé {a} $ de moins que le tiers de la somme m dépensée par Gilles', reponse: 'm/3-{a}', niveau: 3 },
  { texte: 'La moitié de la somme d\'un nombre {v} et de {a}', reponse: '({v}+{a})/2', niveau: 3 },
];

/** Problèmes en contexte : l'élève doit donner l'expression RÉDUITE. */
export const PROBLEMES = [
  { texte: 'Louka a {v} $. Noémie a {a} $ de plus que le triple du montant de Louka. Quelle expression réduite représente le montant total qu\'ils possèdent?', reponse: '{v}+(3{v}+{a})', niveau: 1, reduit: true },
  { texte: 'Mia a {v} ans. Son frère a {a} ans de plus qu\'elle et sa mère a le triple de l\'âge de Mia. Quelle expression réduite représente la somme de leurs trois âges?', reponse: '{v}+({v}+{a})+3{v}', niveau: 2, reduit: true },
  { texte: 'Quelle expression réduite représente la somme de trois nombres consécutifs si le plus petit est {v}?', reponse: '{v}+({v}+1)+({v}+2)', niveau: 1, reduit: true },
  { texte: 'Quelle expression réduite représente la somme de trois nombres pairs consécutifs si le plus petit est {v}?', reponse: '{v}+({v}+2)+({v}+4)', niveau: 2, reduit: true },
  { texte: 'Au cinéma, un billet coûte {v} $ et un popcorn coûte {a} $. Quelle expression réduite représente le coût total pour {b} billets et {c} popcorns?', reponse: '{b}{v}+{c}*{a}', niveau: 1, reduit: true },
  { texte: 'Guillaume, Noémie et Louka investissent dans une entreprise. Louka investit {v} $. Noémie investit le triple de Louka, plus 125 $. Guillaume investit 300 $ de moins que le double de Noémie. Quelle expression réduite représente l\'investissement total?', reponse: '{v}+(3{v}+125)+(2(3{v}+125)-300)', niveau: 3, reduit: true },
  { texte: 'Un groupe de {a} personnes se partage un lot de ({a}0{v} + {a}{b}0) $. Quelle expression réduite représente la part de chacun?', reponse: '({a}0{v}+{a}{b}0)/{a}', niveau: 2, reduit: true },
  { texte: 'Samuel a {v} cartes. Alice en a {a} de moins que le double de Samuel. Quelle expression réduite représente le nombre total de cartes?', reponse: '{v}+(2{v}-{a})', niveau: 1, reduit: true },
  { texte: 'Dans une recette, la quantité de liquide B est de 30 mL de moins que le triple de la quantité {v} de liquide A. Quelle expression réduite représente la quantité totale de liquide?', reponse: '{v}+(3{v}-30)', niveau: 2, reduit: true },
  { texte: 'Léa gagne {v} $ par heure. Elle travaille {a} heures samedi et {b} heures dimanche, puis dépense {c}0 $. Quelle expression réduite représente l\'argent qui lui reste?', reponse: '{a}{v}+{b}{v}-{c}0', niveau: 2, reduit: true },
  { texte: 'Un rectangle a une largeur de {v} cm. Sa longueur mesure {a} cm de plus que le double de sa largeur. Quelle expression réduite représente son périmètre?', reponse: '2{v}+2(2{v}+{a})', niveau: 3, reduit: true },
  { texte: 'Éloïse a {v} ans. Son père a {a} ans de moins que le quadruple de son âge. Quelle expression réduite représente la somme de leurs âges dans {b} ans?', reponse: '({v}+{b})+(4{v}-{a}+{b})', niveau: 3, reduit: true },
];
