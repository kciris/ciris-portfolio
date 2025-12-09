// ===============================
// Voice Interview (single button, with Thinking state)
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  const backendUrl = "https://portfolio-agent-backend-djpe.onrender.com/chat";

  const toggleBtn = document.getElementById("vaw-toggle-btn");
  if (!toggleBtn) return;

  const labelSpan = toggleBtn.querySelector(".vaw-label");
  const iconSpan = toggleBtn.querySelector(".vaw-icon");

  // --- Speech Recognition setup ---
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  }

  // --- State ---
  // "idle" | "listening" | "thinking" | "speaking"
  let state = "idle";
  let sessionActive = false;
  let listening = false;
  let ttsSpeaking = false;
  let voiceSessionId = null;
  let requestCounter = 0; // ignore stale responses

  // --- UI helpers ---
  function setState(next) {
    state = next;
    toggleBtn.dataset.state = next;

    if (!iconSpan || !labelSpan) return;

    if (next === "idle") {
      toggleBtn.setAttribute("aria-pressed", "false");
      iconSpan.textContent = "🎙";
      labelSpan.textContent = "Voice Interview (Browser)";
      toggleBtn.setAttribute("aria-label", "Start voice interview");
      btn.setAttribute(
    "aria-label",
    "Start browser voice interview (Voice Interview, Browser)"
  );
    } else if (next === "listening") {
      toggleBtn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "👂";
      labelSpan.textContent = "Listening…";
      toggleBtn.setAttribute(
        "aria-label",
        "Listening. Tap to stop the interview"
      );
    } else if (next === "thinking") {
      toggleBtn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "💭";
      labelSpan.textContent = "Thinking…";
      toggleBtn.setAttribute(
        "aria-label",
        "I understood your question. Thinking about an answer."
      );
    } else if (next === "speaking") {
      toggleBtn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "🗣";
      labelSpan.textContent = "Stop Talking";
      toggleBtn.setAttribute(
        "aria-label",
        "Answering. Tap to stop and listen again"
      );
    }
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ttsSpeaking = false;
  }

  function startListening() {
    if (!recognition || !sessionActive) return;
    if (listening) return;

    try {
      recognition.start();
      listening = true;
      setState("listening");
    } catch (e) {
      console.error("Voice Interview: failed to start recognition", e);
      listening = false;
      sessionActive = false;
      setState("idle");
    }
  }

  function stopListening() {
    if (!recognition || !listening) return;
    try {
      recognition.stop();
    } catch (e) {
      console.error("Voice Interview: failed to stop recognition", e);
    }
    listening = false;
  }

  function startSession() {
    if (!recognition) {
      console.warn("Voice Interview: SpeechRecognition not supported.");
      labelSpan.textContent = "Voice not supported";
      toggleBtn.disabled = true;
      toggleBtn.setAttribute(
        "aria-label",
        "Voice interview is not supported in this browser"
      );
      return;
    }
    if (sessionActive) return;

    sessionActive = true;
    voiceSessionId =
      "voice-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    startListening();
  }

  function endSession() {
    sessionActive = false;
    voiceSessionId = null;
    stopListening();
    stopSpeech();
    setState("idle");
  }

  // --- Speak answer, then go back to listening ---
  function speakAnswer(text) {
    if (!sessionActive) return;

    if (!("speechSynthesis" in window)) {
      // No TTS support: go back to listening after "thinking"
      startListening();
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = function () {
      ttsSpeaking = true;
      // While speaking, stop listening (avoid echo)
      stopListening();
      setState("speaking");
    };

    utterance.onend = function () {
      ttsSpeaking = false;
      if (sessionActive) {
        // Answer finished → back to listening
        startListening();
      } else {
        setState("idle");
      }
    };

    utterance.onerror = function () {
      ttsSpeaking = false;
      if (sessionActive) {
        startListening();
      } else {
        setState("idle");
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  // --- Backend call (Thinking state + stale reply handling) ---
  async function sendVoiceMessage(text) {
    if (!sessionActive) return;

    const thisRequestId = ++requestCounter;
    setState("thinking");

    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: voiceSessionId,
        }),
      });

      // Session ended or a newer question arrived → ignore this reply
      if (!sessionActive || thisRequestId !== requestCounter) return;

      if (!res.ok) {
        speakAnswer("Sorry, I could not reach the interview service.");
        return;
      }

      const data = await res.json();

      if (data && data.reply) {
        speakAnswer(data.reply);
      } else if (data && data.error) {
        speakAnswer("Error: " + data.error);
      } else {
        speakAnswer("No response from server.");
      }
    } catch (err) {
      console.error("Voice Interview: network error", err);
      if (!sessionActive || thisRequestId !== requestCounter) return;
      speakAnswer("Network error while contacting the interview service.");
    }
  }

  // --- Button behavior ---
  toggleBtn.addEventListener("click", function () {
    // If no SR support, bail gracefully on first click
    if (!recognition && state === "idle") {
      labelSpan.textContent = "Voice not supported";
      toggleBtn.disabled = true;
      toggleBtn.setAttribute(
        "aria-label",
        "Voice interview is not supported in this browser"
      );
      return;
    }

    if (state === "idle") {
      // First click: start the voice interview session
      startSession();
    } else if (state === "listening") {
      // While listening: click ends the session completely
      endSession();
    } else if (state === "thinking") {
      // While thinking: click cancels this question & goes back to listening
      requestCounter++; // ignore in-flight response
      if (sessionActive) {
        startListening();
      } else {
        setState("idle");
      }
    } else if (state === "speaking") {
      // While answering: click stops talking and returns to listening
      stopSpeech();
      if (sessionActive) {
        startListening();
      } else {
        setState("idle");
      }
    }
  });

  // --- SpeechRecognition events ---
  if (recognition) {
    recognition.addEventListener("result", function (event) {
      listening = false;

      if (!sessionActive) {
        setState("idle");
        return;
      }

      const transcript = event.results[0][0].transcript || "";
      const text = transcript.trim();

      if (!text) {
        // nothing understood; keep listening
        startListening();
        return;
      }

      // Understood the question → Thinking mode and ask backend
      sendVoiceMessage(text);
    });

    recognition.addEventListener("error", function (event) {
      console.error("Voice Interview: recognition error", event.error);
      listening = false;
      if (sessionActive && !ttsSpeaking) {
        // Try to keep session alive by listening again
        startListening();
      } else if (!sessionActive) {
        setState("idle");
      }
    });

    recognition.addEventListener("end", function () {
      listening = false;
      // We don't auto-restart here; startListening is called from
      // speakAnswer or sendVoiceMessage / error handlers when appropriate.
    });
  }

  // Initial UI
  setState("idle");
});

