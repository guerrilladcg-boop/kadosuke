/**
 * 実績バッジ定義
 * code: DBに保存するキー
 * label: 表示名
 * icon: 絵文字アイコン
 * description: 獲得条件の説明
 * check(profile, results): 獲得条件判定関数
 */
export const ACHIEVEMENTS = [
  {
    code: "first_tournament",
    label: "初陣",
    icon: "🎯",
    description: "初めて大会に参加した",
    check: (_, results) => results.length >= 1,
  },
  {
    code: "first_win",
    label: "初優勝",
    icon: "🏆",
    description: "大会で初めて優勝した",
    check: (_, results) => results.some((r) => r.rank === 1),
  },
  {
    code: "ten_tournaments",
    label: "常連",
    icon: "🔥",
    description: "10大会に参加した",
    check: (_, results) => results.length >= 10,
  },
  {
    code: "fifty_tournaments",
    label: "ベテラン",
    icon: "⚔️",
    description: "50大会に参加した",
    check: (_, results) => results.length >= 50,
  },
  {
    code: "three_wins",
    label: "3冠",
    icon: "👑",
    description: "3回優勝した",
    check: (_, results) => results.filter((r) => r.rank === 1).length >= 3,
  },
  {
    code: "ten_wins",
    label: "王者",
    icon: "💎",
    description: "10回優勝した",
    check: (_, results) => results.filter((r) => r.rank === 1).length >= 10,
  },
  {
    code: "high_winrate",
    label: "強者",
    icon: "💪",
    description: "通算勝率70%以上（10戦以上）",
    check: (_, results) => {
      const totalW = results.reduce((s, r) => s + (r.wins || 0), 0);
      const totalL = results.reduce((s, r) => s + (r.losses || 0), 0);
      const total = totalW + totalL;
      return total >= 10 && totalW / total >= 0.7;
    },
  },
  {
    code: "multi_game",
    label: "マルチプレイヤー",
    icon: "🎮",
    description: "3種類以上のゲームで大会参加",
    check: (_, results) => {
      const games = new Set(results.map((r) => r.game));
      return games.size >= 3;
    },
  },
];

/**
 * プロフィールと戦績から獲得済みバッジコードの配列を返す
 */
export function checkAchievements(profile, results) {
  return ACHIEVEMENTS
    .filter((a) => a.check(profile, results))
    .map((a) => a.code);
}

/**
 * コードからバッジ情報を取得
 */
export function getAchievementByCode(code) {
  return ACHIEVEMENTS.find((a) => a.code === code) || null;
}
