import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  }, [user]);

  const updateName = async (name) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const updateEmail = async (email) => {
    const { error } = await supabase.auth.updateUser({ email });
    return { error };
  };

  const uploadAvatar = async (imageUri) => {
    if (!user) return { error: "未ログイン" };
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = "jpg";
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) return { error: uploadError };

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (!updateError) await fetchProfile();
      return { error: updateError };
    } catch (e) {
      return { error: e };
    }
  };

  const toggleNotifications = async (enabled) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ push_notifications_enabled: enabled })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const togglePublicProfile = async (isPublic) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ is_public: isPublic })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const updateDisplayNames = async (names) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ display_names: names })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const switchDisplayName = async (index) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ active_display_name_index: index })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const getActiveDisplayName = () => {
    if (!profile) return "";
    const idx = profile.active_display_name_index || 0;
    if (idx === 0) return profile.name || "";
    const names = profile.display_names || [];
    return names[idx - 1] || profile.name || "";
  };

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return {
    profile,
    loading,
    fetchProfile,
    updateName,
    updateEmail,
    uploadAvatar,
    toggleNotifications,
    togglePublicProfile,
    updateDisplayNames,
    switchDisplayName,
    getActiveDisplayName,
  };
};
