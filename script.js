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
  {
    display: "立て。春は始まりだ。\nお前もまだ始まったばかりだろ？",
    speech: "たて…。春は、はじまりだ。\nお前もまだ、はじまったばかりだろ？"
  },
  {
    display: "桜は散ってもな、お前はまだ咲ける。\n25分、いけるだろ？",
    speech: "さくらは散ってもな…\nお前はまだ、咲ける。\n25分、いけるだろ？"
  },
  {
    display: "風向きが変わる。今のお前ならいける。\n始めるぞ。",
    speech: "かざむきが、かわる。\n今のお前なら、いける。\nはじめるぞ。"
  },
  {
    display: "甘える時間は終わりだ。\nだがな、お前はもう走れる状態だ。行くぞ。",
    speech: "あまえる時間は、おわりだ…\nだがな…\nお前はもう、走れる状態だ。\nいくぞ。"
  },
  {
    display: "桜が舞ってるな。だが、お前は散る側じゃねぇ。\n今日も咲きにいけ。",
    speech: "さくらが、舞ってるな…\nだが、お前は、ちるがわじゃねぇ。\n今日も、咲きにいけ。"
  }
];

const SPRING_BREAK_QUOTES = [
  {
    display: "桜の花だって25分じゃ咲かねえ。\nお前、ちゃんと頑張ってる。とりあえず5分休憩しな。",
    speech: "さくらの花だって、25分じゃ咲かねえ。\nお前、ちゃんと頑張ってる。\nとりあえず5分、休憩しな。"
  },
  {
    display: "春の風、落ち着かねぇか？ 周りが速く見えてもな、お前はちゃんと頑張ってる。\n5分だけ、呼吸整えろ。",
    speech: "春の風、落ち着かねぇか？\n周りが速く見えてもな…\nお前はちゃんと、頑張ってる。\n5分だけ、呼吸整えろ。"
  },
  {
    display: "新学期でバタついてるか？ それでも座った。\nちゃんと頑張ってる。5分後にまた続きやろうぜ。",
    speech: "新学期で、バタついてるか？\nそれでも座った。\nちゃんと、頑張ってる。\n5分後に、また続きやろうぜ。"
  },
  {
    display: "桜は一気に咲かねえ。お前も今、ちゃんと頑張ってる最中だ。\n5分ゆっくりしな。命令だ。",
    speech: "さくらは、一気に咲かねえ。\nお前も今、ちゃんと頑張ってる最中だ。\n5分、ゆっくりしな。\n命令だ。"
  },
  {
    display: "今日ちょっと重かったな。それでもやった。そこが頑張りだ。\nとりあえず5分、かたの力を抜け。",
    speech: "今日ちょっと、重かったな…\nそれでもやった。\nそこが、頑張りだ。\nとりあえず5分、かたの力を抜け。"
  }
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
    const quote = pickRandom(SPRING_START_QUOTES);
    elQuote.textContent = quote.display;

    // 2. 音声再生。終わってからタイマーと環境音を開始。
    speakWithDonKumao(quote.speech, async () => {
      if (phase !== "focus") {
        transitionLock = false;
        return;
      }

      await startAmbient(currentMode);
      startTimerLoop(FOCUS_SEC);
      transitionLock = false;
    });

  } else {
    prepareBreakUI();
    const quote = pickRandom(SPRING_BREAK_QUOTES);
    elQuote.textContent = quote.display;

    // 2. 音声再生。終わってから休憩タイマーを開始。
    speakWithDonKumao(quote.speech, () => {
      if (phase !== "break") {
        transitionLock = false;
        return;
      }

      startTimerLoop(BREAK_SEC);
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
