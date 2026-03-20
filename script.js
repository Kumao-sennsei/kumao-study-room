// ======================
// 環境音（完全シームレス版）
// ======================
let ambientCtx = null;
let ambientBuffer = null;
let ambientSource1 = null;
let ambientSource2 = null;
let ambientLoopTimer = null;
let loadedMode = null;

async function startAmbient(mode) {
  if (!mode) return;

  if (!ambientCtx) {
    ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // 初回 or モード変更時のみロード
  if (!ambientBuffer || loadedMode !== mode) {
    const res = await fetch(`${mode}.wav`);
    const arrayBuffer = await res.arrayBuffer();
    ambientBuffer = await ambientCtx.decodeAudioData(arrayBuffer);
    loadedMode = mode;
  }

  const now = ambientCtx.currentTime;
  const duration = ambientBuffer.duration;
  const overlap = 0.3;

  ambientSource1 = ambientCtx.createBufferSource();
  ambientSource2 = ambientCtx.createBufferSource();

  ambientSource1.buffer = ambientBuffer;
  ambientSource2.buffer = ambientBuffer;

  ambientSource1.connect(ambientCtx.destination);
  ambientSource2.connect(ambientCtx.destination);

  ambientSource1.start(now);
  ambientSource2.start(now + duration - overlap);

  // 既存ループ防止
  if (ambientLoopTimer) clearTimeout(ambientLoopTimer);

  ambientLoopTimer = setTimeout(() => {
    startAmbient(mode);
  }, (duration - overlap) * 1000);
}

function stopAmbient() {
  try {
    ambientSource1?.stop();
    ambientSource2?.stop();
  } catch (e) {}

  if (ambientLoopTimer) {
    clearTimeout(ambientLoopTimer);
    ambientLoopTimer = null;
  }
}

// ======================
// 画像管理
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
// ボイス
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

  const safeEnd = () => {
    if (currentVoiceEndedOnce) return;
    currentVoiceEndedOnce = true;

    if (currentVoiceAudio === audio) {
      currentVoiceAudio = null;
    }

    if (onEnded) onEnded();
  };

  audio.onended = safeEnd;
  audio.onerror = safeEnd;

  audio.play().catch(safeEnd);
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

function startTimerLoop(maxSec) {
  stopTimer();
  phaseEndTime = Date.now() + maxSec * 1000;

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
