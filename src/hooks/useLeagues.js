import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useLeagues = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // --- リーグ一覧取得 ---
  const fetchMyLeagues = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("leagues")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setLeagues(data || []);
    setLoading(false);
  }, [user]);

  // --- リーグ作成 ---
  const createLeague = async (leagueData) => {
    if (!user) return { error: "未ログイン" };
    const { data, error } = await supabase
      .from("leagues")
      .insert({ ...leagueData, created_by: user.id })
      .select()
      .single();
    if (!error) await fetchMyLeagues();
    return { data, error };
  };

  // --- リーグ削除 ---
  const deleteLeague = async (leagueId) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("leagues")
      .delete()
      .eq("id", leagueId)
      .eq("created_by", user.id);
    if (!error) await fetchMyLeagues();
    return { error };
  };

  // --- リーグ完了 ---
  const completeLeague = async (leagueId) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("leagues")
      .update({ status: "completed" })
      .eq("id", leagueId)
      .eq("created_by", user.id);
    if (!error) await fetchMyLeagues();
    return { error };
  };

  // --- ラウンド一覧取得 ---
  const fetchRounds = async (leagueId) => {
    const { data } = await supabase
      .from("league_rounds")
      .select("*")
      .eq("league_id", leagueId)
      .order("round_number", { ascending: true });
    return data || [];
  };

  // --- ラウンド追加 ---
  const addRound = async (leagueId, roundData) => {
    // 次のラウンド番号を取得
    const { data: existing } = await supabase
      .from("league_rounds")
      .select("round_number")
      .eq("league_id", leagueId)
      .order("round_number", { ascending: false })
      .limit(1);

    const nextNumber = existing && existing.length > 0 ? existing[0].round_number + 1 : 1;

    const { data, error } = await supabase
      .from("league_rounds")
      .insert({
        league_id: leagueId,
        round_number: nextNumber,
        name: roundData.name || `第${nextNumber}回`,
        date: roundData.date || null,
      })
      .select()
      .single();
    return { data, error };
  };

  // --- ラウンド結果インポート ---
  const importRoundResults = async (roundId, csvData) => {
    // 既存結果を削除してから新規挿入
    await supabase.from("league_round_results").delete().eq("round_id", roundId);

    const rows = csvData.map((row) => ({
      round_id: roundId,
      player_name: row.player_name,
      deck_name: row.deck_name,
      ranking: row.ranking,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      points: row.points,
    }));

    const { error } = await supabase.from("league_round_results").insert(rows);
    return { error };
  };

  // --- スタンディング更新 ---
  const updateStandings = async (leagueId) => {
    // 全ラウンド結果を取得
    const { data: rounds } = await supabase
      .from("league_rounds")
      .select("id")
      .eq("league_id", leagueId);

    if (!rounds || rounds.length === 0) return;

    const roundIds = rounds.map((r) => r.id);
    const { data: results } = await supabase
      .from("league_round_results")
      .select("*")
      .in("round_id", roundIds);

    if (!results) return;

    // プレイヤー別に集計
    const playerMap = {};
    results.forEach((r) => {
      if (!playerMap[r.player_name]) {
        playerMap[r.player_name] = {
          player_name: r.player_name,
          deck_name: r.deck_name,
          total_wins: 0,
          total_losses: 0,
          total_draws: 0,
          total_points: 0,
          rounds_played: 0,
        };
      }
      const p = playerMap[r.player_name];
      p.total_wins += r.wins || 0;
      p.total_losses += r.losses || 0;
      p.total_draws += r.draws || 0;
      p.total_points += r.points || 0;
      p.rounds_played += 1;
      // 最新のデッキ名を保持
      if (r.deck_name) p.deck_name = r.deck_name;
    });

    // ポイント順でランク付け
    const standings = Object.values(playerMap).sort(
      (a, b) => b.total_points - a.total_points || b.total_wins - a.total_wins
    );
    standings.forEach((s, i) => (s.rank = i + 1));

    // 既存スタンディング削除 → 再挿入
    await supabase.from("league_standings").delete().eq("league_id", leagueId);
    const rows = standings.map((s) => ({ league_id: leagueId, ...s }));
    if (rows.length > 0) {
      await supabase.from("league_standings").insert(rows);
    }
  };

  // --- スタンディング取得 ---
  const fetchStandings = async (leagueId) => {
    const { data } = await supabase
      .from("league_standings")
      .select("*")
      .eq("league_id", leagueId)
      .order("rank", { ascending: true });
    return data || [];
  };

  return {
    leagues,
    loading,
    fetchMyLeagues,
    createLeague,
    deleteLeague,
    completeLeague,
    fetchRounds,
    addRound,
    importRoundResults,
    updateStandings,
    fetchStandings,
  };
};
