// assets/js/ai-tools-sync.js

document.addEventListener('DOMContentLoaded', () => {
  const voiceBtn = document.querySelector('.ai-voice-call-btn');
  const vawBtn = document.getElementById('vaw-toggle-btn');

  if (!voiceBtn || !vawBtn) {
    // One of the tools isn't on this page; nothing to sync
    return;
  }

  // ---- Helpers to interpret current state from data-state ----

  function isVoiceActive() {
    return voiceBtn.dataset.state === 'active';
  }

  const VAW_ACTIVE_STATES = new Set(['listening', 'thinking', 'speaking']);

  function isVawActive() {
    const state = vawBtn.dataset.state;
    return VAW_ACTIVE_STATES.has(state);
  }

  // ---- When voice call is activated, we stop VAW if needed ----

  function handleVoiceStateChange() {
    if (isVoiceActive() && isVawActive()) {
      // This will trigger the same logic as if user clicked VAW off
      vawBtn.click();
    }
  }

  // ---- When VAW is activated, we stop voice call if needed ----

  function handleVawStateChange() {
    if (isVawActive() && isVoiceActive()) {
      // This will trigger the same logic as if user clicked voice call off
      voiceBtn.click();
    }
  }

  // ---- Observe data-state changes on both elements ----

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'data-state') 
continue;

      if (m.target === voiceBtn) {
        handleVoiceStateChange();
      } else if (m.target === vawBtn) {
        handleVawStateChange();
      }
    }
  });

  observer.observe(voiceBtn, { attributes: true, attributeFilter: 
['data-state'] });
  observer.observe(vawBtn, { attributes: true, attributeFilter: ['data-state'] 
});

  // Optional sanity check on load: if both somehow start "on", prefer VAW or 
voice
  if (isVoiceActive() && isVawActive()) {
    // Example: prefer VAW and shut down voice call
    voiceBtn.click();
  }

  // Optionally expose functions if you want to control from elsewhere:
  window.aiToolSync = {
    isVoiceActive,
    isVawActive,
    stopVoiceFromOutside() {
      if (isVoiceActive()) voiceBtn.click();
    },
    stopVawFromOutside() {
      if (isVawActive()) vawBtn.click();
    },
  };
});

