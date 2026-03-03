import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
export const useTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const fetch = useCallback(async (filters = {}) => {
    setLoading(true);
    const sortBy = filters.sortBy || "date_asc";
    // ソート設定（popularity はクライアント側で処理）
    let orderCol = "date";
    let orderAsc = true;
    if (sortBy === "date_desc") { orderCol = "date"; orderAsc = false; }
    else if (sortBy === "name") { orderCol = "name"; orderAsc = true; }
    let req = supabase
      .from("tournaments")
      .select(`*, favorites(user_id), entries(user_id)`)
      .order(orderCol, { ascending: orderAsc });
    if (filters.query) {
      req = req.or(`name.ilike.%${filters.query}%,game.ilike.%${filters.query}%,organizer.ilike.%${filters.query}%`);
    }
    // 複数ゲームフィルター（配列対応）
    if (filters.games && filters.games.length > 0) {
      req = req.in("game", filters.games);
    } else if (filters.game) {
      // 後方互換性
      req = req.eq("game", filters.game);
    }
    if (filters.dateFrom) {
      req = req.gte("date", filters.dateFrom);
    }
    if (filters.dateTo) {
      req = req.lte("date", filters.dateTo);
    }
    if (filters.location) {
      req = req.ilike("location", `%${filters.location}%`);
    }
    // 参加費フィルター
    if (filters.entryFeeType) {
      req = req.eq("entry_fee_type", filters.entryFeeType);
    }
    // 開催形式フィルター
    if (filters.locationType) {
      req = req.eq("location_type", filters.locationType);
    }
    // 都道府県フィルター
    if (filters.prefecture) {
      req = req.eq("prefecture", filters.prefecture);
    }
    // タグフィルター（いずれかに一致）
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      req = req.overlaps("tags", filters.selectedTags);
    }
    const { data, error } = await req;
    if (!error) {
      let enriched = (data || []).map((t) => ({
        ...t,
        isFavorite: t.favorites?.some((f) => f.user_id === user?.id) || false,
        isEntered: t.entries?.some((e) => e.user_id === user?.id) || false,
      }));
      // 人気順ソート（エントリー数降順）
      if (sortBy === "popularity") {
        enriched.sort((a, b) => (b.entries?.length || 0) - (a.entries?.length || 0));
      }
      setTournaments(enriched);
    }
    setLoading(false);
  }, [user]);
  const toggleFavorite = async (tournament) => {
    if (!user) return;
    if (tournament.isFavorite) {
      await supabase.from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("tournament_id", tournament.id);
    } else {
      await supabase.from("favorites")
        .insert({ user_id: user.id, tournament_id: tournament.id });
    }
    await fetch();
  };
  const toggleEntry = async (tournament) => {
    if (!user) return;
    if (tournament.isEntered) {
      await supabase.from("entries")
        .delete()
        .eq("user_id", user.id)
        .eq("tournament_id", tournament.id);
    } else {
      await supabase.from("entries")
        .insert({ user_id: user.id, tournament_id: tournament.id });
    }
    await fetch();
  };
  useEffect(() => { fetch(); }, [fetch]);
  return { tournaments, loading, search: fetch, toggleFavorite, toggleEntry };
};
