import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { MISSIONS } from "../constants/missions";
import { addExperience } from "../store/useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

export const useMissions = () => {
  const [unclaimedMissions, setUnclaimedMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // 全ミッションチェック
  const checkMissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. 既に達成済みのミッションIDを取得
      const { data: completed } = await supabase
        .from("user_missions")
        .select("mission_id, claimed_at")
        .eq("user_id", user.id);

      const completedMap = {};
      (completed || []).forEach((m) => {
        completedMap[m.mission_id] = m;
      });

      // 2. 各テーブルのカウントを並列取得
      const [entries, results, wins, logins, follows, favorites, ads] =
        await Promise.all([
          supabase
            .from("entries")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("tournament_results")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("tournament_results")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("ranking", 1),
          supabase
            .from("daily_login_bonuses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("organizer_follows")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("ad_views")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

      const countsMap = {
        entries: entries.count || 0,
        results: results.count || 0,
        wins: wins.count || 0,
        logins: logins.count || 0,
        follows: follows.count || 0,
        favorites: favorites.count || 0,
        ads: ads.count || 0,
      };

      // 3. 新規達成ミッションを検出 & INSERT
      const newlyCompleted = [];

      for (const mission of MISSIONS) {
        // 既に達成済みならスキップ
        if (completedMap[mission.id]) {
          // 未受取なら unclaimed に追加
          if (!completedMap[mission.id].claimed_at) {
            newlyCompleted.push(mission);
          }
          continue;
        }

        // 条件チェック
        const currentCount = countsMap[mission.key] || 0;
        if (currentCount >= mission.count) {
          // 新規達成: user_missions にINSERT
          const { error } = await supabase.from("user_missions").insert({
            user_id: user.id,
            mission_id: mission.id,
            reward_points: mission.reward,
          });

          if (!error) {
            newlyCompleted.push(mission);
          }
        }
      }

      setUnclaimedMissions(newlyCompleted);
    } catch (e) {
      // エラー時は何もしない
    }

    setLoading(false);
  }, [user]);

  // ポイント受取
  const claimMission = async (missionId) => {
    if (!user) return { error: "未ログイン" };

    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return { error: "ミッション不明" };

    try {
      // claimed_at を更新
      const { error: updateError } = await supabase
        .from("user_missions")
        .update({ claimed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("mission_id", missionId);

      if (updateError) return { error: updateError };

      // ポイント加算
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      const currentPoints = profile?.points || 0;
      await supabase
        .from("profiles")
        .update({ points: currentPoints + mission.reward })
        .eq("id", user.id);

      // 経験値加算
      await addExperience(user.id, EXP_REWARDS.MISSION_CLAIM);

      // unclaimed から除外
      setUnclaimedMissions((prev) =>
        prev.filter((m) => m.id !== missionId)
      );

      return { error: null, points: mission.reward };
    } catch (e) {
      return { error: e };
    }
  };

  return {
    unclaimedMissions,
    loading,
    checkMissions,
    claimMission,
  };
};
