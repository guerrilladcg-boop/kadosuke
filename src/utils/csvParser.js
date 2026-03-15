import Papa from "papaparse";

/**
 * CSVテキストをパースしてバリデーション
 * 期待カラム: player_name, ranking, wins, losses, draws, deck_name
 * player_name は必須、他は任意
 */
export const parseResultsCSV = (csvText) => {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const errors = [];
  const data = [];

  if (result.errors.length > 0) {
    result.errors.forEach((e) => {
      errors.push(`行 ${e.row + 1}: ${e.message}`);
    });
  }

  // ヘッダー検証
  const headers = result.meta.fields || [];
  if (!headers.includes("player_name")) {
    errors.push("「player_name」列が見つかりません");
    return { data: [], errors };
  }

  result.data.forEach((row, idx) => {
    const lineNum = idx + 2; // ヘッダー行 + 0-indexed
    const playerName = (row.player_name || "").trim();

    if (!playerName) {
      errors.push(`行 ${lineNum}: player_name が空です`);
      return;
    }

    const ranking = row.ranking ? parseInt(row.ranking) : null;
    const wins = row.wins ? parseInt(row.wins) : 0;
    const losses = row.losses ? parseInt(row.losses) : 0;
    const draws = row.draws ? parseInt(row.draws) : 0;
    const deckName = (row.deck_name || "").trim() || null;

    // 数値バリデーション
    if (row.ranking && isNaN(ranking)) {
      errors.push(`行 ${lineNum}: ranking が数値ではありません`);
      return;
    }
    if (row.wins && isNaN(wins)) {
      errors.push(`行 ${lineNum}: wins が数値ではありません`);
      return;
    }

    data.push({
      player_name: playerName,
      ranking,
      wins,
      losses,
      draws,
      deck_name: deckName,
      points: wins * 3 + draws, // 勝ち3点、引き分け1点
    });
  });

  return { data, errors };
};
