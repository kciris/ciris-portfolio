document.addEventListener("DOMContentLoaded", function () {
  const backendUrl = "https://portfolio-agent-backend-djpe.onrender.com/chat";

  const widget = document.getElementById("portfolio-chat-widget");
  const toggleBtn = document.getElementById("pcw-toggle-btn");
  const closeBtn = document.getElementById("pcw-close-btn");
  const endBtn = document.getElementById("pcw-end-btn");
  const sessionOverlay = document.getElementById("pcw-session-overlay");
  const sessionConfirmBtn = document.getElementById("pcw-session-confirm");
  const sessionCancelBtn = document.getElementById("pcw-session-cancel");
  const messagesEl = document.getElementById("pcw-messages");
  const form = document.getElementById("pcw-form");
  const input = document.getElementById("pcw-input");
  const chips = document.querySelectorAll(".pcw-chip");
  const aiModeNav = document.getElementById("nav-ai-mode");
  const aiModeAnchor = document.getElementById("ai-mode-anchor");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl || !form || !input) {
    console.error("Chat widget elements not found in DOM.");
    return;
  }

  // Session ID – new one per "session"
  let sessionId = createSessionId();

  function createSessionId() {
    return "sess-" + Math.random().toString(36).slice(2);
  }

  function clearMessages() {
    messagesEl.innerHTML = "";
  }

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.classList.add("pcw-msg");
    div.classList.add(role === "user" ? "pcw-msg-user" : "pcw-msg-assistant");

    const span = document.createElement("span");
    span.textContent = text;
    div.appendChild(span);

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showWelcomeMessage() {
    addMessage(
      "assistant",
      "Hi, I’m Kazim. You can interview me here — ask about my background, DevOps, cybersecurity, teaching experience, or specific roles you have in mind."
    );
  }

  // Initialize with one welcome message
  clearMessages();
  showWelcomeMessage();

  // Toggle chat window
  toggleBtn.addEventListener("click", function () {
    widget.classList.toggle("pcw-closed");
    if (!widget.classList.contains("pcw-closed")) {
      input.focus();
    }
  });

  // Close button just hides, keeps session
  closeBtn.addEventListener("click", function () {
    widget.classList.add("pcw-closed");
  });

 // End button: show in-widget end-session overlay
if (endBtn && sessionOverlay && sessionConfirmBtn && sessionCancelBtn) {
  const openOverlay = () => {
    sessionOverlay.classList.add("pcw-session-overlay--visible");
    sessionOverlay.setAttribute("aria-hidden", "false");
  };

  const closeOverlay = () => {
    sessionOverlay.classList.remove("pcw-session-overlay--visible");
    sessionOverlay.setAttribute("aria-hidden", "true");
  };

  endBtn.addEventListener("click", function () {
    openOverlay();
  });

  sessionCancelBtn.addEventListener("click", function (event) {
    event.preventDefault();
    closeOverlay();
  });

  sessionConfirmBtn.addEventListener("click", function (event) {
    event.preventDefault();
    closeOverlay();

    // New session id = new conversation on backend
    sessionId = createSessionId();

    // Clear messages and show "session ended" + new welcome
    clearMessages();
    addMessage(
      "assistant",
      "This interview session has ended. When you’re ready, you can start a new interview with me."
    );

    setTimeout(() => {
      showWelcomeMessage();
    }, 800);
  });
}


  // Suggested question chips
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const q = chip.getAttribute("data-q");
      if (q) {
        input.value = q;
        form.dispatchEvent(new Event("submit"));
      }
    });
  });

  // AI Mode nav: scroll + open widget + focus input
  if (aiModeNav) {
    aiModeNav.addEventListener("click", function (e) {
      e.preventDefault();

      if (aiModeAnchor) {
        aiModeAnchor.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Open the widget if closed
      widget.classList.remove("pcw-closed");

      // Focus input after a small delay so it’s visible
      setTimeout(() => {
        input.focus();
      }, 400);
    });
  }

  // Form submit: send question to backend
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";

    addMessage(
      "assistant",
      "Let me think about how to answer that as I would in a real interview..."
    );
    const thinkingNode = messagesEl.lastChild;

    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      });

      const data = await res.json();
      messagesEl.removeChild(thinkingNode);

      if (data.reply) {
        addMessage("assistant", data.reply);
      } else if (data.error) {
        if (data.error.toLowerCase().includes("quota")) {
          addMessage(
            "assistant",
            "I can’t access the AI engine right now (API quota issue). Once the quota is topped up, I’ll be able to answer again."
          );
        } else {
          addMessage("assistant", "Server error: " + data.error);
        }
      } else {
        addMessage("assistant", "No response from server.");
      }
    } catch (err) {
      console.error(err);
      messagesEl.removeChild(thinkingNode);
      addMessage("assistant", "Network error.");
    }
  });
});
