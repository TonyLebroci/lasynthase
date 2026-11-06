/* Moteur des modules d'apprentissage (2026-11-05).
   Une page de module contient #module[data-module], des <section class="etape"
   data-titre="…"> et des .question. Ce script construit le sommaire, gère le
   passage d'une étape à l'autre, corrige les questions et sauvegarde la
   progression dans le compte (PUT /api/progression/<module>).
   Questions : data-bonne="b" (choix) ou data-type="nombre" data-min data-max. */
(function () {
  "use strict";
  var racine = document.getElementById("module");
  if (!racine) return;

  var idModule = racine.dataset.module;
  var etapes = Array.prototype.slice.call(racine.querySelectorAll(".etape"));
  var questions = Array.prototype.slice.call(racine.querySelectorAll(".question"));
  var sommaire = document.getElementById("sommaire");
  var precedent = document.getElementById("etape-precedente");
  var suivant = document.getElementById("etape-suivante");
  var etatSauvegarde = document.getElementById("sauvegarde");
  var bilan = document.getElementById("bilan-quiz");
  var total = etapes.length + questions.length;

  var etat = { etape: 0, vues: [], reponses: {}, score: 0, totalQuestions: questions.length, termine: false };

  /* ---------- Sommaire ---------- */
  etapes.forEach(function (etape, i) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="puce">' + (i + 1) + '.</span><span></span>';
    b.lastChild.textContent = etape.dataset.titre;
    b.addEventListener("click", function () { allerA(i, true); });
    li.appendChild(b);
    sommaire.appendChild(li);
  });

  function allerA(i, defiler) {
    i = Math.max(0, Math.min(etapes.length - 1, i));
    etat.etape = i;
    if (etat.vues.indexOf(i) === -1) etat.vues.push(i);
    etapes.forEach(function (e, j) { e.classList.toggle("active", j === i); });
    Array.prototype.forEach.call(sommaire.children, function (li, j) {
      li.querySelector("button").toggleAttribute("aria-current", j === i);
      if (j === i) li.querySelector("button").setAttribute("aria-current", "step");
      li.classList.toggle("vue", etat.vues.indexOf(j) !== -1);
    });
    precedent.style.visibility = i === 0 ? "hidden" : "visible";
    suivant.style.display = i === etapes.length - 1 ? "none" : "";
    suivant.textContent = i === etapes.length - 2 ? "Aux questions" : "Suivant";
    majJauge();
    if (defiler) {
      var haut = racine.getBoundingClientRect().top + window.pageYOffset - 110;
      window.scrollTo({ top: haut, behavior: "smooth" });
    }
    sauvegarder();
  }

  precedent.addEventListener("click", function () { allerA(etat.etape - 1, true); });
  suivant.addEventListener("click", function () { allerA(etat.etape + 1, true); });

  function majJauge() {
    var faits = etat.vues.length + Object.keys(etat.reponses).length;
    var pct = Math.round(faits / total * 100);
    document.getElementById("jauge-module").style.width = pct + "%";
    document.getElementById("pourcentage-module").textContent = pct + " % complété";
  }

  /* ---------- Cartes à retourner ---------- */
  racine.querySelectorAll(".carte-choix").forEach(function (c) {
    c.addEventListener("click", function () {
      c.setAttribute("aria-expanded", c.getAttribute("aria-expanded") === "true" ? "false" : "true");
    });
  });

  /* ---------- Questions ---------- */
  questions.forEach(function (q) {
    var expl = q.querySelector(".explication");
    expl.hidden = true;
    if (q.dataset.type === "nombre") {
      var champ = q.querySelector("input");
      var valider = function () {
        var v = parseFloat(String(champ.value).replace(",", "."));
        if (isNaN(v)) { champ.focus(); return; }
        repondre(q, v);
      };
      q.querySelector(".reponse-nombre button").addEventListener("click", valider);
      champ.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); valider(); } });
    } else {
      q.querySelectorAll(".options button").forEach(function (b) {
        b.addEventListener("click", function () { repondre(q, b.dataset.choix); });
      });
    }
  });

  function estJuste(q, valeur) {
    if (q.dataset.type === "nombre") {
      return valeur >= Number(q.dataset.min) && valeur <= Number(q.dataset.max);
    }
    return valeur === q.dataset.bonne;
  }

  function repondre(q, valeur) {
    var id = q.dataset.id;
    if (etat.reponses[id]) return;
    etat.reponses[id] = { r: valeur, ok: estJuste(q, valeur) };
    afficherReponse(q, etat.reponses[id]);
    majScore(true);
    majJauge();
    sauvegarder();
  }

  function afficherReponse(q, rep) {
    var expl = q.querySelector(".explication");
    q.classList.add(rep.ok ? "juste" : "faux");
    if (q.dataset.type === "nombre") {
      var champ = q.querySelector("input");
      champ.value = rep.r;
      champ.disabled = true;
      q.querySelector(".reponse-nombre button").disabled = true;
    } else {
      q.querySelectorAll(".options button").forEach(function (b) {
        b.disabled = true;
        if (b.dataset.choix === q.dataset.bonne) b.classList.add("bonne");
        else if (b.dataset.choix === rep.r) b.classList.add("choisie-fausse");
      });
    }
    var verdict = expl.querySelector(".verdict");
    if (!verdict) {
      verdict = document.createElement("span");
      verdict.className = "verdict";
      expl.insertBefore(verdict, expl.firstChild);
    }
    verdict.textContent = rep.ok ? "Bonne réponse" : "Pas tout à fait";
    expl.hidden = false;
  }

  function majScore(annoncer) {
    var reponses = Object.keys(etat.reponses);
    etat.score = reponses.filter(function (k) { return etat.reponses[k].ok; }).length;
    etat.termine = reponses.length === questions.length;
    if (!etat.termine) { bilan.hidden = true; return; }
    document.getElementById("score-quiz").textContent = etat.score + " / " + questions.length;
    var ratio = etat.score / questions.length;
    document.getElementById("message-quiz").textContent =
      ratio >= 0.8 ? "Excellent. Vous maîtrisez l'essentiel de la zone 2." :
      ratio >= 0.5 ? "Bonne base. Relisez les étapes où vous avez hésité, puis réessayez." :
      "Prenez le temps de revoir les étapes, puis recommencez les questions.";
    bilan.hidden = false;
    if (annoncer) bilan.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.getElementById("recommencer-quiz").addEventListener("click", function () {
    etat.reponses = {};
    questions.forEach(function (q) {
      q.classList.remove("juste", "faux");
      q.querySelectorAll("button").forEach(function (b) { b.disabled = false; b.classList.remove("bonne", "choisie-fausse"); });
      var champ = q.querySelector("input");
      if (champ) { champ.disabled = false; champ.value = ""; }
      q.querySelector(".explication").hidden = true;
    });
    majScore(false);
    majJauge();
    sauvegarder();
    questions[0].scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------- Sauvegarde dans le compte ---------- */
  var minuterie = null;
  var pret = false;

  function sauvegarder() {
    if (!pret) return;
    clearTimeout(minuterie);
    minuterie = setTimeout(envoyer, 500);
  }

  function envoyer() {
    etatSauvegarde.textContent = "Sauvegarde…";
    fetch("/api/progression/" + idModule, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(etat)
    }).then(function (r) {
      if (r.status === 401) {
        etatSauvegarde.innerHTML = 'Session expirée. <a href="/connexion.html?retour=' +
          encodeURIComponent(location.pathname) + '">Reconnectez-vous</a> pour sauvegarder.';
        return;
      }
      etatSauvegarde.textContent = r.ok ? "Progression sauvegardée." : "Sauvegarde impossible pour l'instant.";
    }).catch(function () {
      etatSauvegarde.textContent = "Hors ligne : progression non sauvegardée.";
    });
  }

  /* ---------- Reprise ---------- */
  function reprendre(sauve) {
    if (sauve && typeof sauve === "object") {
      if (Array.isArray(sauve.vues)) etat.vues = sauve.vues.filter(function (v) { return v >= 0 && v < etapes.length; });
      if (sauve.reponses && typeof sauve.reponses === "object") {
        questions.forEach(function (q) {
          var rep = sauve.reponses[q.dataset.id];
          if (rep) { etat.reponses[q.dataset.id] = { r: rep.r, ok: estJuste(q, rep.r) }; afficherReponse(q, etat.reponses[q.dataset.id]); }
        });
      }
      if (typeof sauve.etape === "number") etat.etape = sauve.etape;
    }
    majScore(false);
    pret = true;
    allerA(etat.etape, false);
  }

  fetch("/api/moi", { credentials: "same-origin" }).then(function (r) {
    if (r.status === 401) { location.replace("/connexion.html?retour=" + encodeURIComponent(location.pathname)); return null; }
    return r.json();
  }).then(function (moi) {
    if (moi) reprendre((moi.progression || {})[idModule]);
  }).catch(function () {
    reprendre(null);
    etatSauvegarde.textContent = "Hors ligne : progression non sauvegardée.";
  });
})();
