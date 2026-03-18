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

    const results = [];
    for (const league of leagueData) {
      const myName = playerNameMap[league.id];
      const { data: standings } = await supabase
        .from("league_standings")
        .select("*")
        .eq("league_id", league.id)
        .order("rank", { ascending: true });

      // ラウンド数を取得
      const { count: roundCount } = await supabase
        .from("league_rounds")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id);

      const myStanding = standings?.find((s) => s.player_name === myName) || null;
      const totalPlayers = standings?.length || 0;

      results.push({
        ...league,
        myPlayerName: myName,
        myStanding,
        totalPlayers,
        totalRounds: roundCount || 0,
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

  // --- ラウンド削除 ---
  const deleteRound = async (roundId) => {
    const { error } = await supabase
      .from("league_rounds")
      .delete()
      .eq("id", roundId);
    return { error };
  };

  // --- ラウンド結果取得 ---
  const fetchRoundResults = async (roundId) => {
    const { data } = await supabase
      .from("league_round_results")
      .select("*")
      .eq("round_id", roundId)
      .order("ranking", { ascending: true });
    return data || [];
  };

  // --- ラウンド結果インポート ---
  const importRoundResults = async (roundId, csvData) => {
    await supabase.from("league_round_results").delete().eq("round_id", roundId);

    const playerCount = csvData.length;
    const rows = csvData.map((row) => ({
      round_id: roundId,
      player_name: row.player_name,
      deck_name: row.deck_name,
      ranking: row.ranking,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      points: row.points,
      round_player_count: playerCount,
    }));

    const { error } = await supabase.from("league_round_results").insert(rows);
    return { error };
  };

  // --- スタンディング更新（勝ち点ルール対応） ---
  const updateStandings = async (leagueId) => {
    const { data: leagueInfo } = await supabase
      .from("leagues")
      .select("point_rule_type, point_win, point_loss, point_draw, point_ranking, ranking_scale_by_participants")
      .eq("id", leagueId)
      .single();

    const { data: rounds } = await supabase
      .from("league_rounds")
      .select("id, round_number")
      .eq("league_id", leagueId)
      .order("round_number", { ascending: true });

    if (!rounds || rounds.length === 0) {
      await supabase.from("league_standings").delete().eq("league_id", leagueId);
      return;
    }

    const roundIds = rounds.map((r) => r.id);
    const { data: results } = await supabase
      .from("league_round_results")
      .select("*")
      .in("round_id", roundIds);

    if (!results || results.length === 0) {
      await supabase.from("league_standings").delete().eq("league_id", leagueId);
      return;
    }

    const ruleType = leagueInfo?.point_rule_type || "wld";
    const pointWin = leagueInfo?.point_win ?? 3;
    const pointLoss = leagueInfo?.point_loss ?? 0;
    const pointDraw = leagueInfo?.point_draw ?? 1;
    const pointRanking = leagueInfo?.point_ranking || [];
    const scaleByParticipants = leagueInfo?.ranking_scale_by_participants || false;

    // 傾斜配点用: 各ラウンドの参加人数の基準値（平均）を計算
    let basePlayerCount = 1;
    if (scaleByParticipants && ruleType === "ranking") {
      const roundPlayerCounts = {};
      results.forEach((r) => {
        if (!roundPlayerCounts[r.round_id]) roundPlayerCounts[r.round_id] = r.round_player_count || 0;
      });
      const counts = Object.values(roundPlayerCounts).filter((c) => c > 0);
      basePlayerCount = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 1;
    }

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
      if (r.deck_name) p.deck_name = r.deck_name;

      if (ruleType === "wld") {
        p.total_points += (r.wins || 0) * pointWin + (r.losses || 0) * pointLoss + (r.draws || 0) * pointDraw;
      } else if (ruleType === "ranking") {
        const rank = r.ranking;
        if (rank && rank > 0 && rank <= pointRanking.length) {
          let pts = pointRanking[rank - 1];
          // 傾斜配点: 参加人数 / 基準値 の倍率をかける
          if (scaleByParticipants && basePlayerCount > 0) {
            const roundCount = r.round_player_count || basePlayerCount;
            const multiplier = roundCount / basePlayerCount;
            pts = Math.round(pts * multiplier);
          }
          p.total_points += pts;
        }
      }
    });

    // ソート: ポイント → 勝数 → 勝率
    const standings = Object.values(playerMap).sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
      const aRate = a.total_wins + a.total_losses > 0 ? a.total_wins / (a.total_wins + a.total_losses) : 0;
      const bRate = b.total_wins + b.total_losses > 0 ? b.total_wins / (b.total_wins + b.total_losses) : 0;
      return bRate - aRate;
    });
    standings.forEach((s, i) => (s.rank = i + 1));

    // 参加者テーブルから user_id をマッピング
    const { data: participants } = await supabase
      .from("league_participants")
      .select("user_id, player_name")
      .eq("league_id", leagueId);

    const nameToUserId = {};
    if (participants) {
      participants.forEach((p) => { nameToUserId[p.player_name] = p.user_id; });
    }

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

  // --- リーグ参加解除 ---
  const leaveLeague = async (leagueId) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("league_participants")
      .delete()
      .eq("league_id", leagueId)
      .eq("user_id", user.id);
    return { error };
  };

  // --- 参加者削除（主催者用） ---
  const removeParticipant = async (participantId) => {
    const { error } = await supabase
      .from("league_participants")
      .delete()
      .eq("id", participantId);
    return { error };
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

  // --- リーグ完了（参加者に通知を送信） ---
  const completeLeagueWithNotification = async (leagueId) => {
    if (!user) return { error: "未ログイン" };
    // まず参加者を取得
    const { data: participants } = await supabase
      .from("league_participants")
      .select("user_id")
      .eq("league_id", leagueId);

    // リーグを完了に
    const { error } = await supabase
      .from("leagues")
      .update({ status: "completed" })
      .eq("id", leagueId)
      .eq("created_by", user.id);

    if (error) return { error };

    // 参加者全員に通知を作成
    if (participants && participants.length > 0) {
      const notifRows = participants.map((p) => ({
        league_id: leagueId,
        user_id: p.user_id,
      }));
      await supabase.from("league_completion_notifications").insert(notifRows);
    }

    await fetchMyLeagues();
    return { error: null };
  };

  // --- 未読のリーグ完了通知を取得 ---
  const fetchUnseenCompletions = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("league_completion_notifications")
      .select("*, leagues(*)")
      .eq("user_id", user.id)
      .eq("seen", false)
      .order("created_at", { ascending: false });
    return data || [];
  }, [user]);

  // --- 通知を既読にする ---
  const markCompletionSeen = async (notificationId) => {
    await supabase
      .from("league_completion_notifications")
      .update({ seen: true })
      .eq("id", notificationId);
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
    completeLeagueWithNotification,
    fetchRounds,
    addRound,
    deleteRound,
    fetchRoundResults,
    importRoundResults,
    updateStandings,
    fetchStandings,
    joinLeague,
    leaveLeague,
    removeParticipant,
    fetchParticipants,
    fetchUnseenCompletions,
    markCompletionSeen,
  };
};
