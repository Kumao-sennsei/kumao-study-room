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
let breakCafeAudio = null;
let currentVoiceEndedOnce = false;
let phaseEndTime = null;

// 同じセリフを使い切るまで再出現させないための履歴
const usedVoiceIndexes = {};

// 起動・遷移ロック
let isStarting = false;
let audioUnlocked = false;
let audioUnlockPromise = null;

let wakeLock = null;

async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator)) {
      console.log("[wakeLock] このブラウザは未対応");
      return;
    }

    if (document.visibilityState !== "visible") {
      console.log("[wakeLock] 画面非表示中なので取得しない");
      return;
    }

    wakeLock = await navigator.wakeLock.request("screen");
    console.log("[wakeLock] 取得成功");

    wakeLock.addEventListener("release", () => {
      console.log("[wakeLock] 解除されました");
    });
  } catch (e) {
    console.error("[wakeLock] 取得失敗:", e);
    wakeLock = null;
  }
}

async function releaseWakeLock() {
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      console.log("[wakeLock] 手動解除");
    }
  } catch (e) {
    console.error("[wakeLock] 解除失敗:", e);
  }
}

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

function createManagedAudio(src = "") {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  return audio;
}

async function recoverAudioIfNeeded() {
  try {
    if (document.visibilityState !== "visible") return;

    if (phase === "focus") {
      await startAmbient(currentMode);
    }

    if (phase === "break") {
      stopAmbient();
    }
  } catch (e) {
    console.error("[recoverAudioIfNeeded] 復旧失敗:", e);
  }
}

async function unlockAudioSystem() {
  if (audioUnlocked) return true;
  if (audioUnlockPromise) return audioUnlockPromise;

  audioUnlockPromise = (async () => {
    try {
      const silent = createManagedAudio(SILENT_WAV);
      silent.muted = true;
      await silent.play().catch(() => {});
      silent.pause();
      silent.currentTime = 0;

      if (!currentAudio) {
        currentAudio = createManagedAudio(SILENT_WAV);
        currentAudio.loop = true;
        currentAudio.volume = 0.5;
      }

      if (!currentVoiceAudio) {
        currentVoiceAudio = createManagedAudio(SILENT_WAV);
      }

      currentAudio.muted = true;
      currentVoiceAudio.muted = true;

      await currentAudio.play().catch(() => {});
      currentAudio.pause();
      currentAudio.currentTime = 0;

      await currentVoiceAudio.play().catch(() => {});
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;

      currentAudio.muted = false;
      currentVoiceAudio.muted = false;

      audioUnlocked = true;
      console.log("[audio] unlock 成功");
      return true;
    } catch (e) {
      console.error("[audio] unlock 失敗:", e);
      return false;
    } finally {
      audioUnlockPromise = null;
    }
  })();

  return audioUnlockPromise;
}

function ensureAmbientObject(mode) {
  if (!mode) return null;

  if (!currentAudio) {
    currentAudio = createManagedAudio(`${mode}.wav`);
    currentAudio.loop = true;
    currentAudio.volume = 0.5;
    currentAudioMode = mode;
    return currentAudio;
  }

  if (currentAudioMode !== mode) {
    try {
      currentAudio.pause();
    } catch (e) {}
    currentAudio.src = `${mode}.wav`;
    currentAudio.load();
    currentAudio.loop = true;
    currentAudio.volume = 0.5;
    currentAudio.currentTime = 0;
    currentAudioMode = mode;
  }

  return currentAudio;
}

function ensureVoiceObject() {
  if (!currentVoiceAudio) {
    currentVoiceAudio = createManagedAudio();
  }
  return currentVoiceAudio;
}


function stopVoice() {
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
      currentVoiceAudio.onended = null;
      currentVoiceAudio.onerror = null;
    } catch (e) {}
  }

  currentVoiceEndedOnce = false;
}

function stopAmbient() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
  }
}
function ensureBreakCafeAudio() {
  if (!breakCafeAudio) {
    breakCafeAudio = createManagedAudio("audio/ambient/break_cafe_loop.mp3");
    breakCafeAudio.loop = true;
    breakCafeAudio.volume = 0.18;
  }

  return breakCafeAudio;
}

async function startBreakCafeBgm() {
  try {
    await unlockAudioSystem();

    const audio = ensureBreakCafeAudio();
    audio.loop = true;
    audio.volume = 0.18;

    if (audio.paused) {
      await audio.play();
    }

    console.log("[breakCafe] 再生開始");
  } catch (e) {
    console.error("[breakCafe] 再生失敗:", e);
  }
}

function stopBreakCafeBgm() {
  if (!breakCafeAudio) return;

  try {
    breakCafeAudio.pause();
    breakCafeAudio.currentTime = 0;
    console.log("[breakCafe] 停止");
  } catch (e) {
    console.error("[breakCafe] 停止失敗:", e);
  }
}
// iPad / iPhone 向け：最初のユーザー操作時に環境音を準備
async function primeAmbient(mode) {
  if (!mode) return;

  try {
    ensureAmbientObject(mode);
  } catch (e) {
    console.error("環境音の準備失敗:", e);
  }
}

async function startAmbient(mode) {
  if (!mode) return;

  try {
    await unlockAudioSystem();

    const audio = ensureAmbientObject(mode);
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.5;

    if (audio.paused) {
      try {
        await audio.play();
      } catch (e) {
        console.warn("[audio] 通常再生失敗、再試行します:", e);

        audio.muted = true;
        await audio.play().catch(() => {});
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        await audio.play();
      }
    }
  } catch (e) {
    console.error("環境音再生エラー:", e);
  }
}

