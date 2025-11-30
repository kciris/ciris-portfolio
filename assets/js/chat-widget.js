(function () {
  // 🔴 Replace with your actual deployed backend URL
  const backendUrl = "https://portfolio-agent-backend-djpe.onrender.com";

  const widget = document.getElementById("portfolio-chat-widget");
  const toggleBtn = document.getElementById("pcw-toggle-btn");
  const closeBtn = document.getElementById("pcw-close-btn");
  const messagesEl = document.getElementById("pcw-messages");
  const form = document.getElementById("pcw-form");
  const input = document.getElementById("pcw-input");

  // Unique session per visitor
  const sessionId = "sess-" + Math.random().toString(36).slice(2);

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

  toggleBtn.addEventListener("click", () => {
    widget.classList.toggle("pcw-closed");
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.add("pcw-closed");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";

    addMessage("assistant", "Thinking...");
    const thinkingNode = messagesEl.lastChild;

    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();
      messagesEl.removeChild(thinkingNode);

      if (data.reply) {
        addMessage("assistant", data.reply);
      } else {
        addMessage("assistant", "Sorry, I could not get a response from the server.");
      }
    } catch (err) {
      console.error(err);
      messagesEl.removeChild(thinkingNode);
      addMessage("assistant", "Network error, please try again later.");
    }
  });

  // Optional welcome message
  addMessage(
    "assistant",
    "👋 Hi! I’m Kazim’s AI assistant. Ask me about my experience, projects, DevOps, cyber, or 
research."
  );
})();

