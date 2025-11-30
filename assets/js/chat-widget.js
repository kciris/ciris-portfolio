document.addEventListener("DOMContentLoaded", function () {
  const backendUrl = "https://portfolio-agent-backend-djpe.onrender.com/chat";

  const widget = document.getElementById("portfolio-chat-widget");
  const toggleBtn = document.getElementById("pcw-toggle-btn");
  const closeBtn = document.getElementById("pcw-close-btn");
  const messagesEl = document.getElementById("pcw-messages");
  const form = document.getElementById("pcw-form");
  const input = document.getElementById("pcw-input");
  const chips = document.querySelectorAll(".pcw-chip");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl || !form || !input) {
    console.error("Chat widget elements not found in DOM.");
    return;
  }

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

  toggleBtn.addEventListener("click", function () {
    widget.classList.toggle("pcw-closed");
  });

  closeBtn.addEventListener("click", function () {
    widget.classList.add("pcw-closed");
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      const q = chip.getAttribute("data-q");
      if (q) {
        input.value = q;
        form.dispatchEvent(new Event("submit"));
      }
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    input.value = "";

    addMessage("assistant", "Let me think about how to answer that as I would in a real interview...");
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
            "I temporarily cannot access the AI engine (API quota issue), but normally I would answer with details from my background."
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

  // Interview-style welcome message
  addMessage(
    "assistant",
    "Hi, I’m Kazim. You can interview me here – ask about my background, experience, DevOps, cybersecurity, teaching, or specific roles you have in mind."
  );
});
