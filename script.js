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
let currentVoiceEndedOnce = false;
let phaseEndTime = null;

// 同じセリフを使い切るまで再出現させないための履歴
const usedVoiceIndexes = {};

// 起動・遷移ロック
let isStarting = false;

// ======================
// 音声ユーティリティ
// ======================
function stopVoice() {
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch (e) {}
    currentVoiceAudio = null;
  }
  currentVoiceEndedOnce = false;
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

// iPad / iPhone 向け：最初のユーザー操作時に環境音を準備
async function primeAmbient(mode) {
  if (!mode) return;

  try {
    if (!currentAudio || currentAudioMode !== mode) {
      currentAudioMode = mode;
      currentAudio = new Audio(`${mode}.wav`);
      currentAudio.loop = false;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";
     currentAudio.addEventListener("ended", () => {
   currentAudio.currentTime = 0;
    currentAudio.play();
  });
    }

    // 再生はしない。準備だけ
    
  } catch (e) {
    console.error("環境音の準備失敗:", e);
  }
}

async function startAmbient(mode) {
  if (!mode) return;

  try {
    if (!currentAudio || currentAudioMode !== mode) {
      currentAudioMode = mode;
      currentAudio = new Audio(`${mode}.wav`);
      currentAudio.loop = false;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";

      currentAudio.addEventListener("ended", () => {
        currentAudio.currentTime = 0;
        currentAudio.play().catch((e) => {
          console.error("環境音ループ再生エラー:", e);
        });
      });
    }

    currentAudio.volume = 0.5;
    await currentAudio.play();
  } catch (e) {
    console.error("環境音再生エラー:", e);
  }
}


function playVoiceAudio(src, onEnded) {
  stopVoice();

  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true;
    currentVoiceAudio = audio;
    currentVoiceEndedOnce = false;

    const safeOnEnded = () => {
      if (currentVoiceEndedOnce) return;
      currentVoiceEndedOnce = true;

      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }

      if (typeof onEnded === "function") {
        onEnded();
      }
    };

    audio.onended = safeOnEnded;

    audio.onerror = (e) => {
      console.error("ボイス再生エラー:", e, src);
      safeOnEnded();
    };

    audio.play().catch((e) => {
      console.error("ボイス再生失敗:", e, src);
      safeOnEnded();
    });
  } catch (e) {
    console.error("ボイス生成失敗:", e, src);
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
{ display: "考えてるだけじゃ、何も変わらねぇ。動いたやつから、景色が変わる。", audio: "audio/start/start_01.mp3" },
{ display: "お前に価値を与えることができるのはお前だけだ。もうひと頑張りしようぜ。", audio: "audio/start/start_02.mp3" },
{ display: "でかい夢を語るのはいい。n/だがな、それを本物にするのは今日の一歩だ。", audio: "audio/start/start_03.mp3" },
{ display: "失敗が怖いか？ 動かねぇ方が、よっぽど損だ。始めろ。", audio: "audio/start/start_04.mp3" },
{ display: "一回で変わろうとするな。毎日少しずつでいい。それが、いちばん強ぇ。", audio: "audio/start/start_05.mp3" },
{ display: "お前の未来はな、気分じゃ決まらねぇ。今日なにをやるかで決まる。", audio: "audio/start/start_06.mp3" },
{ display: "言い訳してる暇があるなら、1ページ進めろ。その1ページが、お前を助ける。", audio: "audio/start/start_07.mp3" },
{ display: "大事なのは速さじゃねぇ。止まらずに進むことだ。", audio: "audio/start/start_08.mp3" },
{ display: "本気のやつは、派手じゃねぇ。黙って積む。お前も、そっち側に来い。", audio: "audio/start/start_09.mp3" },
{ display: "チャンスってのは、待つもんじゃねぇ。準備したやつの前にだけ現れる。", audio: "audio/start/start_10.mp3" },
{ display: "苦しいのは、伸びてる証拠だ。何も感じねぇ方が危ねぇ。", audio: "audio/start/start_11.mp3" },
{ display: "お前が超えるべき相手は、他人じゃねぇ。昨日の自分だ。", audio: "audio/start/start_12.mp3" },
{ display: "完璧を待つな。未完成のまま動け。動いたやつだけが、完成に近づく。", audio: "audio/start/start_13.mp3" },
{ display: "でかい結果は、地味な反復からしか生まれねぇ。派手さはいらん。", audio: "audio/start/start_14.mp3" },
{ display: "自信があるからやるんじゃねぇ。やったから、自信がつくんだ。", audio: "audio/start/start_15.mp3" },
{ display: "苦手？ 上等だ。そこを越えた瞬間、お前の武器になる。", audio: "audio/start/start_16.mp3" },
{ display: "今日の努力は、今日すぐ報われるとは限らねぇ。だがな、消えはしねぇ。", audio: "audio/start/start_17.mp3" },
{ display: "人より優れてる必要はねぇ。昨日より前に出てりゃ、それでいい。", audio: "audio/start/start_18.mp3" },
{ display: "迷ってる時間も、人生のコストだ。だったら進みながら考えろ。", audio: "audio/start/start_19.mp3" },
{ display: "勝つやつは、特別な日だけ頑張るんじゃねぇ。普通の日に、ちゃんとやる。", audio: "audio/start/start_20.mp3" },
{ display: "今の一問を雑にするな。でかい差は、そういうとこでつく。", audio: "audio/start/start_21.mp3" },
{ display: "環境のせいにしてるうちは、まだ甘い。逆風の中で進めるやつが、本物だ。", audio: "audio/start/start_22.mp3" },
{ display: "焦るな。だが、止まるな。このバランスを持ってるやつは強い。", audio: "audio/start/start_23.mp3" },
{ display: "限界だと思った場所は、たいてい入口だ。そこからが勝負だろ。", audio: "audio/start/start_24.mp3" },
{ display: "夢だけ語るやつは多い。今日の机に向かえるやつは少ねぇ。", audio: "audio/start/start_25.mp3" },
{ display: "やる気を待つな。先に手を動かせ。気分は、あとからついてくる。", audio: "audio/start/start_26.mp3" },
{ display: "負けたくねぇなら、積め。悔しいなら、積め。結局それしかねぇ。", audio: "audio/start/start_27.mp3" },
{ display: "小さな継続をなめるな。人生ひっくり返すのは、だいたいそれだ。", audio: "audio/start/start_28.mp3" },
{ display: "しんどい日こそ価値がある。楽な日にやるのは当たり前だ。", audio: "audio/start/start_29.mp3" },
{ display: "お前には、まだ伸びしろがある。しかも、かなりデカい。", audio: "audio/start/start_30.mp3" },
];

