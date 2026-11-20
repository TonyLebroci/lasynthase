/* Outil du module « Les intervalles courts 30/15 » (2026-11-20).
   Que se passe-t-il pendant la pause ? Calcul simple, à partir de constantes mesurées :
   - VO2 : constante de temps de 23 s (effort modéré) à 29 s (effort intense) chez des cyclistes
     entraînés, mesurée à la montée (Prinz et al. 2021) et appliquée ici à la descente, qui est plus
     lente en effort intense (Cleuziou et al. 2004) ; part du chemin vers le bas = 1 − e^(−t/τ).
   Le « bas » est le niveau de la récupération active, pas le repos.
   - Phosphocréatine : demi-vie de la part rapide de 21 à 22 s (Harris et al. 1976), le cas le plus
     rapide (contre 57 s après un sprint de 30 s, Bogdanis et al. 1995) ; part rapide refaite = 1 − 2^(−t/21,5). */
(function () {
  "use strict";
  var curseur = document.getElementById("duree-recup");
  if (!curseur) return;
  var texteDuree = document.getElementById("duree-recup-texte");
  var res = document.getElementById("resultat-recup");

  function pct(x) { return Math.round(x * 100); }
  function duree(s) {
    if (s < 60) return s + " s";
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + " min" + (r ? " " + r + " s" : "");
  }
  function jauge(titre, valeur, texte) {
    return '<div class="jauge-outil"><p><strong>' + titre + "</strong> " + texte + "</p>" +
      '<div class="jauge" aria-hidden="true"><span style="width:' + valeur + '%"></span></div></div>';
  }

  function calculer() {
    var t = Number(curseur.value);
    texteDuree.textContent = duree(t);
    var vo2Bas = pct(1 - Math.exp(-t / 29)), vo2Haut = pct(1 - Math.exp(-t / 23));
    var pcr = pct(1 - Math.pow(2, -t / 21.5));
    var html = jauge("La VO2", vo2Haut,
      "ferait environ " + (vo2Bas === vo2Haut ? vo2Haut : vo2Bas + " à " + vo2Haut) + " % du chemin vers le niveau de la récupération (sans doute moins : elle descend plus lentement qu'elle ne monte).");
    html += jauge("La phosphocréatine", pcr, "referait au plus environ " + pcr + " % de sa part rapide.");
    if (t <= 20) html += "<p>La VO2 descend vers le niveau de la récupération active, qui reste élevé, et la pause s'arrête avant qu'elle l'atteigne. C'est le principe du 30/15.</p>";
    else if (t < 120) html += "<p>La VO2 a le temps de redescendre en bonne partie : chaque effort repart de plus bas.</p>";
    else html += "<p>La VO2 a le temps de redescendre presque jusqu'au niveau de la récupération (2 min 30 = la pause du 4 × 5 min).</p>";
    res.innerHTML = html;
  }
  curseur.addEventListener("input", calculer);
  calculer();
})();
