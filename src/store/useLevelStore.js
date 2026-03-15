import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { getLevelFromExp, getTitleForLevel } from "../constants/levels";

export const useLevelStore = create((set) => ({
  pendingLevelUp: null, // { oldLevel, newLevel, oldTitle, newTitle }
  setPendingLevelUp: (data) => set({ pendingLevelUp: data }),
  clearPendingLevelUp: () => set({ pendingLevelUp: null }),
}));

/**
 * 経験値を加算し、レベルアップ判定を行う
 * React外（hookの関数内）から呼べるユーティリティ
 * @param {string} userId - ユーザーID
 * @param {number} amount - 加算するEXP量
 * @returns {{ leveledUp: boolean, newLevel: number }} 結果
 */
export const addExperience = async (userId, amount) => {
  if (!userId || !amount || amount <= 0) return { leveledUp: false, newLevel: 1 };

  try {
    // 現在の経験値とレベルを取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience, level")
      .eq("id", userId)
      .single();

    if (!profile) return { leveledUp: false, newLevel: 1 };

    const oldExp = profile.experience || 0;
    const oldLevel = profile.level || 1;
    const newExp = oldExp + amount;
    const newLevel = getLevelFromExp(newExp);

    // DB更新
    const updateData = { experience: newExp };
    if (newLevel !== oldLevel) {
      updateData.level = newLevel;
    }
    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    // レベルアップした場合、ストアに通知をセット
    if (newLevel > oldLevel) {
      const oldTitle = getTitleForLevel(oldLevel);
      const newTitle = getTitleForLevel(newLevel);
      useLevelStore.getState().setPendingLevelUp({
        oldLevel,
        newLevel,
        oldTitle,
        newTitle,
      });
    }

    return { leveledUp: newLevel > oldLevel, newLevel };
  } catch (e) {
    // EXP加算失敗は静かに無視（メイン機能に影響させない）
    return { leveledUp: false, newLevel: 1 };
  }
};
