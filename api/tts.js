// ======================
// 音声アンロック（最重要）
// ======================
let audioUnlocked = false;

async function unlockAudio(){
  if(audioUnlocked) return;

  try{
    const a = new Audio();
    a.muted = true;
    a.src = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAGkQCA";
    await a.play().catch(()=>{});
  }catch(e){}

  audioUnlocked = true;
}

// ======================
// TTS
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
// 環境音
// ======================
let bgm = null;

function startAmbient(mode){
  stopAmbient();
  bgm = new Audio(`${mode}.mp3`);
  bgm.loop = true;
  bgm.volume = 0.5;
  bgm.play().catch(()=>{});
}

function stopAmbient(){
  if(bgm){
    bgm.pause();
    bgm = null;
  }
}

// ======================
// セリフ（変更なし）
// ======================
const SPRING_START_QUOTES = [
  "立て。春は始まりだ。お前もまだ始まったばかりだろ？",
  "桜は散ってもな、お前はまだ咲ける。次の25分、いけるだろ？",
  "風向きが変わる。今のお前ならいける。始めるぞ。",
  "甘える時間は終わりだ。だがな、お前はもう走れる状態だ。行くぞ。",
  "桜が舞ってるな。だが、お前は散る側じゃねぇ。今日も咲きにいけ。"
];

function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======================
// タイマー
// ======================
let timerId = null;

function startTimer(sec){
  clearInterval(timerId);

  let end = Date.now() + sec*1000;

  timerId = setInterval(()=>{
    let remain = Math.max(0, Math.ceil((end-Date.now())/1000));

    document.getElementById("timer").textContent =
      `${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`;

    if(remain<=0){
      clearInterval(timerId);
    }
  },300);
}

// ======================
// メイン処理（ここが核）
// ======================
async function startStudy(mode){

  // ★1 音声を解放（超重要）
  await unlockAudio();

  // ★2 TTS
  const text = pickRandom(SPRING_START_QUOTES);
  document.getElementById("quote").textContent = text;

  await speak(text);

  // ★3 タイマー＋環境音
  startAmbient(mode);
  startTimer(25 * 60);
}

// ======================
// 初期化
// ======================
window.startStudy = startStudy;
