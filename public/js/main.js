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
      diapos[d].classList.remove("active");
      d = (d + 1) % diapos.length;
      diapos[d].classList.add("active");
    }, 5000);
  }

  // En-tête transparent sur l'accueil, redevient opaque au défilement
  if (document.body.classList.contains("accueil") && header) {
    var majEntete = function () {
      header.classList.toggle("scrolled", window.scrollY > 60);
    };
    window.addEventListener("scroll", majEntete, { passive: true });
    majEntete();
  }

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