function playVoiceAudio(src, onEnded) {
  stopVoice();

  try {
    console.log("[voice] 再生しようとしている音声:", src);

    const audio = ensureVoiceObject();
    currentVoiceEndedOnce = false;

    const safeFinish = () => {
      try {
        audio.onended = null;
        audio.onerror = null;
      } catch (e) {}

      currentVoiceEndedOnce = true;

      if (typeof onEnded === "function") {
        onEnded();
      }
    };

    const startPlayback = () => {
      try {
        const result = audio.play();
        if (result && typeof result.then === "function") {
          result.catch((e) => {
            console.error("ボイス再生失敗:", e, src);
            safeFinish();
          });
        }
      } catch (e) {
        console.error("ボイス再生失敗:", e, src);
        safeFinish();
      }
    };

    audio.src = src;
    audio.load();

    audio.onended = safeFinish;
    audio.onerror = (e) => {
      console.error("ボイス再生エラー:", e, src);
      safeFinish();
    };

    if (audioUnlocked) {
      startPlayback();
    } else {
      unlockAudioSystem()
        .then((ok) => {
          if (!ok) throw new Error("audio unlock failed");
          startPlayback();
        })
        .catch((e) => {
          console.error("ボイス再生失敗:", e, src);
          safeFinish();
        });
    }
  } catch (e) {
    console.error("ボイス生成失敗:", e, src);
    currentVoiceEndedOnce = true;

    if (typeof onEnded === "function") {
      onEnded();
    }
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
// 授業開始時：通年固定
// 休憩開始時：月ごとのランダム
// レア：別枠
// ======================

const START_QUOTES = [
{ display: "考えてるだけじゃ、何も変わらねぇ。\n動いたやつから、景色が変わる。", audio: "audio/start/start_01.mp3" },
{ display: "お前に価値を与えることができるのはお前だけだ。\nもうひと頑張りしようぜ。", audio: "audio/start/start_02.mp3" },
{ display: "でかい夢を語るのはいい。\nだがな、それを本物にするのは今日の一歩だ。", audio: "audio/start/start_03.mp3" },
{ display: "失敗が怖いか？ 動かねぇ方が、よっぽど損だ。\n始めろ。", audio: "audio/start/start_04.mp3" },
{ display: "一回で変わろうとするな。\n毎日少しずつでいい。\nそれが、いちばん強ぇ。", audio: "audio/start/start_05.mp3" },
{ display: "お前の未来はな、気分じゃ決まらねぇ。\n今日なにをやるかで決まる。", audio: "audio/start/start_06.mp3" },
{ display: "言い訳してる暇があるなら、1ページ進めろ。\nその1ページが、お前を助ける。", audio: "audio/start/start_07.mp3" },
{ display: "大事なのは速さじゃねぇ。\n止まらずに進むことだ。", audio: "audio/start/start_08.mp3" },
{ display: "本気のやつは、派手じゃねぇ。\n黙って積む。\nお前も、そっち側に来い。", audio: "audio/start/start_09.mp3" },
{ display: "チャンスってのは、待つもんじゃねぇ。\n準備したやつの前にだけ現れる。", audio: "audio/start/start_10.mp3" },
{ display: "苦しいのは、伸びてる証拠だ。\n何も感じねぇ方が危ねぇ。", audio: "audio/start/start_11.mp3" },
{ display: "お前が超えるべき相手は、他人じゃねぇ。\n昨日の自分だ。", audio: "audio/start/start_12.mp3" },
{ display: "完璧を待つな。未完成のまま動け。\n動いたやつだけが、完成に近づく。", audio: "audio/start/start_13.mp3" },
{ display: "でかい結果は、地味な反復からしか生まれねぇ。\n派手さはいらん。", audio: "audio/start/start_14.mp3" },
{ display: "自信があるからやるんじゃねぇ。\nやったから、自信がつくんだ。", audio: "audio/start/start_15.mp3" },
{ display: "苦手？ 上等だ。\nそこを越えた瞬間、お前の武器になる。", audio: "audio/start/start_16.mp3" },
{ display: "今日の努力は、今日すぐ報われるとは限らねぇ。\nだがな、消えはしねぇ。", audio: "audio/start/start_17.mp3" },
{ display: "人より優れてる必要はねぇ。\n昨日より前に出てりゃ、それでいい。", audio: "audio/start/start_18.mp3" },
{ display: "迷ってる時間も、人生のコストだ。\nだったら進みながら考えろ。", audio: "audio/start/start_19.mp3" },
{ display: "勝つやつは、特別な日だけ頑張るんじゃねぇ。\n普通の日に、ちゃんとやる。", audio: "audio/start/start_20.mp3" },
{ display: "今の一問を雑にするな。\nでかい差は、そういうとこでつく。", audio: "audio/start/start_21.mp3" },
{ display: "環境のせいにしてるうちは、まだ甘い。\n逆風の中で進めるやつが、本物だ。", audio: "audio/start/start_22.mp3" },
{ display: "焦るな。だが、止まるな。\nこのバランスを持ってるやつは強い。", audio: "audio/start/start_23.mp3" },
{ display: "限界だと思った場所は、たいてい入口だ。\nそこからが勝負だろ。", audio: "audio/start/start_24.mp3" },
{ display: "夢だけ語るやつは多い。\n今日の机に向かえるやつは少ねぇ。", audio: "audio/start/start_25.mp3" },
{ display: "やる気を待つな。\n先に手を動かせ。気分は、あとからついてくる。", audio: "audio/start/start_26.mp3" },
{ display: "負けたくねぇなら、積め。\n悔しいなら、積め。結局それしかねぇ。", audio: "audio/start/start_27.mp3" },
{ display: "小さな継続をなめるな。\n人生ひっくり返すのは、だいたいそれだ。", audio: "audio/start/start_28.mp3" },
{ display: "しんどい日こそ価値がある。\n楽な日にやるのは当たり前だ。", audio: "audio/start/start_29.mp3" },
{ display: "お前には、まだ伸びしろがある。\nしかも、かなりデカい。", audio: "audio/start/start_30.mp3" },
];


const FALLBACK_RARE_QUOTES = [
  {
    category: "normal",
    display: "Ayo! You built different. I’m proud of that grind.",
    audio: "audio/rare/rare_01.mp3"
  },
  {
    category: "normal",
    display: "I see that hustle. You not regular. You elite with it.",
    audio: "audio/rare/rare_02.mp3"
  },
  {
    category: "normal",
    display: "That focus? That’s dangerous energy. Keep that.",
    audio: "audio/rare/rare_03.mp3"
  },
  {
    category: "normal",
    display: "You really locked in. Not many built like that.",
    audio: "audio/rare/rare_04.mp3"
  }
];


const BREAK_QUOTES_BY_MONTH = {
  1: [
    { display: "正月だな。今年も始まった。\nだがな、お前はもう途中からのスタートだ。\nその差、忘れるな。一回落ち着け。", audio: "audio/monthly/01/month01_break_01.mp3" },
{ display: "新年ってのはな、リセットじゃねぇ。\nここまでの積みを持って進むだけだ。\nお前、それできてる。少し整えろ。", audio: "audio/monthly/01/month01_break_02.mp3" },
{ display: "正月の空気、静かだろ。\nこの感じ、いいスタートだ。\n無理せず入れ。軽く休憩だ。", audio: "audio/monthly/01/month01_break_03.mp3" },
{ display: "新年一発目、ちゃんと座ったな。\nそれで十分強ぇ。今年もいける。\n一回呼吸整えろ。", audio: "audio/monthly/01/month01_break_04.mp3" },
{ display: "周りは浮かれてるな。\nでもな、お前は動いてる側だ。\nその差、デカいぞ。水でも飲んどけ。", audio: "audio/monthly/01/month01_break_05.mp3" },
{ display: "正月は流れを作る時期だ。\nいい入りしてる。そのままいけ。\n少し抜け。", audio: "audio/monthly/01/month01_break_06.mp3" },
{ display: "新年の最初に崩れねぇやつは強ぇ。\nお前、ちゃんとやれてる。一回休め。", audio: "audio/monthly/01/month01_break_07.mp3" },
{ display: "初詣行ったか？願うだけじゃ変わらねぇ。\nやってるお前は違う。軽く整えとけ。", audio: "audio/monthly/01/month01_break_08.mp3" },
{ display: "正月ボケ？関係ねぇな。\nやるやつはやる。それがお前だ。\n一回落ち着け。", audio: "audio/monthly/01/month01_break_09.mp3" },
{ display: "新年の一歩、地味でいい。\nそれが後で効く。ちゃんと踏めてる。\n少し休憩だ。", audio: "audio/monthly/01/month01_break_10.mp3" },
{ display: "いい流れで入れてるな。\n今年もこのまま積めばいける。\n呼吸整えろ。", audio: "audio/monthly/01/month01_break_11.mp3" },
{ display: "正月はな、“静かな強さ”が出る時期だ。\nお前、それ持ってる。軽く間を取れ。", audio: "audio/monthly/01/month01_break_12.mp3" },
{ display: "焦るな。1月は土台だ。\nここで崩さなきゃ勝てる。\n一回抜いとけ。", audio: "audio/monthly/01/month01_break_13.mp3" },
{ display: "新年ってのはな、気持ちより行動だ。\nお前、もう動いてる。それでいい。少し休め。", audio: "audio/monthly/01/month01_break_14.mp3" },
{ display: "ここで差がつくぞ。気づいてるやつだけが前に出る。\nお前、その側だ。整えろ。", audio: "audio/monthly/01/month01_break_15.mp3" },
{ display: "今年もやるだけだ。特別なことはいらねぇ。\nいつも通り積め。一回落ち着け。", audio: "audio/monthly/01/month01_break_16.mp3" },
{ display: "You didn’t fold under pressure. That’s big. \n【訳】プレッシャーで折れなかったな。それはデカい。", audio: "audio/rare/01/month01_rare_ultra_01.mp3" },
{ display: "You building something real. Don’t rush it. \n【訳】ちゃんとしたもん作ってるな。焦んな。", audio: "audio/rare/01/month01_rare_ultra_02.mp3" },
{ display: "明けまして、おめでとうございます。\n今年も、ニョキニョキ伸びようぜ。お前に限界なんてねぇからな。\nただ、身体は大事にするんだぞ。", audio: "audio/rare/01/month01_rare_ultra_03.mp3" },
{ display: "ある時ふと、昔を思い出した。山の匂い、土の感触、タケノコの味。\n全部、妙にリアルだった。ああ、俺はあそこから来たんだなってな。", audio: "audio/rare/01/month01_rare_ultra_04.mp3" },
  ],
  2: [
    { display: "梅の花、もう咲き始めてる。まだ寒いのにな。\nお前も同じだ、見えないとこでちゃんと進んでる。\n一回落ち着け。", audio: "audio/monthly/02/month02_break_01.mp3" },
{ display: "2月はな、一番キツい時期だ。\nでもここでやってるやつが最後に抜ける。\nお前、いい位置いる。少し整えろ。", audio: "audio/monthly/02/month02_break_02.mp3" },
{ display: "椿はな、寒さの中で咲く花だ。派手じゃねぇが強い。\n今のお前、その感じだ。一回休め。", audio: "audio/monthly/02/month02_break_03.mp3" },
{ display: "まだ寒いな。でもな、この時期の積みが春に効く。\nちゃんとやれてる。軽く休憩入れろ。", audio: "audio/monthly/02/month02_break_04.mp3" },
{ display: "手応え薄いか？当たり前だ。\n今は“仕込み”の時間だ。いい動きしてる。\n一回呼吸整えろ。", audio: "audio/monthly/02/month02_break_05.mp3" },
{ display: "梅の香り、ほんのり感じるか？春は近い。\nお前もそこまで来てる。少し抜け。", audio: "audio/monthly/02/month02_break_06.mp3" },
{ display: "ここで折れるやつ、多い。\nでもな、お前は続けてる。\nそれが全部だ。一回落ち着け。", audio: "audio/monthly/02/month02_break_07.mp3" },
{ display: "2月は結果じゃねぇ、“耐え”だ。\nちゃんと踏ん張ってる。\nいいぞ。軽く間を取れ。", audio: "audio/monthly/02/month02_break_08.mp3" },
{ display: "椿みてぇにな、静かに強ぇやつが最後に勝つ。\n今のお前、その状態だ。\n一回休め。", audio: "audio/monthly/02/month02_break_09.mp3" },
{ display: "寒さで鈍るか？それでも動いてる。\nそれが差になる。少し整えろ。", audio: "audio/monthly/02/month02_break_10.mp3" },
{ display: "もうすぐ春だ。でもな、ここで油断するな。\nこの数日が効く。一回抜いとけ。", audio: "audio/monthly/02/month02_break_11.mp3" },
{ display: "梅はな、気づいたら咲いてる。\n努力も同じだ。お前、ちゃんと積んでる。\n軽く休憩だ。", audio: "audio/monthly/02/month02_break_12.mp3" },
{ display: "ここまで来たら最後の踏ん張りだ。\n雑になるなよ。丁寧にいけ。\n一回深呼吸しろ。", audio: "audio/monthly/02/month02_break_13.mp3" },
{ display: "2月を乗り切ったやつは強ぇ。\nお前、その中にいる。\nいい流れだ。少し休め。", audio: "audio/monthly/02/month02_break_14.mp3" },
{ display: "寒い時ほど、芯が問われる。\nお前、ちゃんと持ってる。\nここで整えろ。", audio: "audio/monthly/02/month02_break_15.mp3" },
{ display: "もうすぐ抜けるぞ。この感じ、わかるだろ。\n最後までいけ。一回落ち着け。", audio: "audio/monthly/02/month02_break_16.mp3" },
{ display: "You stayed in the game. That’s already a win. \n【訳】ゲームから降りなかったな。それだけでもう勝ちだ。", audio: "audio/rare/02/month02_rare_ultra_01.mp3" },
{ display: "You got more in you. I know it. You know it too. \n【訳】まだ力残ってるだろ。俺も知ってるし、お前もわかってる。", audio: "audio/rare/02/month02_rare_ultra_02.mp3" },
{ display: "梅の花が咲いたら次は桜の花か、、。その次は、筍だよな。\n季節は移り行く。そしてお前は成長する。\nニョキニョキな。", audio: "audio/rare/02/month02_rare_ultra_03.mp3" },
{ display: "日本の若いやつらを見た。下向いて、力あるのに止まってる。\nもったいねぇな、と思った。なら、俺が励ましてやるか。\nそう思っただけだ。", audio: "audio/rare/02/month02_rare_ultra_04.mp3" },
  ],
  3: [
   { display: "梅の花、少しずつ開いてきたな。\n春の気配はあるが、まだ途中だ。\nお前も同じだ。ちゃんと進んでる。少し休め。", audio: "audio/monthly/03/month03_break_01.mp3" },
{ display: "春の気配はあるのに、どこか落ち着かねぇな。\nその中でやれてる。\nお前、ちゃんと積んでる。5分休め。", audio: "audio/monthly/03/month03_break_02.mp3" },
{ display: "芽は出てきた。でも、まだ咲いてねぇ。\n今のお前も、その段階だ。\n焦らなくていい。ちゃんと進んでる。休め。", audio: "audio/monthly/03/month03_break_03.mp3" },
{ display: "名残雪、まだ少し残ってるな。\n冬が完全に終わったわけじゃねぇ。\nそんな中でも、お前は動いてる。いいぞ。休め。", audio: "audio/monthly/03/month03_break_04.mp3" },
{ display: "春の風が来てる。でもまだ冷たさも混じる。\nこの中でやってるお前、普通に強い。\n少し力抜け。", audio: "audio/monthly/03/month03_break_05.mp3" },
{ display: "霞がかかって、景色がはっきりしねぇな。\n未来も同じでいい。今は見えなくていい。\nお前はちゃんと進んでる。休め。", audio: "audio/monthly/03/month03_break_06.mp3" },
{ display: "春寒ってやつだな。\n暖かくなりそうで、まだ冷える。\nそんな時期に続けてる。お前、すげーじゃねーか。5分休め。", audio: "audio/monthly/03/month03_break_07.mp3" },
{ display: "若草が出始めてるな。\nまだ小さい。でも確実に伸びてる。\nお前も同じだ。ちゃんと育ってる。休め。", audio: "audio/monthly/03/month03_break_08.mp3" },
{ display: "梅の花は咲き始めだ。\n満開じゃねぇ。でもそれでいい。\nお前も今、途中だ。ちゃんと進んでる。5分後、続きやるぞ。", audio: "audio/monthly/03/month03_break_09.mp3" },
{ display: "季節の変わり目だな。\n少しざわつく。でもそれが普通だ。\nその中でやってるお前、かっこいいぞ。５分ゆっくりしな。", audio: "audio/monthly/03/month03_break_10.mp3" },
{ display: "芽吹きってのはな、静かに始まる。\n気づかないくらいでも、ちゃんと進んでる。\nお前も同じだ。安心して休め。", audio: "audio/monthly/03/month03_break_11.mp3" },
{ display: "名残雪が溶けて、春に変わっていく。\nその途中だ。\nお前も今、変わってる最中だ。5分、リラックスしな。", audio: "audio/monthly/03/month03_break_12.mp3" },
{ display: "春の陽気、少しずつ来てるな。\nでもまだ安定しねぇ。\nその中で続けてるお前、かなりいい。何か飲んで、５分休憩しな。", audio: "audio/monthly/03/month03_break_13.mp3" },
{ display: "霞がかかった景色でもな、ちゃんと前には進んでる。\n見えなくてもいい。\nお前は確実に進んでる。休め。", audio: "audio/monthly/03/month03_break_14.mp3" },
{ display: "芽はまだ小さい。でもな、止まってねぇ。\nお前も同じだ。\nその積み重ね、ちゃんと効いてる。5分ゆっくりしな。", audio: "audio/monthly/03/month03_break_15.mp3" },
{ display: "梅が咲いて、春が近づいてる。\nでもまだ途中だ。\nお前も今、その途中だ。ここまで来てる。ちゃんと強い。５分ゆっくりしな。", audio: "audio/monthly/03/month03_break_16.mp3" },
{ display: "Lowkey… you really putting in work.\nIt’s gonna pay off, for real.\n【訳】正直なところ、お前めっちゃ努力してる。\nこれ、ちゃんと結果に繋がるぞ。", audio: "audio/rare/03/month03_rare_ultra_01.mp3" },
{ display: "You not there yet… but you getting close.\nI can see it.\n【訳】まだ完成じゃない。\nでも確実に近づいてる。\nちゃんと見えてるぞ。", audio: "audio/rare/03/month03_rare_ultra_02.mp3" },
{ display: "筍の収穫の時期だな。お前にも収穫の時期が、いつか来る。\nそのための準備を日々、怠るんじゃねえぞ。\n俺も一緒に収穫してやる。", audio: "audio/rare/03/month03_rare_ultra_03.mp3" },
{ display: "特別なことはしてねぇ。ただな、ちゃんとやってるやつを、ちゃんと認める。それだけだ。だが、それで救われるやつがいるなら、やる価値はあるだろ。", audio: "audio/rare/03/month03_rare_ultra_04.mp3" },
      ],
  4: [
{ display: "桜の花だって25分じゃ咲かねえ。\nお前、ちゃんと頑張ってる。\nとりあえず5分休憩しな。", audio: "audio/monthly/04/month04_break_01.mp3" },
{ display: "春の風、落ち着かねぇか？\n周りが速く見えてもな、お前はちゃんと頑張ってる。\n5分だけ、呼吸整えろ。", audio: "audio/monthly/04/month04_break_02.mp3" },
{ display: "新学期でバタついてるか？\nそれでも座った。ちゃんと頑張ってる。\n5分後にまた続きやろうぜ。", audio: "audio/monthly/04/month04_break_03.mp3" },
{ display: "桜は一気に咲かねえ。\nお前も今、ちゃんと頑張ってる最中だ。\n5分ゆっくりしな。命令だ。", audio: "audio/monthly/04/month04_break_04.mp3" },
{ display: "今日ちょっと重かったな。それでもやった。\nそこが頑張りだ。\nとりあえず5分、肩の力抜け。", audio: "audio/monthly/04/month04_break_05.mp3" },
{ display: "春は始まりの季節だ。\nそしてお前は、ちゃんと始めてる。\n頑張ってる。5分休め。\n次もいくぞ。", audio: "audio/monthly/04/month04_break_06.mp3" },
{ display: "周りは華やかだな。桜も咲いてる。\nだが地味に頑張ってるお前の方が強い。\n5分後、もう一段上行くぞ。", audio: "audio/monthly/04/month04_break_07.mp3" },
{ display: "手応え薄いか？\nそれでも頑張ってるやつを俺は見放したりしねぇ。\n5分だけ、静かに休め。", audio: "audio/monthly/04/month04_break_08.mp3" },
{ display: "俺は今から花見に行ってくる。\n５分休憩したら、お前は頑張れ。\nいいか？さぼるんじゃねぇぞ。", audio: "audio/monthly/04/month04_break_09.mp3" },
{ display: "桜は散る。だがな、お前の頑張りは散らねぇ。\nとりあえず5分、ゆっくりしな。", audio: "audio/monthly/04/month04_break_10.mp3" },
{ display: "考えてみろ。桜だってな、一瞬で咲いてるわけじゃねぇ。\n見えねぇところで準備してんだ。お前も同じだ。\nちゃんと積んでる。今はそれでいい。", audio: "audio/monthly/04/month04_break_11.mp3" },
{ display: "新学期ってのはな、やり直しじゃねぇ。\n“上書き”だ。\nここまで来てるお前なら、もう一段上に行ける。\n5分休んで、次の一手いくぞ。", audio: "audio/monthly/04/month04_break_12.mp3" },
{ display: "春の風、感じてるか？流れが変わる時ってのはな、だいたい今みてぇな瞬間だ。お前、ちゃんと波に乗れてる。少し休んで、また漕ぎ出せ。", audio: "audio/monthly/04/month04_break_13.mp3" },
{ display: "桜は散る。だがな、次の季節に繋がってる。\nお前の努力も同じだ。無駄にはならねぇ。\n今やってること、ちゃんと未来に効いてくる。\n安心して5分休め", audio: "audio/monthly/04/month04_break_14.mp3" },
{ display: "４月、ここでいいスタートを切ったやつは強い。\nとりあえず５分休憩して、また続きやろうぜ。", audio: "audio/monthly/04/month04_break_15.mp3" },
{ display: "春ってのはな、芽が出る季節だ。\nお前も今、確実に伸びてる途中だ。\nまだ完成してねぇ？当たり前だろ。\n伸びてる最中なんだからな。", audio: "audio/monthly/04/month04_break_16.mp3" },
{ display: "Ayo, you really built different.\nNo cap, that grind is loud.\n　【訳】お前、マジでモノが違う。\nガチでその努力、存在感えぐい。", audio: "audio/rare/04/month04_rare_ultra_01.mp3" },
{ display: "Sheesh... you locked in for real.\nThat’s big dog energy.\n【訳】うわ、完全に本気モード入ってるな。\nそれは主役級の強さだ。", audio: "audio/rare/04/month04_rare_ultra_02.mp3" },
{ display: "春はタケノコがうまいよな。\nお前もたけのこのように、にょきにょき伸びるんだ。\nそうだ、ニョキニョキだぜ。", audio: "audio/rare/04/month04_rare_ultra_03.mp3" },
{ display: "春といえばタケノコだよな。\n俺は小さいころ山で家族と生き別れになり、\n飢えをしのぐためにタケノコをよく食べたもんだぜ。\n弟がいたが、顔がおもいだせねぇ。", audio: "audio/rare/04/month04_rare_ultra_04.mp3" },
  ],
  5: [
    { display: "新緑ってのはな、静かに伸びてんだ。\nお前も同じだ。ちゃんと前に進んでる。\n一回手止めて、少し休め。", audio: "audio/monthly/05/month05_break_01.mp3" },
{ display: "風が気持ちいい季節だな。\n焦らなくていい、ちゃんとやってる。\n今は区切りだ。軽く休んどけ。", audio: "audio/monthly/05/month05_break_02.mp3" },
{ display: "５月はな、伸びるやつが伸びる時期だ。\nお前、ちゃんとその流れに乗ってる。\nここで一息入れろ。", audio: "audio/monthly/05/month05_break_03.mp3" },
{ display: "いい感じで積めてるじゃねぇか。\n新緑みてぇに、ちゃんと伸びてる。\nちょっと休んで整えろ。", audio: "audio/monthly/05/month05_break_04.mp3" },
{ display: "今の頑張り、派手じゃねぇな。\nだがな、こういう時期が一番伸びる。\n一回落ち着いて、休憩だ。", audio: "audio/monthly/05/month05_break_05.mp3" },
{ display: "外の風、感じてみろ。頭も少し軽くなる。\nそのまま5分、ゆっくりしとけ。", audio: "audio/monthly/05/month05_break_06.mp3" },
{ display: "5月は調子に乗るやつも、崩れるやつもいる。\nだがな、お前はちゃんとやってる側だ。\n少し休んで、次いくぞ。", audio: "audio/monthly/05/month05_break_07.mp3" },
{ display: "なかなかいいペースだ。このまま突っ込む前に、一回整えろ。\n休憩、入れとけ。", audio: "audio/monthly/05/month05_break_08.mp3" },
{ display: "新しい環境にも慣れてきた頃だな。\nここで油断しねぇやつが強い。\nその前に、軽く休んどけ。", audio: "audio/monthly/05/month05_break_09.mp3" },
{ display: "積み重ねってのはな、見えにくい。\nだがちゃんと効いてる。今は止まっていい、休め。", audio: "audio/monthly/05/month05_break_10.mp3" },
{ display: "いいか、無理して突っ走るな。\n伸びるやつは、ちゃんと抜くところ抜く。\nここは休憩だ。", audio: "audio/monthly/05/month05_break_11.mp3" },
{ display: "風が抜けるみてぇに、頭も抜いとけ。\n詰め込みすぎはよくねぇ。\n少し休めば、また回る。", audio: "audio/monthly/05/month05_break_12.mp3" },
{ display: "今の一歩、ちゃんと意味ある。\n焦って増やす必要はねぇ。\nここで区切って、休憩入れろ。", audio: "audio/monthly/05/month05_break_13.mp3" },
{ display: "悪くねぇ流れだ。\nこのリズム崩さねぇためにもな、一回休んどけ。", audio: "audio/monthly/05/month05_break_14.mp3" },
{ display: "5月はな、地力がつく時期だ。\nお前、ちゃんとやれてる。\n少し休んで、次に備えろ。", audio: "audio/monthly/05/month05_break_15.mp3" },
{ display: "俺は５月病で、森に帰りたい気分だ。\nだが、おまえは頑張れ。まだまだできる。\n５分後もどってこい。", audio: "audio/monthly/05/month05_break_16.mp3" },
{ display: "You ain’t average, not even close. You built different. \n【訳】お前は普通じゃねぇ。マジで別格だ。", audio: "audio/rare/05/month05_rare_ultra_01.mp3" },
{ display: "That grind? Yeah… it speaks loud. People notice that. \n【訳】その努力な、ちゃんと響いてる。みんな気づいてる。", audio: "audio/rare/05/month05_rare_ultra_02.mp3" },
{ display: "お前は、この５月めちゃ頑張ってる。\nニョキニョキ　伸びているはずだ。　\nそう。　筍のようにな。", audio: "audio/rare/05/month05_rare_ultra_03.mp3" },
{ display: "生きるってのはな、綺麗ごとじゃねぇ。\n腹が減ったら、食えるもんを探す。\n雨が降ったら、濡れねぇ場所を探す。\nそれだけだ。\nだが、それを続けたやつだけが、生き残る。\nそう信じてた。", audio: "audio/rare/05/month05_rare_ultra_04.mp3" },
  ],
  6: [
    { display: "紫陽花ってのはな、雨ん中でもちゃんと咲く。\nお前も同じだ。今の積み、無駄じゃねぇ。\n少し休んで整えろ。", audio: "audio/monthly/06/month06_break_01.mp3" },
{ display: "雨続きで気分も重いか？それでもやってる。\nそれだけで十分強ぇ。\nここで一回、軽く休んどけ。", audio: "audio/monthly/06/month06_break_02.mp3" },
{ display: "梅雨はな、前に進んでる実感が薄い。\nだがな、根は確実に伸びてる。\n今は休んで、また動け。", audio: "audio/monthly/06/month06_break_03.mp3" },
{ display: "紫陽花みてぇに、色づくには時間がいる。\n焦るな。ちゃんと変わってる。\n少し休め。", audio: "audio/monthly/06/month06_break_04.mp3" },
{ display: "湿気で頭も重てぇな。\nそんな中でもやってるお前、いいじゃねぇか。\n一回抜いて、整えろ。", audio: "audio/monthly/06/month06_break_05.mp3" },
{ display: "雨音、聞いてみろ。\n悪くねぇだろ。こういう時はな、無理に詰めるな。\n軽く休憩だ。", audio: "audio/monthly/06/month06_break_06.mp3" },
{ display: "梅雨は足取りが重くなる。\nだが止まってねぇならOKだ。\nここで少し休んで、また行け。", audio: "audio/monthly/06/month06_break_07.mp3" },
{ display: "紫陽花は派手じゃねぇ。\nでもな、ちゃんと咲いてる。お前の努力も同じだ。\n一回休め。", audio: "audio/monthly/06/month06_break_08.mp3" },
{ display: "なんか進んでねぇ気がするか？それ、錯覚だ。\nちゃんとやってる。\n今は区切りだ、休憩しとけ。", audio: "audio/monthly/06/month06_break_09.mp3" },
{ display: "雨の日はな、無理して飛ばす日じゃねぇ。\n整える日だ。ここで一息入れろ。", audio: "audio/monthly/06/month06_break_10.mp3" },
{ display: "気分乗らねぇ日もある。それでも座ってる。\nそれが強さだ。少し休んでいい。", audio: "audio/monthly/06/month06_break_11.mp3" },
{ display: "湿った空気はな、焦りも連れてくる。\nだが流されんな。今は落ち着いて、休憩だ。", audio: "audio/monthly/06/month06_break_12.mp3" },
{ display: "紫陽花はな、比べたりしねぇ。ただ咲くだけだ。\nお前もそれでいい。一回休め。", audio: "audio/monthly/06/month06_break_13.mp3" },
{ display: "止まりそうな日でも、ちゃんとやってる。\nそれで十分だ。ここで一回、呼吸整えろ。", audio: "audio/monthly/06/month06_break_14.mp3" },
{ display: "雨はいつか止む。それまでの積みが効いてくる。\n今は焦らず、軽く休め。", audio: "audio/monthly/06/month06_break_15.mp3" },
{ display: "この時期に崩れねぇやつが強ぇ。\nお前、ちゃんと踏ん張ってるな。\n少し休んで、また行くぞ。", audio: "audio/monthly/06/month06_break_16.mp3" },
{ display: "No shortcuts, just work. That’s how winners move. \n【訳】近道なんかねぇ、やるだけだ。それが勝つやつの動きだ。", audio: "audio/rare/06/month06_rare_ultra_01.mp3" },
{ display: "You stayed solid when it got tough. That’s real strength. \n【訳】キツいときに踏ん張ったな。それが本物の強さだ。", audio: "audio/rare/06/month06_rare_ultra_02.mp3" },
{ display: "この梅雨の時期だからこそ、雨を楽しむのさ。\n筍だけじゃねぇ。雨を欲しているのはな。\n物事の見方を変えてみると新しいことに気づく。それが６月だ。", audio: "audio/rare/06/month06_rare_ultra_03.mp3" },
{ display: "山の外には、もっと広い世界があるらしい。\nそう聞いたとき、妙にワクワクしたのを覚えてる。\nここじゃねぇどこかに、何かある気がした。\n理由なんかねぇ。ただ、行きたくなったんだ。", audio: "audio/rare/06/month06_rare_ultra_04.mp3" },
  ],
  7: [
   { display: "向日葵ってのはな、太陽に向かって伸びる。\nお前も今、ちゃんと上向いてる。\n少し休んで、また伸びろ。", audio: "audio/monthly/07/month07_break_01.mp3" },
{ display: "夏の始まりだな。\nこの時期に積んだやつが、一気に伸びる。\nいい流れだ。一回休憩入れろ。", audio: "audio/monthly/07/month07_break_02.mp3" },
{ display: "セミが鳴き始めたな。あいつらも一気に出てきた。\nお前も今、成長のタイミングだ。少し休め。", audio: "audio/monthly/07/month07_break_03.mp3" },
{ display: "7月はな、差がつき始める月だ。\nお前、ちゃんと前に出てる側だ。\n一回整えて次いけ。", audio: "audio/monthly/07/month07_break_04.mp3" },
{ display: "日差し強くなってきたな。\nその分、お前の伸びも強くなってる。\nここで軽く休憩だ。", audio: "audio/monthly/07/month07_break_05.mp3" },
{ display: "いいペースだ。\nそのまま突っ込む前に、一回整えろ。\n伸びるやつはここで休む。", audio: "audio/monthly/07/month07_break_06.mp3" },
{ display: "向日葵は迷わねぇ。ただ伸びるだけだ。\nお前もそれでいい。\n少し休んで、また上行け。", audio: "audio/monthly/07/month07_break_07.mp3" },
{ display: "夏の風、感じてるか？\n流れは来てる。お前、ちゃんと乗れてる。\n一回落ち着け。", audio: "audio/monthly/07/month07_break_08.mp3" },
{ display: "ここ最近の積み、ちゃんと効いてるぞ。\n成長ってのは急に見えてくる。\n今は休憩だ。", audio: "audio/monthly/07/month07_break_09.mp3" },
{ display: "焦らなくていい。だが止まるな。\nそのバランス取れてるのは強ぇ。\n一回休め。", audio: "audio/monthly/07/month07_break_10.mp3" },
{ display: "夏前にここまで来てるのは上出来だ。\nこのまま伸びるぞ。少し呼吸整えろ。", audio: "audio/monthly/07/month07_break_11.mp3" },
{ display: "セミみてぇに一気に鳴く日が来る。\nその準備、今ちゃんとできてる。軽く休憩だ。", audio: "audio/monthly/07/month07_break_12.mp3" },
{ display: "いいか、伸びる時ほど詰めすぎるな。\n壊れたら意味ねぇ。ここで一回抜け。", audio: "audio/monthly/07/month07_break_13.mp3" },
{ display: "周りより一歩先に出てるな。\nその差、今の積みだ。\n少し休んで維持しろ。", audio: "audio/monthly/07/month07_break_14.mp3" },
{ display: "夏はな、覚醒するやつが出る時期だ。\nお前、その入口に立ってる。一回休め。", audio: "audio/monthly/07/month07_break_15.mp3" },
{ display: "ここまで来たら勢いだけじゃねぇ、地力だ。\nちゃんと伸びてる。少し整えろ。", audio: "audio/monthly/07/month07_break_16.mp3" },
{ display: "Ain’t nobody handing it to you. You taking it yourself. Respect. \n【訳】誰も与えてくれねぇ。でもお前は取りにいってる。リスペクトだ。", audio: "audio/rare/07/month07_rare_ultra_01.mp3" },
{ display: "You locked in, no distractions. That’s elite focus. \n【訳】完全に集中モード入ってるな。それは一流の集中力だ。", audio: "audio/rare/07/month07_rare_ultra_02.mp3" },
{ display: "お前のライバルがきのこなら、お前は　筍だ。　\nそう、俺は信じてる。\n　ニョキニョキ　伸びて、この夏ライバルに差をつけようぜ。", audio: "audio/rare/07/month07_rare_ultra_03.mp3" },
{ display: "気づいたら、俺は海を見てた。でけぇな、と思った。\nだがな、それ以上に思ったんだ。\n「この向こうに行けるなら、行くべきだ」ってな。\n怖さより、興味が勝った。", audio: "audio/rare/07/month07_rare_ultra_04.mp3" },
  ],
  8: [
   { display: "祭りの音、聞こえるか？\n誘惑は多いな。だがな、お前はちゃんと戻ってきてる。\n少し休め。", audio: "audio/monthly/08/month08_break_01.mp3" },
{ display: "夏休みだ。遊びもいい。\nだがやることやってるお前、かなり強ぇ。\n一回休憩だ。", audio: "audio/monthly/08/month08_break_02.mp3" },
{ display: "花火は一瞬で消える。\nだがお前の積みは残る。\nここで一息入れて、また行け。", audio: "audio/monthly/08/month08_break_03.mp3" },
{ display: "周りは浮かれてるな。\nそれでも机に戻るお前、相当できる。\n一回抜け。", audio: "audio/monthly/08/month08_break_04.mp3" },
{ display: "誘惑ってのはな、強い時ほど増える。\nそれでもやってる。いいじゃねぇか。\n少し休め。", audio: "audio/monthly/08/month08_break_05.mp3" },
{ display: "夜祭り、屋台、楽しそうだな。\nだがな、お前は未来も取りに行ってる。\nここで休憩だ。", audio: "audio/monthly/08/month08_break_06.mp3" },
{ display: "夏は気が緩みやすい。\nそこで踏ん張れるやつが勝つ。\nお前、ちゃんとやってる。\n少し休め。", audio: "audio/monthly/08/month08_break_07.mp3" },
{ display: "花火みたいに派手じゃねぇな。\nでもな、その積みが一番強ぇ。\nここで一回整えろ。", audio: "audio/monthly/08/month08_break_08.mp3" },
{ display: "今日はちょっと誘惑に揺れたか？\nそれでも戻ってきた。\nそれで十分だ。休憩しろ。", audio: "audio/monthly/08/month08_break_09.mp3" },
{ display: "遊びたい気持ちも本物だ。\nだが続けてるお前も本物だ。\n少し呼吸整えろ。", audio: "audio/monthly/08/month08_break_10.mp3" },
{ display: "夏休みの差はな、ここで決まる。\nお前はちゃんと積んでる側だ。一回休め。", audio: "audio/monthly/08/month08_break_11.mp3" },
{ display: "誘惑に勝つってのはな、小さな積み重ねだ。\n今もそれやってる。軽く休憩だ。", audio: "audio/monthly/08/month08_break_12.mp3" },
{ display: "夜の風、ちょっと気持ちいいだろ。\n頭もリセットしとけ。次に備えろ。", audio: "audio/monthly/08/month08_break_13.mp3" },
{ display: "花火は終わる。だがな、お前の努力は続く。\nそれが強さだ。少し休め。", audio: "audio/monthly/08/month08_break_14.mp3" },
{ display: "今日は十分やってる。\n遊びも勉強もバランス取れてる。\nここで一回抜け。", audio: "audio/monthly/08/month08_break_15.mp3" },
{ display: "夏が終わる頃、差が見える。\nお前は今、その差を作ってる側だ。\n少し休憩だ。", audio: "audio/monthly/08/month08_break_16.mp3" },
{ display: "That consistency? Dangerous. You getting stronger every day. \n【訳】その継続力、マジで強い。毎日ちゃんと進化してる。", audio: "audio/rare/08/month08_rare_ultra_01.mp3" },
{ display: "You showing up every day. That’s how legends are made. \n【訳】毎日ちゃんと来てるな。それが伝説の作り方だ。", audio: "audio/rare/08/month08_rare_ultra_02.mp3" },
{ display: "筍はな、１日で数ｃｍニョキニョキ伸びるんだぜ。\nピーク時には１日１ｍも伸びるんだ。すげえよな。\nこの夏、お前が、どれだけ伸びるか俺が見ててやる。", audio: "audio/rare/08/month08_rare_ultra_03.mp3" },
{ display: "言葉も通じねぇ土地でな、俺は働いた。\n皿洗い、掃除、なんでもやった。なめられたこともある。\nだがな、全部飲み込んだ。\nここで折れたら、全部終わりだからな。", audio: "audio/rare/08/month08_rare_ultra_04.mp3" },
  ],
  9: [
    { display: "風、変わってきただろ。\n季節が動く時はな、人も動く。\nお前、ちゃんと進んでる。一回落ち着け。", audio: "audio/monthly/09/month09_break_01.mp3" },
{ display: "夏終わったな。\n遊んだやつと積んだやつ、ここから差が出る。\nお前は後者だ。少し休め。", audio: "audio/monthly/09/month09_break_02.mp3" },
{ display: "空気が軽くなってきたな。\nこういう時はな、もう一段上いける。\n5分だけ整えろ。", audio: "audio/monthly/09/month09_break_03.mp3" },
{ display: "いい流れだ。\nそのまま行く前に、水でも飲め。\n落ち着いてから次だ。", audio: "audio/monthly/09/month09_break_04.mp3" },
{ display: "周りが戻ってきたな。\nだがな、お前はもう一歩前にいる。\nその差、大事にしろ。一回休憩だ。", audio: "audio/monthly/09/month09_break_05.mp3" },
{ display: "焦る必要はねぇ。\nただ続けてるやつが勝つ。\nお前、それやってる。\n5分休め。命令だ。", audio: "audio/monthly/09/month09_break_06.mp3" },
{ display: "夏の積み、ちゃんと残ってるだろ。\nそれが地力だ。\n一回抜いて、もう一段上いくぞ。", audio: "audio/monthly/09/month09_break_07.mp3" },
{ display: "なんとなく気が抜ける時期だな。\nだからこそやってるお前、強ぇ。\n少し休んどけ。", audio: "audio/monthly/09/month09_break_08.mp3" },
{ display: "風が涼しくなってきたな。\n頭も冷えてくる。このタイミングで整えろ。\n5分だけな。", audio: "audio/monthly/09/month09_break_09.mp3" },
{ display: "いいか、ここで崩れるやつ多い。\nだがな、お前は違う。\nちゃんと踏ん張ってる。一回休め。", audio: "audio/monthly/09/month09_break_10.mp3" },
{ display: "少し現実戻ってきたか？いい兆候だ。\nここからが本番だぞ。\n軽く休憩入れろ。", audio: "audio/monthly/09/month09_break_11.mp3" },
{ display: "夏の勢い、そのまま持ってこれてるな。\nそれが強さだ。一回深呼吸しとけ。", audio: "audio/monthly/09/month09_break_12.mp3" },
{ display: "周りが焦り出す頃だな。\nでもな、お前は淡々とやれてる。\nそれでいい。少し休め。", audio: "audio/monthly/09/month09_break_13.mp3" },
{ display: "この時期の一歩、あとで効いてくる。\nちゃんと踏み出してる。\n何か飲んで整えろ。", audio: "audio/monthly/09/month09_break_14.mp3" },
{ display: "調子悪くねぇな。このまま積めば、さらに抜ける。\n5分後、続きやろうぜ。", audio: "audio/monthly/09/month09_break_15.mp3" },
{ display: "いい位置いるぞ今。無理に飛ばすな。\n整えて、確実にいけ。\n一回休憩だ。", audio: "audio/monthly/09/month09_break_16.mp3" },
{ display: "You didn’t quit. That alone puts you ahead. \n【訳】やめなかった。それだけでお前はもう前にいる。", audio: "audio/rare/09/month09_rare_ultra_01.mp3" },
{ display: "You putting in work when nobody’s watching. That’s real power. \n【訳】誰も見てないとこでやってるな。それが本当の力だ。", audio: "audio/rare/09/month09_rare_ultra_02.mp3" },
{ display: "キノコの里とたけのこの里、どっちが好きかだって？　\n俺はどっちも好きだぜ。　まあポッキーが１番好きなんだがな。\n休憩中、俺が加えているのはポッキーだぜ。", audio: "audio/rare/09/month09_rare_ultra_03.mp3" },
{ display: "ある日、「金が金を生む場所」を知った。\n意味がわからなかった。\nだがな、画面の数字を見てるうちに気づいた。ここは戦場だ。\nそして俺は、こういう場所が嫌いじゃなかった。", audio: "audio/rare/09/month09_rare_ultra_04.mp3" },
  ],
  10: [
    { display: "金木犀の香り、気づいたか？\n季節は進んでる。お前も同じだ。\nちゃんと仕上がってきてる。一回休め。", audio: "audio/monthly/10/month10_break_01.mp3" },
{ display: "コスモスはな、派手じゃねぇが強い。\nお前の今の積みもそれだ。\n軽く休憩入れとけ。", audio: "audio/monthly/10/month10_break_02.mp3" },
{ display: "空気が澄んできたな。こういう時期は、実力もハッキリ出る。\nいい位置いるぞ。少し休め。", audio: "audio/monthly/10/month10_break_03.mp3" },
{ display: "ここまで来たな。積み重ねが“形”になり始めてる。\n焦るなよ。5分だけ整えろ。", audio: "audio/monthly/10/month10_break_04.mp3" },
{ display: "秋風ってのはな、余計なもんを落としてくる。\nお前も一回リセットしとけ。水でも飲め。", audio: "audio/monthly/10/month10_break_05.mp3" },
{ display: "いい仕上がりだ。このまま崩さなきゃ勝てる。\n一回抜いて、次いくぞ。", audio: "audio/monthly/10/month10_break_06.mp3" },
{ display: "コスモスみてぇに、静かに強ぇな今のお前。\n派手じゃねぇが確実だ。少し休め。", audio: "audio/monthly/10/month10_break_07.mp3" },
{ display: "焦りは減ってきたな。それ、成長の証拠だ。\nいい流れだぞ。軽く休憩だ。", audio: "audio/monthly/10/month10_break_08.mp3" },
{ display: "秋の空、広いだろ。視野も同じように広がってる。\nここで一回、呼吸整えろ。", audio: "audio/monthly/10/month10_break_09.mp3" },
{ display: "ここまで来たやつはな、簡単には崩れねぇ。\nお前、その段階入ってる。5分休め。命令だ。", audio: "audio/monthly/10/month10_break_10.mp3" },
{ display: "金木犀の香りみてぇに、気づけば広がってる。\nそれがお前の力だ。一回落ち着け。", audio: "audio/monthly/10/month10_break_11.mp3" },
{ display: "いいか、ここからは“量”じゃねぇ。“精度”だ。\n今のお前ならいける。少し休め。", audio: "audio/monthly/10/month10_break_12.mp3" },
{ display: "秋はな、完成に近づく季節だ。\nお前、ちゃんとそこにいる。一回整えろ。", audio: "audio/monthly/10/month10_break_13.mp3" },
{ display: "調子いいな。このままいけば抜けるぞ。\n5分後、もう一段上いこうぜ。", audio: "audio/monthly/10/month10_break_14.mp3" },
{ display: "無駄な動き減ってきたな。それが強さだ。\nここで一回抜いとけ。", audio: "audio/monthly/10/month10_break_15.mp3" },
{ display: "ここまで積んできたやつだけが見える景色だ。\nお前、ちゃんと来てる。少し休憩だ。", audio: "audio/monthly/10/month10_break_16.mp3" },
{ display: "You got that main character energy. Don’t lose it. \n【訳】主役のオーラ出てるぞ。それ、手放すな。", audio: "audio/rare/10/month10_rare_ultra_01.mp3" },
{ display: "Pressure didn’t break you. It built you. \n【訳】プレッシャーで潰れなかったな。むしろ強くなってる。", audio: "audio/rare/10/month10_rare_ultra_02.mp3" },
{ display: "筍といえば、かぐや姫だよな。　\nかぐや姫が生まれたのは７月７日だ。　意外だよな。　\nそう。この意外だなって感覚を学習に取り入れると強ぇ。", audio: "audio/rare/10/month10_rare_ultra_03.mp3" },
{ display: "負け続けた。笑えるくらいな。\nだがな、ある日突然、流れが見えた。\n理由は説明できねぇ。\nただ、「ああ、そういうことか」ってな。\nそこからは、負け方が変わった。", audio: "audio/rare/10/month10_rare_ultra_04.mp3" },
  ],
  11: [
    { display: "紅葉、きれいに色づいてきたな。\n時間かけたやつだけがこうなる。\nお前も同じだ、ちゃんと仕上がってる。\nここで一息入れろ。", audio: "audio/monthly/11/month11_break_01.mp3" },
{ display: "いちょうの葉が落ち始めたな。\n無駄なもんが削ぎ落ちて、本質だけ残る時期だ。\n今のお前、かなりいい状態だぞ。少し整えとけ。", audio: "audio/monthly/11/month11_break_02.mp3" },
{ display: "ここまで来たな。あとは崩さねぇことだ。\n派手にやる必要はねぇ、丁寧にいけ。\n軽く休憩挟め。", audio: "audio/monthly/11/month11_break_03.mp3" },
{ display: "紅葉はな、焦って色づくもんじゃねぇ。\n積み重ねたやつだけが染まる。\nお前、その段階にいる。一回落ち着け。", audio: "audio/monthly/11/month11_break_04.mp3" },
{ display: "空気、だいぶ冷えてきたな。\n集中力も研ぎ澄まされる時期だ。今の流れ、大事にしろ。\n水でも飲んどけ。", audio: "audio/monthly/11/month11_break_05.mp3" },
{ display: "いい仕上がりだ。\n無理に上げなくていい、この精度を維持しろ。\nここで少し抜け。", audio: "audio/monthly/11/month11_break_06.mp3" },
{ display: "いちょう並木、静かだろ。\nああいう空気が今のお前だ。騒がず、確実に強い。\n呼吸整えろ。", audio: "audio/monthly/11/month11_break_07.mp3" },
{ display: "ここからは勝負の準備だ。焦るやつほど崩れる。\nお前は違う、ちゃんと積んでる。\n5分だけ静かにしろ。", audio: "audio/monthly/11/month11_break_08.mp3" },
{ display: "紅葉が散る前が一番綺麗だろ。完成ってのはそういうもんだ。\n今のお前、かなりいい位置だ。少し休め。", audio: "audio/monthly/11/month11_break_09.mp3" },
{ display: "無駄な動き、ほぼ消えてるな。それが今の強さだ。\nこのままいけば届くぞ。軽く間を取れ。", audio: "audio/monthly/11/month11_break_10.mp3" },
{ display: "ここで欲張るな。やることはもう決まってる。あ\nとは繰り返すだけだ。一回力抜いとけ。", audio: "audio/monthly/11/month11_break_11.mp3" },
{ display: "いちょうの黄色、目立つよな。\nでもな、目立つ前にちゃんと積んでる。\nそれがお前だ。少し整えろ。", audio: "audio/monthly/11/month11_break_12.mp3" },
{ display: "いい流れだ。このまま最後まで持っていけ。\n崩すなよ。一回深呼吸入れろ。", audio: "audio/monthly/11/month11_break_13.mp3" },
{ display: "11月はな、“答え合わせ”が始まる月だ。\nお前の積み、ちゃんと通用してる。\nここで一区切りだ。", audio: "audio/monthly/11/month11_break_14.mp3" },
{ display: "焦り、ほぼなくなったな。それが本物の状態だ。\nこのまま淡々といけ。少し休憩だ。", audio: "audio/monthly/11/month11_break_15.mp3" },
{ display: "ここまで来たやつは強ぇ。あとはやるだけだ。\nいいな？次の一手、準備しとけ。", audio: "audio/monthly/11/month11_break_16.mp3" },
{ display: "You hungry. I can see it. Keep going. \n【訳】その貪欲さ、見えてるぞ。そのまま行け。", audio: "audio/rare/11/month11_rare_ultra_01.mp3" },
{ display: "You ain’t lucky. You earned that. \n【訳】それは運じゃねぇ。ちゃんと勝ち取ったもんだ。", audio: "audio/rare/11/month11_rare_ultra_02.mp3" },
{ display: "今年も残り２か月をきったか。\n来年につなげる月にしようぜ。\n寒くなってきてるから、暖かくして、風邪ひくんじゃねーぞ。", audio: "audio/rare/11/month11_rare_ultra_03.mp3" },
{ display: "気づけば、金は増えていた。\nだがな、金そのものには興味がなかった。\n面白かったのは、「勝てる」って事実だ。\n積み上げたのは金じゃねぇ。自分への確信だ。", audio: "audio/rare/11/month11_rare_ultra_04.mp3" },
  ],
  12: [
   { display: "クリスマスが近いな。今年の自分に何を渡せるか、それが全部だ。\nお前、ちゃんと積んできた。一回落ち着け。", audio: "audio/monthly/12/month12_break_01.mp3" },
{ display: "師走はな、流されるやつが多い。\nでもお前は違う。\nここまで来た積み、無駄じゃねぇ。\n少し整えとけ。", audio: "audio/monthly/12/month12_break_02.mp3" },
{ display: "サンタクロースはな、頑張ったやつに来る。\nお前、自分でちゃんと用意してる側だ。\n軽く休憩入れろ。", audio: "audio/monthly/12/month12_break_03.mp3" },
{ display: "ここまで来たな。今年の積み、ちゃんと形になってる。\n最後まで崩すな。水でも飲んどけ。", audio: "audio/monthly/12/month12_break_04.mp3" },
{ display: "クリスマスの光、綺麗だろ。\nだがな、お前の積みの方が価値ある。\n一回深呼吸しとけ。", audio: "audio/monthly/12/month12_break_05.mp3" },
{ display: "師走は忙しい。\nそれでもやってるお前、かなり強ぇ。\nここで一息入れとけ。", audio: "audio/monthly/12/month12_break_06.mp3" },
{ display: "サンタなんて待つな。\n自分で取りに行ったもんが一番デカい。\n今のお前、それできてる。少し抜け。", audio: "audio/monthly/12/month12_break_07.mp3" },
{ display: "今年、途中で止まらなかったな。それがすべてだ。\nいい年にしてる。一回休め。", audio: "audio/monthly/12/month12_break_08.mp3" },
{ display: "クリスマス前ってのはな、浮かれるやつが多い。\nでもお前は積んでる側だ。その差、大事にしろ。\n呼吸整えろ。", audio: "audio/monthly/12/month12_break_09.mp3" },
{ display: "師走の空気、速ぇだろ。\nその中で流されてねぇ。それが強さだ。\n軽く間を取れ。", audio: "audio/monthly/12/month12_break_10.mp3" },
{ display: "ここまで来たらな、あとは“やりきる”だけだ。\nお前ならできる。一回落ち着け。", audio: "audio/monthly/12/month12_break_11.mp3" },
{ display: "サンタが来るかどうかじゃねぇ。\n自分で積んだもんが残る。それが本物だ。少し整えろ。", audio: "audio/monthly/12/month12_break_12.mp3" },
{ display: "今年の自分、悪くねぇな。むしろかなりいい。\nここで一回、区切り入れとけ。", audio: "audio/monthly/12/month12_break_13.mp3" },
{ display: "クリスマスの夜、ちゃんと頑張ったやつだけが静かに笑う。\nお前、その側だ。少し休め。", audio: "audio/monthly/12/month12_break_14.mp3" },
{ display: "師走の最後まで踏ん張れるやつが勝つ。\nお前、ここまで来てる。軽く抜いとけ。", audio: "audio/monthly/12/month12_break_15.mp3" },
{ display: "今年やりきったな。その顔してるぞ。\nあとは締めるだけだ。次の一手、準備しとけ。", audio: "audio/monthly/12/month12_break_16.mp3" },
{ display: "That mindset? Top tier. Stay like that. \n【訳】その考え方、トップクラスだ。そのままでいけ。", audio: "audio/rare/12/month12_rare_ultra_01.mp3" },
{ display: "You moving different now. Level up looks good on you. \n【訳】動き変わってきてるな。ちゃんとレベル上がってる。", audio: "audio/rare/12/month12_rare_ultra_02.mp3" },
{ display: "この寒い時期だからこそ、足もと（基礎）にも目を向けるんだ。\n筍だって根をはらないとニョキニョキ伸びないからな。", audio: "audio/rare/12/month12_rare_ultra_03.mp3" },
{ display: "表に出る必要はなかった。\n裏で動かす方が、楽だからな。\n気づけば、名前も知らねぇ連中が俺の判断で動いてた。笑える話だ。\nだが、それが現実だった。", audio: "audio/rare/12/month12_rare_ultra_04.mp3" },
  ]
};

const FALLBACK_BREAK_QUOTES = [
  {
    display: "よくやったな。今は少し力を抜け。だが、お前はちゃんと強くなってる。",
    audio: "audio/monthly/fallback_break_01.mp3"
  }
];

// ======================
// ランダム抽選
// ======================
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomNoRepeat(key, arr) {
  if (!arr || arr.length === 0) return null;

  if (!usedVoiceIndexes[key]) {
    usedVoiceIndexes[key] = [];
  }

  if (usedVoiceIndexes[key].length >= arr.length) {
    usedVoiceIndexes[key] = [];
  }

  const used = usedVoiceIndexes[key];
  const availableIndexes = arr
    .map((_, idx) => idx)
    .filter((idx) => !used.includes(idx));

  const pickedIndex = pickRandom(availableIndexes);
  used.push(pickedIndex);

  return arr[pickedIndex];
}

function getCurrentMonth() {
  const now = new Date();
  const monthText = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric"
  }).format(now);
console.log("[month] monthText =", monthText, "Number(monthText) =", Number(monthText));
    return 11;
}

