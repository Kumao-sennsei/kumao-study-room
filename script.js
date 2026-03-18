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
let phaseEndTime = null;

// 同じセリフを使い切るまで再出現させないための履歴
const usedVoiceIndexes = {};

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
      currentAudio = new Audio(`${mode}.mp3`);
      currentAudio.loop = true;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";
    }

    // 再生はしない。準備だけ
    currentAudio.load();
  } catch (e) {
    console.error("環境音の準備失敗:", e);
  }
}

async function startAmbient(mode) {
  if (!mode) return;

  try {
    if (!currentAudio || currentAudioMode !== mode) {
      currentAudioMode = mode;
      currentAudio = new Audio(`${mode}.mp3`);
      currentAudio.loop = true;
      currentAudio.volume = 0.5;
      currentAudio.currentTime = 0;
      currentAudio.playsInline = true;
      currentAudio.preload = "auto";
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

    audio.onended = () => {
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
      console.error("ボイス再生エラー:", e, src);
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      if (onEnded) onEnded();
    };

    audio.play().catch((e) => {
      console.error("ボイス再生失敗:", e, src);
      if (currentVoiceAudio === audio) currentVoiceAudio = null;
      if (onEnded) onEnded();
    });
  } catch (e) {
    console.error("ボイス生成失敗:", e, src);
    if (onEnded) onEnded();
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
// ======================

// ここは通年固定。増やしてもOK
const START_QUOTES = [
  {
    display: "やればできるじゃねーか。",
    audio: "audio/start/start_01.mp3"
  },
  {
    display: "この一歩が、お前を変える。",
    audio: "audio/start/start_02.mp3"
  },
  {
    display: "止まるな。積み上げろ。",
    audio: "audio/start/start_03.mp3"
  }
];

// 月ごとの休憩開始ボイス
// 仮のファイル名にしてあるので、あとで差し替えてOK
const BREAK_QUOTES_BY_MONTH = {
  1: [
    { display: "年のはじまりだ。焦らなくていい、だが止まるな。…少し休め。", audio: "audio/monthly/01/break_01_01.mp3" },
    { display: "寒さの中で動いてる。たいしたもんだ。…今は力を抜け。", audio: "audio/monthly/01/break_01_02.mp3" },
    { display: "新しい年ってのはな、静かな覚悟が大事だ。…5分休め。", audio: "audio/monthly/01/break_01_03.mp3" },
    { display: "よくやったな。正月気分の中で座った、それだけで強い。", audio: "audio/monthly/01/break_01_04.mp3" },
    { display: "まだ身体も頭も温まってねぇ時期だ。…無理せず休め。", audio: "audio/monthly/01/break_01_05.mp3" },
    { display: "今年の土台を作ってる最中だ。見えなくても積めてる。", audio: "audio/monthly/01/break_01_06.mp3" },
    { display: "寒い中よくやった。こういう日こそ差がつく。…休め。", audio: "audio/monthly/01/break_01_07.mp3" },
    { display: "急がなくていい。だが、進んでることは忘れるな。", audio: "audio/monthly/01/break_01_08.mp3" },
    { display: "年の最初にやるやつは強い。お前、ちゃんとやってる。", audio: "audio/monthly/01/break_01_09.mp3" },
    { display: "今は整える時間だ。休憩も実力のうちだぜ。", audio: "audio/monthly/01/break_01_10.mp3" }
  ],

  2: [
    { display: "冷えるな。だが、こういう時期に積めるやつは強い。…休め。", audio: "audio/monthly/02/break_02_01.mp3" },
    { display: "寒さに負けず、よく座った。…少し肩の力を抜け。", audio: "audio/monthly/02/break_02_02.mp3" },
    { display: "2月は芯を作る月だ。派手さはいらねぇ。…休め。", audio: "audio/monthly/02/break_02_03.mp3" },
    { display: "見えにくい努力ほど、あとで効いてくる。…5分休憩だ。", audio: "audio/monthly/02/break_02_04.mp3" },
    { display: "寒い日に逃げなかった。それだけで立派だ。", audio: "audio/monthly/02/break_02_05.mp3" },
    { display: "派手じゃなくていい。折れずにやるやつが最後に残る。", audio: "audio/monthly/02/break_02_06.mp3" },
    { display: "今日は冷えたな。頭も身体も、少しゆるめろ。", audio: "audio/monthly/02/break_02_07.mp3" },
    { display: "耐える季節だ。だが、お前はちゃんと前に出てる。", audio: "audio/monthly/02/break_02_08.mp3" },
    { display: "こんな時期に続いてるの、普通にすげぇぞ。", audio: "audio/monthly/02/break_02_09.mp3" },
    { display: "今は焦るな。芯を育てる時間だ。…休め。", audio: "audio/monthly/02/break_02_10.mp3" }
  ],

  3: [
    { display: "節目の空気だな。落ち着かなくても、ちゃんと進んでる。", audio: "audio/monthly/03/break_03_01.mp3" },
    { display: "別れも始まりも近い。だが、今はただ休め。", audio: "audio/monthly/03/break_03_02.mp3" },
    { display: "3月は揺れる月だ。それでも座った。…よくやった。", audio: "audio/monthly/03/break_03_03.mp3" },
    { display: "気持ちが散りやすい時期だな。だからこそ、お前は強い。", audio: "audio/monthly/03/break_03_04.mp3" },
    { display: "終わりと始まりの間でも、お前は積めてる。…休め。", audio: "audio/monthly/03/break_03_05.mp3" },
    { display: "ざわつく季節に集中した。たいしたもんだ。", audio: "audio/monthly/03/break_03_06.mp3" },
    { display: "不安があっても進めるやつは、本物だ。", audio: "audio/monthly/03/break_03_07.mp3" },
    { display: "変わる前ってのは、少ししんどい。…今は力を抜け。", audio: "audio/monthly/03/break_03_08.mp3" },
    { display: "この時期をちゃんと越えたら、お前はまた強くなる。", audio: "audio/monthly/03/break_03_09.mp3" },
    { display: "慌ただしい中でやったな。…少し、休め。", audio: "audio/monthly/03/break_03_10.mp3" }
  ],

  4: [
    { display: "はじまりの月だ。緊張しててもいい。…よくやってる。", audio: "audio/monthly/04/break_04_01.mp3" },
    { display: "新しい空気ってのは疲れるもんだ。…今は休め。", audio: "audio/monthly/04/break_04_02.mp3" },
    { display: "4月は立つだけでも大仕事だ。お前、ちゃんと立ってる。", audio: "audio/monthly/04/break_04_03.mp3" },
    { display: "慣れねぇ毎日でも座った。それで十分えらい。", audio: "audio/monthly/04/break_04_04.mp3" },
    { display: "新生活ってのは、見えない疲れがたまる。…休め。", audio: "audio/monthly/04/break_04_05.mp3" },
    { display: "始まりの季節に動けるやつは強い。…少し力を抜け。", audio: "audio/monthly/04/break_04_06.mp3" },
    { display: "焦らなくていい。土台づくりは地味でいいんだ。", audio: "audio/monthly/04/break_04_07.mp3" },
    { display: "お前、ちゃんと新しい流れに食らいついてる。立派だ。", audio: "audio/monthly/04/break_04_08.mp3" },
    { display: "まだ不安で当たり前だ。だが、お前は前にいる。", audio: "audio/monthly/04/break_04_09.mp3" },
    { display: "今日はここまででも十分価値がある。…休憩しな。", audio: "audio/monthly/04/break_04_10.mp3" }
  ],

  5: [
    { display: "新緑の季節ってのはな、意外と踏ん張りどころだ。…今は力、抜け。", audio: "audio/monthly/05/break_05_01.mp3" },
    { display: "5月ってのは、気が緩みやすい。それでも座った。…そこが違いだ。", audio: "audio/monthly/05/break_05_02.mp3" },
    { display: "ちょっと重かったか？ いいんだよ、それでも進んでる。…5分、休め。", audio: "audio/monthly/05/break_05_03.mp3" },
    { display: "風、気持ちいいだろ。だがな、流されるか進むかはお前次第だ。", audio: "audio/monthly/05/break_05_04.mp3" },
    { display: "連休気分、まだ残ってるか？ それでもここにいる。…普通じゃねぇぞ。", audio: "audio/monthly/05/break_05_05.mp3" },
    { display: "こういう時期に崩れないやつが、最後に勝つ。…今は少し休め。", audio: "audio/monthly/05/break_05_06.mp3" },
    { display: "新緑はじわじわ濃くなる。お前も同じだ。…ちゃんと積み上がってる。", audio: "audio/monthly/05/break_05_07.mp3" },
    { display: "サボろうと思えば、いくらでもサボれる時期だ。それでもやったな。", audio: "audio/monthly/05/break_05_08.mp3" },
    { display: "少し疲れが出てくる頃だな。だが、それはちゃんとやってる証拠だ。", audio: "audio/monthly/05/break_05_09.mp3" },
    { display: "お前、ちゃんと続いてるな。そのまま崩さなければ、それでいい。", audio: "audio/monthly/05/break_05_10.mp3" }
  ],

  6: [
    { display: "雨、降ってるな。こういう日は、無理すんな。…ちゃんと休め。", audio: "audio/monthly/06/break_06_01.mp3" },
    { display: "今日は重かったな。それでもやった。…それで十分だ。", audio: "audio/monthly/06/break_06_02.mp3" },
    { display: "湿った空気の日は、静かに積むに限る。…今は休め。", audio: "audio/monthly/06/break_06_03.mp3" },
    { display: "集中、切れかけてたな。でも最後までやった。…偉いじゃねぇか。", audio: "audio/monthly/06/break_06_04.mp3" },
    { display: "だるい日だったろ。それでも座った。…それが強さだ。", audio: "audio/monthly/06/break_06_05.mp3" },
    { display: "雨音、悪くねぇな。少し落ち着け。…また戻ってこい。", audio: "audio/monthly/06/break_06_06.mp3" },
    { display: "こういう日、逃げたくなるよな。逃げなかった。…それでいい。", audio: "audio/monthly/06/break_06_07.mp3" },
    { display: "重い日は、軽く考えろ。続けることだけでいい。…休め。", audio: "audio/monthly/06/break_06_08.mp3" },
    { display: "今日はよく粘ったな。その積み重ねが効いてくる。", audio: "audio/monthly/06/break_06_09.mp3" },
    { display: "いい感じに疲れてるな。それ、ちゃんとやった証拠だ。…力抜け。", audio: "audio/monthly/06/break_06_10.mp3" }
  ],

  7: [
    { display: "夏の入口だ。勢いが出る時期だが、休む時は休め。", audio: "audio/monthly/07/break_07_01.mp3" },
    { display: "暑さにやられず、よくやったな。…水分とって休め。", audio: "audio/monthly/07/break_07_02.mp3" },
    { display: "7月は走り出す月だ。だからこそ、整える時間も大事だ。", audio: "audio/monthly/07/break_07_03.mp3" },
    { display: "勢いがある時ほど、無理しすぎるな。…少し抜け。", audio: "audio/monthly/07/break_07_04.mp3" },
    { display: "暑い中で座ったんだ。たいしたもんだよ。", audio: "audio/monthly/07/break_07_05.mp3" },
    { display: "熱くなる季節だな。だが、強いやつは冷静でもある。", audio: "audio/monthly/07/break_07_06.mp3" },
    { display: "ここで丁寧に休むやつが、後半も勝つ。", audio: "audio/monthly/07/break_07_07.mp3" },
    { display: "お前、いい熱を持ってる。…今は少し冷ませ。", audio: "audio/monthly/07/break_07_08.mp3" },
    { display: "7月の一歩は、夏全体の流れを決める。…休んで整えろ。", audio: "audio/monthly/07/break_07_09.mp3" },
    { display: "よくやった。焦るな、だが勢いは殺すな。", audio: "audio/monthly/07/break_07_10.mp3" }
  ],

  8: [
    { display: "真夏だな。熱い中で動いてる、それだけで立派だ。", audio: "audio/monthly/08/break_08_01.mp3" },
    { display: "燃える季節だ。だが、燃え尽きるな。…ちゃんと休め。", audio: "audio/monthly/08/break_08_02.mp3" },
    { display: "暑さの中で座った。逃げなかったな。", audio: "audio/monthly/08/break_08_03.mp3" },
    { display: "8月は熱に飲まれるやつが多い。お前は踏ん張ってる。", audio: "audio/monthly/08/break_08_04.mp3" },
    { display: "夏の努力は、あとで効く。…今は少し休憩だ。", audio: "audio/monthly/08/break_08_05.mp3" },
    { display: "汗かきながらでもやった。文句なしだ。", audio: "audio/monthly/08/break_08_06.mp3" },
    { display: "熱い日ほど、休憩の質が大事になる。…力抜け。", audio: "audio/monthly/08/break_08_07.mp3" },
    { display: "真夏の集中、簡単じゃねぇ。よくやった。", audio: "audio/monthly/08/break_08_08.mp3" },
    { display: "お前、ちゃんと燃えてるな。だが、焦がしすぎるなよ。", audio: "audio/monthly/08/break_08_09.mp3" },
    { display: "今は休め。次でまた火を入れればいい。", audio: "audio/monthly/08/break_08_10.mp3" }
  ],

  9: [
    { display: "少し季節が動いたな。ここで整え直せるやつは強い。", audio: "audio/monthly/09/break_09_01.mp3" },
    { display: "夏の流れが乱れてもいい。戻ってきた、それで十分だ。", audio: "audio/monthly/09/break_09_02.mp3" },
    { display: "9月は切り替えの月だ。…今は落ち着いて休め。", audio: "audio/monthly/09/break_09_03.mp3" },
    { display: "崩れた流れを戻すのも実力だ。お前、できてる。", audio: "audio/monthly/09/break_09_04.mp3" },
    { display: "焦る必要はねぇ。整えるだけでも前進だ。", audio: "audio/monthly/09/break_09_05.mp3" },
    { display: "残暑もだるさもある。それでも座った。よくやった。", audio: "audio/monthly/09/break_09_06.mp3" },
    { display: "ここで立て直すやつが、秋に伸びる。", audio: "audio/monthly/09/break_09_07.mp3" },
    { display: "少しずつでいい。流れを戻せ。…休んだらまた行くぞ。", audio: "audio/monthly/09/break_09_08.mp3" },
    { display: "乱れた後に戻れるのが、本当に強いやつだ。", audio: "audio/monthly/09/break_09_09.mp3" },
    { display: "休憩して整えろ。ここからまた深く入れる。", audio: "audio/monthly/09/break_09_10.mp3" }
  ],

  10: [
    { display: "空気が澄んできたな。集中を深めるにはいい季節だ。", audio: "audio/monthly/10/break_10_01.mp3" },
    { display: "10月は、静かに積むやつが強い。…今は休め。", audio: "audio/monthly/10/break_10_02.mp3" },
    { display: "落ち着いた季節だ。お前の積み上げも、深くなってる。", audio: "audio/monthly/10/break_10_03.mp3" },
    { display: "派手じゃなくていい。秋は深さで勝つ。", audio: "audio/monthly/10/break_10_04.mp3" },
    { display: "気候がいい時期ほど、差がつく。ちゃんとやってるな。", audio: "audio/monthly/10/break_10_05.mp3" },
    { display: "今の積み方、悪くねぇ。…少し休んでまた行け。", audio: "audio/monthly/10/break_10_06.mp3" },
    { display: "静かな季節ってのは、静かな強さが育つ。", audio: "audio/monthly/10/break_10_07.mp3" },
    { display: "いい流れだ。崩さず、でも無理しすぎず、休め。", audio: "audio/monthly/10/break_10_08.mp3" },
    { display: "秋は深く潜る季節だ。お前、ちゃんと潜れてる。", audio: "audio/monthly/10/break_10_09.mp3" },
    { display: "よくやった。落ち着いて、次も積んでいこうぜ。", audio: "audio/monthly/10/break_10_10.mp3" }
  ],

  11: [
    { display: "冷えてきたな。こういう時期に黙って積むやつは強い。", audio: "audio/monthly/11/break_11_01.mp3" },
    { display: "11月は渋くいこう。派手さはいらねぇ。", audio: "audio/monthly/11/break_11_02.mp3" },
    { display: "寒さの中でも座ったな。…いいじゃねぇか。", audio: "audio/monthly/11/break_11_03.mp3" },
    { display: "冷える季節は、根っこが育つ。お前もそうだ。", audio: "audio/monthly/11/break_11_04.mp3" },
    { display: "静かに強くなる時期だ。…今は少し休め。", audio: "audio/monthly/11/break_11_05.mp3" },
    { display: "騒がずにやる。その強さ、嫌いじゃねぇ。", audio: "audio/monthly/11/break_11_06.mp3" },
    { display: "ここで積んだやつは冬に崩れねぇ。よくやってる。", audio: "audio/monthly/11/break_11_07.mp3" },
    { display: "寒さに負けず続けてる。…大したもんだ。", audio: "audio/monthly/11/break_11_08.mp3" },
    { display: "11月は派手に見えない。でも、効く月だ。", audio: "audio/monthly/11/break_11_09.mp3" },
    { display: "今は休め。静かな強さは、こうやって育つ。", audio: "audio/monthly/11/break_11_10.mp3" }
  ],

  12: [
    { display: "年末だな。ここまで来たこと自体、まず誇れ。", audio: "audio/monthly/12/break_12_01.mp3" },
    { display: "12月は締めの月だ。…だが、今はちゃんと休め。", audio: "audio/monthly/12/break_12_02.mp3" },
    { display: "一年の終わりに座ってる。お前、ほんとによくやってる。", audio: "audio/monthly/12/break_12_03.mp3" },
    { display: "ここまで積んできた分、ちゃんと力になってる。", audio: "audio/monthly/12/break_12_04.mp3" },
    { display: "年の最後までやるやつは強い。…少し休んでこい。", audio: "audio/monthly/12/break_12_05.mp3" },
    { display: "締めくくりの時期だな。焦らず、でも丁寧にいけ。", audio: "audio/monthly/12/break_12_06.mp3" },
    { display: "この一年、ちゃんと前に進んでる。忘れるなよ。", audio: "audio/monthly/12/break_12_07.mp3" },
    { display: "最後までやり切ろうとする姿勢、いいねぇ。", audio: "audio/monthly/12/break_12_08.mp3" },
    { display: "疲れもあるだろうが、ここで休めるのも実力だ。", audio: "audio/monthly/12/break_12_09.mp3" },
    { display: "よくやった。今年の締めにふさわしい休憩だ。", audio: "audio/monthly/12/break_12_10.mp3" }
  ]
};

// 月データが足りないときの保険
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
  return new Date().getMonth() + 1;
}

function getStartQuote() {
  // 通年固定。複数あっても月で変わらない
  return pickRandomNoRepeat("start_quotes", START_QUOTES) || START_QUOTES[0];
}

function getBreakQuoteForCurrentMonth() {
  const month = getCurrentMonth();
  const arr = BREAK_QUOTES_BY_MONTH[month] || FALLBACK_BREAK_QUOTES;
  return pickRandomNoRepeat(`break_month_${month}`, arr) || arr[0];
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
// UI切り替え
// ======================
function showHomeUI() {
  [elProductName, elSubTitle, elStartMenu, elBrandBox].forEach((el) => el.classList.remove("hidden"));
  [elModeTitle, elQuote, elRingWrap, elLap, elBears].forEach((el) => el.classList.add("hidden"));

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
// フェーズ遷移ロジック
// 授業開始：通年固定名言
// 休憩開始：月ごとのランダム
// ======================
async function goToPhase(nextPhase) {
  if (transitionLock) return;
  transitionLock = true;

  stopTimer();
  stopVoice();

  if (nextPhase === "focus") {
    prepareFocusUI();

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
  currentMode = mode;
  totalSetIndex = 1;
  transitionLock = false;

  await primeAmbient(mode);
  goToPhase("focus");
}

// 初期化
showHomeUI();
window.startStudy = startStudy;
