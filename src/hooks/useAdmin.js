import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useAdmin = () => {
  const [applications, setApplications] = useState([]);
  const [history, setHistory] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const checkAdmin = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    setIsAdmin(data?.is_admin || false);
  }, [user]);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // 保留中の申請を取得（プロフィール情報を結合）
    const { data } = await supabase
      .from("organizer_applications")
      .select("*, profiles:user_id(name, avatar_url)")
      .eq("status", "pending")
      .order("applied_at", { ascending: true });
    setApplications(data || []);
    setLoading(false);
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("organizer_applications")
      .select("*, profiles:user_id(name, avatar_url)")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(50);
    setHistory(data || []);
  }, [user]);

  const approveApplication = async (appId, userId) => {
    if (!user) return { error: "未ログイン" };
    // 申請を承認
    const { error: appError } = await supabase
      .from("organizer_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", appId);
    if (appError) return { error: appError };
    // プロフィールを更新
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organizer_status: "approved", is_organizer: true })
      .eq("id", userId);
    if (profileError) return { error: profileError };
    await fetchApplications();
    await fetchHistory();
    return { error: null };
  };

  const rejectApplication = async (appId, userId, reason = "") => {
    if (!user) return { error: "未ログイン" };
    const { error: appError } = await supabase
      .from("organizer_applications")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id, reason })
      .eq("id", appId);
    if (appError) return { error: appError };
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organizer_status: "rejected" })
      .eq("id", userId);
    if (profileError) return { error: profileError };
    await fetchApplications();
    await fetchHistory();
    return { error: null };
  };

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
      fetchHistory();
    }
  }, [isAdmin, fetchApplications, fetchHistory]);

  return { isAdmin, applications, history, loading, approveApplication, rejectApplication, refetch: fetchApplications };
};
