document.addEventListener("DOMContentLoaded", () => {
  const c = SITE_CONFIG;

  document.querySelectorAll("[data-hero-tagline]").forEach(el => el.textContent = c.heroTagline);
  document.querySelectorAll("[data-hero-title]").forEach(el => el.textContent = c.heroTitle);
  document.querySelectorAll("[data-hero-subtitle]").forEach(el => el.textContent = c.heroSubtitle);
  document.querySelectorAll("[data-hero-description]").forEach(el => el.textContent = c.heroDescription);
  document.querySelectorAll("[data-address]").forEach(el => el.textContent = c.address);
  document.querySelectorAll("[data-hours]").forEach(el => el.textContent = c.openingHours);

  document.querySelectorAll("[data-phone-link]").forEach(el => {
    el.href = `tel:${c.phone}`;
    if (!el.textContent.includes("Call") && !el.textContent.includes("☎")) {
      el.textContent = c.phoneDisplay;
    }
  });

  document.querySelectorAll("[data-whatsapp-link]").forEach(el => {
    el.href = `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
  });

  document.querySelectorAll("[data-maps-link]").forEach(el => el.href = c.googleMapsUrl);
  document.querySelectorAll("[data-reviews-link]").forEach(el => el.href = c.googleReviewsUrl);
  document.querySelectorAll("[data-menu-link]").forEach(el => el.href = c.menuUrl);

  document.getElementById("year").textContent = new Date().getFullYear();

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
});