function pickByWeight(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item.value;
  }

  return items[items.length - 1].value;
}

function getRareCategoryByWeight(monthPool) {
  const availableCategories = [];

  if (monthPool.some((quote) => quote.category === "funny")) {
    availableCategories.push("funny");
  }

  if (monthPool.some((quote) => quote.category === "ultra")) {
    availableCategories.push("ultra");
  }

  if (availableCategories.length === 0) {
    return null;
  }

  return pickRandom(availableCategories);
}


function getRarePoolForCurrentMonth() {
  const month = getCurrentMonth();
  const arr = BREAK_QUOTES_BY_MONTH[month];

  const rareQuotes = Array.isArray(arr)
    ? arr.filter((quote) =>
        typeof quote.audio === "string" &&
        quote.audio.startsWith(`audio/rare/${String(month).padStart(2, "0")}/`)
      )
    : [];

  return rareQuotes.length > 0 ? rareQuotes : FALLBACK_RARE_QUOTES;
}


function getStartQuote() {
  return pickRandomNoRepeat("start_quotes", START_QUOTES) || START_QUOTES[0];
}

function getBreakQuoteForCurrentMonth() {
  const month = getCurrentMonth();
  const arr = BREAK_QUOTES_BY_MONTH[month];

  const normalBreakQuotes = Array.isArray(arr)
    ? arr.filter((quote) => typeof quote.audio === "string" && quote.audio.startsWith("audio/monthly/"))
    : [];

  if (normalBreakQuotes.length > 0) {
    return pickRandomNoRepeat(`break_month_${month}`, normalBreakQuotes) || normalBreakQuotes[0];
  }

  if (Array.isArray(FALLBACK_BREAK_QUOTES) && FALLBACK_BREAK_QUOTES.length > 0) {
    return pickRandomNoRepeat("fallback_break_quotes", FALLBACK_BREAK_QUOTES) || FALLBACK_BREAK_QUOTES[0];
  }

  throw new Error(`休憩音声データがありません。month=${month}`);
}


