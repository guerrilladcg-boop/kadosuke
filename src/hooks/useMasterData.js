import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export const useMasterData = () => {
  const [games, setGames] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    const { data } = await supabase
      .from("game_masters")
      .select("id, name, color, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) setGames(data);
  }, []);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from("tag_masters")
      .select("id, label, category, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) setTags(data);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGames(), fetchTags()]);
    setLoading(false);
  }, [fetchGames, fetchTags]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { games, tags, loading, refetch: fetchAll };
};
