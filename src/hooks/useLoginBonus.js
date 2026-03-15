import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { addExperience } from "../store/useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

// マイルストーン: 通算○日目に特別ボーナス
const MILESTONES = {
  7: 50,
  14: 50,
  30: 100,
  50: 200,
  100: 500,
  200: 500,
  365: 1000,
};
const BASE_POINTS = 10;

export const useLoginBonus = () => {
  const [canClaim, setCanClaim] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  // 今日のボーナスをチェック
  const checkTodayBonus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"

      // 今日のレコードがあるか確認
      const { count } = await supabase
        .from("daily_login_bonuses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("claimed_date", dateStr);

      // 通算日数を取得
      const { count: total } = await supabase
        .from("daily_login_bonuses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setTotalDays(total || 0);
      setCanClaim((count || 0) === 0);
    } catch (e) {
      setCanClaim(false);
    }
    setLoading(false);
  }, [user]);

  // ボーナスを受け取る
  const claimBonus = async () => {
    if (!user || !canClaim) return { error: "受取不可" };

    try {
      // 通算日数を再取得（最新値）
      const { count: currentTotal } = await supabase
        .from("daily_login_bonuses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const newTotalDays = (currentTotal || 0) + 1;
      const isMilestone = MILESTONES.hasOwnProperty(newTotalDays);
      const bonusPoints = isMilestone ? MILESTONES[newTotalDays] : BASE_POINTS;

      // ログインボーナスレコード作成
      const { error: insertError } = await supabase
        .from("daily_login_bonuses")
        .insert({
          user_id: user.id,
          bonus_points: bonusPoints,
          total_days: newTotalDays,
          is_milestone: isMilestone,
        });

      if (insertError) {
        // UNIQUE制約違反 = 既に受取済み
        if (insertError.code === "23505") {
          setCanClaim(false);
          return { error: "本日は既に受け取っています" };
        }
        return { error: insertError };
      }

      // ポイント加算
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      const currentPoints = profile?.points || 0;
      await supabase
        .from("profiles")
        .update({ points: currentPoints + bonusPoints })
        .eq("id", user.id);

      // 経験値加算
      await addExperience(user.id, EXP_REWARDS.LOGIN_BONUS);

      setCanClaim(false);
      setTotalDays(newTotalDays);

      return {
        error: null,
        points: bonusPoints,
        totalDays: newTotalDays,
        isMilestone,
      };
    } catch (e) {
      return { error: e };
    }
  };

  useEffect(() => {
    checkTodayBonus();
  }, [checkTodayBonus]);

  return {
    canClaim,
    totalDays,
    loading,
    claimBonus,
    checkTodayBonus,
    BASE_POINTS,
    MILESTONES,
  };
};
