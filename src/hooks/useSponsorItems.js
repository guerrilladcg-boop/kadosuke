import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { addExperience } from "../store/useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

export const useSponsorItems = () => {
  const [exchangeItems, setExchangeItems] = useState([]);
  const [lotteryItems, setLotteryItems] = useState([]);
  const [instantLotteryItems, setInstantLotteryItems] = useState([]);
  const [applicationLotteryItems, setApplicationLotteryItems] = useState([]);
  const [instantPrizes, setInstantPrizes] = useState({}); // { [item_id]: Prize[] }
  const [myEntries, setMyEntries] = useState({}); // { [item_id]: totalInvested }
  const [myExchanges, setMyExchanges] = useState([]);
  const [myInstantResults, setMyInstantResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const { user } = useAuthStore();

  const fetchItems = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    const { data } = await supabase
      .from("sponsor_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) {
      const now = new Date();
      // 抽選期間外の商品をフィルタリング（交換アイテムは影響なし）
      const visibleData = data.filter((item) => {
        if (item.type !== "lottery") return true;
        if (item.lottery_start_at && new Date(item.lottery_start_at) > now) return false;
        if (item.lottery_end_at && new Date(item.lottery_end_at) < now) return false;
        return true;
      });

      setExchangeItems(visibleData.filter((i) => i.type === "exchange"));
      setLotteryItems(visibleData.filter((i) => i.type === "lottery"));
      setInstantLotteryItems(visibleData.filter(
        (i) => i.type === "lottery" && i.lottery_type === "instant"
      ));
      setApplicationLotteryItems(visibleData.filter(
        (i) => i.type === "lottery" && (i.lottery_type === "application" || !i.lottery_type)
      ));
    }
    setLoading(false);
    initialLoadDone.current = true;
  }, []);

  const fetchMyEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("lottery_entries")
      .select("item_id, points_invested")
      .eq("user_id", user.id);
    if (data) {
      const map = {};
      data.forEach((e) => {
        map[e.item_id] = (map[e.item_id] || 0) + e.points_invested;
      });
      setMyEntries(map);
    }
  }, [user]);

  // 交換履歴取得
  const fetchMyExchanges = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("point_exchanges")
      .select("*, sponsor_items:item_id(name, icon, delivery_type)")
      .eq("user_id", user.id)
      .in("type", ["exchange", "instant_lottery_win"])
      .order("created_at", { ascending: false });
    if (data) setMyExchanges(data);
  }, [user]);

  // 即時抽選の景品プール取得
  const fetchInstantPrizes = useCallback(async () => {
    const { data } = await supabase
      .from("instant_lottery_prizes")
      .select("*")
      .order("probability_weight", { ascending: false });
    if (data) {
      const map = {};
      data.forEach((p) => {
        if (!map[p.item_id]) map[p.item_id] = [];
        map[p.item_id].push(p);
      });
      setInstantPrizes(map);
    }
  }, []);

  // 即時抽選の自分の結果取得
  const fetchMyInstantResults = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("instant_lottery_results")
      .select("*, instant_lottery_prizes:prize_id(name, icon, is_winning)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setMyInstantResults(data);
  }, [user]);

  // ポイント交換（exchange タイプ）
  const exchangeItem = async (item, currentPoints, shippingAddress = null) => {
    if (!user) return { error: "未ログイン" };
    if (currentPoints < item.point_cost) return { error: "ポイント不足" };
    if (item.stock !== null && item.stock <= 0) return { error: "在庫切れ" };

    // ポイント消費
    const { error: pointError } = await supabase
      .from("profiles")
      .update({ points: currentPoints - item.point_cost })
      .eq("id", user.id);
    if (pointError) return { error: pointError };

    // 在庫減算
    if (item.stock !== null) {
      await supabase
        .from("sponsor_items")
        .update({ stock: item.stock - 1 })
        .eq("id", item.id);
    }

    // 交換履歴（住所スナップショット含む）
    await supabase.from("point_exchanges").insert({
      user_id: user.id,
      item_id: item.id,
      points_spent: item.point_cost,
      type: "exchange",
      status: "pending",
      delivery_type: item.delivery_type || "digital",
      ...(shippingAddress ? {
        shipping_name: shippingAddress.shipping_name,
        shipping_zip: shippingAddress.shipping_zip,
        shipping_prefecture: shippingAddress.shipping_prefecture,
        shipping_city: shippingAddress.shipping_city,
        shipping_address: shippingAddress.shipping_address,
        shipping_building: shippingAddress.shipping_building || null,
        shipping_phone: shippingAddress.shipping_phone,
      } : {}),
    });

    // 経験値加算
    await addExperience(user.id, EXP_REWARDS.EXCHANGE_ITEM);

    await fetchItems();
    await fetchMyExchanges();
    return { error: null };
  };

  // 抽選応募（lottery タイプ - 応募抽選）
  const enterLottery = async (item, ticketCount, currentPoints) => {
    if (!user) return { error: "未ログイン" };
    if (item.lottery_status !== "open") return { error: "この抽選は締め切られています" };
    const totalCost = item.point_cost * ticketCount;
    if (currentPoints < totalCost) return { error: "ポイント不足" };

    // ポイント消費
    const { error: pointError } = await supabase
      .from("profiles")
      .update({ points: currentPoints - totalCost })
      .eq("id", user.id);
    if (pointError) return { error: pointError };

    // 抽選エントリー追加
    await supabase.from("lottery_entries").insert({
      item_id: item.id,
      user_id: user.id,
      points_invested: totalCost,
    });

    // 非正規化カウンター更新
    await supabase
      .from("sponsor_items")
      .update({
        total_entries: (item.total_entries || 0) + 1,
        total_points_invested: (item.total_points_invested || 0) + totalCost,
      })
      .eq("id", item.id);

    // 交換履歴
    await supabase.from("point_exchanges").insert({
      user_id: user.id,
      item_id: item.id,
      points_spent: totalCost,
      type: "lottery_entry",
    });

    // 経験値加算
    await addExperience(user.id, EXP_REWARDS.LOTTERY_ENTRY);

    await fetchItems();
    await fetchMyEntries();
    return { error: null };
  };

  // 即時抽選プレイ
  const playInstantLottery = async (item, currentPoints) => {
    if (!user) return { error: "未ログイン" };
    if (currentPoints < item.point_cost) return { error: "ポイント不足" };

    const prizes = instantPrizes[item.id] || [];
    const availablePrizes = prizes.filter((p) => p.stock === null || p.stock > 0);
    if (availablePrizes.length === 0) return { error: "景品が全て終了しています" };

    // 1. ポイント消費
    const { error: pointError } = await supabase
      .from("profiles")
      .update({ points: currentPoints - item.point_cost })
      .eq("id", user.id);
    if (pointError) return { error: pointError };

    // 2. 重み付きランダム選択
    let totalWeight = 0;
    const cumulative = availablePrizes.map((p) => {
      totalWeight += p.probability_weight;
      return { ...p, cumulativeWeight: totalWeight };
    });
    const rand = Math.random() * totalWeight;
    let selectedPrize = cumulative[cumulative.length - 1];
    for (const entry of cumulative) {
      if (rand < entry.cumulativeWeight) {
        selectedPrize = entry;
        break;
      }
    }

    // 3. 当選景品のstock-1更新（stockがnullの場合は無限なのでスキップ）
    if (selectedPrize.stock !== null) {
      const { error: stockError } = await supabase
        .from("instant_lottery_prizes")
        .update({ stock: selectedPrize.stock - 1 })
        .eq("id", selectedPrize.id);
      if (stockError) {
        // ロールバック
        await supabase.from("profiles")
          .update({ points: currentPoints })
          .eq("id", user.id);
        return { error: "在庫更新に失敗しました。再試行してください。" };
      }
    }

    // 4. ポイント還元（はずれの場合）
    let actualRefund = 0;
    if (selectedPrize.point_refund > 0) {
      actualRefund = selectedPrize.point_refund;
      await supabase
        .from("profiles")
        .update({ points: currentPoints - item.point_cost + actualRefund })
        .eq("id", user.id);
    }

    // 5. 結果保存
    await supabase.from("instant_lottery_results").insert({
      item_id: item.id,
      user_id: user.id,
      prize_id: selectedPrize.id,
      is_win: selectedPrize.is_winning,
      points_spent: item.point_cost,
      points_refunded: actualRefund,
    });

    // 6. 監査記録（当たりは管理対象として、はずれは記録のみ）
    await supabase.from("point_exchanges").insert({
      user_id: user.id,
      item_id: item.id,
      points_spent: item.point_cost,
      type: selectedPrize.is_winning ? "instant_lottery_win" : "instant_lottery",
      status: selectedPrize.is_winning ? "pending" : "completed",
      delivery_type: selectedPrize.delivery_type || "digital",
      prize_name: selectedPrize.name,
      prize_icon: selectedPrize.icon,
    });

    // 経験値加算
    await addExperience(user.id, EXP_REWARDS.INSTANT_LOTTERY);

    await fetchItems();
    await fetchInstantPrizes();
    await fetchMyInstantResults();

    return {
      error: null,
      prize: selectedPrize,
      isWin: selectedPrize.is_winning,
      pointsRefunded: actualRefund,
    };
  };

  useEffect(() => {
    fetchItems();
    fetchMyEntries();
    fetchMyExchanges();
    fetchInstantPrizes();
    fetchMyInstantResults();
  }, [fetchItems, fetchMyEntries, fetchMyExchanges, fetchInstantPrizes, fetchMyInstantResults]);

  return {
    exchangeItems,
    lotteryItems,
    instantLotteryItems,
    applicationLotteryItems,
    instantPrizes,
    myEntries,
    myExchanges,
    myInstantResults,
    loading,
    fetchItems,
    fetchMyEntries,
    fetchMyExchanges,
    fetchInstantPrizes,
    fetchMyInstantResults,
    exchangeItem,
    enterLottery,
    playInstantLottery,
    refetch: () => {
      fetchItems();
      fetchMyEntries();
      fetchMyExchanges();
      fetchInstantPrizes();
      fetchMyInstantResults();
    },
  };
};
