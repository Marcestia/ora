const ORA_CONFIG = window.ORA_CONFIG || {};

function normalizeHash(hash) {
  if (!hash || hash === "#top" || hash === "#pour-qui" || hash === "#pourquoi") {
    return "#association";
  }

  if (hash === "#adhesion" || hash === "#contact") {
    return "#rejoindre";
  }

  return hash;
}

function initNavigation() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const navLinks = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!nav || !navLinks.length) {
    return;
  }

  const setActiveLink = (hash) => {
    const currentHash = normalizeHash(hash || window.location.hash || "#association");

    navLinks.forEach((link) => {
      if (link.getAttribute("href") === currentHash) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  setActiveLink();
  window.addEventListener("hashchange", () => setActiveLink());

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) {
          return;
        }

        setActiveLink(`#${visibleEntries[0].target.id}`);
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.55],
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  if (!menuToggle) {
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
  const fields = form.querySelectorAll("input, textarea, select");

  fields.forEach((field) => {
    const fieldIsValid = field.checkValidity();
    markFieldState(field, fieldIsValid);
    if (!fieldIsValid) {
      isValid = false;
    }
  });

  return isValid;
}

function buildMailToLink(data) {
  const recipient = ORA_CONFIG.recipientEmail || "associationora@outlook.fr";
  const subject = "Demande ORA";
  const lines = [
    `Type de demande : ${data.demandeType || ""}`,
    `Nom : ${data.nom || ""}`,
    `Prénom : ${data.prenom || ""}`,
    `Téléphone : ${data.telephone || ""}`,
    `Email : ${data.email || ""}`,
    "",
    `Message : ${data.message || ""}`,
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
        ORA_CONFIG.oraEndpoint || ORA_CONFIG.contactEndpoint || ORA_CONFIG.adhesionEndpoint;

      try {
        if (endpoint) {
          await postToEndpoint(endpoint, data);
          updateStatus(statusElement, "Votre message a bien été envoyé.", "success");
          form.reset();
          form.querySelectorAll("input, textarea, select").forEach((field) => {
            field.removeAttribute("aria-invalid");
          });
          return;
        }

        window.location.href = buildMailToLink(data);
        updateStatus(
          statusElement,
          "Votre messagerie va s'ouvrir avec le message prérempli.",
          "success"
        );
      } catch (error) {
        updateStatus(
          statusElement,
          "L'envoi n'a pas abouti. Vous pouvez écrire directement à associationora@outlook.fr.",
          "error"
        );
      }
    });

    form.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.hasAttribute("aria-invalid")) {
          markFieldState(field, field.checkValidity());
        }
      });

      field.addEventListener("change", () => {
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
