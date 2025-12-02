// Small enhancements & future hooks

// Dynamic year in footer
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Future idea: fetch projects dynamically from a JSON file or API
// Example structure:
// fetch('assets/data/projects.json')
//   .then(res => res.json())
//   .then(projects => renderProjects(projects));

// Back to Top Button → scroll to hero section with header offset
const backBtn = document.getElementById("backToTopBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    const header = document.querySelector(".site-header");
    const hero = document.querySelector(".hero");

    // Fallback: if hero/header not found, scroll to very top
    if (!hero) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const headerHeight = header ? header.offsetHeight : 0;

    // Distance from top of page to hero
    const heroTop =
      hero.getBoundingClientRect().top + window.pageYOffset;

    // Scroll so hero starts just below the sticky header
    const targetPosition = Math.max(heroTop - headerHeight - 8, 0);

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });
  });
}

// ========================
// Dark / Light mode toggle
// ========================
(function () {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  const body = document.body;

  // Load saved theme or default to dark
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    body.classList.add("light-mode");
    toggleBtn.textContent = "☀️ Light";
  } else {
    body.classList.remove("light-mode");
    toggleBtn.textContent = "🌙 Dark";
  }

  toggleBtn.addEventListener("click", () => {
    const isLight = body.classList.toggle("light-mode");
    if (isLight) {
      localStorage.setItem("theme", "light");
      toggleBtn.textContent = "☀️ Light";
    } else {
      localStorage.setItem("theme", "dark");
      toggleBtn.textContent = "🌙 Dark";
    }
  });
})();
