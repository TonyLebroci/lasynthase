/* Outils interactifs du module « Le threshold » (2026-11-19). */
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
      detail.innerHTML = "<strong>Le threshold, c'est la ligne LT2.</strong> " +
        "Dans ce schéma, à la frontière de I3 et I4 : 87 % de la FC max, 4 mmol/L. Chez vous, seule une mesure le situe.";
    });
  }

  /* --- Combien de temps au-dessus : Tlim = W' / (P - CP), Poole et al. 2016 --- */
  var cp = document.getElementById("cp");
  var wp = document.getElementById("wprime");
  var pv = document.getElementById("pvise");
  var resT = document.getElementById("resultat-temps");
  function duree(s) {
    var m = Math.floor(s / 60), r = Math.round(s - m * 60);
    if (r === 60) { m += 1; r = 0; }
    return m + " min " + (r < 10 ? "0" : "") + r + " s";
  }
  function calculerTemps() {
    var c = nombre(cp), w = nombre(wp), p = nombre(pv);
    if (isNaN(c) || isNaN(w) || isNaN(p)) { resT.innerHTML = "<p>Entrez les trois valeurs pour voir votre temps limite.</p>"; return; }
    if (c < 50 || c > 600) { resT.innerHTML = "<p>Un threshold se situe d'ordinaire entre 50 et 600 W. Vérifiez la valeur.</p>"; return; }
    if (w <= 0 || w > 60) { resT.innerHTML = "<p>Une réserve W′ se compte en kilojoules : entrez une valeur entre 1 et 60 kJ.</p>"; return; }
    if (p <= c) {
      resT.innerHTML = "<p class=\"grand-chiffre\">Sous le threshold</p><p>La réserve ne se vide pas : le modèle ne prédit pas de limite. En pratique, aucun effort ne dure indéfiniment.</p>";
      return;
    }
    var t = w * 1000 / (p - c);
    var html = '<p class="grand-chiffre">' + duree(t) + "</p><p>" + fr(w, 1).replace(",0", "") + " kJ ÷ (" + p + " − " + c + ") W = " + Math.round(t) + " s.</p>";
    if (t > 30 * 60) html += "<p><strong>Ce chiffre est surestimé.</strong> Selon les chercheurs du modèle, on tient environ 30 minutes au plus au-dessus du threshold.</p>";
    else if (t < 120) html += "<p>Sous 2 minutes, le modèle est moins fiable : il a été établi avec des efforts de 2 à 15 minutes.</p>";
    var c2 = c * 1.05;
    html += p <= c2
      ? "<p><strong>Si votre threshold montait de 5 %</strong> (" + Math.round(c2) + " W) : cette puissance passerait sous votre threshold.</p>"
      : "<p><strong>Si votre threshold montait de 5 %</strong> (" + Math.round(c2) + " W) : " + duree(w * 1000 / (p - c2)) + " à la même puissance.</p>";
    resT.innerHTML = html;
  }
  if (cp) { [cp, wp, pv].forEach(function (x) { x.addEventListener("input", calculerTemps); }); }

  /* --- Calculer CP et W' avec deux efforts à fond (modèle travail-durée, Poole et al. 2016) --- */
  var pc = document.getElementById("p-court"), tc = document.getElementById("t-court");
  var pl = document.getElementById("p-long"), tl = document.getElementById("t-long");
  var resW = document.getElementById("resultat-wprime");
  function calculerW() {
    var p1 = nombre(pc), t1 = nombre(tc) * 60, p2 = nombre(pl), t2 = nombre(tl) * 60;
    if ([p1, t1, p2, t2].some(isNaN)) { resW.innerHTML = "<p>Entrez vos deux efforts pour voir le calcul.</p>"; return; }
    if (t2 <= t1) { resW.innerHTML = "<p>L'effort long doit durer plus longtemps que l'effort court.</p>"; return; }
    if (p1 <= p2) { resW.innerHTML = "<p>L'effort court, fait à fond, doit avoir une puissance plus haute que l'effort long.</p>"; return; }
    var c = (p2 * t2 - p1 * t1) / (t2 - t1);
    var w = (p1 - c) * t1 / 1000;
    if (c <= 0 || w <= 0) { resW.innerHTML = "<p>Ces valeurs ne donnent pas de résultat possible. Vérifiez-les.</p>"; return; }
    var html = '<p class="grand-chiffre">' + Math.round(c) + " W · " + fr(w, 1) + " kJ</p>" +
      "<p>Threshold (CP) : " + Math.round(c) + " W. Réserve (W′) : " + fr(w, 1) + " kJ.</p>";
    if (t1 < 120 || t2 > 900) html += "<p>Pour un calcul fiable, gardez les deux efforts entre 2 et 15 minutes.</p>";
    resW.innerHTML = html;
    if (cp && wp) {
      cp.value = Math.round(c); wp.value = fr(w, 1).replace(",", ".");
      if (!pv.value) pv.value = Math.round(c * 1.1);
      calculerTemps();
    }
  }
  if (pc) { [pc, tc, pl, tl].forEach(function (x) { x.addEventListener("input", calculerW); }); }

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
