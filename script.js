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
const elBgVideo = document.getElementById("bgVideo");
const elCharacter = document.getElementById("character");
const elSensei = document.getElementById("sensei");
const elBrandBox = document.getElementById("brandBox");

// SVG ring
const ringFg = document.querySelector(".ring-fg");
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

// ======================
// 追加：画像＆音（動画を使わない）
// ======================
const BG_IMAGES = {
  fire: ["fire1.png", "fire2.png", "fire3.png", "fire4.png"],
  forest: ["forest1.png", "forest2.png", "forest3.png", "forest4.png"],
  sea: ["sea1.png", "sea2.png", "sea3.png", "sea4.png"]
};

let currentAudio = null;
let currentAudioMode = "";

function stopVideo(){
  try{
    elBgVideo.style.opacity = "0";
    elBgVideo.pause();
    elBgVideo.removeAttribute("src");
    elBgVideo.load();
  }catch(e){}
}

function startAmbient(mode){
  if(currentAudioMode === mode && currentAudio) return;

  if(currentAudio){
    try{ currentAudio.pause(); }catch(e){}
    currentAudio = null;
  }

  currentAudioMode = mode;

  currentAudio = new Audio(mode + ".mp3");
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.play().catch(()=>{});
}

function setCharacterImage(mode, setInRound){
  if(!BG_IMAGES[mode]) return;
  const idx = setInRound - 1;
  if(idx < 0) return;
  if(idx >= BG_IMAGES[mode].length) return;

  elCharacter.src = BG_IMAGES[mode][idx];
}

function applyFocusMedia(mode, setInRound){
  stopVideo();

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";

  if(elSensei) elSensei.style.opacity = "0";

  setCharacterImage(mode, setInRound);
  startAmbient(mode);
}

function applyBreakMedia(){
  stopVideo();

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";

  if(elSensei) elSensei.style.opacity = "0";
}

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
// 開始：ドンくまお写真（動画は隠す）
// 集中：動画表示 + 右下に先生 / ドンくまおは消す / クレジット消す
// 休憩：カフェ動画 + ドンくまお写真（先生消す）
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

  // 右：開始は写真のみ
  elBgVideo.style.opacity = "0";
  elBgVideo.pause();
  elBgVideo.removeAttribute("src");
  elBgVideo.load();

  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";

  elSensei.style.opacity = "0"; // 先生は常に開始では消す

  // 初期化
  isBreak = false;
  currentTime = FOCUS_SEC;
  setTimerText(currentTime);

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

  // 右：集中は動画＋先生
  elBgVideo.style.opacity = "1";

  elCharacter.style.display = "none"; // ドンくまおは集中だけ消す
  elSensei.style.opacity = "1";       // 先生は集中だけ出す
}

function showBreakUI(){
  // 左：休憩も集中レイアウトのまま
  elModeTitle.textContent = "休憩TIME";
  elQuote.textContent = "";

  // 右：休憩はカフェ動画＋ドンくまお、先生は消す
  elBgVideo.style.opacity = "1";

  elSensei.style.opacity = "0";
  elCharacter.style.display = "block";
  elCharacter.style.opacity = "1";
}

// ======================
// 動画切替（黒画面対策込み）
// ======================
function setVideoSrcSafe(src){
  if(!elBgVideo) return;
  if(!src) return;

  // いったん完全リセット
  try{
    elBgVideo.pause();
    elBgVideo.removeAttribute("src");
    elBgVideo.load();
  }catch(e){}

  // 少し待ってから差し替え（これで黒になりにくい）
  setTimeout(() => {
    elBgVideo.src = src;
    elBgVideo.loop = true;
    elBgVideo.muted = false;  // ボタン押下後なら基本OK
    elBgVideo.volume = 1.0;

    elBgVideo.load();

    elBgVideo.play().then(()=>{
      elBgVideo.style.opacity = "1";
    }).catch(()=>{
      // 自動再生がブロックされた場合：映像は出ることが多いが、環境依存
      elBgVideo.style.opacity = "1";
    });
  }, 80);
}

function setModeVideo(mode){
  let src = "";
  if(mode === "fire")   src = "fire.mp4";
  if(mode === "forest") src = "forest.mp4";
  if(mode === "sea")    src = "sea.mp4";
  setVideoSrcSafe(src);
}

function setBreakCafeVideo(){
  setVideoSrcSafe("cafe.mp4");
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
  applyFocusMedia(currentMode, setInRound);

  elQuote.textContent = KUMAO_QUOTES[setInRound] || "";
  speak(KUMAO_QUOTES[setInRound] || "");

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
  applyBreakMedia();

  speak("よくやった。一度整えろ。");

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

// ======================
// ドンくまお音声
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
