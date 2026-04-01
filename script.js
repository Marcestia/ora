const ORA_CONFIG = window.ORA_CONFIG || {};

const pageMap = {
  accueil: "index.html",
  "pour-qui": "pour-qui.html",
  activites: "activites.html",
  pourquoi: "pourquoi-nous-rejoindre.html",
  adhesion: "adhesion.html",
  contact: "contact.html",
};

function initNavigation() {
  const currentPage = document.body.dataset.page;
  const navLinks = document.querySelectorAll(".main-nav a");
  const targetPath = pageMap[currentPage];

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === targetPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (!menuToggle || !nav) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    });
  });
}

function initReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((element) => observer.observe(element));
}

function markFieldState(field, isValid) {
  if (!field) {
    return;
  }

  field.setAttribute("aria-invalid", String(!isValid));
}

function serializeFormData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function validateForm(form) {
  let isValid = true;
  const fields = form.querySelectorAll("input, textarea");

  fields.forEach((field) => {
    const fieldIsValid = field.checkValidity();
    markFieldState(field, fieldIsValid);
    if (!fieldIsValid) {
      isValid = false;
    }
  });

  return isValid;
}

function buildMailToLink(formType, data) {
  const recipient = ORA_CONFIG.recipientEmail || "associationora@outlook.fr";
  const subject =
    formType === "adhesion"
      ? "Demande d'adhesion ORA"
      : "Message de contact ORA";

  const lines =
    formType === "adhesion"
      ? [
          `Nom : ${data.nom || ""}`,
          `Prenom : ${data.prenom || ""}`,
          `Date de naissance : ${data.dateNaissance || ""}`,
          `Adresse : ${data.adresse || ""}`,
          `Telephone : ${data.telephone || ""}`,
          `Email : ${data.email || ""}`,
          `Montant cotisation : ${data.montantCotisation || ""}`,
          `Message : ${data.message || ""}`,
        ]
      : [
          `Nom : ${data.nom || ""}`,
          `Telephone : ${data.telephone || ""}`,
          `Email : ${data.email || ""}`,
          "",
          `${data.message || ""}`,
        ];

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

async function postToEndpoint(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("L'envoi a échoué.");
  }
}

function updateStatus(statusElement, message, state) {
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.dataset.state = state || "";
}

function initForms() {
  const forms = document.querySelectorAll("form[data-form-type]");
  if (!forms.length) {
    return;
  }

  forms.forEach((form) => {
    const statusElement = form.querySelector(".form-status");
    const formType = form.dataset.formType;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      updateStatus(statusElement, "", "");

      if (!validateForm(form)) {
        updateStatus(
          statusElement,
          "Merci de vérifier les champs signalés avant l'envoi.",
          "error"
        );
        const firstInvalidField = form.querySelector('[aria-invalid="true"]');
        firstInvalidField?.focus();
        return;
      }

      const data = serializeFormData(form);
      const endpoint =
        formType === "adhesion" ? ORA_CONFIG.adhesionEndpoint : ORA_CONFIG.contactEndpoint;

      try {
        if (endpoint) {
          await postToEndpoint(endpoint, data);
          updateStatus(statusElement, "Votre message a bien été envoyé.", "success");
          form.reset();
          form.querySelectorAll("input, textarea").forEach((field) => {
            field.removeAttribute("aria-invalid");
          });
          return;
        }

        window.location.href = buildMailToLink(formType, data);
        updateStatus(
          statusElement,
          "Votre messagerie va s'ouvrir avec le message prérempli.",
          "success"
        );
      } catch (error) {
        updateStatus(
          statusElement,
          "L'envoi n'a pas abouti. Vous pouvez nous écrire directement à associationora@outlook.fr.",
          "error"
        );
      }
    });

    form.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.hasAttribute("aria-invalid")) {
          markFieldState(field, field.checkValidity());
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initReveal();
  initForms();
});
