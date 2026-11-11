/* Questionnaire de candidature au projet pilote en endurance (2026-11-11).
 *
 * - Une étape à la fois (mêmes classes que les modules : .etape, .active).
 * - Les réponses sont gardées dans le navigateur (localStorage) à mesure.
 * - Rien n'est obligatoire pour avancer : un champ vide est signalé, pas bloqué.
 *   La complétude fait partie de la sélection. Seuls les coordonnées et les
 *   consentements sont exigés à l'envoi.
 * - À l'envoi : POST /api/candidature, puis le bilan est construit ici, dans
 *   la page, à partir des réponses. Tout texte de la personne passe par
 *   textContent (jamais innerHTML).
 */
(function () {
  "use strict";

  var CLE = "ls-candidature-pilote-v1";
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

  /* ---------- Notes de 1 à 5 ---------- */
  form.querySelectorAll(".note-ligne").forEach(function (ligne) {
    var nom = ligne.getAttribute("data-nom");
    var pastilles = document.createElement("div");
    pastilles.className = "pastilles";
    pastilles.setAttribute("role", "radiogroup");
    pastilles.setAttribute("aria-label", ligne.textContent.trim());
    for (var i = 1; i <= 5; i++) {
      var l = document.createElement("label");
      var r = document.createElement("input");
      r.type = "radio";
      r.name = nom;
      r.value = String(i);
      r.setAttribute("aria-label", i + " sur 5");
      var s = document.createElement("span");
      s.textContent = String(i);
      l.appendChild(r);
      l.appendChild(s);
      pastilles.appendChild(l);
    }
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
  form.querySelectorAll('input[type="range"]').forEach(function (el) {
    el.addEventListener("input", function () {
      el.setAttribute("data-touche", "oui");
      afficherEchelle(el);
    });
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
      var groupe = el.type === "radio" || (el.type === "checkbox" && !/^(majeur|consentement|comprend)$/.test(el.name));
      var requis = el.required || groupe || el.type === "range";
      if (el.name === "outils" || el.name === "repetition" || el.name === "evenement" || el.name === "perf_recente") requis = false;
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
    suivant.textContent = i === 0 ? "Commencer" : i === etapes.length - 1 ? "Envoyer et voir mon bilan" : "Suivant";
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

  function forcesEtFaiblesses(r) {
    var notes = Object.keys(CAPACITES).filter(function (k) { return r[k]; })
      .map(function (k) { return { nom: CAPACITES[k], note: Number(r[k]) }; });
    if (notes.length < 3) return null;
    var tri = notes.slice().sort(function (a, b) { return b.note - a.note; });
    return { forces: tri.slice(0, 2), faiblesses: tri.slice(-2).reverse() };
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

  function lectureDonnees(r) {
    var outils = r.outils || [];
    if (r.montre === "Aucune") return "Sans montre, le suivi sera très limité : une montre qui enregistre la fréquence cardiaque est presque indispensable au projet.";
    if (!r.montre) return null;
    if (outils.indexOf("Ceinture cardiaque") !== -1) return "Montre et ceinture cardiaque : la séance étalon pourra se lire à fréquence cardiaque fixe, comme chez les athlètes de haut niveau.";
    return "La fréquence cardiaque au poignet est moins fiable pendant l'effort : la séance étalon pourra aussi se lire à l'allure. Une ceinture cardiaque serait un plus.";
  }

  function lectureEcart() {
    var r = lire();
    var boite = document.getElementById("lecture-ecart");
    var zone = document.getElementById("lecture-ecart-texte");
    zone.textContent = "";
    var lignes = [];
    var s = semainesAvant(r.date_objectif);
    if (s !== null) lignes.push(s >= 0 ? "Votre objectif est dans " + s + " semaine" + (s > 1 ? "s" : "") + "." : "La date de l'objectif est déjà passée : revenez à l'étape 1 pour la corriger.");
    var v = lectureVolume(r); if (v) lignes.push(v);
    var ff = forcesEtFaiblesses(r);
    if (ff) lignes.push("Vos points forts déclarés : " + ff.forces.map(function (x) { return x.nom.toLowerCase(); }).join(" et ") + ". Vos points faibles : " + ff.faiblesses.map(function (x) { return x.nom.toLowerCase(); }).join(" et ") + ".");
    lignes.forEach(function (t) { var p = document.createElement("p"); p.textContent = t; zone.appendChild(p); });
    boite.hidden = lignes.length === 0;
  }

  /* ---------- Les blocs ---------- */
  var TEXTE_BLOCS = {
    "Base": "Bâtir le moteur : beaucoup d'effort facile, la régularité d'abord, le volume qui monte par paliers.",
    "Développement": "Élever le seuil : séances au seuil et intervalles, sur une base qui reste large.",
    "Spécifique": "Ressembler au jour J : des séances qui imitent l'épreuve (durée, terrain, allure).",
    "Affûtage": "Arriver frais : moins de volume, la même intensité. Environ deux semaines.",
    "Préparation courte": "Le délai est court : consolider ce qui est acquis et arriver reposé."
  };
  var COULEURS = { "Base": "#a9b79c", "Développement": "var(--sage)", "Spécifique": "var(--sage-dark)", "Affûtage": "var(--gold-dark)", "Préparation courte": "var(--sage-dark)" };

  function blocs(s) {
    if (s === null || s < 0) return [];
    if (s < 4) return [["Préparation courte", s]];
    var avant = s - 2;
    if (s < 10) return [["Spécifique", avant], ["Affûtage", 2]];
    if (s < 20) {
      var base = Math.round(avant * 0.5);
      return [["Base", base], ["Spécifique", avant - base], ["Affûtage", 2]];
    }
    var b = Math.round(avant * 0.4), dv = Math.round(avant * 0.3);
    return [["Base", b], ["Développement", dv], ["Spécifique", avant - b - dv], ["Affûtage", 2]];
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
    { texte: "The credit belongs to the man who is actually in the arena.", auteur: "Theodore Roosevelt", source: "Discours de la Sorbonne, 1910" }
  ];

  // La citation qui parle le plus selon les réponses : d'abord une confiance basse,
  // puis ce qui pousse la personne, puis l'horizon. Un choix fait par la personne prime.
  function choisirCitation(r, s) {
    var etat = charger();
    if (etat && typeof etat.citation === "number" && CITATIONS[etat.citation]) return CITATIONS[etat.citation];
    if (r.confiance !== undefined && r.confiance <= 5) return CITATIONS[4];
    var parMoteur = {
      "Le défi et le plaisir de progresser": 5,
      "Une fierté personnelle, une promesse à moi-même": 3,
      "Ma santé, mon énergie au quotidien": 7,
      "Prouver quelque chose à quelqu'un": 9,
      "Quelqu'un d'autre me l'a proposé": 0
    };
    if (r.moteur && parMoteur[r.moteur] !== undefined) return CITATIONS[parMoteur[r.moteur]];
    if (s !== null && s >= 30) return CITATIONS[1];
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

    var niv = el("div", null, "fiche-niveaux");
    [["Seuil", r.niveau_seuil], ["Cible", r.niveau_cible], ["Rêve", r.niveau_reve]].forEach(function (n) {
      if (!n[1]) return;
      var d = el("div", null, n[0] === "Cible" ? "est-cible" : null);
      d.appendChild(el("span", n[0]));
      d.appendChild(el("strong", n[1]));
      niv.appendChild(d);
    });
    if (niv.children.length) f.appendChild(niv);

    var pourquoi = r.pourquoi_3 || r.pourquoi_2 || r.pourquoi_1;
    if (pourquoi) {
      f.appendChild(el("p", "Pourquoi", "fiche-etiquette"));
      // Une fiche se lit d'un coup d'œil : le pourquoi au long reste dans la fiche détaillée.
      if (pourquoi.length > 240) pourquoi = pourquoi.slice(0, 240).replace(/\s+\S*$/, "") + "…";
      f.appendChild(el("p", pourquoi, "fiche-pourquoi", pourquoi.length > 150 ? "long" : null));
    }

    var hab = [r.habitude_1, r.habitude_2, r.habitude_3].filter(Boolean);
    if (hab.length) {
      f.appendChild(el("p", "Cette semaine, je fais", "fiche-etiquette"));
      var ul = el("ul", null, "fiche-habitudes");
      hab.forEach(function (h) { ul.appendChild(el("li", h)); });
      f.appendChild(ul);
    }

    if (r.si_1 && r.alors_1) {
      f.appendChild(el("p", "Mon plan", "fiche-etiquette"));
      var elision = /^ils?\b/i.test(r.si_1);
      f.appendChild(el("p", (elision ? "S'" : "Si ") + r.si_1 + ", alors " + r.alors_1 + ".", "fiche-plan"));
    }

    // Beaucoup de texte : la fiche passe en mode compact pour tenir sur une page.
    var volume = [objectif, pourquoi || "", r.si_1 || "", r.alors_1 || ""].concat(hab).join("").length;
    if (volume > 420) f.classList.add("dense");

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
    bilan.appendChild(el("p", "Tout vient de vos réponses. La fiche du matin se colle sur une vitre ou un miroir et se lit chaque matin. La fiche détaillée se relit au début de chaque mois.", null, "ecran"));
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
    sel.addEventListener("change", function () {
      var nouvelle = construireFicheMatin(r, CITATIONS[Number(sel.value)]);
      bilan.replaceChild(nouvelle, bilan.querySelector(".fiche-matin"));
      try {
        var etat = charger() || {};
        etat.citation = Number(sel.value);
        localStorage.setItem(CLE, JSON.stringify(etat));
      } catch (e) { /* rien */ }
    });
    choixCitation.appendChild(lab);
    choixCitation.appendChild(sel);
    bilan.appendChild(choixCitation);

    // Fiche 2 : la fiche détaillée
    var detail = el("section", null, "fiche fiche-detaillee");
    detail.appendChild(el("p", "Fiche détaillée" + (r.prenom ? " · " + r.prenom : ""), "eyebrow"));
    detail.appendChild(el("h2", "La structure de votre objectif"));
    bilan.appendChild(detail);

    // 1. L'objectif
    detail.appendChild(el("h3", "1. L'objectif"));
    var phrase = (r.objectif || "Objectif à préciser");
    if (r.date_objectif) phrase += ", le " + dateLongue(r.date_objectif);
    if (r.evenement) phrase += " (" + r.evenement + ")";
    detail.appendChild(el("p", phrase + ".", "phrase-objectif"));
    var niv = el("div", null, "niveaux");
    [["Seuil", r.niveau_seuil, "le minimum"], ["Cible", r.niveau_cible, "ambitieux et réaliste"], ["Rêve", r.niveau_reve, "si tout s'aligne"]].forEach(function (n) {
      var d = el("div", null, "niveau");
      d.appendChild(el("p", n[0] + " · " + n[2], "etiquette"));
      d.appendChild(el("p", n[1] || "À préciser"));
      niv.appendChild(d);
    });
    detail.appendChild(niv);
    if (s !== null && s >= 0) detail.appendChild(el("p", "Il vous reste " + s + " semaine" + (s > 1 ? "s" : "") + "." + (s > 52 ? " C'est plus d'un an : votre objectif d'étape deviendra le premier vrai rendez-vous." : "")));

    // 2. Le pourquoi
    if (r.pourquoi_1 || r.pourquoi_2 || r.pourquoi_3) {
      detail.appendChild(el("h3", "2. Votre pourquoi"));
      var ch = el("ol", null, "chaine");
      [r.pourquoi_1, r.pourquoi_2, r.pourquoi_3].forEach(function (t) { if (t) ch.appendChild(el("li", t)); });
      detail.appendChild(ch);
      if (r.pourquoi_3) detail.appendChild(el("p", "La dernière ligne est celle à relire les jours où vous n'aurez pas envie."));
    }

    // 3. Le point de départ
    detail.appendChild(el("h3", "3. Le point de départ"));
    var t = document.createElement("table");
    ligne(t, "Pratique", r.annees);
    if (r.heures_actuelles !== undefined) ligne(t, "Volume actuel", heures(r.heures_actuelles) + " par semaine" + (r.seances_sem !== undefined ? ", " + r.seances_sem + " séances" : ""));
    if (r.plus_grosse_semaine !== undefined) ligne(t, "Plus grosse semaine (12 mois)", heures(r.plus_grosse_semaine));
    if (r.plus_longue_seance !== undefined) ligne(t, "Plus longue séance (3 mois)", heures(r.plus_longue_seance));
    ligne(t, "Performance de référence", r.perf_recente);
    ligne(t, "Musculation", r.muscu_actuelle);
    ligne(t, "Montre", r.montre);
    ligne(t, "Historique enregistré", r.historique);
    detail.appendChild(t);
    var ff = forcesEtFaiblesses(r);
    if (ff) {
      detail.appendChild(el("p", "Points forts : " + ff.forces.map(function (x) { return x.nom + " (" + x.note + "/5)"; }).join(", ") + "."));
      detail.appendChild(el("p", "Points faibles : " + ff.faiblesses.map(function (x) { return x.nom + " (" + x.note + "/5)"; }).join(", ") + "."));
    }
    if (r.ce_qui_a_marche) detail.appendChild(el("p", "Ce qui a marché : " + r.ce_qui_a_marche));
    if (r.ce_qui_a_casse) detail.appendChild(el("p", "Ce qui a cassé : " + r.ce_qui_a_casse));

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
    if (r.duree_longue_max !== undefined && r.plus_longue_seance !== undefined && r.duree_longue_max > r.plus_longue_seance * 1.5 && r.plus_longue_seance > 0) {
      detail.appendChild(el("p", "Votre séance longue pourra aller jusqu'à " + heures(r.duree_longue_max) + ", contre " + heures(r.plus_longue_seance) + " au plus ces derniers mois : elle s'allongera graduellement."));
    }
    if (r.preuve) detail.appendChild(el("p", "Votre preuve que c'est atteignable : " + r.preuve));

    // 5. Le chemin
    detail.appendChild(el("h3", "5. Le chemin"));
    var bl = blocs(s);
    if (bl.length) {
      var rangee = el("div", null, "blocs");
      bl.forEach(function (b) {
        var d = el("div", null, "bloc");
        d.style.flex = String(Math.max(b[1], 1));
        d.style.background = COULEURS[b[0]];
        d.appendChild(el("p", b[0], "nom-bloc"));
        d.appendChild(el("p", b[1] + " sem."));
        rangee.appendChild(d);
      });
      detail.appendChild(rangee);
      var ul = document.createElement("ul");
      bl.forEach(function (b) {
        var li = document.createElement("li");
        li.appendChild(el("strong", b[0] + " (" + b[1] + " sem.) : "));
        li.appendChild(document.createTextNode(TEXTE_BLOCS[b[0]]));
        ul.appendChild(li);
      });
      detail.appendChild(ul);
      if (s >= 8) detail.appendChild(el("p", "Toutes les 3 à 4 semaines, une semaine allégée : 25 à 35 % de volume en moins, en retirant du facile, jamais l'intensité. C'est pendant ces semaines que le corps encaisse le travail."));
      detail.appendChild(el("p", "C'est une structure de départ. Le vrai plan se bâtit sur votre historique réel et vos contraintes."));
    } else {
      detail.appendChild(el("p", "Précisez la date de l'objectif pour voir la structure en blocs."));
    }
    var etapesChemin = document.createElement("table");
    ligne(etapesChemin, "Objectif d'étape (à mi-chemin)", r.objectif_etape);
    ligne(etapesChemin, "Répétition avant le jour J", r.repetition);
    if (etapesChemin.children.length) detail.appendChild(etapesChemin);

    // 6. L'engagement
    detail.appendChild(el("h3", "6. Votre engagement"));
    var hab = [r.habitude_1, r.habitude_2, r.habitude_3].filter(Boolean);
    if (hab.length) {
      detail.appendChild(el("p", "Vos habitudes de chaque semaine, celles qui comptent plus que le résultat :"));
      var ulh = el("ol", null, "chaine");
      hab.forEach(function (h) { ulh.appendChild(el("li", h)); });
      detail.appendChild(ulh);
    }
    var te = document.createElement("table");
    if (r.jours && r.jours.length) ligne(te, "Jours disponibles", r.jours.join(", ") + " (" + r.jours.length + " jours)");
    if (r.heures_dispo !== undefined) ligne(te, "Volume tenable", heures(r.heures_dispo) + " par semaine");
    if (r.jour_long) ligne(te, "Séance longue", r.jour_long + (r.duree_longue_max !== undefined ? ", jusqu'à " + heures(r.duree_longue_max) : ""));
    ligne(te, "Moment", r.moment);
    ligne(te, "Musculation", r.muscu_plan);
    ligne(te, "Terrain et matériel", r.terrain);
    ligne(te, "Contraintes à prévoir", r.contraintes);
    ligne(te, "Ce que vous changez", r.renoncer);
    detail.appendChild(te);

    // 7. Les obstacles
    detail.appendChild(el("h3", "7. Les obstacles et vos plans"));
    if (r.obstacle) detail.appendChild(el("p", "L'obstacle principal : " + r.obstacle + (r.obstacle_quand ? " Il apparaît surtout : " + r.obstacle_quand + "." : "")));
    [[r.si_1, r.alors_1], [r.si_2, r.alors_2]].forEach(function (p) {
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
    if (r.abandon) detail.appendChild(el("p", "Ce que vous retenez de la dernière fois : " + r.abandon));

    // 8. La motivation
    detail.appendChild(el("h3", "8. Votre motivation"));
    var tm = document.createElement("table");
    if (r.importance !== undefined) ligne(tm, "Importance", r.importance + " sur 10");
    if (r.confiance !== undefined) ligne(tm, "Confiance", r.confiance + " sur 10");
    ligne(tm, "Ce qui vous pousse", r.moteur);
    detail.appendChild(tm);
    if (r.importance_pourquoi) detail.appendChild(el("p", "Pourquoi ce chiffre : " + r.importance_pourquoi));
    if (r.confiance_plus) detail.appendChild(el("p", "Ce qui ferait monter votre confiance : " + r.confiance_plus + " C'est votre première action."));
    if (r.maintenant) detail.appendChild(el("p", "Pourquoi maintenant : " + r.maintenant));
    if (r.confiance !== undefined && r.confiance <= 6) detail.appendChild(el("p", "Une confiance moyenne au départ est normale. Elle monte quand les habitudes se font, semaine après semaine : c'est pour ça qu'elles passent avant le résultat."));

    // Prochaine étape
    var suite = el("div", null, "ecran");
    suite.appendChild(el("h3", "La suite"));
    suite.appendChild(el("p", "Je lis chaque dossier et je contacte par courriel les cinq personnes retenues. Retenu ou non, ces deux fiches sont à vous."));
    bilan.appendChild(suite);

    var actions = el("div", null, "actions-bilan");
    var imprimer = el("button", "Imprimer la fiche du matin", "btn btn-primary");
    imprimer.type = "button";
    imprimer.addEventListener("click", function () { imprimerSeulement("matin"); });
    var imprimerDetail = el("button", "Imprimer la fiche détaillée", "btn btn-ghost");
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
    var corps = JSON.stringify({ reponses: r, completude: majJauge(), piege: (form.querySelector('[name="site_web"]') || {}).value || "" });
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
  majJauge();
  if (etat && etat.envoye && etat.reponses) {
    montrerBilan(etat.reponses, { ok: true, texte: "Candidature déjà envoyée le " + new Date(etat.envoye).toLocaleDateString("fr-CA", { day: "numeric", month: "long" }) + ". Pour la modifier, écrivez à contact@lasynthase.ca." });
  } else {
    allerA(etat && typeof etat.etape === "number" ? Math.min(etat.etape, etapes.length - 1) : 0, false);
  }
})();
