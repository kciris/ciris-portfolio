# Cd'Kazim Ciris Portfolio – Tech Stack Overview

This document summarizes the main technologies and architectural choices used in the **Cd'Kazim Ciris, PhD** portfolio site.

## 1. Frontend Structure

- **HTML5**
  - Semantic layout: `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`, `<article>`, `<aside>`.
  - Custom AI chat widget markup (`#portfolio-chat-widget`, `#pcw-window`, `#pcw-messages`, etc.).
  - Social preview metadata: Open Graph + Twitter Card tags for LinkedIn and other platforms.

- **CSS3 (No Frameworks)**
  - Pure custom CSS, no Tailwind / Bootstrap / Bulma.
  - Uses **CSS variables** (custom properties) for:
    - Colors (`--bg`, `--accent`, `--text`, etc.)
    - Radii (`--radius-lg`, `--radius-pill`)
    - Shadows (`--shadow-soft`)
    - Typography (`--font-sans`)
  - Layout via **Flexbox** and **CSS Grid**:
    - `.header-inner`, `.brand`, `.hero-inner`, `.two-column`, `.grid`, `.skills-grid`.
  - Responsive behavior via media queries (~880px, 700px, 600px) for:
    - Header collapsing to column
    - Reflowing hero panel and text
    - Avatar resizing
    - Section spacing adjustments

### CSS Files (Modular Structure)

- `assets/css/base.css`
  - Global reset and base styles
  - CSS variables and global typography
  - Container, section spacing, and shared layout utilities

- `assets/css/layout.css`
  - Header + navigation bar
  - Hero section layout (text + hero panel)
  - About, Experience, Projects, Skills, Contact section layout
  - Footer layout
  - Responsive layout rules

- `assets/css/components.css`
  - Reusable UI components:
    - Buttons (`.btn`, `.btn.primary`, `.btn.ghost`)
    - Cards (`.card`, `.info-card`)
    - Timeline (`.timeline`, `.timeline-item`)
    - Tags / pill lists (`.pill-list`, `.tags`)
    - Status pill (job hunting / availability)
  - Small visual components and utility classes

- `assets/css/chat-widgets.css`
  - Chat widget container positioning (`#portfolio-chat-widget`)
  - Chat window (`#pcw-window`) styling
  - Header, subtitle, action buttons (`#pcw-header`, `.pcw-header-actions`)
  - Suggested chips (`#pcw-suggested`, `.pcw-chip`)
  - Message bubbles (`.pcw-msg-user`, `.pcw-msg-assistant`)
  - Form and input styling for the chat
  - Session overlay dialog for "End session" confirmation

- `assets/css/theme.css`
  - Dark / light mode theme system
  - `body.light-mode` overrides for:
    - Backgrounds and text colors
    - Hero and section backgrounds
    - Cards, info-cards, timeline borders
    - Footer styling
    - Chat widget light-mode variants (window, header, messages, chips)

---

## 2. JavaScript

### `assets/js/main.js`

- **Back to Top Button**
  - Controls the `#backToTopBtn` visibility and scroll behavior.

- **Theme Toggle (Dark / Light Mode)**
  - Reads and writes theme preference to `localStorage` (`"theme"` key).
  - Toggles `body.light-mode` class on click.
  - Updates toggle button label (e.g., "🌙 Dark" / "☀️ Light").

### `assets/js/chat-widget.js`

- Controls the **Interview Me (AI)** chat widget:
  - Opens and closes the chat (`#pcw-toggle-btn`, `#pcw-close-btn`).
  - Renders user and assistant messages into `#pcw-messages`.
  - Handles the input form (`#pcw-form`, `#pcw-input`) and `Enter` key behavior.
  - Handles suggested question chips (`.pcw-chip`) by populating the input and sending predefined prompts.
  - Manages session IDs for backend conversations.
  - Implements “End session” behavior:
    - Shows an overlay confirmation dialog (`#pcw-session-overlay`).
    - On confirm: clears messages, creates a new session, and shows a fresh welcome message.

- Communicates with an **external AI backend** (hosted on Render) via `fetch`:
  - Sends user messages and session information.
  - Receives assistant responses and appends them to the chat.

---

## 3. Hosting & Backend

- **GitHub Pages**
  - Static hosting for the portfolio site:
    - Public URL: `https://kciris.github.io/ciris-portfolio/`
  - Serves static HTML, CSS, JS, and assets.

- **AI Backend on Render**
  - The chat widget uses a remote HTTP API (Render-hosted) to:
    - Process user questions.
    - Generate AI-powered answers tailored to the portfolio.
  - API keys and model access stay on the backend (not exposed in frontend code).

---

## 4. Version Control & Workflow

- **Git & GitHub**
  - Primary branches:
    - `main` – production / live GitHub Pages branch (protected).
    
  - Typical workflow:
    1. Create feature branch from `main`.
    2. Implement changes (UI, chat, theme, structure).
    3. Commit locally and push to GitHub.
    4. Open Pull Request targeting `main`.
    5. Resolve conflicts and request review if required.
    6. Merge via PR (often with “squash and merge”).

---

## 5. Analytics

- **Google Analytics 4 (GA4)**
  - Integrated via GA4 `gtag.js` script in `<head>`.
  - Tracks pageviews and basic engagement for the GitHub Pages domain.
  - Future extension: custom events for chat widget usage (e.g., number of questions asked per session).

---

## 6. Accessibility & UX Considerations

- Semantic HTML structure improves screen reader navigation.
- Buttons, links, and interactive controls are:
  - Labeled with accessible text and ARIA where appropriate (e.g., theme toggle).
  - Implemented as real `<button>` / `<a>` elements rather than `div` clicks.
- Theme system uses sufficient contrast in both dark and light modes.
- Responsive layout ensures usability on mobile, tablet, and desktop.

---

This overview can be expanded over time to include:

- Specific AI backend details (without exposing secrets).
- Detailed accessibility compliance notes (WCAG / Section 508).
- Build/test instructions if a more complex toolchain is introduced.
