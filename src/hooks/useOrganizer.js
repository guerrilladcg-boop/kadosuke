import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
export const useOrganizer = () => {
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizerStatus, setOrganizerStatus] = useState("none");
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_organizer, organizer_status")
      .eq("id", user.id)
      .single();
    const status = data?.organizer_status || "none";
    setOrganizerStatus(status);
    setIsOrganizer(status === "approved");
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
  const applyOrganizer = async (xAccount, tonamelUrl) => {
    if (!user) return { error: "未ログイン" };
    // organizer_applications に申請を INSERT（X/Tonamel情報付き）
    const { error: appError } = await supabase
      .from("organizer_applications")
      .insert({
        user_id: user.id,
        status: "pending",
        x_account: xAccount || null,
        tonamel_url: tonamelUrl || null,
      });
    if (appError) return { error: appError };
    // profiles の organizer_status を pending に更新
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organizer_status: "pending" })
      .eq("id", user.id);
    if (profileError) return { error: profileError };
    setOrganizerStatus("pending");
    return { error: null };
  };
  const cancelApplication = async () => {
    if (!user) return { error: "未ログイン" };
    await supabase
      .from("organizer_applications")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");
    const { error } = await supabase
      .from("profiles")
      .update({ organizer_status: "none" })
      .eq("id", user.id);
    if (!error) setOrganizerStatus("none");
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
  return { isOrganizer, organizerStatus, myTournaments, loading, applyOrganizer, cancelApplication, createTournament, deleteTournament, refetch: fetchProfile };
};
