// 通算ミッション定義
// key: useMissions.js のカウントマップのキーに対応
export const MISSIONS = [
  // 大会参加系
  { id: "entry_1",  key: "entries",   category: "tournament", label: "初エントリー",        desc: "大会に初めてエントリーする",     count: 1,  reward: 50  },
  { id: "entry_5",  key: "entries",   category: "tournament", label: "常連プレイヤー",      desc: "大会に5回エントリーする",        count: 5,  reward: 100 },
  { id: "entry_10", key: "entries",   category: "tournament", label: "ベテランプレイヤー",   desc: "大会に10回エントリーする",       count: 10, reward: 200 },

  // 戦績系
  { id: "result_1", key: "results",   category: "result",     label: "初戦績登録",          desc: "戦績を初めて登録する",           count: 1,  reward: 50  },
  { id: "win_1",    key: "wins",      category: "result",     label: "初優勝",              desc: "大会で初めて優勝する",           count: 1,  reward: 100 },
  { id: "win_3",    key: "wins",      category: "result",     label: "3冠王",               desc: "大会で3回優勝する",              count: 3,  reward: 300 },

  // ログイン系
  { id: "login_7",  key: "logins",    category: "login",      label: "1週間継続",           desc: "通算7日ログインする",            count: 7,  reward: 50  },
  { id: "login_30", key: "logins",    category: "login",      label: "1ヶ月継続",           desc: "通算30日ログインする",           count: 30, reward: 200 },

  // ソーシャル系
  { id: "follow_1", key: "follows",   category: "social",     label: "初フォロー",          desc: "主催者を1人フォローする",         count: 1,  reward: 30  },
  { id: "follow_3", key: "follows",   category: "social",     label: "情報通",              desc: "主催者を3人フォローする",         count: 3,  reward: 100 },
  { id: "fav_3",    key: "favorites", category: "social",     label: "コレクター",          desc: "大会を3つお気に入り登録する",     count: 3,  reward: 50  },

  // 広告視聴系
  { id: "ad_5",     key: "ads",       category: "engagement", label: "動画マスター",        desc: "広告を通算5回視聴する",          count: 5,  reward: 50  },
  { id: "ad_20",    key: "ads",       category: "engagement", label: "動画コレクター",      desc: "広告を通算20回視聴する",         count: 20, reward: 150 },
];
