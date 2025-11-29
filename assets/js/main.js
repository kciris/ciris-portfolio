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
