// レベルシステム定義
// 必要EXP計算式: レベルN→N+1 = 50 + (N-1) * 20

export const MAX_LEVEL = 50;

// 各レベルに必要な累計EXP（事前計算）
// LEVEL_TABLE[n] = レベルn+1に到達するための累計EXP
const buildLevelTable = () => {
  const table = [0]; // Lv1 = 0 EXP
  let cumulative = 0;
  for (let lv = 1; lv < MAX_LEVEL; lv++) {
    const needed = 50 + (lv - 1) * 20; // Lv1→2: 50, Lv2→3: 70, ...
    cumulative += needed;
    table.push(cumulative);
  }
  return table;
};

export const LEVEL_TABLE = buildLevelTable();

// 称号定義
const TITLE_RANGES = [
  { min: 1, max: 4, title: "ビギナー" },
  { min: 5, max: 9, title: "ルーキー" },
  { min: 10, max: 14, title: "レギュラー" },
  { min: 15, max: 19, title: "ベテラン" },
  { min: 20, max: 24, title: "エキスパート" },
  { min: 25, max: 29, title: "マスター" },
  { min: 30, max: 34, title: "チャンピオン" },
  { min: 35, max: 39, title: "レジェンド" },
  { min: 40, max: 44, title: "グランドマスター" },
  { min: 45, max: 49, title: "カドスケ王" },
  { min: 50, max: 50, title: "カドスケ神" },
];

// 活動ごとのEXP獲得量
export const EXP_REWARDS = {
  LOGIN_BONUS: 10,
  MISSION_CLAIM: 20,
  AD_VIEW: 5,
  TOURNAMENT_ENTRY: 30,
  FAVORITE: 5,
  FOLLOW_ORGANIZER: 10,
  EXCHANGE_ITEM: 15,
  LOTTERY_ENTRY: 10,
  INSTANT_LOTTERY: 10,
  UPDATE_NAME: 10,
  UPLOAD_AVATAR: 20,
  UPDATE_SHIPPING: 10,
  REFERRAL_REFERRER: 50,
  REFERRAL_NEW_USER: 30,
};

// EXPからレベルを算出
export const getLevelFromExp = (exp) => {
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (exp >= LEVEL_TABLE[lv - 1]) return lv;
  }
  return 1;
};

// レベルから称号を取得
export const getTitleForLevel = (level) => {
  const range = TITLE_RANGES.find((r) => level >= r.min && level <= r.max);
  return range ? range.title : "ビギナー";
};

// 次レベルまでの必要EXP（現レベルから次レベルへの差分）
export const getExpForNextLevel = (level) => {
  if (level >= MAX_LEVEL) return 0;
  return LEVEL_TABLE[level] - LEVEL_TABLE[level - 1];
};

// 現レベル内の進捗（0〜1）
export const getCurrentLevelProgress = (exp) => {
  const level = getLevelFromExp(exp);
  if (level >= MAX_LEVEL) return 1;
  const currentLevelExp = LEVEL_TABLE[level - 1];
  const nextLevelExp = LEVEL_TABLE[level];
  const progress = (exp - currentLevelExp) / (nextLevelExp - currentLevelExp);
  return Math.min(Math.max(progress, 0), 1);
};

// 現レベル内の残りEXP情報
export const getLevelExpInfo = (exp) => {
  const level = getLevelFromExp(exp);
  if (level >= MAX_LEVEL) {
    return { current: 0, needed: 0, remaining: 0 };
  }
  const currentLevelExp = LEVEL_TABLE[level - 1];
  const nextLevelExp = LEVEL_TABLE[level];
  return {
    current: exp - currentLevelExp,
    needed: nextLevelExp - currentLevelExp,
    remaining: nextLevelExp - exp,
  };
};
