import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useOrganizerReviews = () => {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  // 主催者のレビュー一覧を取得
  const fetchReviews = useCallback(async (organizerId) => {
    if (!organizerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("organizer_reviews")
      .select("*, reviewer:profiles!reviewer_id(name, avatar_url)")
      .eq("organizer_id", organizerId)
      .order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  }, []);

  // レビュー投稿
  const submitReview = async (organizerId, tournamentId, rating, comment) => {
    if (!user) return { error: "ログインが必要です" };
    const { error } = await supabase
      .from("organizer_reviews")
      .upsert({
        organizer_id: organizerId,
        reviewer_id: user.id,
        tournament_id: tournamentId,
        rating,
        comment: comment || null,
      }, { onConflict: "reviewer_id,tournament_id" });
    if (!error) {
      // 評価平均を再計算
      await supabase.rpc("update_organizer_rating", { org_id: organizerId });
      await fetchReviews(organizerId);
    }
    return { error };
  };

  // レビュー削除
  const deleteReview = async (reviewId, organizerId) => {
    if (!user) return;
    await supabase
      .from("organizer_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("reviewer_id", user.id);
    // 評価平均を再計算
    await supabase.rpc("update_organizer_rating", { org_id: organizerId });
    await fetchReviews(organizerId);
  };

  // ユーザーが特定の大会でレビュー済みかチェック
  const hasReviewedTournament = useCallback((tournamentId) => {
    return reviews.some((r) => r.reviewer_id === user?.id && r.tournament_id === tournamentId);
  }, [reviews, user]);

  return { reviews, loading, fetchReviews, submitReview, deleteReview, hasReviewedTournament };
};
