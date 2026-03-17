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
let phaseEndTime = null;   // ★ 実時間管理用

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
  currentAudio = new Audio(`${mode}.mp3`);
  currentAudio.loop = true;
  currentAudio.volume = 0.5;
  currentAudio.currentTime = 0;

  currentAudio.play().then(()=>{}).catch(()=>{});
}

function setCharacterImage(mode, setInRound){
  if(!bgImages[mode]) return;

  const idx = setInRound - 1;
  if(idx < 0 || idx >= bgImages[mode].length) return;

  elCharacter.src = bgImages[mode][idx];
}

// ======================
// 春ボイス（開始時 / 休憩開始時）
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

function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======================
// ElevenLabs TTS 再生
// /api/tts に { text } をPOSTして音声を返す想定
// ======================
async function speakWithDonKumao(text, onEnded){
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("TTS API failed:", errText);
      throw new Error("TTS API failed");
    }

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.volume = 1;
    audio.currentTime = 0;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (onEnded) onEnded();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      if (onEnded) onEnded();
    };

    await audio.play();
  } catch (err) {
    console.error("TTS再生エラー:", err);
    if (onEnded) onEnded();
  }
}

// ======================
// 開始時ボイス（タイマーと同時）
// ======================
function playSpringStartVoice(mode){
  const text = pickRandom(SPRING_START_QUOTES);
  elQuote.textContent = text;

  // 環境音を開始
  startAmbient(mode);

  // ドンくまお音声を同時再生
  speakWithDonKumao(text);
}

// ======================
// 休憩開始時ボイス（休憩タイマーと同時）
// ======================
function playSpringBreakVoice(){
  const text = pickRandom(SPRING_BREAK_QUOTES);
  elQuote.textContent = text;

  // ドンくまお音声を同時再生
  speakWithDonKumao(text);
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

const ringFg = document.querySelector(".ring-fg");
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

// ======================
// 名言（未使用でも残してOK）
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
  const ratio = Math.max(0, Math.min(1, 1 - sec / maxSec));
  const offset = CIRC * (1 - ratio);
  ringFg.style.strokeDashoffset = `${offset}`;
}

// ======================
// タイマー制御（実時間ベース）
// ======================
function stopTimer(){
  if(intervalId){
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTimerLoop(phaseMaxSec){
  stopTimer();

  phaseEndTime = Date.now() + phaseMaxSec * 1000;

  intervalId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((phaseEndTime - Date.now()) / 1000));
    currentTime = remaining;

    setTimerText(currentTime);
    updateRing(currentTime, phaseMaxSec);

    if(remaining <= 0){
      if(!isBreak){
        startBreakPhase();
      }else{
        totalSetIndex++;
        startFocusPhase();
      }
    }
  }, 500);
}

// ======================
// フェーズ
// ======================
function startFocusPhase(){
  isBreak = false;
  currentTime = FOCUS_SEC;

  showFocusUI();

  const round = getRound();

  // 画像は「周」で決める
  setCharacterImage(currentMode, round);

  updateLap();
  updateBears();

  setTimerText(currentTime);
  updateRing(currentTime, FOCUS_SEC);

  // タイマー即スタート
  startTimerLoop(FOCUS_SEC);

  // 開始時ボイスも同時に流す
  playSpringStartVoice(currentMode);
}

function startBreakPhase(){
  isBreak = true;
  currentTime = BREAK_SEC;

  showBreakUI();

  const setInRound = getSetInRound();
  const breakImages = ["break1.png","break2.png","break3.png","break4.png"];
  elCharacter.src = breakImages[setInRound - 1] || "break1.png";

  updateLap();
  updateBears();

  setTimerText(currentTime);
  updateRing(currentTime, BREAK_SEC);

  // 休憩タイマー即スタート
  startTimerLoop(BREAK_SEC);

  // 休憩開始時ボイスも同時に流す
  playSpringBreakVoice();
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
