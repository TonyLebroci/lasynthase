document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var header = document.querySelector(".site-header");

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      header.classList.toggle("open");
    });
    header.querySelectorAll(".nav a").forEach(function (lien) {
      lien.addEventListener("click", function () {
        header.classList.remove("open");
      });
    });
  }

  // Diaporama du héros plein écran (accueil) — change toutes les 5 secondes
  var diapos = document.querySelectorAll(".hero-accueil .diapo");
  if (diapos.length > 1) {
    var d = 0;
    setInterval(function () {
      // « sortante » garde le zoom lent de la photo pendant son fondu de sortie,
      // sinon elle reviendrait d'un coup à sa taille de départ.
      var sortante = diapos[d];
      sortante.classList.add("sortante");
      sortante.classList.remove("active");
      setTimeout(function () { sortante.classList.remove("sortante"); }, 2000);
      d = (d + 1) % diapos.length;
      diapos[d].classList.add("active");
    }, 5000);
  }

  // L'en-tête qui change au défilement est géré plus bas, avec les animations.

  document.querySelectorAll(".carousel").forEach(function (carousel) {
    var track = carousel.querySelector(".carousel-track");
    var images = track.querySelectorAll("img");
    var dotsBox = carousel.querySelector(".carousel-dots");
    var index = 0;

    images.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Photo " + (i + 1));
      dot.addEventListener("click", function () { go(i); });
      dotsBox.appendChild(dot);
    });

    function go(i) {
      index = (i + images.length) % images.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dotsBox.querySelectorAll("button").forEach(function (d, j) {
        d.classList.toggle("active", j === index);
      });
    }

    carousel.querySelector(".carousel-prev").addEventListener("click", function () { go(index - 1); });
    carousel.querySelector(".carousel-next").addEventListener("click", function () { go(index + 1); });

    var startX = null;
    carousel.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (dx > 40) go(index - 1);
      else if (dx < -40) go(index + 1);
      startX = null;
    }, { passive: true });

    go(0);
  });

  // Contenus tiers chargés uniquement sur demande (agenda et carte Google).
  // Tant que le visiteur n'a pas cliqué, rien n'est transmis à Google.
  document.querySelectorAll(".tiers-invite").forEach(function (invite) {
    var bouton = invite.querySelector("button");
    if (!bouton) return;
    bouton.addEventListener("click", function () {
      var cadre = document.createElement("iframe");
      cadre.src = invite.getAttribute("data-tiers");
      cadre.title = invite.getAttribute("data-tiers-titre") || "";
      cadre.loading = "lazy";
      cadre.referrerPolicy = "no-referrer-when-downgrade";
      invite.replaceWith(cadre);
    });
  });

  // Confirmation d'envoi : FormSubmit renvoie sur cette page avec ?envoye=1.
  // On affiche une fenêtre au centre de l'écran, que le visiteur ferme lui-même.
  if (new URLSearchParams(window.location.search).get("envoye") === "1") {
    afficherConfirmation();
    window.history.replaceState({}, "", window.location.pathname);
  }

  function afficherConfirmation() {
    var fond = document.createElement("div");
    fond.className = "confirmation";
    fond.setAttribute("role", "dialog");
    fond.setAttribute("aria-modal", "true");
    fond.setAttribute("aria-labelledby", "confirmation-titre");

    fond.innerHTML =
      '<div class="confirmation-carte">' +
        '<button type="button" class="confirmation-fermer" aria-label="Fermer">&times;</button>' +
        '<div class="confirmation-sceau" aria-hidden="true">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
               'stroke="currentColor" stroke-width="1.4" ' +
               'stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M4 12.5 L9.5 18 L20 6.5" />' +
          '</svg>' +
        '</div>' +
        '<h2 id="confirmation-titre">Votre message est parti</h2>' +
        '<p>Merci de m\'avoir écrit. Je vous réponds personnellement sous 24 heures.</p>' +
        '<button type="button" class="btn btn-primary confirmation-ok">Fermer</button>' +
      '</div>';

    document.body.appendChild(fond);
    var defilement = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    var fermer = function () {
      document.body.style.overflow = defilement;
      document.removeEventListener("keydown", surTouche);
      fond.remove();
    };

    var surTouche = function (e) {
      if (e.key === "Escape") fermer();
    };

    fond.querySelector(".confirmation-fermer").addEventListener("click", fermer);
    fond.querySelector(".confirmation-ok").addEventListener("click", fermer);
    fond.addEventListener("click", function (e) {
      if (e.target === fond) fermer();
    });
    document.addEventListener("keydown", surTouche);

    fond.querySelector(".confirmation-fermer").focus();
  }
});

