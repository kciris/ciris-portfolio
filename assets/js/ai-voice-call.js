// ===============================
// Interview Me (AI Voice Call) - PCM16 streaming
// Mic (PCM16 24kHz) -> WebSocket -> OpenAI Realtime -> PCM16 -> playback
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("ai-voice-call-btn");
  if (!btn) return;

  const labelSpan = btn.querySelector(".ai-voice-call-label");
  const iconSpan = btn.querySelector(".ai-voice-call-icon");

  const WS_URL =
    "wss://portfolio-agent-backend-djpe.onrender.com/ai-voice-call";

  // State: "idle" | "connecting" | "active"
  let state = "idle";

  // Mic + audio graph
  let mediaStream = null;
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;

  // Playback
  let playbackContext = null;

  // WebSocket
  let ws = null;

  // -------------------------
  // UI state
  // -------------------------
  function setState(next) {
    state = next;
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
    } else if (next === "active") {
      btn.setAttribute("aria-pressed", "true");
      iconSpan.textContent = "⏹";
      labelSpan.textContent = "Stop AI Voice Call";
      btn.setAttribute("aria-label", "Stop AI Voice Call interview");
    }
  }

  // -------------------------
  // Helpers: playback PCM16
  // -------------------------
  function ensurePlaybackContext() {
    if (!playbackContext) {
      playbackContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    if (playbackContext.state === "suspended") {
      playbackContext.resume();
    }
  }

  function playPcm16Chunk(arrayBuffer) {
    try {
      ensurePlaybackContext();

      const int16 = new Int16Array(arrayBuffer);
      const sampleRate = 24000; // we told Realtime we use 24kHz
      const audioBuffer = playbackContext.createBuffer(
        1,
        int16.length,
        sampleRate
      );
      const channel = audioBuffer.getChannelData(0);

      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768; // convert back to float [-1,1]
      }

      const src = playbackContext.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(playbackContext.destination);
      src.start();
    } catch (err) {
      console.error("[AI Voice Call] Error playing PCM16 chunk:", err);
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
      // optionally close; but reuse is also OK
      // audioContext.close().catch(() => {});
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  }

  function cleanupWebSocket() {
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        // ignore
      }
      ws = null;
    }
  }

  function stopAiVoiceCall() {
    console.log("[AI Voice Call] Stopping call.");
    cleanupAudioGraph();
    cleanupWebSocket();
    setState("idle");
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
        alert(
          "No microphone found. Please connect a microphone and try again."
        );
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
      stopAiVoiceCall();
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

    const inputSampleRate = audioContext.sampleRate; // often 48000
    console.log("[AI Voice Call] Input sampleRate:", inputSampleRate);

    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    // ScriptProcessorNode: simple way to pull PCM in JS
    const bufferSize = 2048;
    processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processorNode.onaudioprocess = function (event) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Float32Array

      // Downsample from inputSampleRate to 24000
      const targetRate = 24000;
      const ratio = inputSampleRate / targetRate;
      const newLength = Math.floor(inputData.length / ratio);
      const pcm16 = new Int16Array(newLength);

      for (let i = 0; i < newLength; i++) {
        const idx = Math.floor(i * ratio);
        let s = inputData[idx];
        // clamp
        s = Math.max(-1, Math.min(1, s));
        // float [-1,1] -> int16
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Send raw PCM16 bytes to backend
      ws.send(pcm16.buffer);
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination); // required in some browsers

    setState("active");
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

  // Quick local beep test (not used in production, just for debugging)
  function testBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = 24000;
    const duration = 0.4; // 400 ms
    const frames = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, sampleRate);
    const data = buffer.getChannelData(0);

    const freq = 660; // Hz
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  }

  // -------------------------
  // Button click handler
  // -------------------------
  btn.addEventListener("click", () => {
    // TEMP: test beep so you can confirm you can hear *something*
    testBeep();

    if (state === "idle") {
      startAiVoiceCall();
    } else {
      stopAiVoiceCall();
    }
  });

  // Init
  setState("idle");
});
