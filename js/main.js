document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var header = document.querySelector(".site-header");

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      header.classList.toggle("open");
    });
  }

  var form = document.querySelector(".contact-form form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form-success");
      if (!note) {
        note = document.createElement("p");
        note.className = "form-success form-note";
        note.textContent = "Merci ! Votre message a été préparé — configurez l'envoi (mailto ou service tiers) pour le transmettre réellement.";
        form.appendChild(note);
      }
    });
  }
});
