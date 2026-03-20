// ======================
// 🔥 環境音（安定版ループ）
// ======================
let ambientCtx = null;
let ambientBuffer = null;
let ambientSource = null;
let nextTimer = null;
let loadedMode = null;

async function startAmbient(mode) {
  if (!mode) return;

  if (!ambientCtx) {
    ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!ambientBuffer || loadedMode !== mode) {
    const res = await fetch(`${mode}.wav`);
    const arrayBuffer = await res.arrayBuffer();
    ambientBuffer = await ambientCtx.decodeAudioData(arrayBuffer);
    loadedMode = mode;
  }

  const duration = ambientBuffer.duration;
  const overlap = 0.15;
  const now = ambientCtx.currentTime;

  const source = ambientCtx.createBufferSource();
  source.buffer = ambientBuffer;
  source.connect(ambientCtx.destination);
  source.start(now);

  ambientSource = source;

  if (nextTimer) clearTimeout(nextTimer);

  nextTimer = setTimeout(() => {
    startAmbient(mode);
  }, (duration - overlap) * 1000);
}

function stopAmbient() {
  try {
    ambientSource?.stop();
  } catch (e) {}

  if (nextTimer) {
    clearTimeout(nextTimer);
    nextTimer = null;
  }
}

// ======================
// 画像＆音管理
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png", "fire_round4.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png", "forest_round4.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png", "sea_round4.png"]
};

let currentVoiceAudio = null;
let currentVoiceEndedOnce = false;
let phaseEndTime = null;

const usedVoiceIndexes = {};
let isStarting = false;

// ======================
// 音声ユーティリティ
// ======================
function stopVoice() {
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch (e) {}
    currentVoiceAudio = null;
  }
  currentVoiceEndedOnce = false;
}

function playVoiceAudio(src, onEnded) {
  stopVoice();

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.playsInline = true;
  currentVoiceAudio = audio;
  currentVoiceEndedOnce = false;

  const safeOnEnded = () => {
    if (currentVoiceEndedOnce) return;
    currentVoiceEndedOnce = true;

    if (currentVoiceAudio === audio) {
      currentVoiceAudio = null;
    }

    if (typeof onEnded === "function") {
      onEnded();
    }
  };

  audio.onended = safeOnEnded;
  audio.onerror = safeOnEnded;

  audio.play().catch(safeOnEnded);
}

// ======================
// UI
// ======================
function setCharacterImage(mode, setInRound) {
  if (!bgImages[mode]) return;
  const idx = setInRound - 1;
  if (idx < 0 || idx >= bgImages[mode].length) return;
  elCharacter.src = bgImages[mode][idx];
}

// ======================
// タイマー
// ======================
const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;
const SETS_PER_ROUND = 4;

let currentMode = "";
let phase = "focus";
let totalSetIndex = 1;
let currentTime = FOCUS_SEC;
let intervalId = null;
let transitionLock = false;

const elTimer = document.getElementById("timer");
const elCharacter = document.getElementById("character");

function setTimerText(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  elTimer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTimerLoop(phaseMaxSec) {
  stopTimer();
  phaseEndTime = Date.now() + phaseMaxSec * 1000;

  intervalId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((phaseEndTime - Date.now()) / 1000));
    currentTime = remaining;
    setTimerText(currentTime);

    if (remaining <= 0) {
      stopTimer();
      handlePhaseEnd();
    }
  }, 250);
}

// ======================
// フェーズ制御
// ======================
async function goToPhase(nextPhase) {
  if (transitionLock) return;
  transitionLock = true;

  stopTimer();
  stopVoice();

  if (nextPhase === "focus") {
    phase = "focus";
    currentTime = FOCUS_SEC;
    setTimerText(currentTime);

    await startAmbient(currentMode);
    startTimerLoop(FOCUS_SEC);

    transitionLock = false;
  } else {
    phase = "break";
    currentTime = BREAK_SEC;
    setTimerText(currentTime);

    stopAmbient();
    startTimerLoop(BREAK_SEC);

    transitionLock = false;
  }
}

function handlePhaseEnd() {
  if (phase === "focus") {
    goToPhase("break");
  } else {
    totalSetIndex++;
    goToPhase("focus");
  }
}

// ======================
// スタート
// ======================
async function startStudy(mode) {
  if (isStarting) return;
  isStarting = true;

  currentMode = mode;
  totalSetIndex = 1;

  await goToPhase("focus");

  isStarting = false;
}

window.startStudy = startStudy;
