/* Outils interactifs du module « La zone 2 » (2026-11-05). */
(function () {
  "use strict";

  /* --- Les cinq zones --- */
  var detail = document.getElementById("detail-zone");
  var segments = document.querySelectorAll("#outil-zones .segment");
  segments.forEach(function (s) {
    s.setAttribute("aria-pressed", "false");
    s.addEventListener("click", function () {
      segments.forEach(function (x) { x.setAttribute("aria-pressed", x === s ? "true" : "false"); });
      detail.innerHTML = s.dataset.detail;
    });
  });

  var bouton = document.getElementById("montrer-zone-2");
  if (bouton) {
    bouton.addEventListener("click", function () {
      document.querySelectorAll("#outil-zones .barre-zones").forEach(function (b) {
        b.classList.remove("montre");
        void b.offsetWidth; // relance l'animation
        b.classList.add("montre");
      });
      detail.innerHTML = "<strong>La zone 2, c'est I2.</strong> " +
        "Elle s'arrête au premier seuil (LT1) : 72 à 82 % de la FC max sur l'échelle norvégienne, lactate 1,5 à 2,5 mmol/L.";
    });
  }

  /* --- Plage de fréquence cardiaque --- */
  var fcMax = document.getElementById("fc-max");
  var fcLt1 = document.getElementById("fc-lt1");
  var resFc = document.getElementById("resultat-fc");

  function calculerFc() {
    var max = Number(fcMax.value);
    var lt1 = Number(fcLt1.value);
    if (!max) { resFc.innerHTML = "<p>Entrez votre FC maximale pour voir votre plage.</p>"; return; }
    if (max < 120 || max > 230) { resFc.innerHTML = "<p>Une FC maximale se situe d'ordinaire entre 120 et 230 bpm. Vérifiez la valeur.</p>"; return; }
    var bas = Math.round(max * 0.67), haut = Math.round(max * 0.82);
    var pos = function (pct) { return Math.max(0, Math.min(100, (pct - 50) / 50 * 100)); };
    var html = '<p class="grand-chiffre">' + bas + " à " + haut + " bpm</p>" +
      "<p>Plage type de zone 2 : 67 à 82 % de votre FC max. Un point de départ, pas votre zone exacte.</p>" +
      '<div class="jauge-fc" aria-hidden="true"><div class="plage" style="left:' + pos(67) + "%;width:" + (pos(82) - pos(67)) + '%"></div>';
    var texte = "";
    if (lt1) {
      if (lt1 >= max) {
        texte = "<p>Le premier seuil doit être plus bas que la FC maximale. Vérifiez la valeur.</p>";
      } else {
        var pct = Math.round(lt1 / max * 100);
        html += '<div class="marque" data-texte="seuil · ' + pct + ' %" style="left:' + pos(pct) + '%"></div>';
        if (pct > 82) texte = "<p><strong>Votre premier seuil (" + lt1 + " bpm, " + pct + " %) est au-dessus de la plage type.</strong> C'est fréquent chez un athlète très entraîné. Fiez-vous à votre mesure : votre zone 2 monte jusqu'à environ " + lt1 + " bpm.</p>";
        else if (pct < 67) texte = "<p><strong>Votre premier seuil (" + lt1 + " bpm, " + pct + " %) est sous la plage type.</strong> Fiez-vous à votre mesure : au-delà d'environ " + lt1 + " bpm, vous n'êtes plus en zone 2, même si la plage type le laisse croire.</p>";
        else texte = "<p><strong>Votre premier seuil (" + lt1 + " bpm, " + pct + " %) est dans la plage type.</strong> Gardez-le comme plafond : votre zone 2 s'arrête vers " + lt1 + " bpm.</p>";
      }
    }
    resFc.innerHTML = html + "</div>" + texte;
  }
  if (fcMax) { fcMax.addEventListener("input", calculerFc); fcLt1.addEventListener("input", calculerFc); }

  /* --- Test des 10 % --- */
  var aet = document.getElementById("fc-aet");
  var ant = document.getElementById("fc-ant");
  var res10 = document.getElementById("resultat-10");

  function calculer10() {
    var a = Number(aet.value), b = Number(ant.value);
    if (!a || !b) { res10.innerHTML = "<p>Entrez les deux valeurs pour voir votre écart.</p>"; return; }
    if (b <= a) { res10.innerHTML = "<p>La FC au seuil anaérobie doit être plus élevée que celle au seuil aérobie.</p>"; return; }
    var ecart = (b / a - 1) * 100;
    var arrondi = ecart.toFixed(1).replace(".", ",");
    var conseil = ecart > 10
      ? "<p><strong>Plus de 10 % : la base aérobie est à bâtir.</strong> Restez en zones 1 et 2, montées comprises, à la FC du seuil aérobie ou en dessous. Refaites le test après un bloc de volume facile.</p>"
      : "<p><strong>10 % ou moins : vous pouvez ajouter de l'intensité.</strong> Commencez petit : environ 5 % du volume aérobie de la semaine en zones 3 et 4, au moins 48 h entre deux séances dures, sans couper le volume facile.</p>";
    res10.innerHTML = '<p class="grand-chiffre">' + arrondi + " %</p><p>" + b + " ÷ " + a + " = " +
      (b / a).toFixed(3).replace(".", ",") + "</p>" + conseil;
  }
  if (aet) { aet.addEventListener("input", calculer10); ant.addEventListener("input", calculer10); }
})();