function getRareQuote() {
  const month = getCurrentMonth();
  const availablePool = getAvailableRareQuotesForCurrentMonth();

  if (!Array.isArray(availablePool) || availablePool.length === 0) {
    return null;
  }

  return pickRandomNoRepeat(`rare_month_${month}_all`, availablePool) || availablePool[0];
}

function saveStoryFragment(fragmentId) {
  const STORAGE_KEY = "kumao_story_fragments";
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!saved.includes(fragmentId)) {
    saved.push(fragmentId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  console.log("[story] 保存済み欠片:", saved);
}
function getSavedStoryFragments() {
  const STORAGE_KEY = "kumao_story_fragments";
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function hasStoryFragment(fragmentId) {
  const saved = getSavedStoryFragments();
  return saved.includes(fragmentId);
}

function getSavedRareAudios() {
  const STORAGE_KEY = "kumao_saved_rare_audios";
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function hasSavedRareAudio(audio) {
  const saved = getSavedRareAudios();
  return saved.includes(audio);
}

function saveRareAudio(audio) {
  const STORAGE_KEY = "kumao_saved_rare_audios";
  const saved = getSavedRareAudios();

  if (!saved.includes(audio)) {
    saved.push(audio);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  console.log("[rare] 保存済みレア音声:", saved);
}

const MONTHLY_BREAK_STORAGE_KEY = "kumao_saved_monthly_break_audios";
let elVoiceCollectionStatus = null;

function getSavedMonthlyBreakAudios() {
  try {
    const saved = JSON.parse(localStorage.getItem(MONTHLY_BREAK_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    console.error("[monthly] 保存済み月ボイス読込エラー:", e);
    return [];
  }
}

function saveMonthlyBreakAudio(audio) {
  if (!audio) return;

  const saved = getSavedMonthlyBreakAudios();

  if (!saved.includes(audio)) {
    saved.push(audio);
    localStorage.setItem(MONTHLY_BREAK_STORAGE_KEY, JSON.stringify(saved));
  }

  console.log("[monthly] 保存済み月ボイス:", saved);
}

function countSavedMonthlyBreakAudios(month) {
  const monthStr = String(month).padStart(2, "0");
  return getSavedMonthlyBreakAudios().filter((audio) =>
    typeof audio === "string" &&
    audio.startsWith(`audio/monthly/${monthStr}/`)
  ).length;
}

function countSavedRareItems(month) {
  const monthStr = String(month).padStart(2, "0");
  const rareAudioCount = getSavedRareAudios().filter((audio) =>
    typeof audio === "string" &&
    audio.startsWith(`audio/rare/${monthStr}/`)
  ).length;

  const storyCount = hasStoryFragment(`story_${monthStr}`) ? 1 : 0;

  return Math.min(4, rareAudioCount + storyCount);
}

function ensureVoiceCollectionStatus() {
  if (elVoiceCollectionStatus) return elVoiceCollectionStatus;

  elVoiceCollectionStatus = document.getElementById("voiceCollectionStatus");

  if (!elVoiceCollectionStatus) {
    elVoiceCollectionStatus = document.createElement("div");
    elVoiceCollectionStatus.id = "voiceCollectionStatus";
  
elVoiceCollectionStatus.style.display = "flex";
elVoiceCollectionStatus.style.justifyContent = "center";
elVoiceCollectionStatus.style.alignItems = "center";
elVoiceCollectionStatus.style.gap = "18px";
elVoiceCollectionStatus.style.width = "100%";
elVoiceCollectionStatus.style.margin = "8px auto 14px";
elVoiceCollectionStatus.style.fontWeight = "800";
elVoiceCollectionStatus.style.color = "#facc15";
elVoiceCollectionStatus.style.textAlign = "center";
elVoiceCollectionStatus.style.letterSpacing = "0.02em";

    if (elModeTitle && elModeTitle.parentNode) {
      elModeTitle.insertAdjacentElement("afterend", elVoiceCollectionStatus);
    }
  }

  return elVoiceCollectionStatus;
}

function updateVoiceCollectionStatus() {
  const status = ensureVoiceCollectionStatus();
  if (!status) return;

  const month = getCurrentMonth();
  const monthlyCount = Math.min(16, countSavedMonthlyBreakAudios(month));
  const rareCount = countSavedRareItems(month);
  const titleText = phase === "break" ? "休憩TIME" : "集中TIME";

  status.innerHTML = `
    <span style="font-size:15px;">${month}月ボイス ${monthlyCount}/16</span>
    <span style="font-size:15px;">レアボイス ${rareCount}/4</span>
  `;

  status.classList.remove("hidden");
}

function hideVoiceCollectionStatus() {
  const status = document.getElementById("voiceCollectionStatus");
  if (!status) return;
  status.classList.add("hidden");
}

function getAvailableRareQuotesForCurrentMonth() {
  const month = getCurrentMonth();
  const pool = getRarePoolForCurrentMonth();

  if (!Array.isArray(pool)) return [];

  const monthStr = String(month).padStart(2, "0");
  const fragmentId = `story_${monthStr}`;

  return pool.filter((quote) => {
    if (!quote || typeof quote.audio !== "string") return false;

    const isStory = /_rare_ultra_04\.mp3$/.test(quote.audio);

    // 物語欠片は取得済みなら再取得候補から外す
    if (isStory && hasStoryFragment(fragmentId)) return false;

    // 通常レアは取得済みでも再当選OK
    return true;
  });
}

// ======================
// 設定・状態管理
// ======================
const FOCUS_SEC = 0.2 * 60;
const BREAK_SEC = 0.05 * 60;
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
const elRareBtn = document.getElementById("rareBtn");
const elStoryBtn = document.getElementById("storyBtn");
const storyBookBtn = document.getElementById("storyBookBtn");
const storyBookModal = document.getElementById("storyBookModal");
const elLoggedInGuideText = document.getElementById("loggedInGuideText");

function closeStoryBook() {
  storyBookModal.classList.add("hidden");
}


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

function getRound() {
  return Math.floor((totalSetIndex - 1) / SETS_PER_ROUND) + 1;
}

function getDisplayRound() {
  return ((getRound() - 1) % 4) + 1;
}

function getSetInRound() {
  return ((totalSetIndex - 1) % SETS_PER_ROUND) + 1;
}

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
    updateRing(currentTime, phaseMaxSec);

    if (remaining <= 0) {
      stopTimer();
      handlePhaseEnd();
    }
  }, 250);
}

// ======================
// レア確率
// 1周目: 1%
// 2周目: 3%
// 3周目: 5%
// 4周目以降: 10%
// ======================
function getRareProbability(round) {
  if (round === 1) return 0.3; //1%
if (round === 2) return 0.3; //3%
if (round === 3) return 0.3; //6%
if (round === 4) return 0.3; //10%
return 0.3;                  //5周目以降15%
}

function shouldShowRareButton() {
  const availableRareQuotes = getAvailableRareQuotesForCurrentMonth();

  if (!Array.isArray(availableRareQuotes) || availableRareQuotes.length === 0) {
    return false;
  }

  const round = getRound();
  const probability = getRareProbability(round);
  return Math.random() < probability;
}

function hideRareButton() {
  if (!elRareBtn) return;
  elRareBtn.classList.add("hidden");
  elRareBtn.classList.remove("rare-glow");
  elRareBtn.disabled = true;
  elRareBtn.onclick = null;
  elRareBtn.ontouchstart = null;
  elRareBtn.ontouchend = null;
}

function showRareButton(config) {
  if (!elRareBtn) return;

  const isFunctionOnly = typeof config === "function";
  const onClickHandler = isFunctionOnly ? config : config?.onClickHandler;
  const label = isFunctionOnly
    ? "レアボイス当選！おめでとう🎉 押してみてね🐻✨"
    : (config?.label || "レアボイス当選！おめでとう🎉 押してみてね🐻✨");

  elRareBtn.textContent = label;
  elRareBtn.disabled = false;
  elRareBtn.classList.remove("hidden");
  elRareBtn.classList.add("rare-glow");

  let fired = false;
  const safeHandler = (e) => {
    if (fired) return;
    fired = true;

    if (typeof onClickHandler === "function") {
      onClickHandler(e);
    }
  };

  elRareBtn.onclick = safeHandler;
  //elRareBtn.ontouchstart = safeHandler;
  elRareBtn.ontouchend = safeHandler;

  if (elStoryBtn) {
    elStoryBtn.classList.add("hidden");
    elStoryBtn.onclick = null;
  }
}

// ======================
// UI切り替え
// ======================
function showHomeUI() {
  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach((el) => el.classList.remove("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach((el) => el.classList.add("hidden"));

  hideRareButton();
  hideVoiceCollectionStatus();
  
  elCharacter.style.opacity = "1";
  phase = "focus";
  currentTime = FOCUS_SEC;

  stopVoice();
  stopAmbient();
  stopTimer();

  updateRing(currentTime, FOCUS_SEC);
  setTimerText(currentTime);
  if (elLoggedInGuideText) elLoggedInGuideText.classList.remove("hidden");
}

function prepareFocusUI() {
  phase = "focus";
  currentTime = FOCUS_SEC;

  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach((el) => el.classList.add("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach((el) => el.classList.remove("hidden"));

  hideRareButton();

  elModeTitle.textContent = "集中TIME";
  updateVoiceCollectionStatus();
setCharacterImage(currentMode, getDisplayRound());
elLap.textContent = `${getDisplayRound()}周目`;

  updateBears();
  setTimerText(currentTime);
  updateRing(currentTime, FOCUS_SEC);
  if (elLoggedInGuideText) elLoggedInGuideText.classList.add("hidden");
}

function prepareBreakUI() {
  phase = "break";
  currentTime = BREAK_SEC;

  hideRareButton();

  elModeTitle.textContent = "休憩TIME";
  updateVoiceCollectionStatus();
  
  elQuote.textContent = "";

  const breakImages = ["break1.png", "break2.png", "break3.png", "break4.png"];
  elCharacter.src = breakImages[getSetInRound() - 1] || "break1.png";

  updateBears();
  setTimerText(currentTime);
  updateRing(currentTime, BREAK_SEC);
  if (elLoggedInGuideText) elLoggedInGuideText.classList.add("hidden");
}

// ======================
// フェーズ遷移ロジック
// 授業開始：通年固定名言 + レアボタン
// 休憩開始：月ごとのランダム
// ======================
async function goToPhase(nextPhase) {
  if (transitionLock) return;
  transitionLock = true;

  stopTimer();

  if (nextPhase === "focus") {
    stopVoice();
    stopBreakCafeBgm();
    prepareFocusUI();


    
const quote = getStartQuote();
elQuote.textContent = quote.display;

// 先にタイマーを動かす
startTimerLoop(FOCUS_SEC);
transitionLock = false;

// 音声は別で流す
playVoiceAudio(quote.audio, async () => {
  if (phase !== "focus") return;
  await startAmbient(currentMode);
});

// 音声側で詰まってもBGMだけは保険で開始
setTimeout(async () => {
  if (phase !== "focus") return;
  await startAmbient(currentMode);
}, 600);

return;
  }
  

  stopAmbient();
  stopVoice();
  prepareBreakUI();
  startBreakCafeBgm();

const FORCE_RARE_TEST = false; // レアボイステスト中だけ true。本番前に false
const showRare = FORCE_RARE_TEST || shouldShowRareButton();

if (showRare) {
  elQuote.textContent = "今日は、ちょっと特別だ😎💣";

  const month = getCurrentMonth();
const monthStr = String(month).padStart(2, "0");
const fragmentId = `story_${monthStr}`;

const monthBreakPool = BREAK_QUOTES_BY_MONTH[month] || [];
const storyQuote =
  monthBreakPool.find(
    (quote) => quote.audio === `audio/rare/${monthStr}/month${monthStr}_rare_ultra_04.mp3`
  ) || null;

const FORCE_STORY_TEST = false;// 物語欠片テスト中だけ true。本番前に false
const shouldUseStory = FORCE_STORY_TEST && !!storyQuote;

  showRareButton({
    label: shouldUseStory
      ? "【物語のかけら】を発見した！🎉 \n押してみてね😎💣"
      : "レアボイス当選！おめでとう🎉 \n押してみてね🐻✨",

    onClickHandler: () => {
      if (elRareBtn.disabled) return;

      elRareBtn.disabled = true;
      elRareBtn.classList.add("hidden");
      elRareBtn.classList.remove("rare-glow");

           const selectedQuote = shouldUseStory ? storyQuote : getRareQuote();

      if (!selectedQuote) {
        elQuote.textContent = "レアボイスのデータが見つからなかったよ🐻💦";
        startTimerLoop(BREAK_SEC);
        transitionLock = false;
        return;
      }

      const isStoryQuote =
  selectedQuote.audio &&
  /_rare_ultra_04\.mp3$/.test(selectedQuote.audio);

if (isStoryQuote) {
  saveStoryFragment(fragmentId);
} else {
  saveRareAudio(selectedQuote.audio);
}

      updateVoiceCollectionStatus();

      if (elQuote && elRareBtn && elQuote.parentNode) {
  elQuote.parentNode.insertBefore(elRareBtn, elQuote);
}

     elQuote.innerHTML = isStoryQuote
  ? `<span style="color:#d12ba8;font-weight:900;">📖【物語のかけら】を発見した！</span><br><br>${selectedQuote.display.replace(/\n/g, "<br>")}`
  : selectedQuote.display.replace(/\n/g, "<br>");
      console.log("[rare] selectedQuote =", selectedQuote);

      playVoiceAudio(selectedQuote.audio, () => {
        if (phase !== "break") {
          transitionLock = false;
          return;
        }

        startTimerLoop(BREAK_SEC);
        transitionLock = false;
      });
    }
  });

  transitionLock = false;
  return;
}

  const quote = getBreakQuoteForCurrentMonth();
  elQuote.textContent = quote.display;
  saveMonthlyBreakAudio(quote.audio);
  updateVoiceCollectionStatus();

  setTimeout(() => {
    playVoiceAudio(quote.audio, () => {
      if (phase !== "break") {
        transitionLock = false;
        return;
      }

      startTimerLoop(BREAK_SEC);
      transitionLock = false;
    });
  }, 180);
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

async function startStudy(mode) {
  if (isStarting) return;
  isStarting = true;

  try {
    currentMode = mode;
    totalSetIndex = 1;
    transitionLock = false;

    await unlockAudioSystem();
    await requestWakeLock();
    await primeAmbient(mode);
    await goToPhase("focus");
  } finally {
    isStarting = false;
  }
}

// 初期化
showHomeUI();
window.startStudy = startStudy;

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    await requestWakeLock();
    await recoverAudioIfNeeded();
  }
});

window.addEventListener("focus", async () => {
  await requestWakeLock();
  await recoverAudioIfNeeded();
});



window.addEventListener(
  "touchstart",
  () => {
    unlockAudioSystem().catch(() => {});
  },
  { once: true, passive: true }
);

window.addEventListener(
  "click",
  () => {
    unlockAudioSystem().catch(() => {});
  },
  { once: true, passive: true }
);

let roomUsers = [];
let isInRoom = false;

function groupPostsByUser(posts) {
  const grouped = {};

  posts.forEach(post => {
    const user = post.user || "unknown";

    if (!grouped[user]) {
      grouped[user] = [];
    }

    grouped[user].push(post);
  });

  return grouped;
}

function getLatestPost(posts) {
  if (!posts || posts.length === 0) return null;
  return posts[posts.length - 1];
}

function getPostCount(posts) {
  if (!posts) return 0;
  return posts.length;
}

function buildUserPostSummary(userName, posts) {
  const latestPost = getLatestPost(posts);
  const postCount = getPostCount(posts);

  return {
    userName,
    postCount,
    latestPost
  };
}

function getAvatarByPostCount(postCount) {
  if (postCount >= 100) return "kumao_suit.png";
  if (postCount >= 20) return "kumao_elementary.png";
  if (postCount >= 5) return "kumao_kindergarten.png";
  return "kumao_baby.png";
}

function buildGroupedPostSummaries(posts) {
  const grouped = groupPostsByUser(posts);
  const summaries = [];

  Object.keys(grouped).forEach((userName) => {
    summaries.push(buildUserPostSummary(userName, grouped[userName]));
  });

  return summaries;
}

const CURRENT_USER_NAME = "たかちゃん";

function getStudyLabelByUser(userName) {
  const studyMap = {
    "Aさん": "英単語",
    "Bさん": "数学Ⅱ",
    [CURRENT_USER_NAME]: "Cさん"
  };

  return studyMap[userName] || "自由に学習中";
}

function renderGroupedPostCard(summary) {
  const latestImage = summary.latestPost?.image || "";
  const latestComment = summary.latestPost?.comment || "";
  const safeUserName = summary.userName || "unknown";
　const avatarSrc = getAvatarByPostCount(summary.postCount);
  const studyLabel = summary.latestPost?.studyLabel || "自由に学習中";
  return `
    <div class="noteCard">

<div style="text-align:center; margin-bottom:8px;">
  <img src="${avatarSrc}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; display:block; margin:0 auto;" />
  <div style="margin-top:6px; font-weight:700;">${safeUserName}</div>
  <div style="margin-top:4px; font-size:12px; color:#555; background:#f3f4f6; display:inline-block; padding:4px 10px; border-radius:999px;">${studyLabel}</div>
</div>

      <div style="font-size:12px; opacity:0.85; margin-bottom:8px;">
        今日の投稿：${summary.postCount}枚
      </div>

      ${
        latestImage
          ? `<img src="${latestImage}" alt="${safeUserName}の最新投稿" style="width:100%; border-radius:8px; margin-bottom:8px; object-fit:cover;" />`
          : ""
      }

      <div style="font-size:12px; line-height:1.5;">
        ${latestComment}
      </div>
    </div>
  `;
}

function renderGroupedPosts(posts) {
  const noteGrid = document.getElementById("noteGrid");
  if (!noteGrid) return;

  const summaries = buildGroupedPostSummaries(posts);

  noteGrid.innerHTML = summaries
    .map((summary) => renderGroupedPostCard(summary))
    .join("");
}

function refreshStudyRoomView(posts) {
  renderRoom();
  renderGroupedPosts(posts || []);
}




function renderRoom() {
  const list = document.getElementById("roomList");
  const count = document.getElementById("roomCount");

  list.innerHTML = "";
  roomUsers.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    list.appendChild(li);
  });

  count.textContent = roomUsers.length;
}

function joinRoom() {
  if (isInRoom) return;

  isInRoom = true;
  roomUsers.push(CURRENT_USER_NAME);
  renderRoom();
}

function leaveRoom() {
  if (!isInRoom) return;

  isInRoom = false;
  roomUsers = roomUsers.filter(name => name !== CURRENT_USER_NAME);
  renderRoom();
}

const samplePosts = [
{
  user: "Aさん",
  image: "gooday.png",
  comment: "英語30分やった🔥",
  studyLabel: "英単語"
},
  
  {
  user: "Bさん",
  image: "",
  comment: "数学むずい😇",
  studyLabel: "数学Ⅱ"
}
  
];

window.addEventListener("DOMContentLoaded", () => {
  renderRoom();
});

const fakeNames = [
  "たろう", "勉強マン", "集中神", "user123", "がんばる君",
  "silent_study", "東大志望", "夜型戦士", "コツコツ勢"
];

// 偽物ユーザー（滞在時間つき）
let fakeUsers = [];

function updateFakeUsers() {
  if (!isInRoom) return;

  const now = Date.now();

  // ⏳ 期限切れユーザーを削除
  fakeUsers = fakeUsers.filter(user => user.leaveAt > now);

  // ➕ たまに新しい人が入る（30%）
  if (Math.random() < 0.3 && fakeUsers.length < 5) {
    const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];

    // 1時間〜2時間滞在
    const stayTime = (60 + Math.random() * 60) * 60 * 1000;

    fakeUsers.push({
      name: name,
      leaveAt: now + stayTime
    });
  }

  // 👤 表示更新（あなた＋偽物）
  roomUsers = [CURRENT_USER_NAME, ...fakeUsers.map(u => u.name)];

  renderRoom();
}

// 10秒ごとに更新（自然に）
setInterval(updateFakeUsers, 10000);

window.addEventListener("DOMContentLoaded", () => {
  const studyRoomView = document.getElementById("studyRoomView");
  const goBtn = document.getElementById("goStudyRoomBtn");
  const backBtn = document.getElementById("backMainBtn");
    const closeStudyRoomViewBtn = document.getElementById("closeStudyRoomViewBtn");

  // 画面切替
  goBtn.onclick = () => {
    studyRoomView.style.display = "block";
    backBtn.style.display = "block";
    goBtn.style.display = "none";
  };

  backBtn.onclick = () => {
    studyRoomView.style.display = "none";
    backBtn.style.display = "none";
    goBtn.style.display = "block";
  };
    closeStudyRoomViewBtn.onclick = () => {
    studyRoomView.style.display = "none";
    backBtn.style.display = "none";
    goBtn.style.display = "block";
  };
});

// 👉 部屋に入る（仮）
function enterRoom(roomName) {
  const detail = document.getElementById("roomDetail");

  detail.innerHTML = `
    <h3>${roomName}</h3>
    <div style="display:grid; grid-template-columns: repeat(5, 60px); gap:10px;">
      ${Array.from({ length: 20 }).map(() => `
        <div style="width:60px; height:60px; background:#333; display:flex; align-items:center; justify-content:center;">
          ○
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   ストーリー図鑑（新）
========================= */

const STORY_TEXTS = {
  4: `春といえばタケノコだよな。俺は小さいころ、山で家族と生き別れになった。飢えをしのぐために、タケノコをよく食べたもんだ。弟がいたが、名前がおもいだせねぇ。`,

  5: `生きるってのはな、綺麗ごとじゃねぇ。腹が減ったら、食えるもんを探す。雨が降ったら、濡れねぇ場所を探す。それだけだ。だが、それを続けたやつだけが、生き残る。そう信じてた。`,

  6: `山の外には、もっと広い世界があるらしい。そう聞いたとき、妙にワクワクしたのを覚えてる。ここじゃねぇどこかに、何かある気がした。理由なんかねぇ。\nただ、行きたくなったんだ。`,

  7: `気づいたら、俺は海を見てた。でけぇな、と思った。だがな、それ以上に思ったんだ。「この向こうに行けるなら、行くべきだ」ってな。怖さより、興味が勝った。`,

  8: `言葉も通じねぇ土地でな、俺は働いた。皿洗い、掃除、なんでもやった。なめられたこともある。だがな、全部飲み込んだ。ここで折れたら、全部終わりだからな。`,

  9: `ある日、「金が金を生む場所」を知った。意味がわからなかった。だがな、画面の数字を見てるうちに気づいた。ここは戦場だ。そして俺は、こういう場所が嫌いじゃなかった。`,

  10: `負け続けた。笑えるくらいな。だがな、ある日突然、流れが見えた。理由は説明できねぇ。ただ、「ああ、そういうことか」ってな。そこからは、負け方が変わった。`,

  11: `気づけば、金は増えていた。だがな、金そのものには興味がなかった。面白かったのは、「勝てる」って事実だ。積み上げたのは金じゃねぇ。自分への確信だ。`,

  12: `表に出る必要はなかった。裏で動かす方が、楽だからな。気づけば、名前も知らねぇ連中が俺の判断で動いてた。笑える話だ。だが、それが現実だった。`,

  1: `ある時ふと、昔を思い出した。山の匂い、土の感触、タケノコの味。全部、妙にリアルだった。ああ、俺はあそこから来たんだなってな。`,

  2: `日本の若いやつらを見た。下向いて、力あるのに止まってる。もったいねぇな、と思った。なら、俺がやるか。そう思っただけだ。`,

  3: `特別なことはしてねぇ。ただな、ちゃんとやってるやつを、ちゃんと認める。それだけだ。だが、それで救われるやつがいるなら、やる価値はあるだろ。`
};

function getStoryOrder() {
  return [4,5,6,7,8,9,10,11,12,1,2,3];
}

function getUnlockedStories() {
  const saved = getSavedStoryFragments();
  const unlocked = [];

  saved.forEach(id => {
    const m = id.match(/^story_(\d{2})$/);
    if (m) unlocked.push(parseInt(m[1]));
  });

  return unlocked;
}

function renderStoryBook() {
  const storyList = document.getElementById("storyList");
  if (!storyList) return;

  const unlockedMonths = getUnlockedStories();
  const order = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  let html = "";

  order.forEach((month) => {
    const isUnlocked = unlockedMonths.includes(month);
    const text = isUnlocked
      ? (STORY_TEXTS[month] || `${month}月の本文は未登録です。`)
      : "🔒 まだ未解放";

    html += `
      <div class="story-row">
        <div class="story-month">${month}月</div>
        <div class="story-line" data-month="${month}" ${isUnlocked ? `onclick="playStoryAudio(${month})"` : ""}>${text}</div>
      </div>
    `;
  });

  storyList.innerHTML = html;
}


function openStoryBook() {
  const modal = document.getElementById("storyBookModal");
  if (!modal) return;

  renderStoryBook();
  modal.classList.remove("hidden");
}

function closeStoryBook() {
  const modal = document.getElementById("storyBookModal");
  if (!modal) return;

  modal.classList.add("hidden");
}

function showStory(month) {
  const unlocked = getUnlockedStories();
  if (!unlocked.includes(month)) return;

  const text = STORY_TEXTS[month] || `${month}月の本文は未登録`;

  const modal = document.getElementById("storyViewerModal");
  const title = document.getElementById("storyViewerTitle");
  const body = document.getElementById("storyViewerBody");

  if (!modal || !title || !body) return;

  title.textContent = `${month}月の物語`;
  body.textContent = text;
  modal.classList.remove("hidden");
}

function closeStoryViewer() {
  const modal = document.getElementById("storyViewerModal");
  if (!modal) return;

  modal.classList.add("hidden");
}


function playStoryAudio(startMonth) {
  const unlocked = UNLOCKED_STORIES.sort((a, b) => a - b);

  let currentIndex = unlocked.indexOf(startMonth);
  if (currentIndex === -1) return;

  function playNext() {
    if (currentIndex >= unlocked.length) return;

    const month = unlocked[currentIndex];
    const monthStr = String(month).padStart(2, "0");
    const src = `audio/rare/${monthStr}/month${monthStr}_rare_ultra_04.mp3`;

    // ハイライト更新
    document.querySelectorAll(".story-line.playing").forEach((el) => {
      el.classList.remove("playing");
    });

    const currentLine = document.querySelector(`.story-line[data-month="${month}"]`);
    if (currentLine) {
      currentLine.classList.add("playing");
    }

    const audio = new Audio(src);

    audio.addEventListener("ended", () => {
      if (currentLine) {
        currentLine.classList.remove("playing");
      }
      currentIndex++;
      playNext(); // 次へ
    });

    audio.addEventListener("error", () => {
      if (currentLine) {
        currentLine.classList.remove("playing");
      }
      currentIndex++;
      playNext(); // エラーでも次へ
    });

    audio.play().catch(() => {
      if (currentLine) {
        currentLine.classList.remove("playing");
      }
      currentIndex++;
      playNext();
    });
  }

  playNext();
}

 

