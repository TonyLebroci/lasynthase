---
module: seuil
page: public/modules/seuil.html
en_ligne: https://tony.lasynthase.ca/modules/seuil
miroir_du: 2026-11-26
tags: [module, lasynthase]
---

# Le threshold, la limite du soutenable

> [!info] Ta copie de travail
> Le miroir de la page en ligne. Écris ici directement : ajoute une section, change un mot,
> laisse une idée en vrac avec **À FAIRE :**. Rien ne change en ligne tant que tu ne dis pas
> « publie le module seuil » : Claude reporte alors tes changements dans la page,
> régénère la fiche PDF, vérifie, et te demande avant la mise en ligne.

*Module 2 · Entraînement*

Le threshold, c'est le seuil : la limite entre l'effort qu'on tient et celui qui finit par vous arrêter. Ce qu'il est, combien de temps on tient au-dessus, comment le mesurer, ce qui le fait monter et comment s'entraîner. Six étapes, dix graphiques, dix questions.

## Étape 1 · Ce qu'est le threshold

Le **threshold**, c'est le mot anglais pour « seuil » : le second seuil de lactate (**LT2**). C'est l'intensité **la plus haute où le lactate du sang reste stable**.

- **Sous le threshold :** le lactate que les muscles relâchent est repris aussi vite. Il se stabilise.
- **Au-dessus :** il en arrive plus qu'il n'en part. Il monte jusqu'à ce que vous ralentissiez.

> [!example] Outil · Les deux seuils et les trois domaines
> Touchez un domaine, sous la courbe ou sur une bande, pour voir ce qui s'y passe. Schéma bâti sur les repères de l'échelle norvégienne : le threshold y est placé à 4 mmol/L, mais il varie d'une personne à l'autre (étape 3).
>
> *(outil interactif : il se modifie dans le code)*

> [!note] À retenir
> Le threshold est le plafond du soutenable. Le module zone 2 traitait du premier seuil (LT1) ; celui-ci traite du second.

Sources : Beneke R., Hütler M., Leithäuser R. M., *Medicine & Science in Sports & Exercise*, 2000 (DOI 10.1097/00005768-200006000-00016) ; Jamnick N. A. et al., *Sports Medicine*, 2020 (DOI 10.1007/s40279-020-01322-8) ; échelle d'intensité I1 à I5 d'Olympiatoppen.

## Étape 2 · Au-dessus du threshold : combien de temps ?

Au-dessus du threshold, on puise dans une **réserve** fixe (W′), comme une batterie. Plus on est haut, plus elle se vide vite. Temps limite = réserve ÷ (puissance − threshold).

> [!example] Graphique · Plus on monte, moins on tient
> Exemple : threshold à 250 W, réserve de 18 kJ.
>
> *(outil interactif : il se modifie dans le code)*

- **Juste au-dessus :** environ **30 minutes au plus**.
- **Plus haut :** quelques minutes.

### Calculer votre W′

Deux efforts **à fond**, bien reposé, des jours différents : un court (2 à 5 min) et un long (10 à 15 min), sur le même vélo ou la même pente. Notez la puissance moyenne de chacun.

- **Le threshold (CP)** = (puissance longue × durée longue − puissance courte × durée courte) ÷ (durée longue − durée courte).
- **La réserve (W′)** = (puissance courte − threshold) × durée courte.
- **Sans capteur de puissance :** même calcul avec la vitesse (course, montée). On obtient une vitesse critique et une réserve en mètres.

> [!example] Outil · Votre threshold et votre W′
> Entrez vos deux efforts à fond. Le résultat remplit l'outil suivant.
>
> *(outil interactif : il se modifie dans le code)*

