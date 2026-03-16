import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useLeagues = () => {
  const [leagues, setLeagues] = useState([]);
  const [participatingLeagues, setParticipatingLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // --- リーグ一覧取得（自分が作成したもの） ---
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

  // --- 参加中リーグ一覧取得（ホーム画面用） ---
  const fetchMyParticipatingLeagues = useCallback(async () => {
    if (!user) return [];
    // league_participants から自分が参加しているリーグを取得
    const { data: participations } = await supabase
      .from("league_participants")
      .select("league_id, player_name")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      setParticipatingLeagues([]);
      return [];
    }

    const leagueIds = participations.map((p) => p.league_id);
    const playerNameMap = {};
    participations.forEach((p) => { playerNameMap[p.league_id] = p.player_name; });

    // リーグ情報取得
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*")
      .in("id", leagueIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!leagueData || leagueData.length === 0) {
      setParticipatingLeagues([]);
      return [];
    }

    // 各リーグのスタンディング取得
    const results = [];
    for (const league of leagueData) {
      const myName = playerNameMap[league.id];
      const { data: standings } = await supabase
        .from("league_standings")
        .select("*")
        .eq("league_id", league.id)
        .order("rank", { ascending: true });

      const myStanding = standings?.find((s) => s.player_name === myName) || null;
      const totalPlayers = standings?.length || 0;

      results.push({
        ...league,
        myPlayerName: myName,
        myStanding,
        totalPlayers,
        topStandings: (standings || []).slice(0, 5),
      });
    }

    setParticipatingLeagues(results);
    return results;
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

  // --- スタンディング更新（勝ち点ルール対応） ---
  const updateStandings = async (leagueId) => {
    // リーグ情報取得（勝ち点ルール）
    const { data: leagueInfo } = await supabase
      .from("leagues")
      .select("point_rule_type, point_win, point_loss, point_draw, point_ranking")
      .eq("id", leagueId)
      .single();

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

    const ruleType = leagueInfo?.point_rule_type || "wld";
    const pointWin = leagueInfo?.point_win ?? 3;
    const pointLoss = leagueInfo?.point_loss ?? 0;
    const pointDraw = leagueInfo?.point_draw ?? 1;
    const pointRanking = leagueInfo?.point_ranking || [];

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
      p.rounds_played += 1;
      // 最新のデッキ名を保持
      if (r.deck_name) p.deck_name = r.deck_name;

      // 勝ち点計算
      if (ruleType === "wld") {
        p.total_points += (r.wins || 0) * pointWin + (r.losses || 0) * pointLoss + (r.draws || 0) * pointDraw;
      } else if (ruleType === "ranking") {
        // 順位ベース: ranking が 1 なら pointRanking[0] のポイント
        const rank = r.ranking;
        if (rank && rank > 0 && rank <= pointRanking.length) {
          p.total_points += pointRanking[rank - 1];
        }
      }
    });

    // ポイント順でランク付け
    const standings = Object.values(playerMap).sort(
      (a, b) => b.total_points - a.total_points || b.total_wins - a.total_wins
    );
    standings.forEach((s, i) => (s.rank = i + 1));

    // 参加者テーブルから user_id を取得してマッピング
    const { data: participants } = await supabase
      .from("league_participants")
      .select("user_id, player_name")
      .eq("league_id", leagueId);

    const nameToUserId = {};
    if (participants) {
      participants.forEach((p) => { nameToUserId[p.player_name] = p.user_id; });
    }

    // 既存スタンディング削除 → 再挿入
    await supabase.from("league_standings").delete().eq("league_id", leagueId);
    const rows = standings.map((s) => ({
      league_id: leagueId,
      ...s,
      user_id: nameToUserId[s.player_name] || null,
    }));
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

  // --- リーグ参加 ---
  const joinLeague = async (leagueId, playerName) => {
    if (!user) return { error: "未ログイン" };
    const { data, error } = await supabase
      .from("league_participants")
      .insert({ league_id: leagueId, user_id: user.id, player_name: playerName })
      .select()
      .single();
    return { data, error };
  };

  // --- リーグ参加者一覧取得 ---
  const fetchParticipants = async (leagueId) => {
    const { data } = await supabase
      .from("league_participants")
      .select("*")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: true });
    return data || [];
  };

  return {
    leagues,
    participatingLeagues,
    loading,
    fetchMyLeagues,
    fetchMyParticipatingLeagues,
    createLeague,
    deleteLeague,
    completeLeague,
    fetchRounds,
    addRound,
    importRoundResults,
    updateStandings,
    fetchStandings,
    joinLeague,
    fetchParticipants,
  };
};
