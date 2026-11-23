/* Outil du module « Le VO2max, le plafond aérobie » (2026-11-22, version courte 2026-11-23).
   En MET : 1 MET = 3,5 mL/kg/min ; repère de 7,9 MET et risque de décès 13 % plus bas par MET de plus
   (Kodama et al. 2009). */
(function () {
  "use strict";

  function fr(n, dec) { return n.toFixed(dec).replace(".", ","); }
  function nombre(champ) { return parseFloat(String(champ.value).replace(",", ".")); }

  var metVo2 = document.getElementById("met-vo2"), resMet = document.getElementById("resultat-met");
  if (!resMet) return;
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
})();