const RARE_QUOTES_BY_MONTH = {
  4: [
    {
      category: "ultra",
      display: "Ayo, you really built different.\nNo cap, that grind is loud.\n【訳】お前、マジでモノが違う。\nガチでその努力、存在感えぐい。",
      audio: "audio/rare/04/month04_rare_ultra_01.mp3"
    },
    {
      category: "ultra",
      display: "Sheesh... you locked in for real.\nThat’s big dog energy.\n【訳】うわ、完全に本気モード入ってるな。\nそれは主役級の強さだ。",
      audio: "audio/rare/04/month04_rare_ultra_02.mp3"
    },
    {
      category: "funny",
      display: "お前の努力、今ちょうどタケノコみたいに伸びてる。\nしかも雨上がりのやつだ。\nにょきにょき通り越して、もはや竹林予備軍だ。",
      audio: "audio/rare/04/month04_rare_funny_01.mp3"
    },
    {
      category: "funny",
      display: "今のお前、春風に乗ったやる気の妖精みたいな動きしてるぞ。\n落ち着いてるようで、内側だけ異様に強い。\nなんかもう、静かな暴走機関車だ。",
      audio: "audio/rare/04/month04_rare_funny_02.mp3"
    }
  ]
};

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
    { display: "年のはじまりだ。焦らなくていい、だが止まるな。…少し休め。", audio: "audio/monthly/01/month01_break_01.mp3" },
    { display: "寒さの中で動いてる。たいしたもんだ。…今は力を抜け。", audio: "audio/monthly/01/month01_break_02.mp3" },
    { display: "新しい年ってのはな、静かな覚悟が大事だ。…5分休め。", audio: "audio/monthly/01/month01_break_03.mp3" },
    { display: "よくやったな。正月気分の中で座った、それだけで強い。", audio: "audio/monthly/01/month01_break_04.mp3" },
    { display: "まだ身体も頭も温まってねぇ時期だ。…無理せず休め。", audio: "audio/monthly/01/month01_break_05.mp3" },
    { display: "今年の土台を作ってる最中だ。見えなくても積めてる。", audio: "audio/monthly/01/month01_break_06.mp3" },
    { display: "寒い中よくやった。こういう日こそ差がつく。…休め。", audio: "audio/monthly/01/month01_break_07.mp3" },
    { display: "急がなくていい。だが、進んでることは忘れるな。", audio: "audio/monthly/01/month01_break_08.mp3" },
    { display: "年の最初にやるやつは強い。お前、ちゃんとやってる。", audio: "audio/monthly/01/month01_break_09.mp3" },
    { display: "今は整える時間だ。休憩も実力のうちだぜ。", audio: "audio/monthly/01/month01_break_10.mp3" }
  ],
  2: [
    { display: "冷えるな。だが、こういう時期に積めるやつは強い。…休め。", audio: "audio/monthly/02/month02_break_01.mp3" },
    { display: "寒さに負けず、よく座った。…少し肩の力を抜け。", audio: "audio/monthly/02/month02_break_02.mp3" },
    { display: "2月は芯を作る月だ。派手さはいらねぇ。…休め。", audio: "audio/monthly/02/month02_break_03.mp3" },
    { display: "見えにくい努力ほど、あとで効いてくる。…5分休憩だ。", audio: "audio/monthly/02/month02_break_04.mp3" },
    { display: "寒い日に逃げなかった。それだけで立派だ。", audio: "audio/monthly/02/month02_break_05.mp3" },
    { display: "派手じゃなくていい。折れずにやるやつが最後に残る。", audio: "audio/monthly/02/month02_break_06.mp3" },
    { display: "今日は冷えたな。頭も身体も、少しゆるめろ。", audio: "audio/monthly/02/month02_break_07.mp3" },
    { display: "耐える季節だ。だが、お前はちゃんと前に出てる。", audio: "audio/monthly/02/month02_break_08.mp3" },
    { display: "こんな時期に続いてるの、普通にすげぇぞ。", audio: "audio/monthly/02/month02_break_09.mp3" },
    { display: "今は焦るな。芯を育てる時間だ。…休め。", audio: "audio/monthly/02/month02_break_10.mp3" }
  ],
  3: [
    { display: "節目の空気だな。落ち着かなくても、ちゃんと進んでる。", audio: "audio/monthly/03/month03_break_01.mp3" },
    { display: "別れも始まりも近い。だが、今はただ休め。", audio: "audio/monthly/03/month03_break_02.mp3" },
    { display: "3月は揺れる月だ。それでも座った。…よくやった。", audio: "audio/monthly/03/month03_break_03.mp3" },
    { display: "気持ちが散りやすい時期だな。だからこそ、お前は強い。", audio: "audio/monthly/03/month03_break_04.mp3" },
    { display: "終わりと始まりの間でも、お前は積めてる。…休め。", audio: "audio/monthly/03/month03_break_05.mp3" },
    { display: "ざわつく季節に集中した。たいしたもんだ。", audio: "audio/monthly/03/month03_break_06.mp3" },
    { display: "不安があっても進めるやつは、本物だ。", audio: "audio/monthly/03/month03_break_07.mp3" },
    { display: "変わる前ってのは、少ししんどい。…今は力を抜け。", audio: "audio/monthly/03/month03_break_08.mp3" },
    { display: "この時期をちゃんと越えたら、お前はまた強くなる。", audio: "audio/monthly/03/month03_break_09.mp3" },
    { display: "慌ただしい中でやったな。…少し、休め。", audio: "audio/monthly/03/month03_break_10.mp3" }
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
{ display: "俺は今から花見に行ってくる。\n５分休憩したら、お前は頑張れ。\nいいか？さぼるんじゃねぞ。", audio: "audio/monthly/04/month04_break_09.mp3" },
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
{ display: "春といえばタケノコだよな。\n俺は小さいころ山で家族と生き別れになり、\n飢えをしのぐためにタケノコをよく食べたもんだぜ。\n弟がいたが、名前がおもいだせねぇ。", audio: "audio/rare/04/month04_rare_ultra_04.mp3" },
  ],
  5: [
    { display: "新緑の季節ってのはな、意外と踏ん張りどころだ。…今は力、抜け。", audio: "audio/monthly/05/month05_break_01.mp3" },
    { display: "5月ってのは、気が緩みやすい。それでも座った。…そこが違いだ。", audio: "audio/monthly/05/month05_break_02.mp3" },
    { display: "ちょっと重かったか？ いいんだよ、それでも進んでる。…5分、休め。", audio: "audio/monthly/05/month05_break_03.mp3" },
    { display: "風、気持ちいいだろ。だがな、流されるか進むかはお前次第だ。", audio: "audio/monthly/05/month05_break_04.mp3" },
    { display: "連休気分、まだ残ってるか？ それでもここにいる。…普通じゃねぇぞ。", audio: "audio/monthly/05/month05_break_05.mp3" },
    { display: "こういう時期に崩れないやつが、最後に勝つ。…今は少し休め。", audio: "audio/monthly/05/month05_break_06.mp3" },
    { display: "新緑はじわじわ濃くなる。お前も同じだ。…ちゃんと積み上がってる。", audio: "audio/monthly/05/month05_break_07.mp3" },
    { display: "サボろうと思えば、いくらでもサボれる時期だ。それでもやったな。", audio: "audio/monthly/05/month05_break_08.mp3" },
    { display: "少し疲れが出てくる頃だな。だが、それはちゃんとやってる証拠だ。", audio: "audio/monthly/05/month05_break_09.mp3" },
    { display: "お前、ちゃんと続いてるな。そのまま崩さなければ、それでいい。", audio: "audio/monthly/05/month05_break_10.mp3" }
  ],
  6: [
    { display: "雨、降ってるな。こういう日は、無理すんな。…ちゃんと休め。", audio: "audio/monthly/06/month06_break_01.mp3" },
    { display: "今日は重かったな。それでもやった。…それで十分だ。", audio: "audio/monthly/06/month06_break_02.mp3" },
    { display: "湿った空気の日は、静かに積むに限る。…今は休め。", audio: "audio/monthly/06/month06_break_03.mp3" },
    { display: "集中、切れかけてたな。でも最後までやった。…偉いじゃねぇか。", audio: "audio/monthly/06/month06_break_04.mp3" },
    { display: "だるい日だったろ。それでも座った。…それが強さだ。", audio: "audio/monthly/06/month06_break_05.mp3" },
    { display: "雨音、悪くねぇな。少し落ち着け。…また戻ってこい。", audio: "audio/monthly/06/month06_break_06.mp3" },
    { display: "こういう日、逃げたくなるよな。逃げなかった。…それでいい。", audio: "audio/monthly/06/month06_break_07.mp3" },
    { display: "重い日は、軽く考えろ。続けることだけでいい。…休め。", audio: "audio/monthly/06/month06_break_08.mp3" },
    { display: "今日はよく粘ったな。その積み重ねが効いてくる。", audio: "audio/monthly/06/month06_break_09.mp3" },
    { display: "いい感じに疲れてるな。それ、ちゃんとやった証拠だ。…力抜け。", audio: "audio/monthly/06/month06_break_10.mp3" }
  ],
  7: [
    { display: "夏の入口だ。勢いが出る時期だが、休む時は休め。", audio: "audio/monthly/07/month07_break_01.mp3" },
    { display: "暑さにやられず、よくやったな。…水分とって休め。", audio: "audio/monthly/07/month07_break_02.mp3" },
    { display: "7月は走り出す月だ。だからこそ、整える時間も大事だ。", audio: "audio/monthly/07/month07_break_03.mp3" },
    { display: "勢いがある時ほど、無理しすぎるな。…少し抜け。", audio: "audio/monthly/07/month07_break_04.mp3" },
    { display: "暑い中で座ったんだ。たいしたもんだよ。", audio: "audio/monthly/07/month07_break_05.mp3" },
    { display: "熱くなる季節だな。だが、強いやつは冷静でもある。", audio: "audio/monthly/07/month07_break_06.mp3" },
    { display: "ここで丁寧に休むやつが、後半も勝つ。", audio: "audio/monthly/07/month07_break_07.mp3" },
    { display: "お前、いい熱を持ってる。…今は少し冷ませ。", audio: "audio/monthly/07/month07_break_08.mp3" },
    { display: "7月の一歩は、夏全体の流れを決める。…休んで整えろ。", audio: "audio/monthly/07/month07_break_09.mp3" },
    { display: "よくやった。焦るな、だが勢いは殺すな。", audio: "audio/monthly/07/month07_break_10.mp3" }
  ],
  8: [
    { display: "真夏だな。熱い中で動いてる、それだけで立派だ。", audio: "audio/monthly/08/month08_break_01.mp3" },
    { display: "燃える季節だ。だが、燃え尽きるな。…ちゃんと休め。", audio: "audio/monthly/08/month08_break_02.mp3" },
    { display: "暑さの中で座った。逃げなかったな。", audio: "audio/monthly/08/month08_break_03.mp3" },
    { display: "8月は熱に飲まれるやつが多い。お前は踏ん張ってる。", audio: "audio/monthly/08/month08_break_04.mp3" },
    { display: "夏の努力は、あとで効く。…今は少し休憩だ。", audio: "audio/monthly/08/month08_break_05.mp3" },
    { display: "汗かきながらでもやった。文句なしだ。", audio: "audio/monthly/08/month08_break_06.mp3" },
    { display: "熱い日ほど、休憩の質が大事になる。…力抜け。", audio: "audio/monthly/08/month08_break_07.mp3" },
    { display: "真夏の集中、簡単じゃねぇ。よくやった。", audio: "audio/monthly/08/month08_break_08.mp3" },
    { display: "お前、ちゃんと燃えてるな。だが、焦がしすぎるなよ。", audio: "audio/monthly/08/month08_break_09.mp3" },
    { display: "今は休め。次でまた火を入れればいい。", audio: "audio/monthly/08/month08_break_10.mp3" }
  ],
  9: [
    { display: "少し季節が動いたな。ここで整え直せるやつは強い。", audio: "audio/monthly/09/month09_break_01.mp3" },
    { display: "夏の流れが乱れてもいい。戻ってきた、それで十分だ。", audio: "audio/monthly/09/month09_break_02.mp3" },
    { display: "9月は切り替えの月だ。…今は落ち着いて休め。", audio: "audio/monthly/09/month09_break_03.mp3" },
    { display: "崩れた流れを戻すのも実力だ。お前、できてる。", audio: "audio/monthly/09/month09_break_04.mp3" },
    { display: "焦る必要はねぇ。整えるだけでも前進だ。", audio: "audio/monthly/09/month09_break_05.mp3" },
    { display: "残暑もだるさもある。それでも座った。よくやった。", audio: "audio/monthly/09/month09_break_06.mp3" },
    { display: "ここで立て直すやつが、秋に伸びる。", audio: "audio/monthly/09/month09_break_07.mp3" },
    { display: "少しずつでいい。流れを戻せ。…休んだらまた行くぞ。", audio: "audio/monthly/09/month09_break_08.mp3" },
    { display: "乱れた後に戻れるのが、本当に強いやつだ。", audio: "audio/monthly/09/month09_break_09.mp3" },
    { display: "休憩して整えろ。ここからまた深く入れる。", audio: "audio/monthly/09/month09_break_10.mp3" }
  ],
  10: [
    { display: "空気が澄んできたな。集中を深めるにはいい季節だ。", audio: "audio/monthly/10/month10_break_01.mp3" },
    { display: "10月は、静かに積むやつが強い。…今は休め。", audio: "audio/monthly/10/month10_break_02.mp3" },
    { display: "落ち着いた季節だ。お前の積み上げも、深くなってる。", audio: "audio/monthly/10/month10_break_03.mp3" },
    { display: "派手じゃなくていい。秋は深さで勝つ。", audio: "audio/monthly/10/month10_break_04.mp3" },
    { display: "気候がいい時期ほど、差がつく。ちゃんとやってるな。", audio: "audio/monthly/10/month10_break_05.mp3" },
    { display: "今の積み方、悪くねぇ。…少し休んでまた行け。", audio: "audio/monthly/10/month10_break_06.mp3" },
    { display: "静かな季節ってのは、静かな強さが育つ。", audio: "audio/monthly/10/month10_break_07.mp3" },
    { display: "いい流れだ。崩さず、でも無理しすぎず、休め。", audio: "audio/monthly/10/month10_break_08.mp3" },
    { display: "秋は深く潜る季節だ。お前、ちゃんと潜れてる。", audio: "audio/monthly/10/month10_break_09.mp3" },
    { display: "よくやった。落ち着いて、次も積んでいこうぜ。", audio: "audio/monthly/10/month10_break_10.mp3" }
  ],
  11: [
    { display: "冷えてきたな。こういう時期に黙って積むやつは強い。", audio: "audio/monthly/11/month11_break_01.mp3" },
    { display: "11月は渋くいこう。派手さはいらねぇ。", audio: "audio/monthly/11/month11_break_02.mp3" },
    { display: "寒さの中でも座ったな。…いいじゃねぇか。", audio: "audio/monthly/11/month11_break_03.mp3" },
    { display: "冷える季節は、根っこが育つ。お前もそうだ。", audio: "audio/monthly/11/month11_break_04.mp3" },
    { display: "静かに強くなる時期だ。…今は少し休め。", audio: "audio/monthly/11/month11_break_05.mp3" },
    { display: "騒がずにやる。その強さ、嫌いじゃねぇ。", audio: "audio/monthly/11/month11_break_06.mp3" },
    { display: "ここで積んだやつは冬に崩れねぇ。よくやってる。", audio: "audio/monthly/11/month11_break_07.mp3" },
    { display: "寒さに負けず続けてる。…大したもんだ。", audio: "audio/monthly/11/month11_break_08.mp3" },
    { display: "11月は派手に見えない。でも、効く月だ。", audio: "audio/monthly/11/month11_break_09.mp3" },
    { display: "今は休め。静かな強さは、こうやって育つ。", audio: "audio/monthly/11/month11_break_10.mp3" }
  ],
  12: [
    { display: "年末だな。ここまで来たこと自体、まず誇れ。", audio: "audio/monthly/12/month12_break_01.mp3" },
    { display: "12月は締めの月だ。…だが、今はちゃんと休め。", audio: "audio/monthly/12/month12_break_02.mp3" },
    { display: "一年の終わりに座ってる。お前、ほんとによくやってる。", audio: "audio/monthly/12/month12_break_03.mp3" },
    { display: "ここまで積んできた分、ちゃんと力になってる。", audio: "audio/monthly/12/month12_break_04.mp3" },
    { display: "年の最後までやるやつは強い。…少し休んでこい。", audio: "audio/monthly/12/month12_break_05.mp3" },
    { display: "締めくくりの時期だな。焦らず、でも丁寧にいけ。", audio: "audio/monthly/12/month12_break_06.mp3" },
    { display: "この一年、ちゃんと前に進んでる。忘れるなよ。", audio: "audio/monthly/12/month12_break_07.mp3" },
    { display: "最後までやり切ろうとする姿勢、いいねぇ。", audio: "audio/monthly/12/month12_break_08.mp3" },
    { display: "疲れもあるだろうが、ここで休めるのも実力だ。", audio: "audio/monthly/12/month12_break_09.mp3" },
    { display: "よくやった。今年の締めにふさわしい休憩だ。", audio: "audio/monthly/12/month12_break_10.mp3" }
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

  return Number(monthText);
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
  const hasNormal = monthPool.some((quote) => quote.category === "normal");
  const hasFunny = monthPool.some((quote) => quote.category === "funny");
  const hasUltra = monthPool.some((quote) => quote.category === "ultra");

  const weights = [];

  if (hasNormal) weights.push({ value: "normal", weight: 80 });
  if (hasFunny) weights.push({ value: "funny", weight: 18 });
  if (hasUltra) weights.push({ value: "ultra", weight: 2 });

  if (weights.length === 0) {
    return null;
  }

  return pickByWeight(weights);
}