> [!example] Outil · Combien de temps au-dessus ?
> Entrez votre threshold et votre réserve (calculés ci-dessus, ou estimés par votre plateforme d'entraînement), puis la puissance visée.
>
> *(outil interactif : il se modifie dans le code)*

> [!note] À retenir
> Un threshold plus haut rend la même allure moins coûteuse : on la tient plus longtemps, ou on passe dessous (étape 4).

Source : Poole D. C. et al., « Critical power: an important fatigue threshold in exercise physiology », *Medicine & Science in Sports & Exercise*, 2016 (DOI 10.1249/MSS.0000000000000939). Leur seuil, la puissance critique (CP), est voisin du threshold mesuré au lactate.

## Étape 3 · Le mesurer

Deux outils qui se complètent : un test pour situer le threshold, une montée chaque semaine pour le suivre.

### 1. Le test par paliers

- **Le principe :** des paliers de 4 à 6 minutes, un peu plus vite à chaque fois.
- **La mesure :** une goutte de sang à la fin de chaque palier, avec la FC et la vitesse.
- **La lecture :** on trace la courbe et on lit la vitesse et la FC là où elle franchit la frontière choisie (4 mmol/L sur l'échelle norvégienne).

> [!example] Graphique · Lire le threshold sur la courbe
> Exemple de test. Sur un vrai test, on note aussi la FC au threshold : elle sert ensuite chaque semaine.
>
> *(outil interactif : il se modifie dans le code)*

Le repère de 4 mmol/L est pratique, mais il ne tombe pas au même endroit pour tous :

> [!example] Graphique · Le même chiffre pour tous ?
> Chez 33 hommes testés, le lactate au vrai threshold variait beaucoup.
>
> *(outil interactif : il se modifie dans le code)*

### 2. Chaque semaine : la montée-étalon

- **Toujours la même montée,** de 10 à 20 minutes, à pente régulière.
- **À FC fixe :** celle du threshold, lue au test par paliers.
- **Le résultat, c'est la vitesse :** les mètres de dénivelé gagnés par heure.
- **Pourquoi la FC fixe :** elle retire la motivation de l'équation. Le chiffre montre la machine, pas la volonté.

> [!example] Graphique · Suivre le threshold semaine après semaine
> Exemple. Plus vite à la même FC : le threshold (ou l'efficacité) progresse. Garde-fou : si l'effort ressenti monte aussi et que vous êtes fatigué, ce n'est pas un progrès.
>
> *(outil interactif : il se modifie dans le code)*

### En laboratoire : le vrai MLSS

Le test par paliers donne toute la courbe en une séance, mais il **estime** le threshold. Pour connaître la vraie valeur, les chercheurs font des efforts de 30 minutes :

- **Un effort par jour,** à intensité constante, un peu plus fort que la veille.
- **Le critère :** le lactate ne monte pas de plus de **1,0 mmol/L** entre la 10e et la 30e minute.
- **Le MLSS,** c'est l'effort le plus fort qui passe encore. Il en faut un qui passe et un juste au-dessus qui dérive, pour encadrer la limite : de 3 à 6 séances.
- **Pour vérifier un threshold déjà estimé,** une seule séance suffit : à la FC du test par paliers, le lactate passe-t-il le critère ?

> [!example] Graphique · Trouver le MLSS
> Exemple : le même test, trois jours de suite, un peu plus fort chaque fois.
>
> *(outil interactif : il se modifie dans le code)*

> [!example] Outil · Cet effort était-il sous votre threshold ?
> Entrez le lactate mesuré à la 10e et à la 30e minute d'un effort constant de 30 minutes.
>
> *(outil interactif : il se modifie dans le code)*

Sources : échelle d'intensité I1 à I5 d'Olympiatoppen ; Beneke R., 2000 (voir étape 1) ; Beneke R., *European Journal of Applied Physiology*, 2003 (DOI 10.1007/s00421-002-0783-1).

## Étape 4 · Ce qui fait monter le threshold (le seuil) : les fibres lentes

- **Les fibres rapides** fabriquent surtout le lactate.
- **Les fibres lentes le mangent :** elles le captent et le brûlent avec de l'oxygène dans leurs mitochondries. Plus elles ont de mitochondries, plus elles en mangent.

> [!example] Graphique · Ce que l'endurance change
> Après 9 semaines de vélo à 75 % du VO2max.
>
> *(outil interactif : il se modifie dans le code)*

> [!example] Schéma · La courbe glisse vers la droite
> Schéma, pas une mesure : plus les fibres lentes mangent de lactate, plus il faut aller vite avant qu'il ne s'accumule.
>
> *(outil interactif : il se modifie dans le code)*

**Le lien avec la zone 2 :** c'est là que les fibres lentes travaillent en premier. L'entraînement d'endurance, dont la zone 2 fait partie, entraîne ces fibres à recycler le lactate ; le threshold monte.

**Ainsi, le travail de faible intensité nous rend indirectement meilleur à plus haute intensité.**

En résumé, la vitesse au threshold = **VO2max × fraction tenue × efficacité**. Les fibres lentes font monter la fraction.

> [!note] À retenir
> Le volume d'endurance fait monter le threshold, pas seulement le travail au threshold.

[Revoir le module sur la zone 2 et les fibres lentes ›](zone-2.html)

Sources : Brooks G. A., *Cell Metabolism*, 2018 (DOI 10.1016/j.cmet.2018.03.008) ; Pilegaard H. et al., *American Journal of Physiology*, 1999 (DOI 10.1152/ajpendo.1999.276.5.E843) ; Dubouchaud H. et al., *American Journal of Physiology – Endocrinology and Metabolism*, 2000 (DOI 10.1152/ajpendo.2000.278.4.E571) ; Bergman B. C. et al., *Journal of Applied Physiology*, 1999 (DOI 10.1152/jappl.1999.87.5.1684) ; Joyner M. J., Coyle E. F., *Journal of Physiology*, 2008 (DOI 10.1113/jphysiol.2007.143834).

## Étape 5 · S'entraîner

### Quelle séance ?

> [!example] Graphique · Quatre séances comparées
> 35 cyclistes amateurs, 7 semaines, 2 séances d'intervalles par semaine plus 2 ou 3 sorties faciles. Gain : moyenne du VO2max, de la puissance au VO2max et de la puissance à 4 mmol/L.
>
> *(outil interactif : il se modifie dans le code)*

- **Le gagnant :** 4 × 8 min, un peu **au-dessus** du threshold (9,6 mmol/L).
- **La limite :** des amateurs, 7 semaines. Pas forcément vrai chez un athlète très entraîné.

> [!note] Une étude ne connaît pas votre corps
> C'est pourquoi, dans mon système d'entraînement, on ne copie pas une séance à la mode : on situe votre threshold par un test par paliers, on le suit chaque semaine sur votre montée-étalon, et le plan s'ajuste à ce que vos chiffres disent.
>
> [Découvrir le projet pilote en endurance ›](../candidature.html)

### Combien ?

> [!example] Graphique · La saison des meilleurs
> 17 fondeurs de classe mondiale, leur meilleure saison.
>
> *(outil interactif : il se modifie dans le code)*

Chez eux, le travail dur est réparti presque à parts égales sous et au-dessus du threshold, en petite dose, toute l'année. L'essentiel reste facile.

> [!note] Le bon réflexe
> Une séance au threshold n'est pas une course : finissez avec l'impression que vous auriez pu en faire encore un peu.

Sources : Seiler S., Jøranson K., Olesen B. V., Hetlelid K. J., *Scandinavian Journal of Medicine & Science in Sports*, 2013 (DOI 10.1111/j.1600-0838.2011.01351.x) ; Walther J., Kocbach J., Sandbakk Ø., *European Journal of Sport Science*, 2025 (DOI 10.1002/ejsc.12322).

## Étape 6 · Vérifiez ce que vous avez retenu

Dix questions. Votre première réponse compte ; l'explication s'affiche tout de suite.

**Question 1.** Le threshold (LT2), c'est…

- a) l'intensité la plus haute où le lactate reste stable ✅
- b) l'intensité où le lactate commence à monter
- c) la fréquence cardiaque maximale

