import { Share, Alert } from "react-native";

// ストア公開後に実際のURLに差し替え
const APP_STORE_URL = "https://kadosuke.app";

export const shareText = async (message) => {
  try {
    await Share.share({ message: message + "\n\n" + APP_STORE_URL });
  } catch (e) {
    if (e.message !== "User did not share") {
      Alert.alert("エラー", "シェアに失敗しました");
    }
  }
};

// 大会結果シェア
export const shareTournamentResult = (result) => {
  const medal =
    result.rank === 1 ? "🥇" :
    result.rank === 2 ? "🥈" :
    result.rank === 3 ? "🥉" : "🏅";
  const hasWL = (result.wins || 0) > 0 || (result.losses || 0) > 0;
  let msg =
    `${medal} ${result.tournament_name}で${result.rank}位を獲得しました！\n` +
    `🎮 ${result.game}\n`;
  if (hasWL) {
    msg += `📊 ${result.wins}勝${result.losses}敗`;
    if ((result.draws || 0) > 0) msg += `${result.draws}分`;
    msg += `\n`;
  }
  if (result.deck_name) {
    msg += `🃏 ${result.deck_name}\n`;
  }
  msg += `📅 ${result.date}\n` +
    `#カドスケ`;
  return shareText(msg);
};

// 招待コードシェア
export const shareReferralCode = (code) => {
  const msg =
    `カドスケ！で一緒にカードゲーム大会を楽しもう！\n` +
    `招待コード: ${code}\n` +
    `登録時に入力すると50ptもらえます！\n` +
    `#カドスケ`;
  return shareText(msg);
};

// 大会情報シェア
export const shareTournament = (tournament) => {
  const dateStr = new Date(tournament.date).toLocaleDateString("ja-JP", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  let msg =
    `${tournament.game} の大会情報\n` +
    `${tournament.name}\n` +
    `${dateStr}\n`;
  if (tournament.location) msg += `${tournament.location}\n`;
  if (tournament.organizer) msg += `主催: ${tournament.organizer}\n`;
  msg += `#カドスケ`;
  return shareText(msg);
};

// プロフィールシェア
export const shareProfile = (displayName) => {
  const msg =
    `カドスケ！で活動中！\n` +
    `プレイヤー: ${displayName}\n` +
    `#カドスケ`;
  return shareText(msg);
};
