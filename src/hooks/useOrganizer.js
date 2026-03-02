import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
export const useOrganizer = () => {
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_organizer")
      .eq("id", user.id)
      .single();
    setIsOrganizer(data?.is_organizer || false);
    setLoading(false);
  }, [user]);
  const fetchMyTournaments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", user.id)
      .order("date", { ascending: true });
    setMyTournaments(data || []);
  }, [user]);
  const applyOrganizer = async () => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ is_organizer: true })
      .eq("id", user.id);
    if (!error) setIsOrganizer(true);
    return { error };
  };
  const createTournament = async (data) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("tournaments")
      .insert({ ...data, created_by: user.id });
    if (!error) await fetchMyTournaments();
    return { error };
  };
  const deleteTournament = async (id) => {
    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);
    if (!error) await fetchMyTournaments();
    return { error };
  };
  useEffect(() => {
    fetchProfile();
    fetchMyTournaments();
  }, [fetchProfile, fetchMyTournaments]);
  return { isOrganizer, myTournaments, loading, applyOrganizer, createTournament, deleteTournament };
};
