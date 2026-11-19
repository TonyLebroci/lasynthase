/* Outils interactifs du module « Le seuil » (2026-11-19). */
(function () {
  "use strict";

  function nombre(champ) { return parseFloat(String(champ.value).replace(",", ".")); }
  function fr(n, dec) { return n.toFixed(dec).replace(".", ","); }

  /* Choix exclusif dans un groupe de boutons */
  function groupe(boutons, quandChoisi) {
    boutons.forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        boutons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        quandChoisi(b);
      });
    });
  }

  /* --- Les trois domaines --- */
  var detail = document.getElementById("detail-domaine");
  var boutonsDomaine = Array.prototype.slice.call(document.querySelectorAll("#outil-domaines .formats button"));
  var bandes = document.querySelectorAll("#outil-domaines .bande");
  groupe(boutonsDomaine, function (b) {
    detail.innerHTML = b.dataset.detail;
    bandes.forEach(function (r) { r.classList.toggle("actif", r.dataset.domaine === b.dataset.domaine); });
  });
  bandes.forEach(function (r) {
    r.addEventListener("click", function () {
      var b = boutonsDomaine[Number(r.dataset.domaine)];
      if (b) b.click();
    });
  });

  var montrer = document.getElementById("montrer-seuil");
  if (montrer) {
    montrer.addEventListener("click", function () {
      var cadre = document.querySelector("#outil-domaines .graphe-cadre");
      cadre.classList.remove("montre-seuil");
      void cadre.offsetWidth; // relance l'animation
      cadre.classList.add("montre-seuil");
      detail.innerHTML = "<strong>Le seuil, c'est la ligne LT2.</strong> " +
        "Dans ce schéma, à la frontière de I3 et I4 : 87 % de la FC max, 4 mmol/L. Chez vous, seule une mesure le situe.";
    });
  }

  /* --- Test à charge constante --- */
  var l10 = document.getElementById("lac-10");
  var l30 = document.getElementById("lac-30");
  var resMlss = document.getElementById("resultat-mlss");
  function calculerMlss() {
    var a = nombre(l10), b = nombre(l30);
    if (isNaN(a) || isNaN(b) || l10.value === "" || l30.value === "") {
      resMlss.innerHTML = "<p>Entrez les deux valeurs pour voir le verdict.</p>"; return;
    }
    if (a < 0 || b < 0 || a > 25 || b > 25) { resMlss.innerHTML = "<p>Un lactate se situe d'ordinaire entre 0 et 25 mmol/L. Vérifiez les valeurs.</p>"; return; }
    var hausse = Math.round((b - a) * 10) / 10; // évite 3,2 − 2,2 = 1,0000000004
    var signe = hausse >= 0 ? "+" : "−";
    var texte = hausse <= 1.0
      ? "<p><strong>Stable : cet effort était à votre seuil ou en dessous.</strong> Pour trouver la limite, refaites le test un peu plus fort un autre jour.</p>"
      : "<p><strong>Au-dessus du seuil : le lactate dérive.</strong> La hausse dépasse 1,0 mmol/L. Votre seuil est sous cette intensité.</p>";
    resMlss.innerHTML = '<p class="grand-chiffre">' + signe + fr(Math.abs(hausse), 1) + " mmol/L</p>" +
      "<p>Hausse entre la 10<sup>e</sup> et la 30<sup>e</sup> minute (critère : 1,0 au plus).</p>" + texte;
  }
  if (l10) { l10.addEventListener("input", calculerMlss); l30.addEventListener("input", calculerMlss); }

  /* --- Le plafond et la fraction --- */
  var vo2 = document.getElementById("vo2max");
  var frac = document.getElementById("fraction");
  var resLev = document.getElementById("resultat-leviers");
  function calculerLeviers() {
    var v = nombre(vo2), f = nombre(frac);
    if (isNaN(v) || isNaN(f)) { resLev.innerHTML = "<p>Entrez les deux valeurs pour voir le calcul.</p>"; return; }
    if (v < 20 || v > 95) { resLev.innerHTML = "<p>Un VO2max se situe d'ordinaire entre 20 et 95 ml/kg/min. Vérifiez la valeur.</p>"; return; }
    if (f < 40 || f > 100) { resLev.innerHTML = "<p>La fraction au seuil se situe entre 40 et 100 % du VO2max. Vérifiez la valeur.</p>"; return; }
    var seuil = v * f / 100;
    var fPlus = Math.min(100, f + 5);
    var html = '<p class="grand-chiffre">' + fr(seuil, 1) + " ml/kg/min</p>" +
      "<p>" + fr(v, 1) + " × " + fr(f / 100, 2) + " : l'oxygène que vous utilisez au seuil.</p>";
    if (f >= 100) {
      html += "<p>La fraction est déjà à 100 % : seul le plafond (ou l'efficacité) peut encore monter.</p>";
    } else {
      html += "<p><strong>Fraction à " + fr(fPlus, 0) + " %</strong> (+" + fr(fPlus - f, 0) + " points) : " + fr(v * fPlus / 100, 1) + " ml/kg/min.</p>";
    }
    html += "<p><strong>VO2max +5 %</strong> (" + fr(v * 1.05, 1) + ") : " + fr(v * 1.05 * f / 100, 1) + " ml/kg/min.</p>";
    resLev.innerHTML = html;
  }
  if (vo2) { vo2.addEventListener("input", calculerLeviers); frac.addEventListener("input", calculerLeviers); }

  /* --- Les quatre groupes de l'étude --- */
  var resSeiler = document.getElementById("resultat-seiler");
  var boutonsSeiler = Array.prototype.slice.call(document.querySelectorAll("#outil-seiler .formats button"));
  var gainMax = 11.4;
  groupe(boutonsSeiler, function (b) {
    var g = Number(b.dataset.gain);
    resSeiler.innerHTML = '<p class="grand-chiffre">+' + fr(g, 1) + " %</p>" +
      '<div class="jauge-gain" aria-hidden="true"><span style="width:' + (g / gainMax * 100) + '%"></span></div>' +
      "<p>" + b.dataset.detail + "</p>";
  });

  /* --- Leur proportion, à votre volume --- */
  var heures = document.getElementById("heures-semaine");
  var resSem = document.getElementById("resultat-semaine");
  // Walther, Kocbach et Sandbakk, 2025 : 781,8 h d'endurance, 33,7 h entre les seuils, 32,5 h au-dessus.
  var ENDURANCE = 781.8, ENTRE = 33.7, DESSUS = 32.5;
  function calculerSemaine() {
    var h = nombre(heures);
    if (isNaN(h) || heures.value === "") { resSem.innerHTML = "<p>Entrez vos heures pour voir le calcul.</p>"; return; }
    if (h <= 0 || h > 40) { resSem.innerHTML = "<p>Entrez un nombre d'heures entre 1 et 40.</p>"; return; }
    var entre = Math.round(h * 60 * ENTRE / ENDURANCE);
    var dessus = Math.round(h * 60 * DESSUS / ENDURANCE);
    resSem.innerHTML = '<p class="grand-chiffre">' + entre + " min</p>" +
      "<p>entre les seuils, et " + dessus + " min au-dessus, sur vos " + fr(h, 1).replace(",0", "") + " h : " +
      "la même part que les 17 fondeurs (4,3 % et 4,2 % de leur endurance).</p>" +
      "<p>Une comparaison, pas une prescription : leur proportion vient de plus de 800 heures par année.</p>";
  }
  if (heures) heures.addEventListener("input", calculerSemaine);
})();
