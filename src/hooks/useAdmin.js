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

  // ========================================
  // 協賛商品管理
  // ========================================
  const [sponsorItems, setSponsorItems] = useState([]);
  const [sponsorLoading, setSponsorLoading] = useState(false);

  const fetchSponsorItems = useCallback(async () => {
    if (!user) return;
    setSponsorLoading(true);
    const { data } = await supabase
      .from("sponsor_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setSponsorItems(data || []);
    setSponsorLoading(false);
  }, [user]);

  const createSponsorItem = async (itemData) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase.from("sponsor_items").insert(itemData);
    if (!error) await fetchSponsorItems();
    return { error };
  };

  const updateSponsorItem = async (id, updates) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("sponsor_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await fetchSponsorItems();
    return { error };
  };

  const toggleSponsorItemActive = async (id, currentActive) => {
    return updateSponsorItem(id, { is_active: !currentActive });
  };

  // 重み付き抽選の実行（応募抽選用）
  const drawLotteryWinner = async (itemId) => {
    if (!user) return { error: "未ログイン" };

    // 全応募を取得
    const { data: entries, error: fetchError } = await supabase
      .from("lottery_entries")
      .select("user_id, points_invested")
      .eq("item_id", itemId);

    if (fetchError) return { error: fetchError };
    if (!entries || entries.length === 0) return { error: "参加者がいないため抽選できません" };

    // user_id ごとに合計ポイントを集計
    const userTotals = {};
    entries.forEach((e) => {
      userTotals[e.user_id] = (userTotals[e.user_id] || 0) + e.points_invested;
    });
    const userList = Object.entries(userTotals).map(([uid, pts]) => ({ user_id: uid, total: pts }));

    // 累積重みで乱数抽選
    let totalWeight = 0;
    const cumulative = userList.map((u) => {
      totalWeight += u.total;
      return { ...u, cumulativeWeight: totalWeight };
    });
    const rand = Math.random() * totalWeight;
    let winner = cumulative[cumulative.length - 1];
    for (const entry of cumulative) {
      if (rand < entry.cumulativeWeight) {
        winner = entry;
        break;
      }
    }

    // 結果を保存
    const { error: updateError } = await supabase
      .from("sponsor_items")
      .update({
        winner_user_id: winner.user_id,
        lottery_status: "drawn",
        drawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) return { error: updateError };

    // 当選者のプロフィール名を取得
    const { data: winnerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", winner.user_id)
      .single();

    await fetchSponsorItems();
    return { error: null, winner: { ...winner, name: winnerProfile?.name || "不明" } };
  };

  // ========================================
  // 交換管理（フルフィルメント）
  // ========================================
  const [pendingExchanges, setPendingExchanges] = useState([]);
  const [completedExchanges, setCompletedExchanges] = useState([]);
  const [exchangesLoading, setExchangesLoading] = useState(false);

  const fetchPendingExchanges = useCallback(async () => {
    if (!user) return;
    setExchangesLoading(true);
    const { data } = await supabase
      .from("point_exchanges")
      .select("*, profiles:user_id(name, email), sponsor_items:item_id(name, icon, delivery_type)")
      .eq("type", "exchange")
      .in("status", ["pending", "shipped"])
      .order("created_at", { ascending: true });
    setPendingExchanges(data || []);
    setExchangesLoading(false);
  }, [user]);

  const fetchCompletedExchanges = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("point_exchanges")
      .select("*, profiles:user_id(name, email), sponsor_items:item_id(name, icon, delivery_type)")
      .eq("type", "exchange")
      .in("status", ["completed", "cancelled"])
      .order("fulfilled_at", { ascending: false })
      .limit(50);
    setCompletedExchanges(data || []);
  }, [user]);

  const fulfillExchange = async (exchangeId, newStatus, adminNote = "") => {
    if (!user) return { error: "未ログイン" };
    const updates = {
      status: newStatus,
      admin_note: adminNote || null,
      fulfilled_at: new Date().toISOString(),
      fulfilled_by: user.id,
    };
    const { error } = await supabase
      .from("point_exchanges")
      .update(updates)
      .eq("id", exchangeId);
    if (!error) {
      await fetchPendingExchanges();
      await fetchCompletedExchanges();
    }
    return { error };
  };

  // ========================================
  // 即時抽選の景品管理
  // ========================================
  const [instantPrizesList, setInstantPrizesList] = useState([]);
  const [instantPrizesLoading, setInstantPrizesLoading] = useState(false);

  const fetchInstantPrizes = useCallback(async () => {
    if (!user) return;
    setInstantPrizesLoading(true);
    const { data } = await supabase
      .from("instant_lottery_prizes")
      .select("*")
      .order("item_id", { ascending: true })
      .order("probability_weight", { ascending: false });
    setInstantPrizesList(data || []);
    setInstantPrizesLoading(false);
  }, [user]);

  const createInstantPrize = async (prizeData) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase.from("instant_lottery_prizes").insert(prizeData);
    if (!error) await fetchInstantPrizes();
    return { error };
  };

  const updateInstantPrize = async (id, updates) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("instant_lottery_prizes")
      .update(updates)
      .eq("id", id);
    if (!error) await fetchInstantPrizes();
    return { error };
  };

  const deleteInstantPrize = async (id) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("instant_lottery_prizes")
      .delete()
      .eq("id", id);
    if (!error) await fetchInstantPrizes();
    return { error };
  };

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
      fetchHistory();
      fetchSponsorItems();
      fetchPendingExchanges();
      fetchCompletedExchanges();
      fetchInstantPrizes();
    }
  }, [isAdmin, fetchApplications, fetchHistory, fetchSponsorItems, fetchPendingExchanges, fetchCompletedExchanges, fetchInstantPrizes]);

  return {
    isAdmin, applications, history, loading, approveApplication, rejectApplication, refetch: fetchApplications,
    sponsorItems, sponsorLoading, fetchSponsorItems,
    createSponsorItem, updateSponsorItem, toggleSponsorItemActive, drawLotteryWinner,
    pendingExchanges, completedExchanges, exchangesLoading,
    fetchPendingExchanges, fetchCompletedExchanges, fulfillExchange,
    instantPrizesList, instantPrizesLoading, fetchInstantPrizes,
    createInstantPrize, updateInstantPrize, deleteInstantPrize,
  };
};