> Explication : Le moment où le lactate commence à monter, c'est le premier seuil (LT1).

**Question 2.** Juste au-dessus de votre threshold, que fait votre lactate ?

- a) Il redescend après quelques minutes
- b) Il se stabilise un peu plus haut
- c) Il monte sans arrêt, jusqu'à ce que vous ralentissiez ✅

> Explication : Il en arrive plus qu'il n'en part : l'effort a une limite de temps.

**Question 3.** Juste au-dessus du threshold, combien de temps tient-on au maximum ?

- a) Quelques secondes
- b) Environ 30 minutes au plus ✅
- c) Plusieurs heures

> Explication : Environ 30 minutes au plus ; plus haut, quelques minutes seulement.

**Question 4.** Threshold à 250 W, réserve de 18 kJ. À 280 W, combien de minutes tenez-vous ?

- Réponse acceptée : de 9.9 à 10.1 ✅

> Explication : 18 000 J ÷ (280 − 250) W = 600 secondes, soit 10 minutes.

**Question 5.** Vrai ou faux : chez tout le monde, le threshold tombe à 4 mmol/L.

- a) Vrai
- b) Faux ✅

> Explication : Chez 33 hommes, 4,9 mmol/L en moyenne, avec un écart type de 1,4. Le 4 mmol/L est un repère, pas une loi.

**Question 6.** Effort constant de 30 minutes : 3,1 mmol/L à la 10e minute, 3,8 à la 30e. Cet effort passe-t-il le critère du threshold ?

- a) Oui : la hausse est de 0,7, pas plus de 1,0 ✅
- b) Non : le lactate a monté

> Explication : Le critère accepte une hausse de 1,0 mmol/L au plus : l'effort était au threshold ou dessous.

**Question 7.** À votre montée-étalon, à la même FC, vous montez plus vite qu'il y a un mois, sans fatigue particulière. Qu'est-ce que ça veut dire ?

- a) Votre threshold (ou votre efficacité) progresse ✅
- b) Votre montre se trompe
- c) Rien : la vitesse ne compte pas

> Explication : La FC est fixe : la vitesse montre la machine. Plus vite à la même FC, c'est un progrès, sauf si l'effort ressenti monte aussi avec de la fatigue.

**Question 8.** Pourquoi l'entraînement d'endurance, dont la zone 2, fait-il monter le threshold ?

- a) Il habitue à l'inconfort
- b) Il fait monter la FC maximale
- c) Il équipe les fibres lentes, qui mangent plus de lactate ✅

> Explication : Plus de mitochondries et de transporteurs : le lactate est mieux repris, la courbe glisse vers la droite.

**Question 9.** Chez les 35 cyclistes amateurs, quelle séance a donné le plus gros gain ?

- a) 4 × 4 min, la plus intense
- b) 4 × 8 min ✅
- c) 4 × 16 min, la plus longue

> Explication : +11,4 %, environ deux fois plus que les autres. Ces 4 × 8 se faisaient un peu au-dessus du threshold (9,6 mmol/L).

**Question 10.** Chez les 17 fondeurs de classe mondiale, quelle part de l'endurance se fait entre les seuils ?

- a) Environ 1 %
- b) Environ 4 % ✅
- c) Environ 25 %

> Explication : 34 heures sur 782 : 4,3 %, environ 39 minutes par semaine. L'essentiel reste facile.

> [!tip] Votre fiche à garder
> L'essentiel du module sur une page, à télécharger et à relire au besoin.
>
> [Télécharger la fiche (PDF)](fiches/seuil.pdf)
