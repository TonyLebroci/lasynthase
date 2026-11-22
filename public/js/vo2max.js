/* Outils du module « Le VO2max, le plafond aérobie » (2026-11-22).
   - Construire un VO2max : principe de Fick, VO2 = FC × volume d'éjection × oxygène retiré du sang
     (mL par 100 mL de sang → × 10 pour des mL par litre). Valeurs d'exemple, pas des mesures.
   - Les trois leviers : puissance ≈ VO2 tenu (L/min) × 21 kJ/L ÷ 60 × efficacité. La plage de 18 à 26 %
     est l'efficacité « delta » de Coyle et al. 1992 (19 cyclistes très entraînés) ; 22 % = valeur d'exemple.
   - En MET : 1 MET = 3,5 mL/kg/min ; repère de 7,9 MET et −13 % par MET (Kodama et al. 2009). */
(function () {
  "use strict";

  function fr(n, dec) { return n.toFixed(dec).replace(".", ","); }
  function nombre(champ) { return parseFloat(String(champ.value).replace(",", ".")); }
  function lier(id, suffixe) {
    var c = document.getElementById(id), t = document.getElementById(id + "-texte");
    return { champ: c, maj: function () { if (t) t.textContent = String(c.value).replace(".", ",") + (suffixe || ""); } };
  }

  /* --- Construire un VO2max --- */
  var fc = lier("fick-fc"), ve = lier("fick-ve"), ox = lier("fick-ox"), kg = lier("fick-kg");
  var resFick = document.getElementById("resultat-fick");
  if (resFick) {
    var calculerFick = function () {
      [fc, ve, ox, kg].forEach(function (x) { x.maj(); });
      var debit = Number(fc.champ.value) * Number(ve.champ.value) / 1000; // L/min
      var vo2 = debit * Number(ox.champ.value) * 10;                        // mL/min
      var rel = vo2 / Number(kg.champ.value);
      resFick.innerHTML =
        '<p class="grand-chiffre">' + fr(rel, 1) + " mL/kg/min</p>" +
        "<p>Débit du cœur : <strong>" + fr(debit, 1) + " L/min</strong>. VO2max : <strong>" + fr(vo2 / 1000, 2) + " L/min</strong>.</p>" +
        "<p>Dans ce calcul, 10 % de volume d'éjection en plus donne 10 % de VO2max en plus, si le reste ne bouge pas. Chez Helgerud, le volume d'éjection a monté d'environ 10 %, et le VO2max de 5,5 à 7,2 %.</p>";
    };
    [fc, ve, ox, kg].forEach(function (x) { x.champ.addEventListener("input", calculerFick); });
    calculerFick();
  }

  /* --- Les trois leviers --- */
  var levVo2 = document.getElementById("lev-vo2"), levKg = document.getElementById("lev-kg");
  var frac = lier("lev-frac", " %"), eff = lier("lev-eff", " %");
  var resLev = document.getElementById("resultat-leviers");
  if (resLev) {
    var calculerLeviers = function () {
      frac.maj(); eff.maj();
      var v = nombre(levVo2), m = nombre(levKg);
      if (isNaN(v) || isNaN(m)) { resLev.innerHTML = "<p>Entrez votre VO2max et votre poids.</p>"; return; }
      if (v < 15 || v > 95) { resLev.innerHTML = "<p>Un VO2max se situe d'ordinaire entre 15 et 95 mL/kg/min. Vérifiez la valeur.</p>"; return; }
      if (m < 30 || m > 150) { resLev.innerHTML = "<p>Entrez un poids entre 30 et 150 kg.</p>"; return; }
      var f = Number(frac.champ.value) / 100, e = Number(eff.champ.value) / 100;
      var watts = v * m / 1000 * f * 21 / 60 * e * 1000;
      var fPlus = Math.min(0.95, f + 0.05), points = Math.round((fPlus - f) * 100);
      var plus = v * m / 1000 * fPlus * 21 / 60 * e * 1000;
      resLev.innerHTML =
        '<p class="grand-chiffre">≈ ' + Math.round(watts) + " W</p>" +
        "<p>Soit environ <strong>" + fr(watts / m, 1) + " W/kg</strong> au threshold, selon ce calcul.</p>" +
        (points > 0 ? "<p>" + (points === 5 ? "Cinq points" : points + (points > 1 ? " points" : " point")) + " de fraction en plus, à VO2max égal : environ <strong>" + Math.round(plus - watts) + " W</strong> de plus.</p>" : "<p>Le curseur s’arrête à 95 %.</p>");
    };
    [levVo2, levKg, frac.champ, eff.champ].forEach(function (c) { c.addEventListener("input", calculerLeviers); });
    calculerLeviers();
  }

  /* --- En MET --- */
  var metVo2 = document.getElementById("met-vo2"), resMet = document.getElementById("resultat-met");
  if (resMet) {
    metVo2.addEventListener("input", function () {
      var v = nombre(metVo2);
      if (isNaN(v)) { resMet.innerHTML = "<p>Entrez une valeur.</p>"; return; }
      if (v < 10 || v > 95) { resMet.innerHTML = "<p>Entrez un VO2max entre 10 et 95 mL/kg/min.</p>"; return; }
      var met = v / 3.5;
      var texte = met >= 7.9
        ? "C'est au-dessus du repère de 7,9 MET de la méta-analyse de Kodama."
        : "C'est sous le repère de 7,9 MET de la méta-analyse de Kodama, où chaque MET de plus allait avec un risque de décès environ 13 % plus bas.";
      resMet.innerHTML = '<p class="grand-chiffre">' + fr(met, 1) + " MET</p><p>" + texte + "</p>" +
        "<p>Un lien observé dans des études, pas une prédiction pour vous.</p>";
    });
  }
})();
