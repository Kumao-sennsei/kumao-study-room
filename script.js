// ======================
// グローバル状態管理
// ======================
let currentMode = null;
let totalSetIndex = 1;

let currentAudio = null;
let currentAudioMode = "";

// DOM取得
const rareBtn = document.getElementById("rareBtn");
// ======================
// 追加：画像＆音管理
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png"]
};
const breakImages = ["break1.png", "break2.png", "break3.png", "break4.png"];


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
  currentAudio = new Audio(mode + ".mp3");
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.play().catch(()=>{});
}

function setCharacterImage(mode){
  if(!bgImages[mode]) return;

  const roundIndex = getRound() - 1;  // 0始まり

  const images = bgImages[mode];
  const safeIndex = Math.min(roundIndex, images.length - 1);

  elCharacter.src = images[safeIndex];
}
function speakThenAmbient(_text, mode){
  // quote1.mp3〜quote4.mp3 を再生 → 終わったら環境音
  const setInRound = getSetInRound();

  const audio = new Audio(`quote${setInRound}.mp3`);
  audio.volume = 1;

  audio.onended = () => startAmbient(mode);

  audio.play().catch(() => {
    // 自動再生ブロック/ファイル不在などでも環境音へ
    startAmbient(mode);
  });
}

function playBreakVoice() {
  const audio = new Audio("break_normal.mp3");
  audio.volume = 0.9;
  audio.play().catch(()=>{});
}
function playRareVoice() {
  const audioEn = new Audio("rare_praise_01_en.mp3");
  const audioJp = new Audio("rare_praise_01_jp.mp3");

  audioEn.volume = 1;
  audioJp.volume = 1;

  audioEn.onended = () => audioJp.play();
  audioEn.play().catch(()=>{});
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
const elCharacter = document.getElementById("character"); // ★統一
const elBrandBox = document.getElementById("brandBox");


// SVG ring
const ringFg = document.querySelector(".ring-fg");
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

// ======================
// 名言（セット固定）
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

// ring更新：時計回り（経過時間ベース）
function updateRing(sec, maxSec){
  ringFg.style.strokeDasharray = `${CIRC}`;

  const elapsed = maxSec - sec;
  const ratio = Math.max(0, Math.min(1, elapsed / maxSec));

  const offset = CIRC * (1 - ratio);
  ringFg.style.strokeDashoffset = `${offset}`;
}

// ======================
// UI制御（表示のルール）
// ======================
function showHomeUI(){
  // 左：開始画面
  elProductName.classList.remove("hidden");
  elSubTitle.classList.remove("hidden");
  elStartMenu.classList.remove("hidden");
  elBrandBox.classList.remove("hidden");

  // 左：集中UIを隠す
  elModeTitle.classList.add("hidden");
  elQuote.classList.add("hidden");
  elRingWrap.classList.add("hidden");
  elLap.classList.add("hidden");
  elBears.classList.add("hidden");

  // 右：画像は出す（ホーム絵があるならそのまま）
  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";

  // 初期化
  isBreak = false;
  currentTime = FOCUS_SEC;
  setTimerText(currentTime);

  stopAmbient();     // ★開始では環境音止める
  stopTimer();
  updateRing(currentTime, FOCUS_SEC);
}

function showFocusUI(){
  // 左：集中画面
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

  // 右：集中は画像
  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";
}

function showBreakUI(){
  // 左：休憩も集中レイアウトのまま
  elModeTitle.textContent = "休憩TIME";
  elQuote.textContent = "";

  // 右：休憩も画像は出す（ドン画像にしたいならここで差し替え）
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
        startBreakPhase(); // 集中 -> 休憩
      }else{
        totalSetIndex++;
        startFocusPhase(); // 休憩 -> 次セット集中
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

  // 画像：set番号で差し込み
  setCharacterImage(currentMode);

  // 名言：表示は維持
  elQuote.textContent = KUMAO_QUOTES[setInRound] || "";

  // 名言音声→環境音
  speakThenAmbient(KUMAO_QUOTES[setInRound] || "", currentMode);

  updateLap();
  updateBears();

  setTimerText(currentTime);
  updateRing(currentTime, FOCUS_SEC);

  // タイマー開始
  startTimerLoop(FOCUS_SEC);
}

function startBreakPhase(){
  isBreak = true;
  currentTime = BREAK_SEC;

  showBreakUI();
  const setInRound = getSetInRound(); // 1〜4
  elCharacter.src = breakImages[setInRound - 1];
  // 休憩では環境音いったん止める
  stopAmbient();

  // 休憩開始ボイス（ドンくまお）
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

  // 🔥 テスト用：開始時にレア表示
  rareBtn.style.display = "block";
  playRareVoice();

  startFocusPhase();
}

// ======================
// 初期化
// ======================
showHomeUI();
window.startStudy = startStudy;

// ======================
// （残してOK）WebSpeech用：ドンくまお読み上げ
// ※今は使ってなくても害なし
// ======================
function speak(text){
  if(!("speechSynthesis" in window)) return;
  if(!text) return;

  const uttr = new SpeechSynthesisUtterance(text);
  uttr.lang = "ja-JP";
  uttr.rate = 0.9;
  uttr.pitch = 0.8;
  uttr.volume = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(uttr);
}
function playRareTest() {
  const audioEn = new Audio("rare_praise_01_en.mp3");
  const audioJp = new Audio("rare_praise_01_jp.mp3");

  audioEn.onended = () => {
    audioJp.play();
  };

  audioEn.play();
}








