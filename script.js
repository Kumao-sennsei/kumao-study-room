// ======================
// グローバル状態管理
// ======================
let currentMode = null;
let totalSetIndex = 1;

let currentAudio = null;
let currentAudioMode = "";

// ======================
// DOM
// ======================
const rareBtn = document.getElementById("rareBtn");
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

// ======================
// 画像
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png"]
};

const breakImages = ["break1.png", "break2.png", "break3.png", "break4.png"];

// ======================
// レア関連
// ======================
function playRareVoice() {
  const audioEn = new Audio("rare_praise_01_en.mp3");
  const audioJp = new Audio("rare_praise_01_jp.mp3");

  audioEn.onended = () => audioJp.play();
  audioEn.play().catch(()=>{});
}

function checkRare(){
  rareBtn.style.display = "none";
}

rareBtn.addEventListener("click", playRareVoice);

// ======================
// 設定
// ======================
const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;
const SETS_PER_ROUND = 4;

let isBreak = false;
let currentTime = FOCUS_SEC;
let intervalId = null;

// ======================
// 音管理
// ======================
function stopAmbient(){
  if(currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  currentAudioMode = "";
}

function startAmbient(mode){
  if(!mode) return;
  if(currentAudioMode === mode && currentAudio) return;

  stopAmbient();

  currentAudioMode = mode;
  currentAudio = new Audio(mode + ".mp3");
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.play().catch(()=>{});
}

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

  rareBtn.style.display = "none"; // 初期非表示
  checkRare(); // 🔥 ここで抽選

  stopAmbient();
  stopTimer();
}

// ======================
// タイマー
// ======================
function stopTimer(){
  if(intervalId){
    clearInterval(intervalId);
    intervalId = null;
  }
}

// ======================
// フェーズ
// ======================
function startFocusPhase(){
  isBreak = false;
  currentTime = FOCUS_SEC;

  // 🔥 ここ追加
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

  rareBtn.style.display = "none";

  const setInRound = getSetInRound();
  elQuote.textContent = KUMAO_QUOTES[setInRound] || "";

  setTimerText(currentTime);
  updateLap();
  updateBears();

  startTimerLoop(FOCUS_SEC);
}

function startBreakPhase(){
  isBreak = true;
  currentTime = BREAK_SEC;

  const setInRound = getSetInRound();
  elCharacter.src = breakImages[setInRound - 1];

  startTimerLoop(BREAK_SEC);
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
  }, 1000);
}

// ======================
// 入口
// ======================
console.log("startFocusPhase入った");
function startStudy(mode){
  currentMode = mode;
  totalSetIndex = 1;
  startFocusPhase();
}

// ======================
// 初期化
// ======================
window.onload = function(){
  showHomeUI();
};

window.startStudy = startStudy;




