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
let phaseEndTime = null;

function stopAmbient(){
  if(currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;// ======================
// 追加：画像＆音管理
// ======================
const bgImages = {
  fire: ["fire_round1.png", "fire_round2.png", "fire_round3.png", "fire_round4.png"],
  forest: ["forest_round1.png", "forest_round2.png", "forest_round3.png", "forest_round4.png"],
  sea: ["sea_round1.png", "sea_round2.png", "sea_round3.png", "sea_round4.png"]
};

let currentAudio = null;
let currentAudioMode = "";
let phaseEndTime = null;

function stopAmbient(){
  if(currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  currentAudioMode = "";
}

function startAmbient(mode){
  stopAmbient();

  currentAudioMode = mode;
  currentAudio = new Audio(`${mode}.mp3`);
  currentAudio.loop = true;
  currentAudio.volume = 0.5;

  currentAudio.play().catch(()=>{});
}

function setCharacterImage(mode, setInRound){
  const arr = bgImages[mode];
  if(!arr) return;
  elCharacter.src = arr[setInRound - 1] || arr[0];
}

// ======================
// セリフ（変更禁止）
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
// TTS（そのまま使用）
// ======================
let currentVoice = null;

function stopVoice(){
  if(currentVoice){
    currentVoice.pause();
    currentVoice = null;
  }
}

async function speak(text){
  stopVoice();

  const res = await fetch("/api/tts", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  currentVoice = audio;

  return new Promise(resolve=>{
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  });
}

// ======================
// 設定
// ======================
const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

let phase = "focus";
let currentMode = "";
let intervalId = null;

// ======================
// DOM
// ======================
const elTimer = document.getElementById("timer");
const elQuote = document.getElementById("quote");
const elModeTitle = document.getElementById("modeTitle");
const elCharacter = document.getElementById("character");

// ======================
// Timer
// ======================
function startTimer(sec){
  clearInterval(intervalId);

  let end = Date.now() + sec*1000;

  intervalId = setInterval(()=>{
    let remain = Math.max(0, Math.ceil((end-Date.now())/1000));
    elTimer.textContent =
      `${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`;

    if(remain<=0){
      clearInterval(intervalId);
      nextPhase();
    }
  },300);
}

// ======================
// フェーズ制御
// ======================
async function startFocus(){
  phase = "focus";

  elModeTitle.textContent = "集中TIME";

  const text = pickRandom(SPRING_START_QUOTES);
  elQuote.textContent = text;

  await speak(text); // ★ここが最重要

  startAmbient(currentMode);
  startTimer(FOCUS_SEC);
}

async function startBreak(){
  phase = "break";

  elModeTitle.textContent = "休憩TIME";

  const text = pickRandom(SPRING_BREAK_QUOTES);
  elQuote.textContent = text;

  await speak(text); // ★ここが最重要

  stopAmbient();
  startTimer(BREAK_SEC);
}

function nextPhase(){
  if(phase === "focus"){
    startBreak();
  }else{
    startFocus();
  }
}

// ======================
// 入口
// ======================
async function startStudy(mode){
  currentMode = mode;
  stopAmbient();
  stopVoice();
  startFocus();
}

window.startStudy = startStudy;
  }
  currentAudioMode = "";
}

function startAmbient(mode){
  stopAmbient();

  currentAudioMode = mode;
  currentAudio = new Audio(`${mode}.mp3`);
  currentAudio.loop = true;
  currentAudio.volume = 0.5;

  currentAudio.play().catch(()=>{});
}

function setCharacterImage(mode, setInRound){
  const arr = bgImages[mode];
  if(!arr) return;
  elCharacter.src = arr[setInRound - 1] || arr[0];
}

// ======================
// セリフ（変更禁止）
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
// TTS（そのまま使用）
// ======================
let currentVoice = null;

function stopVoice(){
  if(currentVoice){
    currentVoice.pause();
    currentVoice = null;
  }
}

async function speak(text){
  stopVoice();

  const res = await fetch("/api/tts", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  currentVoice = audio;

  return new Promise(resolve=>{
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  });
}

// ======================
// 設定
// ======================
const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

let phase = "focus";
let currentMode = "";
let intervalId = null;

// ======================
// DOM
// ======================
const elTimer = document.getElementById("timer");
const elQuote = document.getElementById("quote");
const elModeTitle = document.getElementById("modeTitle");
const elCharacter = document.getElementById("character");

// ======================
// Timer
// ======================
function startTimer(sec){
  clearInterval(intervalId);

  let end = Date.now() + sec*1000;

  intervalId = setInterval(()=>{
    let remain = Math.max(0, Math.ceil((end-Date.now())/1000));
    elTimer.textContent =
      `${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`;

    if(remain<=0){
      clearInterval(intervalId);
      nextPhase();
    }
  },300);
}

// ======================
// フェーズ制御
// ======================
async function startFocus(){
  phase = "focus";

  elModeTitle.textContent = "集中TIME";

  const text = pickRandom(SPRING_START_QUOTES);
  elQuote.textContent = text;

  await speak(text); // ★ここが最重要

  startAmbient(currentMode);
  startTimer(FOCUS_SEC);
}

async function startBreak(){
  phase = "break";

  elModeTitle.textContent = "休憩TIME";

  const text = pickRandom(SPRING_BREAK_QUOTES);
  elQuote.textContent = text;

  await speak(text); // ★ここが最重要

  stopAmbient();
  startTimer(BREAK_SEC);
}

function nextPhase(){
  if(phase === "focus"){
    startBreak();
  }else{
    startFocus();
  }
}

// ======================
// 入口
// ======================
async function startStudy(mode){
  currentMode = mode;
  stopAmbient();
  stopVoice();
  await startFocus();
}

window.startStudy = startStudy;
