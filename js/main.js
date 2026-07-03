document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var header = document.querySelector(".site-header");

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      header.classList.toggle("open");
    });
  }

  var form = document.querySelector(".contact-form form");
  if (form && new URLSearchParams(window.location.search).get("envoye") === "1") {
    var note = document.createElement("p");
    note.className = "form-success form-note";
    note.textContent = "Merci ! Votre message a bien été envoyé, nous vous répondrons sous peu.";
    form.appendChild(note);
    window.history.replaceState({}, "", window.location.pathname);
  }
});
