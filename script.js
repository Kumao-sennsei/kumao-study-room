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
  }

  currentVoiceAudio = null;
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
      currentAudio.loop = true;
currentAudio.volume = 0.5;
currentAudio.currentTime = 0;
currentAudio.playsInline = true;
currentAudio.preload = "auto";
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
    console.log("[voice] 再生しようとしている音声:", src);

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true;
    currentVoiceAudio = audio;
    currentVoiceEndedOnce = false;

    audio.onended = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
      currentVoiceEndedOnce = true;

      if (typeof onEnded === "function") {
        onEnded();
      }
    };

    audio.onerror = (e) => {
      console.error("ボイス再生エラー:", e, src);

      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
      currentVoiceEndedOnce = true;

      if (typeof onEnded === "function") {
        onEnded();
      }
    };

    audio.play().catch((e) => {
      console.error("ボイス再生失敗:", e, src);

      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
      currentVoiceEndedOnce = true;

      if (typeof onEnded === "function") {
        onEnded();
      }
    });
  } catch (e) {
    console.error("ボイス生成失敗:", e, src);
    currentVoiceAudio = null;
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
    { display: "正月だな。今年も始まった。だがな、お前はもう途中からのスタートだ。その差、忘れるな。一回落ち着け。", audio: "audio/monthly/01/month01_break_01.mp3" },
{ display: "新年ってのはな、リセットじゃねぇ。ここまでの積みを持って進むだけだ。お前、それできてる。少し整えろ。", audio: "audio/monthly/01/month01_break_02.mp3" },
{ display: "正月の空気、静かだろ。この感じ、いいスタートだ。無理せず入れ。軽く休憩だ。", audio: "audio/monthly/01/month01_break_03.mp3" },
{ display: "新年一発目、ちゃんと座ったな。それで十分強ぇ。今年もいける。一回呼吸整えろ。", audio: "audio/monthly/01/month01_break_04.mp3" },
{ display: "周りは浮かれてるな。でもな、お前は動いてる側だ。その差、デカいぞ。水でも飲んどけ。", audio: "audio/monthly/01/month01_break_05.mp3" },
{ display: "正月は流れを作る時期だ。いい入りしてる。そのままいけ。少し抜け。", audio: "audio/monthly/01/month01_break_06.mp3" },
{ display: "新年の最初に崩れねぇやつは強ぇ。お前、ちゃんとやれてる。一回休め。", audio: "audio/monthly/01/month01_break_07.mp3" },
{ display: "初詣行ったか？願うだけじゃ変わらねぇ。やってるお前は違う。軽く整えとけ。", audio: "audio/monthly/01/month01_break_08.mp3" },
{ display: "正月ボケ？関係ねぇな。やるやつはやる。それがお前だ。一回落ち着け。", audio: "audio/monthly/01/month01_break_09.mp3" },
{ display: "新年の一歩、地味でいい。それが後で効く。ちゃんと踏めてる。少し休憩だ。", audio: "audio/monthly/01/month01_break_10.mp3" },
{ display: "いい流れで入れてるな。今年もこのまま積めばいける。呼吸整えろ。", audio: "audio/monthly/01/month01_break_11.mp3" },
{ display: "正月はな、“静かな強さ”が出る時期だ。お前、それ持ってる。軽く間を取れ。", audio: "audio/monthly/01/month01_break_12.mp3" },
{ display: "焦るな。1月は土台だ。ここで崩さなきゃ勝てる。一回抜いとけ。", audio: "audio/monthly/01/month01_break_13.mp3" },
{ display: "新年ってのはな、気持ちより行動だ。お前、もう動いてる。それでいい。少し休め。", audio: "audio/monthly/01/month01_break_14.mp3" },
{ display: "ここで差がつくぞ。気づいてるやつだけが前に出る。お前、その側だ。整えろ。", audio: "audio/monthly/01/month01_break_15.mp3" },
{ display: "今年もやるだけだ。特別なことはいらねぇ。いつも通り積め。一回落ち着け。", audio: "audio/monthly/01/month01_break_16.mp3" },
{ display: "You didn’t fold under pressure. That’s big. 【訳】プレッシャーで折れなかったな。それはデカい。", audio: "audio/rare/01/month01_rare_ultra_01.mp3" },
{ display: "You building something real. Don’t rush it. 【訳】ちゃんとしたもん作ってるな。焦んな。", audio: "audio/rare/01/month01_rare_ultra_02.mp3" },
{ display: "明けまして、おめでとうございます。今年も、ニョキニョキ伸びようぜ。お前に限界なんてねぇからな。ただ、身体は大事にするんだぞ。", audio: "audio/rare/01/month01_rare_ultra_03.mp3" },
{ display: "ある時ふと、昔を思い出した。山の匂い、土の感触、タケノコの味。全部、妙にリアルだった。ああ、俺はあそこから来たんだなってな。", audio: "audio/rare/01/month01_rare_ultra_04.mp3" },
  ],
  2: [
    { display: "梅の花、もう咲き始めてる。まだ寒いのにな。お前も同じだ、見えないとこでちゃんと進んでる。一回落ち着け。", audio: "audio/monthly/02/month02_break_01.mp3" },
{ display: "2月はな、一番キツい時期だ。でもここでやってるやつが最後に抜ける。お前、いい位置いる。少し整えろ。", audio: "audio/monthly/02/month02_break_02.mp3" },
{ display: "椿はな、寒さの中で咲く花だ。派手じゃねぇが強い。今のお前、その感じだ。一回休め。", audio: "audio/monthly/02/month02_break_03.mp3" },
{ display: "まだ寒いな。でもな、この時期の積みが春に効く。ちゃんとやれてる。軽く休憩入れろ。", audio: "audio/monthly/02/month02_break_04.mp3" },
{ display: "手応え薄いか？当たり前だ。今は“仕込み”の時間だ。いい動きしてる。一回呼吸整えろ。", audio: "audio/monthly/02/month02_break_05.mp3" },
{ display: "梅の香り、ほんのり感じるか？春は近い。お前もそこまで来てる。少し抜け。", audio: "audio/monthly/02/month02_break_06.mp3" },
{ display: "ここで折れるやつ、多い。でもな、お前は続けてる。それが全部だ。一回落ち着け。", audio: "audio/monthly/02/month02_break_07.mp3" },
{ display: "2月は結果じゃねぇ、“耐え”だ。ちゃんと踏ん張ってる。いいぞ。軽く間を取れ。", audio: "audio/monthly/02/month02_break_08.mp3" },
{ display: "椿みてぇにな、静かに強ぇやつが最後に勝つ。今のお前、その状態だ。一回休め。", audio: "audio/monthly/02/month02_break_09.mp3" },
{ display: "寒さで鈍るか？それでも動いてる。それが差になる。少し整えろ。", audio: "audio/monthly/02/month02_break_10.mp3" },
{ display: "もうすぐ春だ。でもな、ここで油断するな。この数日が効く。一回抜いとけ。", audio: "audio/monthly/02/month02_break_11.mp3" },
{ display: "梅はな、気づいたら咲いてる。努力も同じだ。お前、ちゃんと積んでる。軽く休憩だ。", audio: "audio/monthly/02/month02_break_12.mp3" },
{ display: "ここまで来たら最後の踏ん張りだ。雑になるなよ。丁寧にいけ。一回呼吸しろ。", audio: "audio/monthly/02/month02_break_13.mp3" },
{ display: "2月を乗り切ったやつは強ぇ。お前、その中にいる。いい流れだ。少し休め。", audio: "audio/monthly/02/month02_break_14.mp3" },
{ display: "寒い時ほど、芯が問われる。お前、ちゃんと持ってる。ここで整えろ。", audio: "audio/monthly/02/month02_break_15.mp3" },
{ display: "もうすぐ抜けるぞ。この感じ、わかるだろ。最後までいけ。一回落ち着け。", audio: "audio/monthly/02/month02_break_16.mp3" },
{ display: "You stayed in the game. That’s already a win. 【訳】ゲームから降りなかったな。それだけでもう勝ちだ。", audio: "audio/rare/02/month02_rare_ultra_01.mp3" },
{ display: "You got more in you. I know it. You know it too. 【訳】まだ力残ってるだろ。俺も知ってるし、お前もわかってる。", audio: "audio/rare/02/month02_rare_ultra_02.mp3" },
{ display: "梅の花が咲いたら次は桜の花か、、。その次は、筍だよな。季節は移り行く。そしてお前は成長する。ニョキニョキな。", audio: "audio/rare/02/month02_rare_ultra_03.mp3" },
{ display: "日本の若いやつらを見た。下向いて、力あるのに止まってる。もったいねぇな、と思った。なら、俺が励ましてやるか。そう思っただけだ。", audio: "audio/rare/02/month02_rare_ultra_04.mp3" },
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
    { display: "新緑ってのはな、静かに伸びてんだ。お前も同じだ。ちゃんと前に進んでる。一回手止めて、少し休め。", audio: "audio/monthly/05/month05_break_01.mp3" },
{ display: "風が気持ちいい季節だな。焦らなくていい、ちゃんとやってる。今は区切りだ。軽く休んどけ。", audio: "audio/monthly/05/month05_break_02.mp3" },
{ display: "５月はな、伸びるやつが伸びる時期だ。お前、ちゃんとその流れに乗ってる。ここで一息入れろ。", audio: "audio/monthly/05/month05_break_03.mp3" },
{ display: "いい感じで積めてるじゃねぇか。新緑みてぇに、ちゃんと伸びてる。ちょっと休んで整えろ。", audio: "audio/monthly/05/month05_break_04.mp3" },
{ display: "今の頑張り、派手じゃねぇな。だがな、こういう時期が一番伸びる。一回落ち着いて、休憩だ。", audio: "audio/monthly/05/month05_break_05.mp3" },
{ display: "外の風、感じてみろ。頭も少し軽くなる。そのまま5分、ゆっくりしとけ。", audio: "audio/monthly/05/month05_break_06.mp3" },
{ display: "5月は調子に乗るやつも、崩れるやつもいる。だがな、お前はちゃんとやってる側だ。少し休んで、次いくぞ。", audio: "audio/monthly/05/month05_break_07.mp3" },
{ display: "なかなかいいペースだ。このまま突っ込む前に、一回整えろ。休憩、入れとけ。", audio: "audio/monthly/05/month05_break_08.mp3" },
{ display: "新しい環境にも慣れてきた頃だな。ここで油断しねぇやつが強い。その前に、軽く休んどけ。", audio: "audio/monthly/05/month05_break_09.mp3" },
{ display: "積み重ねってのはな、見えにくい。だがちゃんと効いてる。今は止まっていい、休め。", audio: "audio/monthly/05/month05_break_10.mp3" },
{ display: "いいか、無理して突っ走るな。伸びるやつは、ちゃんと抜くところ抜く。ここは休憩だ。", audio: "audio/monthly/05/month05_break_11.mp3" },
{ display: "風が抜けるみてぇに、頭も抜いとけ。詰め込みすぎはよくねぇ。少し休めば、また回る。", audio: "audio/monthly/05/month05_break_12.mp3" },
{ display: "今の一歩、ちゃんと意味ある。焦って増やす必要はねぇ。ここで区切って、休憩入れろ。", audio: "audio/monthly/05/month05_break_13.mp3" },
{ display: "悪くねぇ流れだ。このリズム崩さねぇためにもな、一回休んどけ。", audio: "audio/monthly/05/month05_break_14.mp3" },
{ display: "5月はな、地力がつく時期だ。お前、ちゃんとやれてる。少し休んで、次に備えろ。", audio: "audio/monthly/05/month05_break_15.mp3" },
{ display: "俺は５月病で、森に帰りたい気分だ。だが、おまえは頑張れ。まだまだできる。５分後もどってこい。", audio: "audio/monthly/05/month05_break_16.mp3" },
{ display: "You ain’t average, not even close. You built different. 【訳】お前は普通じゃねぇ。マジで別格だ。", audio: "audio/rare/05/month05_rare_ultra_01.mp3" },
{ display: "That grind? Yeah… it speaks loud. People notice that. 【訳】その努力な、ちゃんと響いてる。みんな気づいてる。", audio: "audio/rare/05/month05_rare_ultra_02.mp3" },
{ display: "お前は、この５月めちゃ頑張ってる。ニョキニョキ　伸びているはずだ。　そう。　筍のようにな。", audio: "audio/rare/05/month05_rare_ultra_03.mp3" },
  ],
  6: [
    { display: "紫陽花ってのはな、雨ん中でもちゃんと咲く。お前も同じだ。今の積み、無駄じゃねぇ。少し休んで整えろ。", audio: "audio/monthly/06/month06_break_01.mp3" },
{ display: "雨続きで気分も重いか？それでもやってる。それだけで十分強ぇ。ここで一回、軽く休んどけ。", audio: "audio/monthly/06/month06_break_02.mp3" },
{ display: "梅雨はな、前に進んでる実感が薄い。だがな、根は確実に伸びてる。今は休んで、また動け。", audio: "audio/monthly/06/month06_break_03.mp3" },
{ display: "紫陽花みてぇに、色づくには時間がいる。焦るな。ちゃんと変わってる。少し休め。", audio: "audio/monthly/06/month06_break_04.mp3" },
{ display: "湿気で頭も重てぇな。そんな中でもやってるお前、いいじゃねぇか。一回抜いて、整えろ。", audio: "audio/monthly/06/month06_break_05.mp3" },
{ display: "雨音、聞いてみろ。悪くねぇだろ。こういう時はな、無理に詰めるな。軽く休憩だ。", audio: "audio/monthly/06/month06_break_06.mp3" },
{ display: "梅雨は足取りが重くなる。だが止まってねぇならOKだ。ここで少し休んで、また行け。", audio: "audio/monthly/06/month06_break_07.mp3" },
{ display: "紫陽花は派手じゃねぇ。でもな、ちゃんと咲いてる。お前の努力も同じだ。一回休め。", audio: "audio/monthly/06/month06_break_08.mp3" },
{ display: "なんか進んでねぇ気がするか？それ、錯覚だ。ちゃんとやってる。今は区切りだ、休憩しとけ。", audio: "audio/monthly/06/month06_break_09.mp3" },
{ display: "雨の日はな、無理して飛ばす日じゃねぇ。整える日だ。ここで一息入れろ。", audio: "audio/monthly/06/month06_break_10.mp3" },
{ display: "気分乗らねぇ日もある。それでも座ってる。それが強さだ。少し休んでいい。", audio: "audio/monthly/06/month06_break_11.mp3" },
{ display: "湿った空気はな、焦りも連れてくる。だが流されんな。今は落ち着いて、休憩だ。", audio: "audio/monthly/06/month06_break_12.mp3" },
{ display: "紫陽花はな、比べたりしねぇ。ただ咲くだけだ。お前もそれでいい。一回休め。", audio: "audio/monthly/06/month06_break_13.mp3" },
{ display: "止まりそうな日でも、ちゃんとやってる。それで十分だ。ここで一回、呼吸整えろ。", audio: "audio/monthly/06/month06_break_14.mp3" },
{ display: "雨はいつか止む。それまでの積みが効いてくる。今は焦らず、軽く休め。", audio: "audio/monthly/06/month06_break_15.mp3" },
{ display: "この時期に崩れねぇやつが強ぇ。お前、ちゃんと踏ん張ってるな。少し休んで、また行くぞ。", audio: "audio/monthly/06/month06_break_16.mp3" },
{ display: "No shortcuts, just work. That’s how winners move. 【訳】近道なんかねぇ、やるだけだ。それが勝つやつの動きだ。", audio: "audio/rare/06/month06_rare_ultra_01.mp3" },
{ display: "You stayed solid when it got tough. That’s real strength. 【訳】キツいときに踏ん張ったな。それが本物の強さだ。", audio: "audio/rare/06/month06_rare_ultra_02.mp3" },
{ display: "この梅雨の時期だからこそ、雨を楽しむのさ。筍だけじゃねぇ。雨を欲しているのはな。物事の見方を変えてみると新しいことに気づく。それが６月だ。", audio: "audio/rare/06/month06_rare_ultra_03.mp3" },
{ display: "山の外には、もっと広い世界があるらしい。そう聞いたとき、妙にワクワクしたのを覚えてる。ここじゃねぇどこかに、何かある気がした。理由なんかねぇ。ただ、行きたくなったんだ。", audio: "audio/rare/06/month06_rare_ultra_04.mp3" },
  ],
  7: [
   { display: "向日葵ってのはな、太陽に向かって伸びる。お前も今、ちゃんと上向いてる。少し休んで、また伸びろ。", audio: "audio/monthly/07/month07_break_01.mp3" },
{ display: "夏の始まりだな。この時期に積んだやつが、一気に伸びる。いい流れだ。一回休憩入れろ。", audio: "audio/monthly/07/month07_break_02.mp3" },
{ display: "セミが鳴き始めたな。あいつらも一気に出てきた。お前も今、成長のタイミングだ。少し休め。", audio: "audio/monthly/07/month07_break_03.mp3" },
{ display: "7月はな、差がつき始める月だ。お前、ちゃんと前に出てる側だ。一回整えて次いけ。", audio: "audio/monthly/07/month07_break_04.mp3" },
{ display: "日差し強くなってきたな。その分、お前の伸びも強くなってる。ここで軽く休憩だ。", audio: "audio/monthly/07/month07_break_05.mp3" },
{ display: "いいペースだ。そのまま突っ込む前に、一回整えろ。伸びるやつはここで休む。", audio: "audio/monthly/07/month07_break_06.mp3" },
{ display: "向日葵は迷わねぇ。ただ伸びるだけだ。お前もそれでいい。少し休んで、また上行け。", audio: "audio/monthly/07/month07_break_07.mp3" },
{ display: "夏の風、感じてるか？流れは来てる。お前、ちゃんと乗れてる。一回落ち着け。", audio: "audio/monthly/07/month07_break_08.mp3" },
{ display: "ここ最近の積み、ちゃんと効いてるぞ。成長ってのは急に見えてくる。今は休憩だ。", audio: "audio/monthly/07/month07_break_09.mp3" },
{ display: "焦らなくていい。だが止まるな。そのバランス取れてるのは強ぇ。一回休め。", audio: "audio/monthly/07/month07_break_10.mp3" },
{ display: "夏前にここまで来てるのは上出来だ。このまま伸びるぞ。少し呼吸整えろ。", audio: "audio/monthly/07/month07_break_11.mp3" },
{ display: "セミみてぇに一気に鳴く日が来る。その準備、今ちゃんとできてる。軽く休憩だ。", audio: "audio/monthly/07/month07_break_12.mp3" },
{ display: "いいか、伸びる時ほど詰めすぎるな。壊れたら意味ねぇ。ここで一回抜け。", audio: "audio/monthly/07/month07_break_13.mp3" },
{ display: "周りより一歩先に出てるな。その差、今の積みだ。少し休んで維持しろ。", audio: "audio/monthly/07/month07_break_14.mp3" },
{ display: "夏はな、覚醒するやつが出る時期だ。お前、その入口に立ってる。一回休め。", audio: "audio/monthly/07/month07_break_15.mp3" },
{ display: "ここまで来たら勢いだけじゃねぇ、地力だ。ちゃんと伸びてる。少し整えろ。", audio: "audio/monthly/07/month07_break_16.mp3" },
{ display: "Ain’t nobody handing it to you. You taking it yourself. Respect. 【訳】誰も与えてくれねぇ。でもお前は取りにいってる。リスペクトだ。", audio: "audio/rare/07/month07_rare_ultra_01.mp3" },
{ display: "You locked in, no distractions. That’s elite focus. 【訳】完全に集中モード入ってるな。それは一流の集中力だ。", audio: "audio/rare/07/month07_rare_ultra_02.mp3" },
{ display: "お前のライバルがきのこなら、お前は　筍だ。　そう、俺は信じてる。　ニョキニョキ　伸びて、この夏ライバルに差をつけようぜ。", audio: "audio/rare/07/month07_rare_ultra_03.mp3" },
{ display: "気づいたら、俺は海を見てた。でけぇな、と思った。だがな、それ以上に思ったんだ。「この向こうに行けるなら、行くべきだ」ってな。怖さより、興味が勝った。", audio: "audio/rare/07/month07_rare_ultra_04.mp3" },
  ],
  8: [
   { display: "祭りの音、聞こえるか？誘惑は多いな。だがな、お前はちゃんと戻ってきてる。少し休め。", audio: "audio/monthly/08/month08_break_01.mp3" },
{ display: "夏休みだ。遊びもいい。だがやることやってるお前、かなり強ぇ。一回休憩だ。", audio: "audio/monthly/08/month08_break_02.mp3" },
{ display: "花火は一瞬で消える。だがお前の積みは残る。ここで一息入れて、また行け。", audio: "audio/monthly/08/month08_break_03.mp3" },
{ display: "周りは浮かれてるな。それでも机に戻るお前、相当できる。一回抜け。", audio: "audio/monthly/08/month08_break_04.mp3" },
{ display: "誘惑ってのはな、強い時ほど増える。それでもやってる。いいじゃねぇか。少し休め。", audio: "audio/monthly/08/month08_break_05.mp3" },
{ display: "夜祭り、屋台、楽しそうだな。だがな、お前は未来も取りに行ってる。ここで休憩だ。", audio: "audio/monthly/08/month08_break_06.mp3" },
{ display: "夏は気が緩みやすい。そこで踏ん張れるやつが勝つ。お前、ちゃんとやってる。少し休め。", audio: "audio/monthly/08/month08_break_07.mp3" },
{ display: "花火みたいに派手じゃねぇな。でもな、その積みが一番強ぇ。ここで一回整えろ。", audio: "audio/monthly/08/month08_break_08.mp3" },
{ display: "今日はちょっと誘惑に揺れたか？それでも戻ってきた。それで十分だ。休憩しろ。", audio: "audio/monthly/08/month08_break_09.mp3" },
{ display: "遊びたい気持ちも本物だ。だが続けてるお前も本物だ。少し呼吸整えろ。", audio: "audio/monthly/08/month08_break_10.mp3" },
{ display: "夏休みの差はな、ここで決まる。お前はちゃんと積んでる側だ。一回休め。", audio: "audio/monthly/08/month08_break_11.mp3" },
{ display: "誘惑に勝つってのはな、小さな積み重ねだ。今もそれやってる。軽く休憩だ。", audio: "audio/monthly/08/month08_break_12.mp3" },
{ display: "夜の風、ちょっと気持ちいいだろ。頭もリセットしとけ。次に備えろ。", audio: "audio/monthly/08/month08_break_13.mp3" },
{ display: "花火は終わる。だがな、お前の努力は続く。それが強さだ。少し休め。", audio: "audio/monthly/08/month08_break_14.mp3" },
{ display: "今日は十分やってる。遊びも勉強もバランス取れてる。ここで一回抜け。", audio: "audio/monthly/08/month08_break_15.mp3" },
{ display: "夏が終わる頃、差が見える。お前は今、その差を作ってる側だ。少し休憩だ。", audio: "audio/monthly/08/month08_break_16.mp3" },
{ display: "That consistency? Dangerous. You getting stronger every day. 【訳】その継続力、マジで強い。毎日ちゃんと進化してる。", audio: "audio/rare/08/month08_rare_ultra_01.mp3" },
{ display: "You showing up every day. That’s how legends are made. 【訳】毎日ちゃんと来てるな。それが伝説の作り方だ。", audio: "audio/rare/08/month08_rare_ultra_02.mp3" },
{ display: "筍はな、１日で数ｃｍニョキニョキ伸びるんだぜ。ピーク時には１日１ｍも伸びるんだ。すげえよな。この夏、お前が、どれだけ伸びるか俺が見ててやる。", audio: "audio/rare/08/month08_rare_ultra_03.mp3" },
{ display: "言葉も通じねぇ土地でな、俺は働いた。皿洗い、掃除、なんでもやった。なめられたこともある。だがな、全部飲み込んだ。ここで折れたら、全部終わりだからな。", audio: "audio/rare/08/month08_rare_ultra_04.mp3" },
  ],
  9: [
    { display: "風、変わってきただろ。季節が動く時はな、人も動く。お前、ちゃんと進んでる。一回落ち着け。", audio: "audio/monthly/09/month09_break_01.mp3" },
{ display: "夏終わったな。遊んだやつと積んだやつ、ここから差が出る。お前は後者だ。少し休め。", audio: "audio/monthly/09/month09_break_02.mp3" },
{ display: "空気が軽くなってきたな。こういう時はな、もう一段上いける。5分だけ整えろ。", audio: "audio/monthly/09/month09_break_03.mp3" },
{ display: "いい流れだ。そのまま行く前に、水でも飲め。落ち着いてから次だ。", audio: "audio/monthly/09/month09_break_04.mp3" },
{ display: "周りが戻ってきたな。だがな、お前はもう一歩前にいる。その差、大事にしろ。一回休憩だ。", audio: "audio/monthly/09/month09_break_05.mp3" },
{ display: "焦る必要はねぇ。ただ続けてるやつが勝つ。お前、それやってる。5分休め。命令だ。", audio: "audio/monthly/09/month09_break_06.mp3" },
{ display: "夏の積み、ちゃんと残ってるだろ。それが地力だ。一回抜いて、もう一段上いくぞ。", audio: "audio/monthly/09/month09_break_07.mp3" },
{ display: "なんとなく気が抜ける時期だな。だからこそやってるお前、強ぇ。少し休んどけ。", audio: "audio/monthly/09/month09_break_08.mp3" },
{ display: "風が涼しくなってきたな。頭も冷えてくる。このタイミングで整えろ。5分だけな。", audio: "audio/monthly/09/month09_break_09.mp3" },
{ display: "いいか、ここで崩れるやつ多い。だがな、お前は違う。ちゃんと踏ん張ってる。一回休め。", audio: "audio/monthly/09/month09_break_10.mp3" },
{ display: "少し現実戻ってきたか？いい兆候だ。ここからが本番だぞ。軽く休憩入れろ。", audio: "audio/monthly/09/month09_break_11.mp3" },
{ display: "夏の勢い、そのまま持ってこれてるな。それが強さだ。一回深呼吸しとけ。", audio: "audio/monthly/09/month09_break_12.mp3" },
{ display: "周りが焦り出す頃だな。でもな、お前は淡々とやれてる。それでいい。少し休め。", audio: "audio/monthly/09/month09_break_13.mp3" },
{ display: "この時期の一歩、あとで効いてくる。ちゃんと踏み出してる。何か飲んで整えろ。", audio: "audio/monthly/09/month09_break_14.mp3" },
{ display: "調子悪くねぇな。このまま積めば、さらに抜ける。5分後、続きやろうぜ。", audio: "audio/monthly/09/month09_break_15.mp3" },
{ display: "いい位置いるぞ今。無理に飛ばすな。整えて、確実にいけ。一回休憩だ。", audio: "audio/monthly/09/month09_break_16.mp3" },
{ display: "You didn’t quit. That alone puts you ahead. 【訳】やめなかった。それだけでお前はもう前にいる。", audio: "audio/rare/09/month09_rare_ultra_01.mp3" },
{ display: "You putting in work when nobody’s watching. That’s real power. 【訳】誰も見てないとこでやってるな。それが本当の力だ。", audio: "audio/rare/09/month09_rare_ultra_02.mp3" },
{ display: "キノコの里とたけのこの里、どっちが好きかだって？　俺はどっちも好きだぜ。　まあポッキーが１番好きなんだがな。休憩中。俺が加えているのはポッキーだぜ。", audio: "audio/rare/09/month09_rare_ultra_03.mp3" },
{ display: "ある日、「金が金を生む場所」を知った。意味がわからなかった。だがな、画面の数字を見てるうちに気づいた。ここは戦場だ。そして俺は、こういう場所が嫌いじゃなかった。", audio: "audio/rare/09/month09_rare_ultra_04.mp3" },
  ],
  10: [
    { display: "金木犀の香り、気づいたか？季節は進んでる。お前も同じだ。ちゃんと仕上がってきてる。一回休め。", audio: "audio/monthly/10/month10_break_01.mp3" },
{ display: "コスモスはな、派手じゃねぇが強い。お前の今の積みもそれだ。軽く休憩入れとけ。", audio: "audio/monthly/10/month10_break_02.mp3" },
{ display: "空気が澄んできたな。こういう時期は、実力もハッキリ出る。いい位置いるぞ。少し休め。", audio: "audio/monthly/10/month10_break_03.mp3" },
{ display: "ここまで来たな。積み重ねが“形”になり始めてる。焦るなよ。5分だけ整えろ。", audio: "audio/monthly/10/month10_break_04.mp3" },
{ display: "秋風ってのはな、余計なもんを落としてくる。お前も一回リセットしとけ。水でも飲め。", audio: "audio/monthly/10/month10_break_05.mp3" },
{ display: "いい仕上がりだ。このまま崩さなきゃ勝てる。一回抜いて、次いくぞ。", audio: "audio/monthly/10/month10_break_06.mp3" },
{ display: "コスモスみてぇに、静かに強ぇな今のお前。派手じゃねぇが確実だ。少し休め。", audio: "audio/monthly/10/month10_break_07.mp3" },
{ display: "焦りは減ってきたな。それ、成長の証拠だ。いい流れだぞ。軽く休憩だ。", audio: "audio/monthly/10/month10_break_08.mp3" },
{ display: "秋の空、広いだろ。視野も同じように広がってる。ここで一回、呼吸整えろ。", audio: "audio/monthly/10/month10_break_09.mp3" },
{ display: "ここまで来たやつはな、簡単には崩れねぇ。お前、その段階入ってる。5分休め。命令だ。", audio: "audio/monthly/10/month10_break_10.mp3" },
{ display: "金木犀の香りみてぇに、気づけば広がってる。それがお前の力だ。一回落ち着け。", audio: "audio/monthly/10/month10_break_11.mp3" },
{ display: "いいか、ここからは“量”じゃねぇ。“精度”だ。今のお前ならいける。少し休め。", audio: "audio/monthly/10/month10_break_12.mp3" },
{ display: "秋はな、完成に近づく季節だ。お前、ちゃんとそこにいる。一回整えろ。", audio: "audio/monthly/10/month10_break_13.mp3" },
{ display: "調子いいな。このままいけば抜けるぞ。5分後、もう一段上いこうぜ。", audio: "audio/monthly/10/month10_break_14.mp3" },
{ display: "無駄な動き減ってきたな。それが強さだ。ここで一回抜いとけ。", audio: "audio/monthly/10/month10_break_15.mp3" },
{ display: "ここまで積んできたやつだけが見える景色だ。お前、ちゃんと来てる。少し休憩だ。", audio: "audio/monthly/10/month10_break_16.mp3" },
{ display: "You got that main character energy. Don’t lose it. 【訳】主役のオーラ出てるぞ。それ、手放すな。", audio: "audio/rare/10/month10_rare_ultra_01.mp3" },
{ display: "Pressure didn’t break you. It built you. 【訳】プレッシャーで潰れなかったな。むしろ強くなってる。", audio: "audio/rare/10/month10_rare_ultra_02.mp3" },
{ display: "筍といえば、かぐや姫だよな。　かぐや姫が生まれたのは７月７日だ。　意外だよな。　そう。この意外だなって感触を学習に取り入れると強ぇ。", audio: "audio/rare/10/month10_rare_ultra_03.mp3" },
{ display: "負け続けた。笑えるくらいな。だがな、ある日突然、流れが見えた。理由は説明できねぇ。ただ、「ああ、そういうことか」ってな。そこからは、負け方が変わった。", audio: "audio/rare/10/month10_rare_ultra_04.mp3" },
  ],
  11: [
    { display: "紅葉、きれいに色づいてきたな。時間かけたやつだけがこうなる。お前も同じだ、ちゃんと仕上がってる。ここで一息入れろ。", audio: "audio/monthly/11/month11_break_01.mp3" },
{ display: "いちょうの葉が落ち始めたな。無駄なもんが削ぎ落ちて、本質だけ残る時期だ。今のお前、かなりいい状態だぞ。少し整えとけ。", audio: "audio/monthly/11/month11_break_02.mp3" },
{ display: "ここまで来たな。あとは崩さねぇことだ。派手にやる必要はねぇ、丁寧にいけ。軽く休憩挟め。", audio: "audio/monthly/11/month11_break_03.mp3" },
{ display: "紅葉はな、焦って色づくもんじゃねぇ。積み重ねたやつだけが染まる。お前、その段階にいる。一回落ち着け。", audio: "audio/monthly/11/month11_break_04.mp3" },
{ display: "空気、だいぶ冷えてきたな。集中力も研ぎ澄まされる時期だ。今の流れ、大事にしろ。水でも飲んどけ。", audio: "audio/monthly/11/month11_break_05.mp3" },
{ display: "いい仕上がりだ。無理に上げなくていい、この精度を維持しろ。ここで少し抜け。", audio: "audio/monthly/11/month11_break_06.mp3" },
{ display: "いちょう並木、静かだろ。ああいう空気が今のお前だ。騒がず、確実に強い。呼吸整えろ。", audio: "audio/monthly/11/month11_break_07.mp3" },
{ display: "ここからは勝負の準備だ。焦るやつほど崩れる。お前は違う、ちゃんと積んでる。5分だけ静かにしろ。", audio: "audio/monthly/11/month11_break_08.mp3" },
{ display: "紅葉が散る前が一番綺麗だろ。完成ってのはそういうもんだ。今のお前、かなりいい位置だ。少し休め。", audio: "audio/monthly/11/month11_break_09.mp3" },
{ display: "無駄な動き、ほぼ消えてるな。それが今の強さだ。このままいけば届くぞ。軽く間を取れ。", audio: "audio/monthly/11/month11_break_10.mp3" },
{ display: "ここで欲張るな。やることはもう決まってる。あとは繰り返すだけだ。一回力抜いとけ。", audio: "audio/monthly/11/month11_break_11.mp3" },
{ display: "いちょうの黄色、目立つよな。でもな、目立つ前にちゃんと積んでる。それがお前だ。少し整えろ。", audio: "audio/monthly/11/month11_break_12.mp3" },
{ display: "いい流れだ。このまま最後まで持っていけ。崩すなよ。一回深呼吸入れろ。", audio: "audio/monthly/11/month11_break_13.mp3" },
{ display: "11月はな、“答え合わせ”が始まる月だ。お前の積み、ちゃんと通用してる。ここで一区切りだ。", audio: "audio/monthly/11/month11_break_14.mp3" },
{ display: "焦り、ほぼなくなったな。それが本物の状態だ。このまま淡々といけ。少し休憩だ。", audio: "audio/monthly/11/month11_break_15.mp3" },
{ display: "ここまで来たやつは強ぇ。あとはやるだけだ。いいな？次の一手、準備しとけ。", audio: "audio/monthly/11/month11_break_16.mp3" },
{ display: "You hungry. I can see it. Keep going. 【訳】その貪欲さ、見えてるぞ。そのまま行け。", audio: "audio/rare/11/month11_rare_ultra_01.mp3" },
{ display: "You ain’t lucky. You earned that. 【訳】それは運じゃねぇ。ちゃんと勝ち取ったもんだ。", audio: "audio/rare/11/month11_rare_ultra_02.mp3" },
{ display: "俺が休憩中に加えているのはポッキーだ。たけのこの里も好きだが、ポッキーもいいよな。　最近、寒くなってきてる。暖かくして、風邪ひくんじゃねーぞ。", audio: "audio/rare/11/month11_rare_ultra_03.mp3" },
{ display: "気づけば、金は増えていた。だがな、金そのものには興味がなかった。面白かったのは、「勝てる」って事実だ。積み上げたのは金じゃねぇ。自分への確信だ。", audio: "audio/rare/11/month11_rare_ultra_04.mp3" },
  ],
  12: [
   { display: "クリスマスが近いな。今年の自分に何を渡せるか、それが全部だ。お前、ちゃんと積んできた。一回落ち着け。", audio: "audio/monthly/12/month12_break_01.mp3" },
{ display: "師走はな、流されるやつが多い。でもお前は違う。ここまで来た積み、無駄じゃねぇ。少し整えとけ。", audio: "audio/monthly/12/month12_break_02.mp3" },
{ display: "サンタクロースはな、頑張ったやつに来る。お前、自分でちゃんと用意してる側だ。軽く休憩入れろ。", audio: "audio/monthly/12/month12_break_03.mp3" },
{ display: "ここまで来たな。今年の積み、ちゃんと形になってる。最後まで崩すな。水でも飲んどけ。", audio: "audio/monthly/12/month12_break_04.mp3" },
{ display: "クリスマスの光、綺麗だろ。だがな、お前の積みの方が価値ある。一回深呼吸しとけ。", audio: "audio/monthly/12/month12_break_05.mp3" },
{ display: "師走は忙しい。それでもやってるお前、かなり強ぇ。ここで一息入れとけ。", audio: "audio/monthly/12/month12_break_06.mp3" },
{ display: "サンタなんて待つな。自分で取りに行ったもんが一番デカい。今のお前、それできてる。少し抜け。", audio: "audio/monthly/12/month12_break_07.mp3" },
{ display: "今年、途中で止まらなかったな。それがすべてだ。いい年にしてる。一回休め。", audio: "audio/monthly/12/month12_break_08.mp3" },
{ display: "クリスマス前ってのはな、浮かれるやつが多い。でもお前は積んでる側だ。その差、大事にしろ。呼吸整えろ。", audio: "audio/monthly/12/month12_break_09.mp3" },
{ display: "師走の空気、速ぇだろ。その中で流されてねぇ。それが強さだ。軽く間を取れ。", audio: "audio/monthly/12/month12_break_10.mp3" },
{ display: "ここまで来たらな、あとは“やりきる”だけだ。お前ならできる。一回落ち着け。", audio: "audio/monthly/12/month12_break_11.mp3" },
{ display: "サンタが来るかどうかじゃねぇ。自分で積んだもんが残る。それが本物だ。少し整えろ。", audio: "audio/monthly/12/month12_break_12.mp3" },
{ display: "今年の自分、悪くねぇな。むしろかなりいい。ここで一回、区切り入れとけ。", audio: "audio/monthly/12/month12_break_13.mp3" },
{ display: "クリスマスの夜、ちゃんと頑張ったやつだけが静かに笑う。お前、その側だ。少し休め。", audio: "audio/monthly/12/month12_break_14.mp3" },
{ display: "師走の最後まで踏ん張れるやつが勝つ。お前、ここまで来てる。軽く抜いとけ。", audio: "audio/monthly/12/month12_break_15.mp3" },
{ display: "今年やりきったな。その顔してるぞ。あとは締めるだけだ。次の一手、準備しとけ。", audio: "audio/monthly/12/month12_break_16.mp3" },
{ display: "That mindset? Top tier. Stay like that. 【訳】その考え方、トップクラスだ。そのままでいけ。", audio: "audio/rare/12/month12_rare_ultra_01.mp3" },
{ display: "You moving different now. Level up looks good on you. 【訳】動き変わってきてるな。ちゃんとレベル上がってる。", audio: "audio/rare/12/month12_rare_ultra_02.mp3" },
{ display: "この寒い時期だからこそ、足もと（基礎）にも目を向けるんだ。筍だって根をはらないとニョキニョキ伸びないからな。", audio: "audio/rare/12/month12_rare_ultra_03.mp3" },
{ display: "表に出る必要はなかった。裏で動かす方が、楽だからな。気づけば、名前も知らねぇ連中が俺の判断で動いてた。笑える話だ。だが、それが現実だった。", audio: "audio/rare/12/month12_rare_ultra_04.mp3" },
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
  return parseInt(monthText, 10);
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
  return RARE_QUOTES_BY_MONTH[month] || FALLBACK_RARE_QUOTES;
}


