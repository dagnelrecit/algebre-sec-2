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

  // ---- Ajouts (version 3) — niveau 1 ----
  { texte: 'Le quadruple d\'un nombre {v}', reponse: '4{v}', niveau: 1 },
  { texte: 'Le tiers d\'un nombre {v}', reponse: '{v}/3', niveau: 1 },
  { texte: 'Le produit de {a} et d\'un nombre {v}', reponse: '{a}{v}', niveau: 1 },
  { texte: 'Un nombre {v} diminué de {a}', reponse: '{v}-{a}', niveau: 1 },
  { texte: 'Un nombre {v} augmenté de {a}', reponse: '{v}+{a}', niveau: 1 },
  { texte: 'L\'opposé d\'un nombre {v}', reponse: '-{v}', niveau: 1 },
  { texte: 'Le nombre pair qui suit le nombre pair {v}', reponse: '{v}+2', niveau: 1 },
  { texte: 'La somme d\'un nombre {v} et de son double', reponse: '{v}+2{v}', niveau: 1 },
  { texte: 'Le prix de {a} crayons qui coûtent {v} $ chacun', reponse: '{a}{v}', niveau: 1 },
  // ---- Ajouts — niveau 2 ----
  { texte: 'Le triple d\'un nombre {v}, augmenté de {a}', reponse: '3{v}+{a}', niveau: 2 },
  { texte: 'La moitié d\'un nombre {v}, diminuée de {a}', reponse: '{v}/2-{a}', niveau: 2 },
  { texte: 'Le carré de la différence entre {v} et {a}', reponse: '({v}-{a})^2', niveau: 2 },
  { texte: 'La différence entre les carrés de {v} et de {w}', reponse: '{v}^2-{w}^2', niveau: 2 },
  { texte: 'Le produit d\'un nombre {v} par le nombre qui le suit', reponse: '{v}({v}+1)', niveau: 2 },
  { texte: 'Le double de la somme de {v} et de {a}', reponse: '2({v}+{a})', niveau: 2 },
  { texte: 'La somme du triple de {v} et du double de {w}', reponse: '3{v}+2{w}', niveau: 2 },
  { texte: 'Le quart de la somme de {v} et de {w}', reponse: '({v}+{w})/4', niveau: 2 },
  { texte: 'L\'aire d\'un rectangle de longueur {v} et de largeur {a}', reponse: '{a}{v}', niveau: 2 },
  { texte: 'Le périmètre d\'un carré de côté {v}', reponse: '4{v}', niveau: 2 },
  // ---- Ajouts — niveau 3 ----
  { texte: 'Le double du carré d\'un nombre {v}, diminué de son triple', reponse: '2{v}^2-3{v}', niveau: 3 },
  { texte: 'La somme de trois nombres consécutifs dont le plus petit est {v}', reponse: '{v}+({v}+1)+({v}+2)', niveau: 3 },
  { texte: 'Le produit de la somme de {v} et de {w} par leur différence', reponse: '({v}+{w})({v}-{w})', niveau: 3 },
  { texte: 'Le carré du double d\'un nombre {v}', reponse: '(2{v})^2', niveau: 3 },
  { texte: 'Le tiers de la différence entre le double de {v} et {a}', reponse: '(2{v}-{a})/3', niveau: 3 },
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

  // ---- Ajouts (version 3) — niveau 1 ----
  { texte: 'Olivier a {v} billes. Sa sœur en a {a} de plus que lui. Quelle expression réduite représente le nombre total de billes?', reponse: '{v}+({v}+{a})', niveau: 1, reduit: true },
  { texte: 'Un forfait de cellulaire coûte {a}0 $ par mois, plus {v} $ par gigaoctet supplémentaire. Quelle expression réduite représente le coût d\'un mois où l\'on utilise {b} gigaoctets supplémentaires?', reponse: '{a}0+{b}{v}', niveau: 1, reduit: true },
  { texte: 'Zoé a {v} ans. Son père a le triple de son âge, plus {a} ans. Quelle expression réduite représente la somme de leurs âges?', reponse: '{v}+(3{v}+{a})', niveau: 1, reduit: true },
  { texte: 'Une équipe de hockey marque {v} buts en première période, le double en deuxième période et {a} buts en troisième période. Quelle expression réduite représente le nombre total de buts?', reponse: '{v}+2{v}+{a}', niveau: 1, reduit: true },
  { texte: 'Un taxi demande {a} $ au départ, plus {v} $ par kilomètre. Quelle expression réduite représente le prix d\'une course de {b}0 km?', reponse: '{a}+{b}0{v}', niveau: 1, reduit: true },
  { texte: 'Noah lit {v} pages lundi, {a} pages de plus mardi et le double de lundi mercredi. Quelle expression réduite représente le nombre total de pages lues?', reponse: '{v}+({v}+{a})+2{v}', niveau: 1, reduit: true },
  { texte: 'Léo économise {v} $ par semaine. Il possède déjà {a}0 $. Quelle expression réduite représente le montant qu\'il aura dans {b} semaines?', reponse: '{a}0+{b}{v}', niveau: 1, reduit: true },
  { texte: 'Dans une classe, il y a {v} filles et {a} garçons de moins que de filles. Quelle expression réduite représente le nombre total d\'élèves?', reponse: '{v}+({v}-{a})', niveau: 1, reduit: true },
  // ---- Ajouts — niveau 2 ----
  { texte: 'Un rectangle mesure {v} cm de largeur. Sa longueur mesure {a} cm de plus que sa largeur. Quelle expression réduite représente son périmètre?', reponse: '2{v}+2({v}+{a})', niveau: 2, reduit: true },
  { texte: 'Trois amis se partagent une facture. Le premier paie {v} $, le deuxième paie {a} $ de plus que le premier et le troisième paie le double du deuxième. Quelle expression réduite représente le montant total de la facture?', reponse: '{v}+({v}+{a})+2({v}+{a})', niveau: 2, reduit: true },
  { texte: 'Un triangle isocèle a deux côtés isométriques qui mesurent chacun ({v} + {a}) cm et une base de {v} cm. Quelle expression réduite représente son périmètre?', reponse: '2({v}+{a})+{v}', niveau: 2, reduit: true },
  { texte: 'Emma a {v} ans. Son frère a {a} ans de moins qu\'elle. Quelle expression réduite représente la somme de leurs âges dans {b} ans?', reponse: '({v}+{b})+({v}-{a}+{b})', niveau: 2, reduit: true },
  { texte: 'Un cinéma vend {v} billets pour adultes à 12 $ chacun et deux fois plus de billets pour enfants à 8 $ chacun. Quelle expression réduite représente les recettes du cinéma?', reponse: '12{v}+8*2{v}', niveau: 2, reduit: true },
  { texte: 'Quelle expression réduite représente la somme de quatre nombres consécutifs si le plus petit est {v}?', reponse: '{v}+({v}+1)+({v}+2)+({v}+3)', niveau: 2, reduit: true },
  { texte: 'Un jardin rectangulaire mesure {v} m de largeur, et sa longueur est le triple de sa largeur. Une clôture en fait le tour. Quelle expression réduite représente la longueur de la clôture?', reponse: '2{v}+2*3{v}', niveau: 2, reduit: true },
  { texte: 'Alex a {v} $. Béatrice a {a} $ de plus que le double du montant d\'Alex. Quelle expression réduite représente le montant total qu\'ils possèdent?', reponse: '{v}+(2{v}+{a})', niveau: 2, reduit: true },
  { texte: 'Un club achète {a} ballons à {v} $ chacun et {b} filets qui coûtent chacun 15 $ de plus qu\'un ballon. Quelle expression réduite représente la dépense totale?', reponse: '{a}{v}+{b}({v}+15)', niveau: 2, reduit: true },
  // ---- Ajouts — niveau 3 ----
  { texte: 'Un trapèze a une petite base de {v} cm et une hauteur de 6 cm. Sa grande base mesure {a} cm de plus que le double de la petite base. Quelle expression réduite représente son aire?', reponse: '({v}+(2{v}+{a}))*6/2', niveau: 3, reduit: true },
  { texte: 'Maya a {v} ans. Son frère a {a} ans de plus qu\'elle, et sa grand-mère a le quadruple de l\'âge du frère. Quelle expression réduite représente la somme de leurs trois âges?', reponse: '{v}+({v}+{a})+4({v}+{a})', niveau: 3, reduit: true },
  { texte: 'Un magasin vend des chandails à {v} $ chacun. Pendant les soldes, le prix baisse de {a} $. Samuel en achète 3 en solde et 2 au prix régulier. Quelle expression réduite représente le montant payé?', reponse: '3({v}-{a})+2{v}', niveau: 3, reduit: true },
  { texte: 'Quatre amis louent un chalet pour (12{v} + 200) $ et achètent pour 40 $ de nourriture. Ils partagent le total également. Quelle expression réduite représente la part de chacun?', reponse: '(12{v}+200+40)/4', niveau: 3, reduit: true },
  { texte: 'Un rectangle a une largeur de {v} cm. Sa longueur mesure {a} cm de moins que le triple de sa largeur. Quelle expression réduite représente son périmètre?', reponse: '2{v}+2(3{v}-{a})', niveau: 3, reduit: true },
  { texte: 'Lucas, Rosalie et Félix vendent du chocolat. Lucas vend {v} boîtes. Rosalie en vend 5 de plus que le double de Lucas. Félix en vend 10 de moins que Rosalie. Quelle expression réduite représente le nombre total de boîtes vendues?', reponse: '{v}+(2{v}+5)+(2{v}+5-10)', niveau: 3, reduit: true },
];
