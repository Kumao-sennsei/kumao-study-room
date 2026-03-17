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
let phaseEndTime = null;

// ======================
// AudioContext（TTS安定化用）
// ======================
let audioCtx = null;
let currentVoiceSource = null;
let voiceRequestToken = 0;

async function unlockAudioSystem() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state !== "running") {
    await audioCtx.resume();
  }
}

function stopVoice() {
  voiceRequestToken++;
  if (currentVoiceSource) {
    try {
      currentVoiceSource.stop(0);
    } catch (e) {}
    try {
      currentVoiceSource.disconnect();
    } catch (e) {}
    currentVoiceSource = null;
  }
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

async function startAmbient(mode) {
  if (!mode) return;
  if (currentAudioMode === mode && currentAudio) return;

  stopAmbient();

  currentAudioMode = mode;
  currentAudio = new Audio(`${mode}.mp3`);
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.currentTime = 0;
  currentAudio.playsInline = true;

  try {
    await currentAudio.play();
  } catch (e) {
    console.error("環境音再生エラー:", e);
  }
}

function setCharacterImage(mode, setInRound) {
  if (!bgImages[mode]) return;
  const idx = setInRound - 1;
  if (idx < 0 || idx >= bgImages[mode].length) return;
  elCharacter.src = bgImages[mode][idx];
}

// ======================
// セリフ設定
// ======================
const SPRING_START_QUOTES = [
  "立て。春は始まりだ。お前もまだ始まったばかりだろ？",
  "桜は散ってもな、お前はまだ咲ける。次の25分、いけるだろ？",
  "風向きが変わる。今のお前ならいける。始めるぞ。",
  "甘える時間は終わりだ。だがな、お前はもう走れる状態だ。行くぞ。",
  "桜が舞ってるな。だが、お前は散る側じゃねぇ。今日も咲きにいけ。"
];

const SPRING_BREAK_QUOTES = [
  "桜の花だって25分じゃ咲かねえ。お前、ちゃんと頑張ってる。とりあえず5分休憩しな。",
  "春の風、落ち着かねぇか？ 周りが速く見えてもな、お前はちゃんと頑張ってる。5分だけ、呼吸整えろ。",
  "新学期でバタついてるか？ それでも座った。ちゃんと頑張ってる。5分後にまた続きやろうぜ。",
  "桜は一気に咲かねえ。お前も今、ちゃんと頑張ってる最中だ。5分ゆっくりしな。命令だ。",
  "今日ちょっと重かったな。それでもやった。そこが頑張りだ。とりあえず5分、肩の力抜け。"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======================
// ElevenLabs TTS 再生
// ======================
async function speakWithDonKumao(text, onEnded) {
  const myToken = ++voiceRequestToken;

  try {
    await unlockAudioSystem();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error("TTS API failed");

    const arrayBuffer = await res.arrayBuffer();
    if (myToken !== voiceRequestToken) {
      if (onEnded) onEnded();
      return;
    }

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    currentVoiceSource = source;

    source.onended = () => {
      if (currentVoiceSource === source) currentVoiceSource = null;
      if (onEnded) onEnded();
    };

    source.start(0);
  } catch (err) {
    console.error("TTS再生エラー:", err);
    if (onEnded) onEnded(); // エラー時もタイマーが止まらないよう実行
  }
}

// ======================
// 設定・状態管理
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

// DOM取得
const elProductName = document.getElementById("productName");
const elSubTitle = document.getElementById("subTitle");
const elModeTitle = document.getElementById("modeTitle");
const elQuote = document.getElementById("quote");
const elRingWrap = document.getElementById("ringWrap");
const elTimer = document.getElementById("timer");
const elLap = document.getElementById("lap");
const elBears = document.getElementById("bears");
const elBearSpans = Array.from(document.querySelectorAll(".bear"));
const elStartMenu = document.getElementById("startMenu");
const elCharacter = document.getElementById("character");
const elBrandBox = document.getElementById("brandBox");
const ringFg = document.querySelector(".ring-fg");

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

// ======================
// UI & タイマー更新
// ======================
function setTimerText(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  elTimer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getRound() { return Math.floor((totalSetIndex - 1) / SETS_PER_ROUND) + 1; }
function getSetInRound() { return ((totalSetIndex - 1) % SETS_PER_ROUND) + 1; }

function updateBears() {
  const setInRound = getSetInRound();
  elBearSpans.forEach((sp, idx) => {
    idx < setInRound ? sp.classList.add("on") : sp.classList.remove("on");
  });
}

function updateRing(sec, maxSec) {
  ringFg.style.strokeDasharray = `${CIRC}`;
  const ratio = Math.max(0, Math.min(1, 1 - sec / maxSec));
  ringFg.style.strokeDashoffset = CIRC * (1 - ratio);
}

function stopTimer() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

function startTimerLoop(phaseMaxSec) {
  stopTimer();
  phaseEndTime = Date.now() + phaseMaxSec * 1000;
  intervalId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((phaseEndTime - Date.now()) / 1000));
    currentTime = remaining;
    setTimerText(currentTime);
    updateRing(currentTime, phaseMaxSec);
    if (remaining <= 0) {
      stopTimer();
      handlePhaseEnd();
    }
  }, 250);
}

