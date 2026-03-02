import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { DAILY_AD_LIMIT, POINTS_PER_AD } from "../constants/adConfig";

export const useAdRewards = () => {
  const [dailyViewCount, setDailyViewCount] = useState(0);
  const [adLoading, setAdLoading] = useState(false);
  const { user } = useAuthStore();

  const canWatchAd = dailyViewCount < DAILY_AD_LIMIT;
  const remainingViews = DAILY_AD_LIMIT - dailyViewCount;

  const fetchDailyCount = useCallback(async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("ad_views")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("viewed_at", today.toISOString());
    setDailyViewCount(count || 0);
  }, [user]);

  const grantReward = async () => {
    if (!user || !canWatchAd) return { error: "視聴上限" };
    // 広告視聴記録を追加
    const { error: viewError } = await supabase
      .from("ad_views")
      .insert({ user_id: user.id, points_earned: POINTS_PER_AD });
    if (viewError) return { error: viewError };

    // ポイントを加算
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    const currentPoints = profile?.points || 0;
    const { error: pointsError } = await supabase
      .from("profiles")
      .update({ points: currentPoints + POINTS_PER_AD })
      .eq("id", user.id);

    if (!pointsError) {
      setDailyViewCount((prev) => prev + 1);
    }
    return { error: pointsError, pointsEarned: POINTS_PER_AD };
  };

  const showRewardedAd = async () => {
    if (!canWatchAd) return { error: "本日の上限に達しました" };
    setAdLoading(true);
    try {
      // react-native-google-mobile-ads のリワード広告
      const { RewardedAd, RewardedAdEventType, TestIds } = require("react-native-google-mobile-ads");
      const { AD_UNIT_ID } = require("../constants/adConfig");

      return new Promise((resolve) => {
        const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID);

        rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          rewarded.show();
        });

        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
          const result = await grantReward();
          setAdLoading(false);
          resolve(result);
        });

        rewarded.addAdEventListener("error", (error) => {
          setAdLoading(false);
          resolve({ error: "広告の読み込みに失敗しました" });
        });

        rewarded.load();
      });
    } catch (e) {
      // AdMob が利用できない場合（Expo Go 等）はモックでポイント付与
      const result = await grantReward();
      setAdLoading(false);
      return result;
    }
  };

  useEffect(() => { fetchDailyCount(); }, [fetchDailyCount]);

  return {
    dailyViewCount,
    remainingViews,
    canWatchAd,
    adLoading,
    showRewardedAd,
    grantReward,
    refetch: fetchDailyCount,
  };
};
