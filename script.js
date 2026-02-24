// ======================
// 追加：画像＆音管理
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png", "fire_round4.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png", "forest_round4.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png", "sea_round4.png"]
};

let currentAudio = null;
let currentAudioMode = "";

function stopAmbient(){
  if(currentAudio){
    try{
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }catch(e){}
    currentAudio = null;
  }
  currentAudioMode = "";
}

function startAmbient(mode){
  if(!mode) return;
  if(currentAudioMode === mode && currentAudio) return;

  stopAmbient();

  currentAudioMode = mode;
  currentAudio = new Audio(`${mode}.mp3`); // ← ルート直下
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.play().catch(()=>{});
}

function setCharacterImage(mode, setInRound){
  if(!bgImages[mode]) return;

  const idx = setInRound - 1;
  if(idx < 0) return;
  if(idx >= bgImages[mode].length) return;

  // ★ imagesフォルダは存在しないので付けない
  elCharacter.src = bgImages[mode][idx];
}

function speakThenAmbient(_text, mode){
  const setInRound = getSetInRound();

  const audio = new Audio(`quote${setInRound}.mp3`); // ← ルート直下
  audio.volume = 1;

  audio.onended = () => startAmbient(mode);

  audio.play().catch(() => {
    startAmbient(mode);
  });
}

function playBreakVoice() {
  const audio = new Audio("break_normal.mp3"); // ← ルート直下
  audio.volume = 0.9;
  audio.play().catch(()=>{});
}

// ======================
// 設定
// ======================
const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

const SETS_PER_ROUND = 4;

let currentMode = "";
let isBreak = false;

let totalSetIndex = 1;
let currentTime = FOCUS_SEC;
let intervalId = null;

// ======================
// DOM
// ======================
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

// SVG ring
const ringFg = document.querySelector(".ring-fg");
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

// ======================
// 名言
// ======================
const KUMAO_QUOTES = {
  1: "静かに積め。焦るな。\n積み上げた者だけが強くなる。",
  2: "思考を深めよ。\n答えは外ではなく、内にある。",
  3: "昨日の自分を超えろ。\n勝つべき相手は自分だ。",
  4: "最終セット。\nここを越えれば、景色が変わる。"
};

// ======================
// Utils
// ======================
function setTimerText(sec){
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  elTimer.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function getRound(){
  return Math.floor((totalSetIndex - 1) / SETS_PER_ROUND) + 1;
}

function getSetInRound(){
  return ((totalSetIndex - 1) % SETS_PER_ROUND) + 1;
}

function updateBears(){
  const setInRound = getSetInRound();
  elBearSpans.forEach((sp, idx) => {
    if (idx < setInRound) sp.classList.add("on");
    else sp.classList.remove("on");
  });
}

function updateLap(){
  elLap.textContent = `${getRound()}周目`;
}

function updateRing(sec, maxSec){
  ringFg.style.strokeDasharray = `${CIRC}`;
  const elapsed = maxSec - sec;
  const ratio = Math.max(0, Math.min(1, elapsed / maxSec));
  const offset = CIRC * (1 - ratio);
  ringFg.style.strokeDashoffset = `${offset}`;
}

// ======================
// UI制御
// ======================
function showHomeUI(){
  elProductName.classList.remove("hidden");
  elSubTitle.classList.remove("hidden");
  elStartMenu.classList.remove("hidden");
  elBrandBox.classList.remove("hidden");

  elModeTitle.classList.add("hidden");
  elQuote.classList.add("hidden");
  elRingWrap.classList.add("hidden");
  elLap.classList.add("hidden");
  elBears.classList.add("hidden");

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";

  isBreak = false;
  currentTime = FOCUS_SEC;
  setTimerText(currentTime);

  stopAmbient();
  stopTimer();
  updateRing(currentTime, FOCUS_SEC);
}

function showFocusUI(){
  elProductName.classList.add("hidden");
  elSubTitle.classList.add("hidden");
  elStartMenu.classList.add("hidden");
  elBrandBox.classList.add("hidden");

  elModeTitle.classList.remove("hidden");
  elQuote.classList.remove("hidden");
  elRingWrap.classList.remove("hidden");
  elLap.classList.remove("hidden");
  elBears.classList.remove("hidden");

  elModeTitle.textContent = "集中TIME";

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";
}

function showBreakUI(){
  elModeTitle.textContent = "休憩TIME";
  elQuote.textContent = "";

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";
}

// ======================
// タイマー制御
// ======================
function stopTimer(){
  if(intervalId){
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTimerLoop(phaseMaxSec){
  stopTimer();

  intervalId = setInterval(() => {
    currentTime--;

    if(currentTime < 0){
      if(!isBreak){
        startBreakPhase();
      }else{
        totalSetIndex++;
        startFocusPhase();
      }
      return;
    }

    setTimerText(currentTime);
    updateRing(currentTime, phaseMaxSec);
  }, 1000);
}

// ======================
// フェーズ
// ======================
function startFocusPhase(){
  isBreak = false;
  currentTime = FOCUS_SEC;

  showFocusUI();

  const setInRound = getSetInRound();

  // 画像切り替え
  setCharacterImage(currentMode, setInRound);

  // 名言表示
  elQuote.textContent = KUMAO_QUOTES[setInRound] || "";

  // 🔥 重要：環境音を止めてから名言再生
  stopAmbient();
  speakThenAmbient(KUMAO_QUOTES[setInRound] || "", currentMode);

  updateLap();
  updateBears();

  setTimerText(currentTime);
  updateRing(currentTime, FOCUS_SEC);

  startTimerLoop(FOCUS_SEC);
}

function startBreakPhase(){
  isBreak = true;
  currentTime = BREAK_SEC;

  showBreakUI();

  // 🔥 休憩用画像切り替え
  const setInRound = getSetInRound();
  const breakImages = [
    "break1.png",
    "break2.png",
    "break3.png",
    "break4.png"
  ];
  elCharacter.src = breakImages[setInRound - 1] || "break1.png";

  stopAmbient();
  playBreakVoice();

  updateLap();
  updateBears();

  setTimerText(currentTime);
  updateRing(currentTime, BREAK_SEC);

  startTimerLoop(BREAK_SEC);
}


// ======================
// 入口
// ======================
function startStudy(mode){
  currentMode = mode;
  totalSetIndex = 1;
  startFocusPhase();
}

// ======================
// 初期化
// ======================
showHomeUI();
window.startStudy = startStudy;