function getStartQuote() {
  return pickRandomNoRepeat("start_quotes", START_QUOTES) || START_QUOTES[0];
}

function getBreakQuoteForCurrentMonth() {
  const month = getCurrentMonth();
  const arr = BREAK_QUOTES_BY_MONTH[month];

  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`休憩音声データがありません。month=${month}`);
  }

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
const elStoryBtn = document.getElementById("storyBtn");
const storyBookBtn = document.getElementById("storyBookBtn");
const storyBookModal = document.getElementById("storyBookModal");


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
function getRareProbability(round) {
  if (round === 1) return 0.01;
  if (round === 2) return 0.03;
  if (round === 3) return 0.05;
  return 0.10;
}

function shouldShowRareButton() {
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
}

function showRareButton(onClickHandler) {
  if (!elRareBtn) return;

  elRareBtn.textContent = "レアボイス当選！おめでとう🎉 押してみてね🐻✨";
  elRareBtn.disabled = false;
  elRareBtn.classList.remove("hidden");
  const fragmentId = `story_${getCurrentMonth().toString().padStart(2, "0")}`;

if (!hasStoryFragment(fragmentId)) {
  elStoryBtn.classList.remove("hidden");
}
  elRareBtn.classList.add("rare-glow");
  elRareBtn.onclick = onClickHandler;
  elStoryBtn.onclick = () => {
  saveStoryFragment(fragmentId);
    elStoryBtn.classList.add("hidden");
};
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
    stopVoice();
    prepareBreakUI();

    const quote = getBreakQuoteForCurrentMonth();
    elQuote.textContent = quote.display;

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

  if (!unlocked.includes(3)) unlocked.push(3);

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

 