// ======================
// UI切り替え
// ======================
function showHomeUI() {
  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach(el => el.classList.remove("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach(el => el.classList.add("hidden"));
  elCharacter.style.opacity = "1";
  phase = "focus";
  currentTime = FOCUS_SEC;
  stopVoice();
  stopAmbient();
  stopTimer();
  updateRing(currentTime, FOCUS_SEC);
  setTimerText(currentTime);
}

function prepareFocusUI() {
  phase = "focus";
  currentTime = FOCUS_SEC;
  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach(el => el.classList.add("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach(el => el.classList.remove("hidden"));
  elModeTitle.textContent = "集中TIME";
  setCharacterImage(currentMode, getRound());
  elLap.textContent = `${getRound()}周目`;
  updateBears();
  setTimerText(currentTime);
  updateRing(currentTime, FOCUS_SEC);
}

function prepareBreakUI() {
  phase = "break";
  currentTime = BREAK_SEC;
  elModeTitle.textContent = "休憩TIME";
  elQuote.textContent = "";
  const breakImages = ["break1.png", "break2.png", "break3.png", "break4.png"];
  elCharacter.src = breakImages[getSetInRound() - 1] || "break1.png";
  updateBears();
  setTimerText(currentTime);
  updateRing(currentTime, BREAK_SEC);
}

// ======================
// フェーズ遷移ロジック（ここがメインの修正箇所）
// ======================
async function goToPhase(nextPhase) {
  if (transitionLock) return;
  transitionLock = true;

  // 1. 全て停止
  stopTimer();
  stopVoice();
  stopAmbient();

  if (nextPhase === "focus") {
    prepareFocusUI();
    const text = pickRandom(SPRING_START_QUOTES);
    elQuote.textContent = text;

    // 2. 音声再生。終わってからタイマーと環境音を開始。
    speakWithDonKumao(text, async () => {
      if (phase !== "focus") { transitionLock = false; return; }
      
      await startAmbient(currentMode); // 環境音開始
      startTimerLoop(FOCUS_SEC);      // タイマー開始
      transitionLock = false;
    });

  } else {
    prepareBreakUI();
    const text = pickRandom(SPRING_BREAK_QUOTES);
    elQuote.textContent = text;

    // 2. 音声再生。終わってから休憩タイマーを開始。
    speakWithDonKumao(text, () => {
      if (phase !== "break") { transitionLock = false; return; }
      
      startTimerLoop(BREAK_SEC);      // タイマー開始
      transitionLock = false;
    });
  }
}

function handlePhaseEnd() {
  if (transitionLock) return;
  if (phase === "focus") {
    goToPhase("break");
  } else {
    totalSetIndex++;
    goToPhase("focus");
  }
}

function startStudy(mode) {
  currentMode = mode;
  totalSetIndex = 1;
  transitionLock = false;
  unlockAudioSystem().then(() => goToPhase("focus"));
}

// 初期化
showHomeUI();
window.startStudy = startStudy;
