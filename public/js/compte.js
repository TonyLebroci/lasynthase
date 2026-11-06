/* Espace membre (2026-11-05) : page de connexion et page « Mon espace ».
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

  function occupe(form, oui, texte) {
    var b = form.querySelector('button[type="submit"]');
    if (oui) { b.dataset.texte = b.textContent; b.textContent = texte; b.disabled = true; }
    else { b.textContent = b.dataset.texte || b.textContent; b.disabled = false; }
  }

  // Adresse où revenir après la connexion : seulement une page du site.
  function adresseRetour() {
    var r = new URLSearchParams(location.search).get("retour") || "";
    return /^\/(?!\/)[\w\-./]*$/.test(r) ? r : "/espace.html";
  }

  // Afficher / masquer le mot de passe.
  document.querySelectorAll(".voir-mdp").forEach(function (b) {
    b.addEventListener("click", function () {
      var champ = document.getElementById(b.getAttribute("aria-controls"));
      var visible = champ.type === "text";
      champ.type = visible ? "password" : "text";
      b.textContent = visible ? "Afficher" : "Masquer";
    });
  });

  /* ---------- Page de connexion ---------- */
  var formConnexion = document.getElementById("form-connexion");
  var formInscription = document.getElementById("form-inscription");

  if (formConnexion && formInscription) {
    // Déjà connecté ? On file directement à l'espace.
    if (/(?:^|;\s*)ls_connecte=1/.test(document.cookie)) {
      appel("GET", "/api/moi").then(function (r) { if (r.ok) location.replace(adresseRetour()); });
    }

    var onglets = document.querySelector(".onglets");
    function montrer(nom) {
      onglets.dataset.actif = nom;
      document.getElementById("onglet-connexion").setAttribute("aria-selected", nom === "connexion");
      document.getElementById("onglet-inscription").setAttribute("aria-selected", nom === "inscription");
      formConnexion.hidden = nom !== "connexion";
      formInscription.hidden = nom !== "inscription";
      var premier = (nom === "connexion" ? formConnexion : formInscription).querySelector("input");
      if (premier) premier.focus({ preventScroll: true });
    }
    document.getElementById("onglet-connexion").addEventListener("click", function () { montrer("connexion"); });
    document.getElementById("onglet-inscription").addEventListener("click", function () { montrer("inscription"); });
    if (location.hash === "#inscription") montrer("inscription");

    // Jauge de solidité du mot de passe (indicative).
    var mdp = document.getElementById("inscription-mdp");
    var jauge = formInscription.querySelector(".force-mdp span");
    var aide = document.getElementById("aide-mdp");
    mdp.addEventListener("input", function () {
      var v = mdp.value, points = 0;
      if (v.length >= 10) points++;
      if (v.length >= 14) points++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) points++;
      if (/\d/.test(v)) points++;
      if (/[^\w\s]/.test(v)) points++;
      var niveaux = [
        ["8%", "var(--terracotta)", "Au moins 10 caractères."],
        ["30%", "var(--terracotta)", "Encore un peu court ou trop simple."],
        ["55%", "var(--gold)", "Correct."],
        ["78%", "var(--sage)", "Solide."],
        ["100%", "var(--sage-deep)", "Très solide."]
      ];
      var n = v.length < 10 ? niveaux[v.length ? 1 : 0] : niveaux[Math.min(4, Math.max(2, points))];
      jauge.style.width = v.length ? n[0] : "0";
      jauge.style.background = n[1];
      aide.textContent = n[2];
    });

    formConnexion.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = { courriel: formConnexion.courriel.value, motDePasse: formConnexion.motDePasse.value };
      if (!d.courriel || !d.motDePasse) return message(formConnexion, "Entrez votre courriel et votre mot de passe.");
      occupe(formConnexion, true, "Connexion…");
      message(formConnexion, "");
      appel("POST", "/api/connexion", d).then(function (r) {
        if (r.ok) { message(formConnexion, "Bienvenue, " + r.corps.nom + ".", true); location.assign(adresseRetour()); return; }
        occupe(formConnexion, false);
        message(formConnexion, r.corps.erreur || "Connexion impossible pour l'instant.");
      }).catch(function () {
        occupe(formConnexion, false);
        message(formConnexion, "Pas de connexion au serveur. Vérifiez votre réseau.");
      });
    });

    formInscription.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = formInscription;
      var d = { nom: f.nom.value, courriel: f.courriel.value, motDePasse: f.motDePasse.value, consentement: f.consentement.checked };
      if (!d.nom.trim()) return message(f, "Indiquez votre nom.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.courriel.trim())) return message(f, "Ce courriel ne semble pas valide.");
      if (d.motDePasse.length < 10) return message(f, "Le mot de passe doit compter au moins 10 caractères.");
      if (!d.consentement) return message(f, "Cochez la case pour accepter la politique de confidentialité.");
      occupe(f, true, "Création…");
      message(f, "");
      appel("POST", "/api/inscription", d).then(function (r) {
        if (r.ok) { message(f, "Compte créé. Bienvenue, " + r.corps.nom + ".", true); location.assign(adresseRetour()); return; }
        occupe(f, false);
        message(f, r.corps.erreur || "Création impossible pour l'instant.");
        if (r.statut === 409) formConnexion.courriel.value = d.courriel;
      }).catch(function () {
        occupe(f, false);
        message(f, "Pas de connexion au serveur. Vérifiez votre réseau.");
      });
    });
  }

  /* ---------- Page « Mon espace » ---------- */
  var cartes = document.querySelectorAll(".module-carte[data-module]");
  var boutonDeconnexion = document.getElementById("deconnexion");

  if (boutonDeconnexion) {
    appel("GET", "/api/moi").then(function (r) {
      if (!r.ok) { location.replace("/connexion.html?retour=" + encodeURIComponent(location.pathname)); return; }
      var prenom = String(r.corps.nom || "").split(/\s+/)[0];
      document.getElementById("nom-membre").textContent = prenom;
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

    boutonDeconnexion.addEventListener("click", function () {
      appel("POST", "/api/deconnexion", {}).then(function () { location.assign("/index.html"); });
    });

    var formSuppression = document.getElementById("form-suppression");
    formSuppression.addEventListener("submit", function (e) {
      e.preventDefault();
      var mdp = document.getElementById("suppression-mdp").value;
      if (!mdp) return message(formSuppression, "Entrez votre mot de passe.");
      occupe(formSuppression, true, "Suppression…");
      appel("DELETE", "/api/compte", { motDePasse: mdp }).then(function (r) {
        if (r.ok) { location.assign("/index.html"); return; }
        occupe(formSuppression, false);
        message(formSuppression, r.corps.erreur || "Suppression impossible pour l'instant.");
      });
    });
  }
})();
