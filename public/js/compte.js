/* Espace membre : page « Mon espace ».
   Depuis le 2026-11-25 (porte unique), la connexion se fait par Cloudflare Access (courriel + code), la même
   que l'app d'entraînement. Plus de formulaire de connexion, d'inscription ni de mot de passe sur le site.
   Parle au serveur (src/worker.js) par /api/… en JSON. */
(function () {
  "use strict";

  function appel(methode, chemin, donnees) {
    var options = { method: methode, credentials: "same-origin", headers: {} };
    if (donnees !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(donnees);
    }
    return fetch(chemin, options).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (corps) {
        return { ok: r.ok, statut: r.status, corps: corps };
      });
    });
  }

  function message(form, texte, ok) {
    var m = form.querySelector(".message-form");
    m.textContent = texte || "";
    m.classList.toggle("ok", !!ok);
  }

  /* ---------- Page « Mon espace » ---------- */
  var cartes = document.querySelectorAll(".module-carte[data-module]");
  var boutonDeconnexion = document.getElementById("deconnexion");
  if (!boutonDeconnexion) return;

  appel("GET", "/api/moi").then(function (r) {
    if (!r.ok) { location.replace("/connexion.html"); return; }
    var prenom = String(r.corps.nom || "").split(/\s+/)[0];
    if (prenom) document.getElementById("nom-membre").textContent = prenom;
    document.getElementById("courriel-membre").textContent = r.corps.courriel;

    cartes.forEach(function (carte) {
      var etat = (r.corps.progression || {})[carte.dataset.module];
      var total = Number(carte.dataset.total) || 1;
      var lien = carte.querySelector(".btn");
      var texte = carte.querySelector(".module-etat");
      var barre = carte.querySelector(".jauge span");
      if (!etat) return;
      var faits = (etat.vues || []).length + Object.keys(etat.reponses || {}).length;
      var pct = Math.min(100, Math.round(faits / total * 100));
      setTimeout(function () { barre.style.width = pct + "%"; }, 200);
      if (etat.termine) {
        texte.textContent = "Terminé · " + etat.score + " / " + etat.totalQuestions + " aux questions.";
        lien.textContent = "Revoir le module";
      } else {
        texte.textContent = pct + " % complété.";
        lien.textContent = "Continuer";
      }
    });
  });

  // Déconnexion : le site oublie son indice, puis Cloudflare Access ferme la connexion.
  boutonDeconnexion.addEventListener("click", function () {
    appel("POST", "/api/deconnexion", {}).then(function (r) {
      location.assign((r.corps && r.corps.sortie) || "/index.html");
    });
  });

  var formSuppression = document.getElementById("form-suppression");
  formSuppression.addEventListener("submit", function (e) {
    e.preventDefault();
    var confirmation = document.getElementById("suppression-confirmation").value;
    if (confirmation.trim().toUpperCase() !== "SUPPRIMER") return message(formSuppression, "Écrivez SUPPRIMER pour confirmer.");
    var b = formSuppression.querySelector('button[type="submit"]');
    b.disabled = true;
    appel("DELETE", "/api/compte", { confirmation: confirmation }).then(function (r) {
      // Compte effacé : on ferme aussi la connexion Cloudflare, sinon la visite suivante le recréerait aussitôt.
      if (r.ok) { location.assign("/cdn-cgi/access/logout"); return; }
      b.disabled = false;
      message(formSuppression, r.corps.erreur || "Suppression impossible pour l'instant.");
    });
  });
})();