/* ===== Animations et effets (2026-11-05) =====
   Tout ce qui suit est une couche d'agrément : sans JavaScript, ou si le
   visiteur a demandé moins de mouvement (prefers-reduced-motion), le site
   reste complet et lisible. Le script est chargé en fin de <body> : la page
   est déjà construite quand il s'exécute, on n'attend donc pas
   DOMContentLoaded (ça évite qu'un élément s'affiche puis disparaisse avant
   son apparition animée). Ne jamais animer la section du triptyque
   (#triptyquePin) ni ses parents : GSAP l'épingle, et une transformation sur
   un parent casserait l'épinglage. */
(function () {
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointeurFin = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var header = document.querySelector(".site-header");

  /* --- Barre de progression de lecture + en-tête au défilement --- */
  var barre = document.createElement("div");
  barre.className = "barre-progression";
  barre.setAttribute("aria-hidden", "true");
  document.body.appendChild(barre);

  var heroCentre = document.querySelector(".hero-accueil .hero-centre");
  var diapos = document.querySelectorAll(".hero-accueil .diapo");
  var prevu = false;

  function majDefilement() {
    prevu = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var h = window.innerHeight;
    var max = document.documentElement.scrollHeight - h;
    barre.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    if (header) header.classList.toggle("scrolled", y > 60);

    // Parallaxe du grand héros de l'accueil : le texte monte moins vite et
    // s'estompe, les photos glissent plus lentement que la page.
    if (!reduit && heroCentre && y < h * 1.2) {
      heroCentre.style.transform = "translate3d(0," + (y * 0.35).toFixed(1) + "px,0)";
      heroCentre.style.opacity = Math.max(0, 1 - y / (h * 0.75)).toFixed(3);
      for (var i = 0; i < diapos.length; i++) {
        diapos[i].style.transform = "translate3d(0," + (y * 0.2).toFixed(1) + "px,0)";
      }
    }
  }
  function demanderMaj() {
    if (!prevu) { prevu = true; window.requestAnimationFrame(majDefilement); }
  }
  window.addEventListener("scroll", demanderMaj, { passive: true });
  window.addEventListener("resize", demanderMaj, { passive: true });
  majDefilement();

  if (reduit) return;

  /* --- Titre de l'accueil : les lettres entrent une à une --- */
  var titreAccueil = document.querySelector(".hero-accueil h1");
  if (titreAccueil && !titreAccueil.children.length) {
    var texte = titreAccueil.textContent.trim();
    var n = 0;
    titreAccueil.setAttribute("aria-label", texte);
    titreAccueil.textContent = "";
    texte.split(/\s+/).forEach(function (mot, i, tous) {
      var bloc = document.createElement("span");
      bloc.className = "mot-lettres";
      bloc.setAttribute("aria-hidden", "true");
      mot.split("").forEach(function (c) {
        var l = document.createElement("span");
        l.className = "lettre";
        l.textContent = c;
        l.style.setProperty("--i", n++);
        bloc.appendChild(l);
      });
      titreAccueil.appendChild(bloc);
      if (i < tous.length - 1) titreAccueil.appendChild(document.createTextNode(" "));
    });
    titreAccueil.classList.add("en-lettres");
  }

  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("anim");

  var horsJeu = function (el) {
    return el.closest("#triptyquePin") || el.closest(".hero-accueil");
  };

  /* --- Grands titres : les mots montent d'un masque, un à la fois --- */
  var titres = [];
  document.querySelectorAll(".hero h1").forEach(function (h) {
    if (h.children.length || horsJeu(h)) return;
    var mots = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    mots.forEach(function (m, i) {
      var masque = document.createElement("span");
      masque.className = "mot";
      var dedans = document.createElement("span");
      dedans.textContent = m;
      dedans.style.setProperty("--d", (0.15 + i * 0.08).toFixed(2) + "s");
      masque.appendChild(dedans);
      h.appendChild(masque);
      if (i < mots.length - 1) h.appendChild(document.createTextNode(" "));
    });
    h.classList.add("titre-decoupe");
    // Pages intérieures : le titre est en haut, il part tout de suite.
    // Accueil : il attend d'arriver à l'écran.
    if (document.body.classList.contains("accueil")) titres.push(h);
    else {
      // Deux images d'attente : le navigateur doit d'abord dessiner les mots
      // cachés, sinon la transition ne se déclenche pas.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { h.classList.add("titre-pret"); });
      });
    }
  });

  /* --- Apparition au défilement --- */
  var groupes = [
    [".accueil .hero .container > :not(h1)", "haut"],
    [".section-heading > *", "haut"],
    [".approach-visual", "zoom"],
    [".approach > div:not(.approach-visual) > :not(ul)", "haut"],
    [".approach-list li", "droite"],
    [".service-visual", "rideau"],
    [".service-content > *", "haut"],
    [".article-card", "haut"],
    [".pricing-note", "zoom"],
    [".contact-info > *", "haut"],
    [".contact-form", "droite"],
    [".hote-portrait", "zoom"],
    [".hote-content > *", "haut"],
    [".pillars .pillar-card", "haut"],
    [".galerie-photo, .agenda-block, .map-block", "zoom"],
    [".cta-band .btn", "zoom"],
    [".article-photo", "rideau"],
    [".article-body > h2, .article-body > blockquote, .article-body > figure", "haut"],
    [".footer-grid > *", "haut"]
  ];
  var rangs = new Map();
  var cibles = [];

  groupes.forEach(function (g) {
    document.querySelectorAll(g[0]).forEach(function (el) {
      if (horsJeu(el) || el.classList.contains("a-reveler")) return;
      var parent = el.parentNode;
      var rang = rangs.get(parent) || 0;
      rangs.set(parent, rang + 1);
      el.classList.add("a-reveler", "rv-" + g[1]);
      el.style.setProperty("--delai", (Math.min(rang, 6) * 0.09).toFixed(2) + "s");
      cibles.push(el);
    });
  });

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      observateur.unobserve(el);
      if (el.classList.contains("titre-decoupe")) { el.classList.add("titre-pret"); return; }
      el.classList.add("revele", "vu");
      var delai = parseFloat(el.style.getPropertyValue("--delai")) || 0;
      // Une fois l'apparition finie, on retire les classes : les effets de
      // survol retrouvent leurs propres transitions, sans délai hérité.
      setTimeout(function () {
        el.classList.remove("a-reveler", "revele", "rv-haut", "rv-droite", "rv-zoom", "rv-rideau");
        el.style.removeProperty("--delai");
      }, delai * 1000 + 1800);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  cibles.concat(titres).forEach(function (el) { observateur.observe(el); });

  /* --- Effets au pointeur (souris seulement) --- */
  if (!pointeurFin) return;

  // Halo doré qui suit la souris sur les cartes.
  document.querySelectorAll(".article-card").forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--x", (e.clientX - r.left) + "px");
      c.style.setProperty("--y", (e.clientY - r.top) + "px");
    });
  });

  // Légère inclinaison 3D des grandes images.
  document.querySelectorAll(".service-visual, .approach-visual").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      if (el.classList.contains("a-reveler")) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = "perspective(1000px) rotateY(" + (px * 6).toFixed(2) + "deg) rotateX(" + (-py * 6).toFixed(2) + "deg)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  });

  // Les taches de couleur du haut de page suivent doucement la souris.
  document.querySelectorAll(".hero").forEach(function (hero) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  });
})();
