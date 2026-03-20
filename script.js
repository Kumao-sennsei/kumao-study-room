// ======================
// 画像＆音管理
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png", "fire_round4.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png", "forest_round4.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png", "sea_round4.png"]
};

let currentAudio = null;
let currentAudioMode = "";
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

function stopAmbient() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  currentAudioMode = "";
}

async function primeAmbient(mode) {
  if (!mode) return;

  try {
    if (!currentAudio || currentAudioMode !== mode) {
      currentAudio = new Audio(`${mode}.mp3`);
      currentAudioMode = mode;
      
      currentAudio.loop = true;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";
    }

    currentAudio.load();
  } catch (e) {
    console.error("環境音の準備失敗:", e);
  }
}

async function startAmbient(mode) {
  if (!mode) return;

  try {
    if (!currentAudio || currentAudioMode !== mode) {
      currentAudio = new Audio(`${mode}.mp3`);
      currentAudioMode = mode;
      
      currentAudio.loop = true;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";
    }

    currentAudio.volume = 0.5;
    await currentAudio.play();
  } catch (e) {
    console.error("環境音再生エラー:", e);
  }
}

function playVoiceAudio(src, onEnded) {
  stopVoice();

  try {
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

    audio.onerror = (e) => {
      console.error("ボイス再生エラー:", e, src);
      safeOnEnded();
    };

    audio.play().catch((e) => {
      console.error("ボイス再生失敗:", e, src);
      safeOnEnded();
    });
  } catch (e) {
    console.error("ボイス生成失敗:", e, src);
    if (typeof onEnded === "function") {
      onEnded();
    }
  }
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

// DOM
const elProductName = document.getElementById("productName");
const elSubTitle = document.getElementById("subTitle");
const elModeTitle = document.getElementById("modeTitle");
const elQuote = document.getElementById("quote");
const elRingWrap = document.getElementById("ringWrap");
const elLap = document.getElementById("lap");
const elBears = document.getElementById("bears");
const elBearSpans = Array.from(document.querySelectorAll(".bear"));
const elStartMenu = document.getElementById("startMenu");
const elCharacter = document.getElementById("character");
const elBrandBox = document.getElementById("brandBox");
const elRareBtn = document.getElementById("rareBtn");
const ringFg = document.querySelector(".ring-fg");

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

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

  await primeAmbient(mode);
  await goToPhase("focus");

  isStarting = false;
}

window.startStudy = startStudy;
