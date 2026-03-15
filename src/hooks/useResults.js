import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const { user } = useAuthStore();

  const fetchResults = useCallback(async () => {
    if (!user) return;
    if (!initialLoadDone.current) setLoading(true);
    const { data, error } = await supabase
      .from("results")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (!error) setResults(data || []);
    setLoading(false);
    initialLoadDone.current = true;
  }, [user]);

  const addResult = async (result) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("results")
      .insert({ ...result, user_id: user.id });
    if (!error) await fetchResults();
    return { error };
  };

  const deleteResult = async (id) => {
    const { error } = await supabase
      .from("results")
      .delete()
      .eq("id", id);
    if (!error) await fetchResults();
    return { error };
  };

  // ゲーム別統計
  const gameStats = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.game]) {
        map[r.game] = {
          game: r.game,
          color: r.game_color,
          count: 0,
          totalRank: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          hasWL: false,
        };
      }
      const s = map[r.game];
      s.count++;
      s.totalRank += r.rank || 0;
      if ((r.wins || 0) > 0 || (r.losses || 0) > 0) {
        s.hasWL = true;
        s.wins += r.wins || 0;
        s.losses += r.losses || 0;
        s.draws += r.draws || 0;
      }
    });
    return Object.values(map)
      .map((s) => ({
        ...s,
        avgRank: s.count > 0 ? (s.totalRank / s.count).toFixed(1) : "-",
        winRate: s.hasWL && (s.wins + s.losses) > 0
          ? Math.round((s.wins / (s.wins + s.losses)) * 100)
          : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  // 全体統計
  const totalStats = useMemo(() => {
    const count = results.length;
    if (count === 0) return { count: 0, avgRank: "-", winRate: null };
    const totalRank = results.reduce((sum, r) => sum + (r.rank || 0), 0);
    const totalWins = results.reduce((sum, r) => sum + (r.wins || 0), 0);
    const totalLosses = results.reduce((sum, r) => sum + (r.losses || 0), 0);
    const hasWL = totalWins > 0 || totalLosses > 0;
    return {
      count,
      avgRank: (totalRank / count).toFixed(1),
      winRate: hasWL && (totalWins + totalLosses) > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : null,
    };
  }, [results]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return { results, loading, addResult, deleteResult, refetch: fetchResults, gameStats, totalStats };
};