function getRarePoolForCurrentMonth() {
  const month = getCurrentMonth();
  return RARE_QUOTES_BY_MONTH[month] || FALLBACK_RARE_QUOTES;
}


function getStartQuote() {
  return pickRandomNoRepeat("start_quotes", START_QUOTES) || START_QUOTES[0];
}

function getBreakQuoteForCurrentMonth() {
  const month = getCurrentMonth();
  const arr = BREAK_QUOTES_BY_MONTH[month] || FALLBACK_BREAK_QUOTES;
  return pickRandomNoRepeat(`break_month_${month}`, arr) || arr[0];
}

function getRareQuote() {
  const month = getCurrentMonth();
  const pool = getRarePoolForCurrentMonth();
  const selectedCategory = getRareCategoryByWeight(pool);

  if (!selectedCategory) {
    return pickRandomNoRepeat(`rare_month_${month}_all`, pool) || pool[0];
  }

  const categoryPool = pool.filter((quote) => quote.category === selectedCategory);

  if (categoryPool.length > 0) {
    return (
      pickRandomNoRepeat(`rare_month_${month}_${selectedCategory}`, categoryPool) ||
      categoryPool[0]
    );
  }

  return pickRandomNoRepeat(`rare_month_${month}_all`, pool) || pool[0];
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
const elRareBtn = document.getElementById("rareBtn");
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
// 1周目1セット目: 0%
// 1周目2〜4セット目: 1%
// 2周目: 3%
// 3周目: 5%
// 4周目以降: 10%
// ======================
function getRareProbability(round, setInRound) {
  if (round === 1) {
    if (setInRound === 1) return 0;
    return 0.01;
  }
  if (round === 2) return 0.03;
  if (round === 3) return 0.05;
  return 0.10;
}

function shouldShowRareButton() {
  const round = getRound();
  const setInRound = getSetInRound();
  const probability = getRareProbability(round, setInRound);
  return Math.random() < probability;
}

function hideRareButton() {
  if (!elRareBtn) return;
  elRareBtn.classList.add("hidden");
  elRareBtn.classList.remove("rare-glow");
  elRareBtn.disabled = true;
  elRareBtn.onclick = null;
}

function showRareButton(onClickHandler) {
  if (!elRareBtn) return;

  elRareBtn.textContent = "レアボイス当選！おめでとう🎉 押してみてね🐻✨";
  elRareBtn.disabled = false;
  elRareBtn.classList.remove("hidden");
  elRareBtn.classList.add("rare-glow");
  elRareBtn.onclick = onClickHandler;
}

// ======================
// UI切り替え
// ======================
function showHomeUI() {
  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach((el) => el.classList.remove("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach((el) => el.classList.add("hidden"));

  hideRareButton();

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

  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach((el) => el.classList.add("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach((el) => el.classList.remove("hidden"));

  hideRareButton();

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

  hideRareButton();

  elModeTitle.textContent = "休憩TIME";
  elQuote.textContent = "";

  const breakImages = ["break1.png", "break2.png", "break3.png", "break4.png"];
  elCharacter.src = breakImages[getSetInRound() - 1] || "break1.png";

  updateBears();
  setTimerText(currentTime);
  updateRing(currentTime, BREAK_SEC);
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
  stopVoice();

  if (nextPhase === "focus") {
    prepareFocusUI();

    const showRare = shouldShowRareButton();

    if (showRare) {
      elQuote.textContent = "今日は、ちょっと特別だ。";

      showRareButton(() => {
        if (elRareBtn.disabled) return;

        elRareBtn.disabled = true;
        elRareBtn.classList.add("hidden");
        elRareBtn.classList.remove("rare-glow");

        const rareQuote = getRareQuote();
        elQuote.textContent = rareQuote.display;

        playVoiceAudio(rareQuote.audio, async () => {
          if (phase !== "focus") {
            transitionLock = false;
            return;
          }

          await startAmbient(currentMode);
          startTimerLoop(FOCUS_SEC);
          transitionLock = false;
        });
      });

      return;
    }

    const quote = getStartQuote();
    elQuote.textContent = quote.display;

    playVoiceAudio(quote.audio, async () => {
      if (phase !== "focus") {
        transitionLock = false;
        return;
      }

      await startAmbient(currentMode);
      startTimerLoop(FOCUS_SEC);
      transitionLock = false;
    });
  } else {
    stopAmbient();
    prepareBreakUI();

    const quote = getBreakQuoteForCurrentMonth();
    elQuote.textContent = quote.display;

    playVoiceAudio(quote.audio, () => {
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

async function startStudy(mode) {
  if (isStarting) return;
  isStarting = true;

  try {
    currentMode = mode;
    totalSetIndex = 1;
    transitionLock = false;

    await primeAmbient(mode);
    await goToPhase("focus");
  } finally {
    isStarting = false;
  }
}

// 初期化
showHomeUI();
window.startStudy = startStudy;

let roomUsers = [];
let isInRoom = false;

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
  roomUsers.push("あなた");
  renderRoom();
}

function leaveRoom() {
  if (!isInRoom) return;

  isInRoom = false;
  roomUsers = roomUsers.filter(name => name !== "あなた");
  renderRoom();
}
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
  roomUsers = ["あなた", ...fakeUsers.map(u => u.name)];

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

