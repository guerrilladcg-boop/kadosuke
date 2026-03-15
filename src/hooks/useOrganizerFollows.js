import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { addExperience } from "../store/useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

export const useOrganizerFollows = () => {
  const [followedIds, setFollowedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchFollows = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("organizer_follows")
      .select("organizer_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setFollowedIds(new Set(data.map((f) => f.organizer_id)));
    }
    setLoading(false);
  }, [user]);

  const toggleFollow = async (organizerId) => {
    if (!user || !organizerId) return;
    if (followedIds.has(organizerId)) {
      await supabase
        .from("organizer_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("organizer_id", organizerId);
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(organizerId);
        return next;
      });
    } else {
      await supabase
        .from("organizer_follows")
        .insert({ user_id: user.id, organizer_id: organizerId });
      setFollowedIds((prev) => new Set(prev).add(organizerId));
      // 経験値加算
      await addExperience(user.id, EXP_REWARDS.FOLLOW_ORGANIZER);
    }
  };

  const isFollowing = (organizerId) => followedIds.has(organizerId);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  return {
    followedIds,
    followedIdsArray: [...followedIds],
    loading,
    toggleFollow,
    isFollowing,
    refetch: fetchFollows,
  };
};
