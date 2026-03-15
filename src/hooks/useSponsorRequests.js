import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useSponsorRequests = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // --- 自分の募集一覧 ---
  const fetchMyRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("sponsor_requests")
      .select("*, tournaments(name)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setMyRequests(data || []);
    setLoading(false);
  }, [user]);

  // --- 公開募集一覧（スポンサー向け） ---
  const fetchOpenRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sponsor_requests")
      .select("*, profiles(name), tournaments(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);
    setOpenRequests(data || []);
    setLoading(false);
  }, []);

  // --- 募集作成 ---
  const createRequest = async (requestData) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase.from("sponsor_requests").insert({
      ...requestData,
      created_by: user.id,
    });
    if (!error) await fetchMyRequests();
    return { error };
  };

  // --- 募集終了 ---
  const closeRequest = async (requestId) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("sponsor_requests")
      .update({ status: "closed" })
      .eq("id", requestId)
      .eq("created_by", user.id);
    if (!error) await fetchMyRequests();
    return { error };
  };

  // --- オファー一覧取得 ---
  const fetchOffersForRequest = async (requestId) => {
    const { data } = await supabase
      .from("sponsor_offers")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    return data || [];
  };

  // --- オファー送信（スポンサー側） ---
  const submitOffer = async (requestId, offerData) => {
    const { error } = await supabase.from("sponsor_offers").insert({
      request_id: requestId,
      ...offerData,
    });
    return { error };
  };

  // --- オファー承認 ---
  const acceptOffer = async (offerId, requestId) => {
    const { error } = await supabase
      .from("sponsor_offers")
      .update({ status: "accepted" })
      .eq("id", offerId);
    if (!error) {
      // 募集をmatchedに更新
      await supabase
        .from("sponsor_requests")
        .update({ status: "matched" })
        .eq("id", requestId);
      await fetchMyRequests();
    }
    return { error };
  };

  // --- オファー拒否 ---
  const rejectOffer = async (offerId) => {
    const { error } = await supabase
      .from("sponsor_offers")
      .update({ status: "rejected" })
      .eq("id", offerId);
    return { error };
  };

  return {
    myRequests,
    openRequests,
    loading,
    fetchMyRequests,
    fetchOpenRequests,
    createRequest,
    closeRequest,
    fetchOffersForRequest,
    submitOffer,
    acceptOffer,
    rejectOffer,
  };
};
