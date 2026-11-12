/* Questionnaire de candidature au projet pilote en endurance (2026-11-11).
 *
 * - Une étape à la fois (mêmes classes que les modules : .etape, .active).
 * - Les réponses sont gardées dans le navigateur (localStorage) à mesure.
 * - Rien n'est obligatoire pour avancer : un champ vide est signalé, pas bloqué.
 *   La complétude fait partie de la sélection. Seuls les coordonnées et les
 *   consentements sont exigés à l'envoi.
 * - À la fin, la personne choisit (2026-11-11, demande de Tony) : garder ses
 *   fiches pour elle (rien n'est envoyé, aucune requête) ou poser sa candidature
 *   (POST /api/candidature). Dans les deux cas, le bilan est construit ici, dans
 *   la page, à partir des réponses. Tout texte de la personne passe par
 *   textContent (jamais innerHTML).
 */
(function () {
  "use strict";

  // v3 (2026-11-11) : révision par quatre experts (jalon, soutien, actions de
  // confiance liées à l'entraînement, plus d'importance sur 10 ni de questions de plan).
  var CLE = "ls-candidature-pilote-v3";
  var VERSION = 3;
  var form = document.getElementById("candidature");
  if (!form) return;

  var etapes = Array.prototype.slice.call(form.querySelectorAll(".etape"));
  var sommaire = document.getElementById("sommaire");
  var precedent = document.getElementById("precedent");
  var suivant = document.getElementById("suivant");
  var jauge = document.getElementById("jauge");
  var pourcentage = document.getElementById("pourcentage");
  var sauvegarde = document.getElementById("sauvegarde");
  var bilan = document.getElementById("bilan");
  var navigation = form.querySelector(".navigation-etapes");
  var courante = 0;

  /* ---------- Force ou faiblesse (valeurs 1, 3, 5) ---------- */
  var NIVEAUX_CAPACITE = [["1", "Faiblesse"], ["3", "Ni l'un ni l'autre"], ["5", "Force"]];
  form.querySelectorAll(".note-ligne").forEach(function (ligne) {
    var nom = ligne.getAttribute("data-nom");
    var pastilles = document.createElement("div");
    pastilles.className = "pastilles";
    pastilles.setAttribute("role", "radiogroup");
    pastilles.setAttribute("aria-label", ligne.textContent.trim());
    NIVEAUX_CAPACITE.forEach(function (niv) {
      var l = document.createElement("label");
      var r = document.createElement("input");
      r.type = "radio";
      r.name = nom;
      r.value = niv[0];
      var s = document.createElement("span");
      s.textContent = niv[1];
      l.appendChild(r);
      l.appendChild(s);
      pastilles.appendChild(l);
    });
    ligne.appendChild(pastilles);
  });

  /* ---------- Lecture et écriture des réponses ---------- */
  function lire() {
    var r = {};
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (!el.name || el.name === "site_web") return;
      if (el.type === "checkbox") {
        if (el.name === "majeur" || el.name === "consentement" || el.name === "comprend") {
          r[el.name] = el.checked;
        } else {
          if (!r[el.name]) r[el.name] = [];
          if (el.checked) r[el.name].push(el.value);
        }
      } else if (el.type === "radio") {
        if (el.checked) r[el.name] = el.value;
      } else if (el.type === "range") {
        if (el.getAttribute("data-touche") === "oui") r[el.name] = Number(el.value);
      } else {
        var v = el.value.trim();
        if (v !== "") r[el.name] = el.type === "number" ? Number(v) : v;
      }
    });
    return r;
  }

  function ecrire(r) {
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (!el.name || !(el.name in r)) return;
      var v = r[el.name];
      if (el.type === "checkbox") {
        el.checked = Array.isArray(v) ? v.indexOf(el.value) !== -1 : v === true;
      } else if (el.type === "radio") {
        el.checked = String(v) === el.value;
      } else if (el.type === "range") {
        el.value = v;
        el.setAttribute("data-touche", "oui");
        afficherEchelle(el);
      } else {
        el.value = v;
      }
    });
  }

  function charger() {
    try { return JSON.parse(localStorage.getItem(CLE) || "null"); } catch (e) { return null; }
  }

  var minuterie;
  function memoriser() {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () {
      try {
        var etat = charger() || {};
        etat.reponses = lire();
        etat.etape = courante;
        localStorage.setItem(CLE, JSON.stringify(etat));
        sauvegarde.textContent = "Réponses gardées dans ce navigateur";
      } catch (e) {
        sauvegarde.textContent = "";
      }
    }, 400);
    majJauge();
  }

  /* ---------- Échelles 0 à 10 ---------- */
  function afficherEchelle(el) {
    var sortie = document.getElementById(el.id + "-valeur");
    if (sortie) sortie.textContent = el.getAttribute("data-touche") === "oui" ? el.value : "–";
  }
  // Toucher le curseur compte comme une réponse, même sans le déplacer (ex. laisser 5).
  form.querySelectorAll('input[type="range"]').forEach(function (el) {
    ["input", "change", "pointerup", "touchend", "keyup"].forEach(function (evt) {
      el.addEventListener(evt, function () {
        el.setAttribute("data-touche", "oui");
        afficherEchelle(el);
        memoriser();
      });
    });
  });

  /* ---------- Terminer ou chrono ---------- */
  function majTypeObjectif() {
    var choisi = form.querySelector('input[name="type_objectif"]:checked');
    form.querySelectorAll("[data-si-type]").forEach(function (b) {
      b.hidden = !choisi || b.getAttribute("data-si-type") !== choisi.value;
    });
  }
  form.querySelectorAll('input[name="type_objectif"]').forEach(function (r) {
    r.addEventListener("change", function () { majTypeObjectif(); majJauge(); });
  });

  /* ---------- Garder ses fiches ou poser sa candidature ---------- */
  function modeFin() {
    var choisi = form.querySelector('input[name="mode_fin"]:checked');
    return choisi ? choisi.value : null;
  }
  function majModeFin() {
    var m = modeFin();
    form.querySelectorAll("[data-si-envoi]").forEach(function (b) {
      b.hidden = b.getAttribute("data-si-envoi") !== m;
    });
    if (courante === etapes.length - 1) suivant.textContent = texteDernierBouton();
  }
  function texteDernierBouton() {
    var m = modeFin();
    return m === "envoyer" ? "Envoyer ma candidature et voir mes fiches" : "Voir mes fiches";
  }
  form.querySelectorAll('input[name="mode_fin"]').forEach(function (r) {
    r.addEventListener("change", function () { majModeFin(); majJauge(); messageEnvoi.textContent = ""; });
  });

  /* ---------- Deux leviers au plus ---------- */
  var leviers = document.getElementById("leviers");
  leviers.addEventListener("change", function (e) {
    var coches = leviers.querySelectorAll("input:checked");
    if (coches.length > 2 && e.target.checked) e.target.checked = false;
  });

  /* ---------- Complétude ---------- */
  // Un « champ » = un input/select/textarea requis, ou un groupe (radio, cases, note).
  function champsDe(etape) {
    var vus = {};
    var liste = [];
    etape.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (!el.name || el.name === "site_web" || vus[el.name]) return;
      if (el.closest("[data-si-type][hidden]") || el.closest("[data-si-envoi][hidden]")) return;
      var groupe = el.type === "radio" || (el.type === "checkbox" && !/^(majeur|consentement|comprend)$/.test(el.name));
      var requis = el.required || groupe || el.type === "range";
      if (el.name === "evenement" || el.name === "perf_recente" || el.name === "barriere") requis = false;
      if (!requis) return;
      vus[el.name] = true;
      liste.push(el.name);
    });
    return liste;
  }

  function rempli(r, nom) {
    var v = r[nom];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "boolean") return v;
    return v !== undefined && v !== "";
  }

  function majJauge() {
    var r = lire();
    var total = 0, faits = 0;
    etapes.forEach(function (etape, i) {
      var noms = champsDe(etape);
      var manque = 0;
      noms.forEach(function (n) { total++; if (rempli(r, n)) faits++; else manque++; });
      var li = sommaire.children[i];
      if (li) {
        li.classList.toggle("vue", noms.length > 0 && manque === 0);
      }
    });
    var p = total ? Math.round((faits / total) * 100) : 0;
    jauge.style.width = p + "%";
    pourcentage.textContent = p + " % rempli";
    return p;
  }

  function signalerManques(etape) {
    var r = lire();
    var manque = 0;
    champsDe(etape).forEach(function (nom) {
      var el = etape.querySelector('[name="' + nom + '"]');
      var bloc = el.closest(".field, .choix, .note-ligne, .echelle-bloc");
      var ok = rempli(r, nom);
      if (bloc) bloc.classList.toggle("manque", !ok);
      if (!ok) manque++;
    });
    return manque;
  }

  /* ---------- Navigation ---------- */
  etapes.forEach(function (etape, i) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    var puce = document.createElement("span");
    puce.className = "puce";
    puce.textContent = i === 0 ? "·" : i === etapes.length - 1 ? "✉" : String(i);
    var titre = document.createElement("span");
    titre.textContent = etape.getAttribute("data-titre");
    b.appendChild(puce);
    b.appendChild(titre);
    b.addEventListener("click", function () { allerA(i, true); });
    li.appendChild(b);
    sommaire.appendChild(li);
  });

  var messageEnvoi = document.getElementById("message-envoi");

  function allerA(i, defiler) {
    if (i < 0 || i >= etapes.length) return;
    etapes.forEach(function (e, j) { e.classList.toggle("active", j === i); });
    Array.prototype.forEach.call(sommaire.querySelectorAll("button"), function (b, j) {
      if (j === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    courante = i;
    precedent.style.visibility = i === 0 ? "hidden" : "visible";
    suivant.textContent = i === 0 ? "Commencer" : i === etapes.length - 1 ? texteDernierBouton() : "Suivant";
    messageEnvoi.textContent = "";
    if (etapes[i].getAttribute("data-titre") === "L'écart") lectureEcart();
    if (defiler) form.scrollIntoView({ behavior: "smooth", block: "start" });
    memoriser();
  }

  precedent.addEventListener("click", function () { allerA(courante - 1, true); });
  suivant.addEventListener("click", function () {
    if (courante === etapes.length - 1) { envoyer(); return; }
    var manque = signalerManques(etapes[courante]);
    var note = etapes[courante].querySelector(".note-manques");
    if (manque > 0 && !note) {
      note = document.createElement("p");
      note.className = "message-form note-manques";
      note.setAttribute("role", "status");
      etapes[courante].appendChild(note);
    }
    if (manque > 0 && note.getAttribute("data-vu") !== String(manque)) {
      // Premier clic : on signale. Deuxième clic : on laisse passer.
      note.textContent = manque === 1
        ? "Une réponse manque (en orangé). Vous pouvez continuer, mais un dossier complet a plus de chances d'être retenu."
        : manque + " réponses manquent (en orangé). Vous pouvez continuer, mais un dossier complet a plus de chances d'être retenu.";
      note.setAttribute("data-vu", String(manque));
      return;
    }
    if (note) note.textContent = "";
    allerA(courante + 1, true);
  });

  form.addEventListener("input", function (e) {
    var bloc = e.target.closest(".field, .choix, .note-ligne, .echelle-bloc");
    if (bloc) bloc.classList.remove("manque");
    memoriser();
  });
  form.addEventListener("change", memoriser);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ---------- Calculs ---------- */
  function semainesAvant(dateIso) {
    if (!dateIso) return null;
    var cible = new Date(dateIso + "T12:00:00");
    if (isNaN(cible)) return null;
    var auj = new Date();
    auj.setHours(12, 0, 0, 0);
    return Math.floor((cible - auj) / (7 * 24 * 3600 * 1000));
  }

  // Le jalon se date à partir de l'envoi (pas du jour où l'on réimprime la fiche).
  function dansSemaines(n) {
    var etat = charger();
    var quand = etat && (etat.envoye || etat.garde);
    var d = quand ? new Date(quand) : new Date();
    d.setDate(d.getDate() + n * 7);
    return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
  }

  function dateLongue(dateIso) {
    var d = new Date(dateIso + "T12:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  }

  function heures(h) {
    if (h === undefined || h === null || isNaN(h)) return "?";
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return mm ? hh + " h " + String(mm).padStart(2, "0") : hh + " h";
  }

  var CAPACITES = {
    cap_endurance: "Endurance de base", cap_seuil: "Vitesse au seuil", cap_vitesse: "Vitesse et puissance courtes",
    cap_force: "Force et solidité musculaire", cap_technique: "Technique", cap_regularite: "Régularité",
    cap_recuperation: "Récupération"
  };

  // Forces = « Force » (5), faiblesses = « Faiblesse » (1). Les anciennes notes de 1 à 5
  // (questionnaire du début) se lisent pareil : 4-5 force, 1-2 faiblesse.
  function forcesEtFaiblesses(r) {
    var notes = Object.keys(CAPACITES).filter(function (k) { return r[k]; })
      .map(function (k) { return { nom: CAPACITES[k], note: Number(r[k]) }; });
    if (notes.length < 3) return null;
    return {
      forces: notes.filter(function (x) { return x.note >= 4; }),
      faiblesses: notes.filter(function (x) { return x.note <= 2; })
    };
  }

  function lectureVolume(r) {
    var a = r.heures_actuelles, d = r.heures_dispo;
    if (!(a >= 0) || !(d >= 0)) return null;
    if (a === 0) return "Vous partez de zéro heure par semaine : le plan commencera bas et montera par paliers.";
    var ecart = Math.round(((d - a) / a) * 100);
    if (d < a) return "Vous prévoyez " + heures(d) + " par semaine, moins qu'aujourd'hui (" + heures(a) + ") : le plan misera sur la qualité des séances plutôt que sur le volume.";
    if (ecart > 30) return "Vous visez " + heures(d) + " par semaine contre " + heures(a) + " aujourd'hui (+" + ecart + " %). La hausse se fera par paliers : une charge qui monte trop vite est une cause fréquente de blessure.";
    return "Vous visez " + heures(d) + " par semaine, proche de ce que vous faites aujourd'hui (" + heures(a) + ") : la continuité est un atout.";
  }

  function lectureCriteres(r) {
    var manque = [];
    if (r.crit_intervals === "non") manque.push("vos séances ne sont pas encore dans intervals.icu");
    if (r.crit_capteur === "non") manque.push("vous n'avez ni ceinture cardiaque ni capteur de puissance");
    if (!manque.length) return r.crit_intervals && r.crit_capteur ? "Vous répondez aux critères du projet : historique dans intervals.icu et capteur fiable." : null;
    return "À noter : " + manque.join(" et ") + ". C'est un critère du projet pilote ; sans ça, la séance étalon ne peut pas mesurer votre forme avec précision.";
  }

  /* ---------- L'objectif formulé SMART ---------- */
  function minusculeInitiale(t) {
    return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  }

  function phraseSmart(r) {
    var obj = minusculeInitiale((r.objectif || "atteindre mon objectif").replace(/[.\s]+$/, ""));
    var p = (r.date_objectif ? "D'ici le " + dateLongue(r.date_objectif) + ", " : "") + obj;
    if (r.type_objectif === "terminer") {
      if (r.barriere) p += ", avant le temps limite de " + r.barriere;
      if (r.comment_finir) p += ", " + minusculeInitiale(r.comment_finir.replace(/[.\s]+$/, ""));
    } else if (r.niveau_cible) {
      // La cible est souvent déjà dans la phrase de l'objectif : ne pas la répéter.
      var n = (r.objectif || "").toLowerCase().indexOf(r.niveau_cible.toLowerCase()) === -1 ? ["cible : " + r.niveau_cible] : [];
      if (r.niveau_seuil) n.push("seuil : " + r.niveau_seuil);
      if (r.niveau_reve) n.push("rêve : " + r.niveau_reve);
      if (n.length) p += " (" + n.join(" ; ") + ")";
    }
    if (r.heures_dispo !== undefined) p += ", en m'entraînant " + heures(r.heures_dispo) + " par semaine";
    p = p.charAt(0).toUpperCase() + p.slice(1);
    return p + ".";
  }

  function grilleSmart(r, s) {
    var mesurable;
    if (r.type_objectif === "terminer") {
      mesurable = "Franchir la ligne d'arrivée" + (r.barriere ? " avant le temps limite de " + r.barriere : "") + (r.comment_finir ? ", " + minusculeInitiale(r.comment_finir) : "") + ".";
    } else {
      mesurable = r.niveau_cible ? "Cible : " + r.niveau_cible + (r.niveau_seuil ? " · seuil : " + r.niveau_seuil : "") + (r.niveau_reve ? " · rêve : " + r.niveau_reve : "") + "." : "À préciser : un chiffre qui se vérifie sans discussion.";
    }
    // Locke et Latham : un objectif difficile mais à sa portée donne plus qu'un objectif
    // facile. A = Ambitieux (on part d'où ?) ; R = Rétroaction (comment on saura).
    var ambitieux = [];
    if (r.perf_recente) ambitieux.push("Vous partez de : " + r.perf_recente + ".");
    if (r.preuve) ambitieux.push("Votre preuve que c'est à votre portée : " + r.preuve);
    if (!ambitieux.length) ambitieux.push("À démontrer : d'où vous partez, et pourquoi c'est à votre portée.");
    var retro = (r.jalon ? "Jalon d'ici le " + dansSemaines(8) + " : " + r.jalon.replace(/[.\s]+$/, "") + ". " : "À préciser : un jalon dans 6 à 8 semaines. ")
      + "Puis la séance étalon, toutes les deux semaines, qui dit en chiffres si la forme monte.";
    return [
      ["S", "Spécifique", (r.objectif || "À préciser") + (r.evenement ? " · " + r.evenement : "") + (r.sport ? " · " + r.sport : "")],
      ["M", "Mesurable", mesurable],
      ["A", "Ambitieux", ambitieux.join(" ")],
      ["R", "Rétroaction", retro],
      ["T", "Temporel", r.date_objectif ? dateLongue(r.date_objectif) + (s !== null && s >= 0 ? ", dans " + s + " semaine" + (s > 1 ? "s" : "") : "") + "." : "À préciser : une date."]
    ];
  }

  var LEVIER_CAP = {
    "Endurance de base": "cap_endurance", "Vitesse au seuil": "cap_seuil", "Vitesse et puissance courtes": "cap_vitesse",
    "Force et solidité musculaire": "cap_force", "Technique": "cap_technique", "Régularité": "cap_regularite",
    "Récupération": "cap_recuperation"
  };

  // Les leviers se choisissent d'abord parmi les faiblesses cochées à l'étape 2.
  function ordonnerLeviers(r) {
    var etiquettes = Array.prototype.slice.call(leviers.querySelectorAll("label"));
    function rang(l) {
      var n = Number(r[LEVIER_CAP[l.querySelector("input").value]]);
      return n && n <= 2 ? 0 : n >= 4 ? 2 : 1;
    }
    etiquettes.forEach(function (l, i) { l.setAttribute("data-ordre", l.getAttribute("data-ordre") || String(i)); });
    etiquettes.sort(function (a, b) { return rang(a) - rang(b) || a.getAttribute("data-ordre") - b.getAttribute("data-ordre"); });
    etiquettes.forEach(function (l) {
      var m = l.querySelector(".marque-faiblesse");
      if (m) m.remove();
      if (rang(l) === 0) l.appendChild(el("span", "votre faiblesse", "marque-faiblesse"));
      leviers.appendChild(l);
    });
  }

  function lectureEcart() {
    var r = lire();
    ordonnerLeviers(r);
    var boite = document.getElementById("lecture-ecart");
    var zone = document.getElementById("lecture-ecart-texte");
    zone.textContent = "";
    var lignes = [];
    var s = semainesAvant(r.date_objectif);
    if (s !== null) lignes.push(s >= 0 ? "Votre objectif est dans " + s + " semaine" + (s > 1 ? "s" : "") + "." : "La date de l'objectif est déjà passée : revenez à l'étape 1 pour la corriger.");
    var v = lectureVolume(r); if (v) lignes.push(v);
    var ff = forcesEtFaiblesses(r);
    if (ff && ff.forces.length) lignes.push("Vos forces : " + ff.forces.map(function (x) { return x.nom.toLowerCase(); }).join(", ") + ".");
    if (ff && ff.faiblesses.length) lignes.push("Vos faiblesses : " + ff.faiblesses.map(function (x) { return x.nom.toLowerCase(); }).join(", ") + ".");
    lignes.forEach(function (t) { var p = document.createElement("p"); p.textContent = t; zone.appendChild(p); });
    boite.hidden = lignes.length === 0;
  }

  /* ---------- Construction du bilan ---------- */
  function el(balise, texte, classe, classe2) {
    var e = document.createElement(balise);
    if (texte !== undefined && texte !== null) e.textContent = texte;
    if (classe) e.className = classe;
    if (classe2) e.classList.add(classe2);
    return e;
  }

  /* ---------- Citations (attributions vérifiées) ---------- */
  var CITATIONS = [
    { texte: "Un voyage de mille lieues commence par un premier pas.", auteur: "Lao-tseu", source: "Tao-tö-king" },
    { texte: "Patience et longueur de temps font plus que force ni que rage.", auteur: "Jean de La Fontaine", source: "Le Lion et le Rat" },
    { texte: "L'obstacle à l'action fait avancer l'action. Ce qui fait obstacle devient le chemin.", auteur: "Marc Aurèle", source: "Pensées" },
    { texte: "Celui qui a un pourquoi peut supporter presque n'importe quel comment.", auteur: "D'après Friedrich Nietzsche", source: "Crépuscule des idoles" },
    { texte: "Tombe sept fois, relève-toi huit.", auteur: "Proverbe japonais" },
    { texte: "Only the disciplined ones in life are free.", auteur: "Eliud Kipchoge" },
    { texte: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", auteur: "Will Durant", source: "The Story of Philosophy" },
    { texte: "Mens sana in corpore sano. Un esprit sain dans un corps sain.", auteur: "Juvénal", source: "Satires" },
    { texte: "Le hasard ne favorise que les esprits préparés.", auteur: "Louis Pasteur" },
    { texte: "The credit belongs to the man who is actually in the arena.", auteur: "Theodore Roosevelt", source: "Discours de la Sorbonne, 1910" },
    { texte: "The miracle isn't that I finished. The miracle is that I had the courage to start.", auteur: "John Bingham" }
  ];

  // La citation qui parle le plus selon les réponses : d'abord une confiance basse,
  // puis le genre d'objectif, puis l'horizon. Un choix fait par la personne prime.
  function choisirCitation(r, s) {
    var etat = charger();
    if (etat && etat.citation === "perso" && etat.citationPerso && etat.citationPerso.texte) {
      return { texte: etat.citationPerso.texte, auteur: etat.citationPerso.auteur || r.prenom || "Moi" };
    }
    if (etat && typeof etat.citation === "number" && CITATIONS[etat.citation]) return CITATIONS[etat.citation];
    if (r.confiance !== undefined && r.confiance <= 5) return CITATIONS[4];
    if (r.type_objectif === "terminer") return CITATIONS[10];
    if (s !== null && s >= 30) return CITATIONS[1];
    if (r.type_objectif === "chrono") return CITATIONS[5];
    return CITATIONS[6];
  }

  /* ---------- Fiche du matin : une page, l'essentiel ---------- */
  function construireFicheMatin(r, c) {
    var f = el("section", null, "fiche fiche-matin");
    f.appendChild(el("p", "Chaque matin" + (r.prenom ? " · " + r.prenom : ""), "fiche-surtitre"));
    var objectif = r.objectif || "Mon objectif";
    f.appendChild(el("p", objectif, "fiche-objectif", objectif.length > 90 ? "long" : null));
    var quand = [];
    if (r.date_objectif) quand.push(dateLongue(r.date_objectif));
    if (r.evenement) quand.push(r.evenement);
    if (quand.length) f.appendChild(el("p", quand.join(" · "), "fiche-date"));

    // v3 : d'abord ce que la personne contrôle (Burton, 1989), puis le prochain jalon,
    // puis la cible. Le seuil et le rêve restent dans la fiche détaillée.
    var hab = [r.habitude_1, r.habitude_2, r.habitude_3].filter(Boolean);
    if (hab.length) {
      f.appendChild(el("p", "Mes actions de confiance", "fiche-etiquette"));
      var ul = el("ul", null, "fiche-habitudes");
      hab.forEach(function (h) { ul.appendChild(el("li", h)); });
      f.appendChild(ul);
    }

    if (r.jalon) {
      f.appendChild(el("p", "Mon prochain jalon · d'ici le " + dansSemaines(8), "fiche-etiquette"));
      f.appendChild(el("p", r.jalon, "fiche-plan"));
    }

    var cible = r.type_objectif === "terminer" ? "Terminer" + (r.barriere ? " en moins de " + r.barriere : "") : r.niveau_cible;
    if (cible) {
      var niv = el("div", null, "fiche-niveaux");
      var d = el("div", null, "est-cible");
      d.appendChild(el("span", "Cible"));
      d.appendChild(el("strong", cible));
      niv.appendChild(d);
      f.appendChild(niv);
    }

    var pourquoi = r.pourquoi_1;
    if (pourquoi) {
      f.appendChild(el("p", "Pourquoi", "fiche-etiquette"));
      // Une fiche se lit d'un coup d'œil : le pourquoi au long reste dans la fiche détaillée.
      if (pourquoi.length > 160) pourquoi = pourquoi.slice(0, 160).replace(/\s+\S*$/, "") + "…";
      f.appendChild(el("p", pourquoi, "fiche-pourquoi", pourquoi.length > 110 ? "long" : null));
    }

    if (r.si_1 && r.alors_1) {
      f.appendChild(el("p", "Mon plan", "fiche-etiquette"));
      var elision = /^ils?\b/i.test(r.si_1);
      f.appendChild(el("p", (elision ? "S'" : "Si ") + r.si_1 + ", alors " + r.alors_1 + ".", "fiche-plan"));
    }

    // Beaucoup de texte : la fiche passe en mode compact pour tenir sur une page.
    var volume = [objectif, pourquoi || "", r.jalon || "", r.si_1 || "", r.alors_1 || ""].concat(hab).join("").length;
    // v3 : le jalon s'ajoute à la fiche, donc le mode compact arrive plus tôt (420 → 330 caractères).
    if (volume > 330) f.classList.add("dense");
    if (volume > 520) f.classList.add("tres-dense");

    var q = el("blockquote", null, "fiche-citation");
    q.appendChild(el("p", "« " + c.texte + " »"));
    q.appendChild(el("cite", c.auteur + (c.source ? ", " + c.source : "")));
    f.appendChild(q);
    return f;
  }

  function imprimerSeulement(quoi) {
    document.body.classList.add("imprimer-" + quoi);
    var fin = function () {
      document.body.classList.remove("imprimer-" + quoi);
      window.removeEventListener("afterprint", fin);
    };
    window.addEventListener("afterprint", fin);
    window.print();
  }

  function ligne(table, titre, valeur) {
    if (valeur === undefined || valeur === null || valeur === "") return;
    var tr = document.createElement("tr");
    tr.appendChild(el("th", titre));
    tr.appendChild(el("td", String(valeur)));
    table.appendChild(tr);
  }

  function construireBilan(r, statutEnvoi) {
    bilan.textContent = "";
    var s = semainesAvant(r.date_objectif);

    bilan.appendChild(el("p", "Votre bilan", "eyebrow", "ecran"));
    bilan.appendChild(el("h2", "Vos deux fiches", null, "ecran"));
    var garde = statutEnvoi && statutEnvoi.garde;
    bilan.appendChild(el("p", "Tout vient de vos réponses. La fiche du matin se colle sur une vitre ou un miroir et se lit chaque matin. La fiche détaillée se relit au début de chaque mois.", null, "ecran"));
    var prive = el("div", null, "encadre", "ecran");
    prive.appendChild(el("p", "Ces fiches sont à vous seulement", "titre-encadre"));
    prive.appendChild(el("p", garde
      ? "Rien ne m'a été envoyé : vos réponses et vos fiches restent dans ce navigateur. Téléchargez-les en PDF (dans la fenêtre d'impression, choisissez « Enregistrer en PDF ») : c'est la seule copie. Le bouton « Effacer » les retire de ce navigateur."
      : "Elles sont construites dans votre navigateur. Je n'y ai pas accès et je ne les garde pas : ni les fiches, ni la citation que vous choisissez ou écrivez. Ce que je reçois, ce sont seulement vos réponses au questionnaire, pour étudier votre candidature. Téléchargez vos fiches en PDF (dans la fenêtre d'impression, choisissez « Enregistrer en PDF ») : c'est la seule copie."));
    bilan.appendChild(prive);
    if (statutEnvoi) bilan.appendChild(el("p", statutEnvoi.texte, "message-form ecran" + (statutEnvoi.ok ? " ok" : "")));

    // Fiche 1 : la fiche du matin
    var citation = choisirCitation(r, s);
    var matin = construireFicheMatin(r, citation);
    bilan.appendChild(matin);

    var choixCitation = el("div", null, "choix-citation ecran");
    var lab = el("label", "Une autre citation vous parle davantage ?");
    lab.setAttribute("for", "choix-citation");
    var sel = document.createElement("select");
    sel.id = "choix-citation";
    CITATIONS.forEach(function (c, i) {
      var o = el("option", c.auteur + " · " + c.texte.slice(0, 48) + (c.texte.length > 48 ? "…" : ""));
      o.value = String(i);
      if (c === citation) o.selected = true;
      sel.appendChild(o);
    });
    var optPerso = el("option", "Ma propre citation…");
    optPerso.value = "perso";
    sel.appendChild(optPerso);

    // Citation personnelle : gardée dans ce navigateur seulement, jamais envoyée.
    var perso = el("div", null, "citation-perso");
    var etatC = charger() || {};
    var cp = etatC.citationPerso || { texte: "", auteur: "" };
    var champTexte = document.createElement("textarea");
    champTexte.rows = 2; champTexte.maxLength = 220; champTexte.placeholder = "Votre citation";
    champTexte.value = cp.texte || "";
    champTexte.setAttribute("aria-label", "Votre citation");
    var champAuteur = document.createElement("input");
    champAuteur.type = "text"; champAuteur.maxLength = 80; champAuteur.placeholder = "Qui l'a dite (vous, un parent, un athlète…)";
    champAuteur.value = cp.auteur || "";
    champAuteur.setAttribute("aria-label", "Auteur de la citation");
    perso.appendChild(champTexte);
    perso.appendChild(champAuteur);
    if (etatC.citation === "perso" && cp.texte) { sel.value = "perso"; } else { perso.hidden = true; }

    function citationCourante() {
      if (sel.value === "perso") {
        return { texte: champTexte.value.trim() || "…", auteur: champAuteur.value.trim() || (r.prenom || "Moi") };
      }
      return CITATIONS[Number(sel.value)];
    }
    function redessiner() {
      var nouvelle = construireFicheMatin(r, citationCourante());
      bilan.replaceChild(nouvelle, bilan.querySelector(".fiche-matin"));
      try {
        var etat = charger() || {};
        etat.citation = sel.value === "perso" ? "perso" : Number(sel.value);
        etat.citationPerso = { texte: champTexte.value.trim(), auteur: champAuteur.value.trim() };
        localStorage.setItem(CLE, JSON.stringify(etat));
      } catch (e) { /* rien */ }
    }
    sel.addEventListener("change", function () {
      perso.hidden = sel.value !== "perso";
      if (sel.value === "perso") champTexte.focus();
      redessiner();
    });
    champTexte.addEventListener("input", redessiner);
    champAuteur.addEventListener("input", redessiner);
    choixCitation.appendChild(lab);
    choixCitation.appendChild(sel);
    choixCitation.appendChild(perso);
    bilan.appendChild(choixCitation);

    // Fiche 2 : la fiche détaillée
    var detail = el("section", null, "fiche fiche-detaillee");
    detail.appendChild(el("p", "Fiche détaillée" + (r.prenom ? " · " + r.prenom : ""), "eyebrow"));
    detail.appendChild(el("h2", "La structure de votre objectif"));
    bilan.appendChild(detail);

    // 1. L'objectif, formulé SMART
    detail.appendChild(el("h3", "1. Votre objectif, formulé SMART"));
    detail.appendChild(el("p", phraseSmart(r), "phrase-objectif"));
    var ts = el("table", null, "table-smart");
    grilleSmart(r, s).forEach(function (g) {
      var tr = document.createElement("tr");
      var th = el("th");
      th.appendChild(el("strong", g[0] + " "));
      th.appendChild(document.createTextNode(g[1]));
      tr.appendChild(th);
      tr.appendChild(el("td", g[2]));
      ts.appendChild(tr);
    });
    detail.appendChild(ts);
    if (r.type_objectif !== "terminer" && (r.niveau_seuil || r.niveau_cible || r.niveau_reve)) {
      var niv = el("div", null, "niveaux");
      [["Seuil", r.niveau_seuil, "le minimum"], ["Cible", r.niveau_cible, "ambitieuse, à votre portée"], ["Rêve", r.niveau_reve, "si tout s'aligne"]].forEach(function (n) {
        var d = el("div", null, "niveau");
        d.appendChild(el("p", n[0] + " · " + n[2], "etiquette"));
        d.appendChild(el("p", n[1] || "À préciser"));
        niv.appendChild(d);
      });
      detail.appendChild(niv);
    }
    if (r.jour_j) detail.appendChild(el("p", "Le jour J : " + r.jour_j));

    // 2. Le pourquoi
    if (r.pourquoi_1) {
      detail.appendChild(el("h3", "2. Votre pourquoi"));
      detail.appendChild(el("p", r.pourquoi_1, "encadre"));
      detail.appendChild(el("p", "À relire les jours où vous n'aurez pas envie."));
    }

    // 3. Le point de départ
    detail.appendChild(el("h3", "3. Le point de départ"));
    var t = document.createElement("table");
    ligne(t, "Pratique", r.annees);
    if (r.heures_actuelles !== undefined) ligne(t, "Volume actuel", heures(r.heures_actuelles) + " par semaine");
    ligne(t, "Performance de référence", r.perf_recente);
    if (r.crit_intervals) ligne(t, "Séances dans intervals.icu", r.crit_intervals === "oui" ? "Oui" : "Pas encore");
    if (r.crit_capteur) ligne(t, "Ceinture cardiaque ou capteur de puissance", r.crit_capteur === "oui" ? "Oui" : "Non");
    detail.appendChild(t);
    var crit = lectureCriteres(r); if (crit) detail.appendChild(el("p", crit));
    var ff = forcesEtFaiblesses(r);
    if (ff) {
      if (ff.forces.length) detail.appendChild(el("p", "Vos forces : " + ff.forces.map(function (x) { return x.nom; }).join(", ") + "."));
      if (ff.faiblesses.length) detail.appendChild(el("p", "Vos faiblesses : " + ff.faiblesses.map(function (x) { return x.nom; }).join(", ") + "."));
    }

    // 4. L'écart
    detail.appendChild(el("h3", "4. L'écart"));
    if (r.ecart) detail.appendChild(el("p", r.ecart));
    if (r.leviers && r.leviers.length) detail.appendChild(el("p", "Vos deux leviers : " + r.leviers.join(" et ") + ". C'est là que le plan mettra l'accent."));
    if (ff && r.leviers && r.leviers.length) {
      var faibles = ff.faiblesses.map(function (x) { return x.nom; });
      var communs = r.leviers.filter(function (l) { return faibles.some(function (f) { return f.indexOf(l) === 0 || l.indexOf(f) === 0; }); });
      if (communs.length === 0) detail.appendChild(el("p", "À noter : vos leviers ne sont pas vos points faibles déclarés. Ce n'est pas une erreur, mais la question mérite d'être posée : est-ce vraiment là que se joue votre objectif ?"));
    }
    var vol = lectureVolume(r); if (vol) detail.appendChild(el("p", vol));
    if (r.preuve) detail.appendChild(el("p", "Votre preuve que c'est atteignable : " + r.preuve));
    if (r.jalon) detail.appendChild(el("p", "Votre jalon, d'ici le " + dansSemaines(8) + " : " + r.jalon, "encadre"));

    // 6. L'engagement
    detail.appendChild(el("h3", "5. Votre engagement"));
    var hab = [r.habitude_1, r.habitude_2, r.habitude_3].filter(Boolean);
    if (hab.length) {
      detail.appendChild(el("p", "Vos trois actions de confiance, deux dans l'entraînement et une libre : chaque fois que vous les faites, vous vous prouvez que vous avez la discipline d'aller au bout."));
      var ulh = el("ol", null, "chaine");
      hab.forEach(function (h) { ulh.appendChild(el("li", h)); });
      detail.appendChild(ulh);
    }
    var te = document.createElement("table");
    if (r.jours && r.jours.length) ligne(te, "Jours disponibles", r.jours.join(", ") + " (" + r.jours.length + " jours)");
    if (r.heures_dispo !== undefined) ligne(te, "Volume tenable", heures(r.heures_dispo) + " par semaine");
    ligne(te, "Qui va le savoir", r.soutien);
    detail.appendChild(te);

    // 7. Les obstacles
    detail.appendChild(el("h3", "6. L'obstacle et votre plan"));
    if (r.obstacle) detail.appendChild(el("p", "Ce qui vous a fait décrocher la dernière fois : " + r.obstacle));
    [[r.si_1, r.alors_1]].forEach(function (p) {
      if (p[0] && p[1]) {
        var d = el("p", null, "encadre");
        var elision = /^ils?\b/i.test(p[0]);
        d.appendChild(el("strong", elision ? "S'" : "Si "));
        d.appendChild(document.createTextNode(p[0] + ", "));
        d.appendChild(el("strong", "alors "));
        d.appendChild(document.createTextNode(p[1] + "."));
        detail.appendChild(d);
      }
    });

    // 8. La motivation
    detail.appendChild(el("h3", "7. Votre confiance"));
    var tm = document.createElement("table");
    if (r.confiance !== undefined) ligne(tm, "Confiance", r.confiance + " sur 10");
    detail.appendChild(tm);
    if (r.confiance_plus) detail.appendChild(el("p", "Ce qui ferait monter votre confiance : " + r.confiance_plus + " C'est votre première action."));
    if (r.confiance !== undefined && r.confiance <= 6) detail.appendChild(el("p", "Une confiance moyenne au départ est normale. Elle monte quand les habitudes se font, semaine après semaine : c'est pour ça qu'elles passent avant le résultat."));

    // Prochaine étape
    var suite = el("div", null, "ecran");
    suite.appendChild(el("h3", "La suite"));
    if (garde) {
      suite.appendChild(el("p", "Votre objectif est bâti. Si vous voulez être accompagné pour l'atteindre, vous pouvez encore poser votre candidature au projet pilote : vos réponses sont déjà là, il reste vos coordonnées."));
      var candidater = el("button", "Poser ma candidature", "btn btn-ghost");
      candidater.type = "button";
      candidater.addEventListener("click", function () {
        try { var etat = charger() || {}; delete etat.garde; localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* rien */ }
        var r2 = form.querySelector('input[name="mode_fin"][value="envoyer"]');
        r2.checked = true;
        majModeFin();
        bilan.hidden = true;
        navigation.hidden = false;
        form.classList.remove("mode-bilan");
        allerA(etapes.length - 1, true);
      });
      suite.appendChild(candidater);
    } else {
      suite.appendChild(el("p", "Je lis chaque dossier et je contacte par courriel les cinq personnes retenues. Retenu ou non, ces deux fiches sont à vous."));
    }
    bilan.appendChild(suite);

    var actions = el("div", null, "actions-bilan");
    var imprimer = el("button", "Télécharger ou imprimer la fiche du matin", "btn btn-primary");
    imprimer.type = "button";
    imprimer.addEventListener("click", function () { imprimerSeulement("matin"); });
    var imprimerDetail = el("button", "Télécharger ou imprimer la fiche détaillée", "btn btn-ghost");
    imprimerDetail.type = "button";
    imprimerDetail.addEventListener("click", function () { imprimerSeulement("detail"); });
    actions.appendChild(imprimerDetail);
    var effacer = el("button", "Effacer mes réponses de ce navigateur", "btn btn-ghost");
    effacer.type = "button";
    effacer.addEventListener("click", function () {
      try { localStorage.removeItem(CLE); } catch (e) { /* rien */ }
      effacer.textContent = "Réponses effacées de ce navigateur";
      effacer.disabled = true;
    });
    actions.insertBefore(imprimer, imprimerDetail);
    actions.appendChild(effacer);
    if (statutEnvoi && !statutEnvoi.ok) {
      var reessayer = el("button", "Réessayer l'envoi", "btn btn-gold");
      reessayer.type = "button";
      reessayer.addEventListener("click", envoyer);
      actions.insertBefore(reessayer, imprimer);
    }
    bilan.appendChild(actions);
  }

  function montrerBilan(r, statut) {
    etapes.forEach(function (e) { e.classList.remove("active"); });
    navigation.hidden = true;
    form.classList.add("mode-bilan");
    construireBilan(r, statut);
    bilan.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Envoi ---------- */
  var envoiEnCours = false;
  function envoyer() {
    if (envoiEnCours) return;
    var r = lire();
    var mode = modeFin();
    if (!mode) {
      messageEnvoi.textContent = "Choisissez d'abord : garder vos fiches pour vous, ou poser votre candidature.";
      return;
    }
    if (mode === "garder") {
      // Rien ne part : aucune requête au serveur.
      try {
        var etatG = charger() || {};
        etatG.reponses = r;
        etatG.garde = new Date().toISOString();
        localStorage.setItem(CLE, JSON.stringify(etatG));
      } catch (e) { /* rien */ }
      montrerBilan(r, { ok: true, garde: true, texte: "Vos fiches sont prêtes. Rien n'a été envoyé." });
      return;
    }
    var manques = [];
    if (!r.prenom) manques.push("votre prénom");
    if (!r.courriel || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.courriel)) manques.push("un courriel valide");
    if (!r.majeur) manques.push("la case 18 ans ou plus");
    if (!r.consentement) manques.push("le consentement");
    if (!r.comprend) manques.push("la case sur la candidature");
    if (manques.length) {
      if (!bilan.hidden) {
        bilan.hidden = true;
        navigation.hidden = false;
        form.classList.remove("mode-bilan");
        allerA(etapes.length - 1, true);
      }
      messageEnvoi.textContent = "Il manque " + manques.join(", ") + ".";
      signalerManques(etapes[etapes.length - 1]);
      return;
    }
    envoiEnCours = true;
    suivant.disabled = true;
    suivant.textContent = "Envoi…";
    var corps = JSON.stringify({ version: VERSION, reponses: r, completude: majJauge(), piege: (form.querySelector('[name="site_web"]') || {}).value || "" });
    fetch("/api/candidature", { method: "POST", headers: { "Content-Type": "application/json" }, body: corps, credentials: "same-origin" })
      .then(function (rep) { return rep.json().catch(function () { return {}; }).then(function (d) { return { ok: rep.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error(x.d.erreur || "L'envoi a échoué.");
        try {
          var etat = charger() || {};
          etat.reponses = r;
          etat.envoye = new Date().toISOString();
          localStorage.setItem(CLE, JSON.stringify(etat));
        } catch (e) { /* rien */ }
        montrerBilan(r, { ok: true, texte: "Candidature reçue. Merci, " + r.prenom + "." });
      })
      .catch(function (err) {
        montrerBilan(r, { ok: false, texte: (err && err.message ? err.message : "L'envoi a échoué.") + " Votre bilan est quand même là ; vos réponses restent gardées dans ce navigateur. Réessayez dans un instant." });
      })
      .then(function () {
        envoiEnCours = false;
        suivant.disabled = false;
      });
  }

  /* ---------- Démarrage ---------- */
  var etat = charger();
  if (etat && etat.reponses) ecrire(etat.reponses);
  majTypeObjectif();
  majModeFin();
  majJauge();
  if (etat && etat.garde && !etat.envoye && etat.reponses) {
    montrerBilan(etat.reponses, { ok: true, garde: true, texte: "Vos fiches, bâties le " + new Date(etat.garde).toLocaleDateString("fr-CA", { day: "numeric", month: "long" }) + ". Rien n'a été envoyé." });
  } else if (etat && etat.envoye && etat.reponses) {
    montrerBilan(etat.reponses, { ok: true, texte: "Candidature déjà envoyée le " + new Date(etat.envoye).toLocaleDateString("fr-CA", { day: "numeric", month: "long" }) + ". Pour la modifier, écrivez à contact@lasynthase.ca." });
  } else {
    allerA(etat && typeof etat.etape === "number" ? Math.min(etat.etape, etapes.length - 1) : 0, false);
  }
})();
