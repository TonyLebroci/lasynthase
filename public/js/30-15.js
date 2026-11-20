/* Outil du module « Les intervalles courts 30/15 » (2026-11-20).
   Que se passe-t-il pendant la pause ? Calcul simple, à partir de constantes mesurées :
   - VO2 : constante de temps de 23 s (effort modéré) à 29 s (effort intense) chez des cyclistes
     entraînés (Prinz et al. 2021) ; part du chemin vers le bas = 1 − e^(−t/τ).
   - Phosphocréatine : demi-vie de la part rapide de 21 à 22 s (Harris et al. 1976) ;
     part rapide refaite = 1 − 2^(−t/21,5). */
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
      "fait environ " + (vo2Bas === vo2Haut ? vo2Haut : vo2Bas + " à " + vo2Haut) + " % du chemin vers le bas.");
    html += jauge("La phosphocréatine", pcr, "refait environ " + pcr + " % de sa part rapide.");
    if (t <= 20) html += "<p>La pause est trop courte pour que la VO2 retombe : elle reste près du haut. C'est le principe du 30/15.</p>";
    else if (t < 120) html += "<p>La VO2 a le temps de redescendre en bonne partie : chaque effort repart de plus bas.</p>";
    else html += "<p>C'est la pause du 4 × 5 min (2 min 30) : la VO2 est presque revenue au niveau de la récupération.</p>";
    res.innerHTML = html;
  }
  curseur.addEventListener("input", calculer);
  calculer();
})();
