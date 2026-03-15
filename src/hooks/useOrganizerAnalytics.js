import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useOrganizerAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 自分の大会一覧
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name, game, game_color, date, max_players")
        .eq("created_by", user.id)
        .order("date", { ascending: false });

      if (!tournaments || tournaments.length === 0) {
        setAnalytics({
          totalTournaments: 0,
          totalParticipants: 0,
          avgParticipants: 0,
          repeaterRate: 0,
          gameDistribution: [],
          monthlyTrend: [],
          topDecks: [],
          fillRate: 0,
        });
        setLoading(false);
        return;
      }

      const tournamentIds = tournaments.map((t) => t.id);

      // エントリー数を取得
      const { data: entries } = await supabase
        .from("entries")
        .select("tournament_id, user_id")
        .in("tournament_id", tournamentIds);

      // 大会結果（デッキ集計用）
      const { data: results } = await supabase
        .from("tournament_results")
        .select("tournament_id, player_name, deck_name")
        .in("tournament_id", tournamentIds);

      const entryList = entries || [];
      const resultList = results || [];

      // === KPI ===
      const totalTournaments = tournaments.length;
      const totalParticipants = entryList.length;
      const avgParticipants =
        totalTournaments > 0 ? Math.round(totalParticipants / totalTournaments) : 0;

      // リピーター率: 2大会以上参加したユーザー / 全ユニークユーザー
      const userCounts = {};
      entryList.forEach((e) => {
        userCounts[e.user_id] = (userCounts[e.user_id] || 0) + 1;
      });
      const uniqueUsers = Object.keys(userCounts).length;
      const repeaters = Object.values(userCounts).filter((c) => c >= 2).length;
      const repeaterRate = uniqueUsers > 0 ? Math.round((repeaters / uniqueUsers) * 100) : 0;

      // === ゲーム別分布 ===
      const gameMap = {};
      tournaments.forEach((t) => {
        if (!gameMap[t.game]) {
          gameMap[t.game] = { game: t.game, color: t.game_color, count: 0, participants: 0 };
        }
        gameMap[t.game].count += 1;
      });
      // 各ゲームの参加者数
      entryList.forEach((e) => {
        const t = tournaments.find((tt) => tt.id === e.tournament_id);
        if (t && gameMap[t.game]) gameMap[t.game].participants += 1;
      });
      const gameDistribution = Object.values(gameMap).sort(
        (a, b) => b.participants - a.participants
      );

      // === 月別トレンド（過去6ヶ月） ===
      const monthlyTrend = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${d.getMonth() + 1}月`;
        const monthTournaments = tournaments.filter((t) => {
          const td = new Date(t.date);
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        });
        const monthTIds = monthTournaments.map((t) => t.id);
        const monthEntries = entryList.filter((e) => monthTIds.includes(e.tournament_id)).length;
        monthlyTrend.push({
          month: yearMonth,
          label,
          tournaments: monthTournaments.length,
          participants: monthEntries,
        });
      }

      // === 人気デッキ TOP5 ===
      const deckMap = {};
      resultList.forEach((r) => {
        const deck = r.deck_name || "不明";
        deckMap[deck] = (deckMap[deck] || 0) + 1;
      });
      const topDecks = Object.entries(deckMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // === 定員充足率 ===
      const tournamentsWithCap = tournaments.filter((t) => t.max_players && t.max_players > 0);
      let fillRate = 0;
      if (tournamentsWithCap.length > 0) {
        const totalFill = tournamentsWithCap.reduce((sum, t) => {
          const tEntries = entryList.filter((e) => e.tournament_id === t.id).length;
          return sum + Math.min(tEntries / t.max_players, 1);
        }, 0);
        fillRate = Math.round((totalFill / tournamentsWithCap.length) * 100);
      }

      setAnalytics({
        totalTournaments,
        totalParticipants,
        avgParticipants,
        repeaterRate,
        gameDistribution,
        monthlyTrend,
        topDecks,
        fillRate,
      });
    } catch (e) {
      console.warn("Analytics fetch error:", e);
    }
    setLoading(false);
  }, [user]);

  return { analytics, loading, fetchAnalytics };
};
