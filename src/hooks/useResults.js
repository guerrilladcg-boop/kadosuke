import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
export const useResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("results")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (!error) setResults(data || []);
    setLoading(false);
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
  useEffect(() => { fetchResults(); }, [fetchResults]);
  return { results, loading, addResult, deleteResult, refetch: fetchResults };
};
