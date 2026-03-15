import { create } from "zustand";
import { MOCK_RESULTS, MOCK_PENDING } from "../constants/mockData";
export const useAppStore = create((set) => ({
  // 戦績
  results: MOCK_RESULTS,
  pendingTournaments: MOCK_PENDING,
  // ユーザー（後で認証に差し替え）
  user: { name: "ゲスト", role: "player" },
  // アクション
  addResult: (result) =>
    set((state) => ({ results: [result, ...state.results] })),
  removePending: (id) =>
    set((state) => ({
      pendingTournaments: state.pendingTournaments.filter((t) => t.id !== id),
    })),
}));
