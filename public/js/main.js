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

  var form = document.querySelector(".contact-form form");
  if (form && new URLSearchParams(window.location.search).get("envoye") === "1") {
    var note = document.createElement("p");
    note.className = "form-success form-note";
    note.textContent = "Merci ! Votre message a bien été envoyé, je vous répondrai sous peu.";
    form.appendChild(note);
    window.history.replaceState({}, "", window.location.pathname);
  }
});
