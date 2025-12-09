// ===============================
// Interview Me (AI Voice Call) - PCM16 streaming with barge-in
// Mic (PCM16 24kHz) -> WebSocket -> OpenAI Realtime -> PCM16 -> playback
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("ai-voice-call-btn");
  if (!btn) return;

  const labelSpan = btn.querySelector(".ai-voice-call-label");
  const iconSpan = btn.querySelector(".ai-voice-call-icon");

  // For local testing you can use: ws://localhost:8080/ai-voice-call
  const WS_URL =
    "wss://portfolio-agent-backend-djpe.onrender.com/ai-voice-call";

  // State: "idle" | "connecting" | "listening" | "speaking"
  let state = "idle";

  // Mic + audio graph
  let mediaStream = null;
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;

  // Playback
  let playbackContext = null;
  let playbackTime = 0; // scheduled position for streaming audio
  let activeSources = []; // currently playing buffer sources

  // Simple voice activity detection (VAD)
  let vadSpeaking = false;
  let vadAboveCount = 0;
  let vadBelowCount = 0;
  const VAD_THRESHOLD = 0.03; // adjust if too sensitive/insensitive
  const VAD_ABOVE_FRAMES = 3; // frames above threshold to trigger "start speech"
  const VAD_BELOW_FRAMES = 6; // frames below to trigger "end speech"

  // WebSocket
  let ws = null;

  // -------------------------
  // UI state
  // -------------------------
  function setState(next) {
    state = next;

    // For CSS, anything except idle is treated as "active"
    btn.dataset.state = next === "idle" ? "idle" : "active";

    if (!labelSpan || !iconSpan) return;

    if (next === "idle") {
      btn.setAttribute("aria-pressed", "false");
      iconSpan.textContent = "📞";
      labelSpan.textContent = "Interview Me (AI Voice Call)";
      btn.setAttribute(
        "aria-label",
        "Start AI Voice Call interview (advanced voice pipeline)"
      );
    } else if (next === "connecting") {
      btn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "⏳";
      labelSpan.textContent = "Connecting…";
      btn.setAttribute("aria-label", "Connecting AI Voice Call…");
    } else if (next === "listening") {
      btn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "🎤";
      labelSpan.textContent = "Listening… (start speaking)";
      btn.setAttribute("aria-label", "AI is listening to you");
    } else if (next === "speaking") {
      btn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "🔊";
      labelSpan.textContent = "Speaking… (tap to stop)";
      btn.setAttribute("aria-label", "AI is speaking. Tap to stop.");
    }
  }

  // -------------------------
  // Helpers: playback PCM16
  // -------------------------
  function ensurePlaybackContext() {
    if (!playbackContext) {
      playbackContext =
        new (window.AudioContext || window.webkitAudioContext)();
      playbackTime = 0;
      activeSources = [];
    }
    if (playbackContext.state === "suspended") {
      playbackContext.resume();
    }
  }

  function playPcm16Chunk(arrayBuffer) {
    try {
      ensurePlaybackContext();

      const int16 = new Int16Array(arrayBuffer);
      const sampleRate = 24000; // matches Realtime + our downsampling
      const audioBuffer = playbackContext.createBuffer(
        1,
        int16.length,
        sampleRate
      );
      const channel = audioBuffer.getChannelData(0);

      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768;
      }

      const src = playbackContext.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(playbackContext.destination);

      // Schedule sequentially so chunks play back-to-back
      const now = playbackContext.currentTime;
      const startTime = Math.max(playbackTime, now);
      src.start(startTime);
      playbackTime = startTime + audioBuffer.duration;

      activeSources.push(src);
      src.onended = () => {
        activeSources = activeSources.filter((s) => s !== src);
        // When no more AI audio is playing and call is active, go back to listening
        if (activeSources.length === 0 && state !== "idle" && state !== "connecting") {
          setState("listening");
        }
      };

      // As soon as we start playing AI audio, mark as speaking
      if (state !== "idle" && state !== "connecting") {
        setState("speaking");
      }
    } catch (err) {
      console.error("[AI Voice Call] Error playing PCM16 chunk:", err);
    }
  }

  // Stop all AI audio; if hard=true, also close playback context
  function stopPlayback(hard = false) {
    activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    });
    activeSources = [];

    if (playbackContext) {
      if (hard) {
        try {
          playbackContext.close();
        } catch (_) {}
        playbackContext = null;
        playbackTime = 0;
      } else {
        // Keep context alive; reset timeline to "now"
        playbackTime = playbackContext.currentTime;
      }
    } else {
      playbackTime = 0;
    }
  }

  // -------------------------
  // Cleanup
  // -------------------------
  function cleanupAudioGraph() {
    if (processorNode) {
      processorNode.disconnect();
      processorNode.onaudioprocess = null;
      processorNode = null;
    }
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (audioContext) {
      try {
        audioContext.close();
      } catch (_) {}
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }

    // Reset VAD state
    vadSpeaking = false;
    vadAboveCount = 0;
    vadBelowCount = 0;
  }

  function cleanupWebSocket() {
    if (ws) {
      try {
        ws.close();
      } catch (_) {}
      ws = null;
    }
  }

  function stopAiVoiceCall() {
    console.log("[AI Voice Call] Stopping call.");
    cleanupAudioGraph();
    cleanupWebSocket();
    stopPlayback(true); // hard: stop and close playback context
    setState("idle");
  }

  // -------------------------
  // VAD: user speech detection
  // -------------------------
  function handleVadFrame(inputData) {
    // RMS energy
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      const s = inputData[i];
      sum += s * s;
    }
    const rms = Math.sqrt(sum / inputData.length);

    if (rms > VAD_THRESHOLD) {
      vadAboveCount++;
      vadBelowCount = 0;
    } else {
      vadBelowCount++;
      vadAboveCount = 0;
    }

    // User speech starts
    if (!vadSpeaking && vadAboveCount >= VAD_ABOVE_FRAMES) {
      vadSpeaking = true;
      // BARGE-IN: if AI is speaking, stop AI audio and switch to listening
      if (state === "speaking") {
        console.log("[AI Voice Call] Barge-in: user started speaking, stopping AI audio.");
        stopPlayback(false); // soft stop: keep context alive
      }
      if (state !== "idle" && state !== "connecting") {
        setState("listening");
      }
    }

    // User speech ends
    if (vadSpeaking && vadBelowCount >= VAD_BELOW_FRAMES) {
      vadSpeaking = false;
      // We don't have to change state here; Realtime will detect turn end
      // and start speaking when ready. We'll flip to "speaking" when audio arrives.
    }
  }

  // -------------------------
  // Capture mic -> PCM16 24kHz -> WS
  // -------------------------
  async function startAiVoiceCall() {
    if (
      !("mediaDevices" in navigator) ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert("Sorry, your browser does not support microphone access.");
      return;
    }

    setState("connecting");

    // 1) Mic access
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch (err) {
      console.error("[AI Voice Call] getUserMedia error:", err);
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        alert(
          "Microphone access was blocked. Please allow microphone permission for this site and try again."
        );
      } else if (err.name === "NotFoundError") {
        alert("No microphone found. Please connect a microphone and try again.");
      } else {
        alert(
          "Could not access your microphone. Check permissions and console for details."
        );
      }
      setState("idle");
      return;
    }

    // 2) WebSocket
    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error("[AI Voice Call] Failed to create WebSocket:", err);
      alert("Failed to open AI Voice Call connection. Check console.");
      stopAiVoiceCall();
      return;
    }

    ws.binaryType = "arraybuffer";

    ws.onerror = (event) => {
      console.error("[AI Voice Call] WebSocket error:", event);
      alert(
        "Error connecting to AI Voice Call service. Check backend logs / console."
      );
      stopAiVoiceCall();
    };

    ws.onclose = () => {
      console.log("[AI Voice Call] WebSocket closed.");
      if (state !== "idle") {
        stopAiVoiceCall();
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          handleServerJsonMessage(msg);
        } catch {
          console.warn("[AI Voice Call] Non-JSON text frame:", event.data);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // PCM16 from backend
        playPcm16Chunk(event.data);
      }
    };

    ws.onopen = () => {
      console.log("[AI Voice Call] WebSocket open.");
      startMicStreaming();
    };
  }

  function startMicStreaming() {
    if (!mediaStream) {
      console.error("[AI Voice Call] No mediaStream when starting streaming.");
      stopAiVoiceCall();
      return;
    }

    audioContext =
      audioContext || new (window.AudioContext || window.webkitAudioContext)();

    const inputSampleRate = audioContext.sampleRate; // often 44100 or 48000
    console.log("[AI Voice Call] Input sampleRate:", inputSampleRate);

    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    const bufferSize = 2048;
    processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

    // Mute mic path to speakers to avoid hearing yourself / echo
    const muteGain = audioContext.createGain();
    muteGain.gain.value = 0;

    processorNode.onaudioprocess = function (event) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);

      // Run simple VAD on this frame
      handleVadFrame(inputData);

      // Downsample from inputSampleRate to 24000 and send PCM16
      const targetRate = 24000;
      const ratio = inputSampleRate / targetRate;
      const newLength = Math.floor(inputData.length / ratio);
      const pcm16 = new Int16Array(newLength);

      for (let i = 0; i < newLength; i++) {
        const idx = Math.floor(i * ratio);
        let s = inputData[idx];
        s = Math.max(-1, Math.min(1, s));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      ws.send(pcm16.buffer);
    };

    // Graph: mic -> processor -> muteGain (0) -> destination
    sourceNode.connect(processorNode);
    processorNode.connect(muteGain);
    muteGain.connect(audioContext.destination);

    // Once audio graph is running, we are "listening"
    setState("listening");
  }

  // -------------------------
  // JSON messages from backend
  // -------------------------
  function handleServerJsonMessage(msg) {
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "transcript":
        console.log("[AI Voice Call] Transcript:", msg.text);
        break;
      case "status":
        console.log("[AI Voice Call] Status:", msg.message);
        break;
      case "error":
        console.error("[AI Voice Call] Server error:", msg.message);
        alert("AI Voice Call error: " + msg.message);
        break;
      default:
        console.log("[AI Voice Call] Unknown message:", msg);
    }
  }

  // -------------------------
  // Button click handler (toggle)
  // -------------------------
  btn.addEventListener("click", () => {
    if (state === "idle") {
      startAiVoiceCall();
    } else {
      // Works as "Stop" in any non-idle state
      stopAiVoiceCall();
    }
  });

  // Init
  setState("idle");
});
