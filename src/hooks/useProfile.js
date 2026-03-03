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
    let { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    // プロフィールが存在しない場合は作成
    if (!data) {
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.email?.split("@")[0] || "プレイヤー",
        push_notifications_enabled: true,
        notify_tournament_entry: true,
        notify_favorite_organizer: true,
        notify_sponsor_items: true,
        is_public: true,
        is_premium: false,
      };
      await supabase.from("profiles").insert(newProfile);
      const { data: created } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      data = created;
    }
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

  // パスワード変更（メール認証経由）
  const requestPasswordReset = async () => {
    if (!user?.email) return { error: "メールアドレスが見つかりません" };
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
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

  // 楽観的更新ヘルパー: 先にローカル state を更新し、DB に反映
  const optimisticToggle = async (field, value) => {
    if (!user) return { error: "未ログイン" };
    // 楽観的にローカルプロフィールを更新（即座にUIに反映）
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    if (error) {
      // 失敗時はロールバック
      setProfile((prev) => prev ? { ...prev, [field]: !value } : prev);
    }
    return { error };
  };

  // プッシュ通知の全体トグル
  const toggleNotifications = async (enabled) => {
    return optimisticToggle("push_notifications_enabled", enabled);
  };

  // 個別通知トグル: エントリー済み大会の通知
  const toggleTournamentEntry = async (enabled) => {
    return optimisticToggle("notify_tournament_entry", enabled);
  };

  // 個別通知トグル: お気に入り主催者の新着大会通知
  const toggleFavoriteOrganizer = async (enabled) => {
    return optimisticToggle("notify_favorite_organizer", enabled);
  };

  // 個別通知トグル: 目玉の協賛商品通知
  const toggleSponsorItems = async (enabled) => {
    return optimisticToggle("notify_sponsor_items", enabled);
  };

  const togglePublicProfile = async (isPublic) => {
    return optimisticToggle("is_public", isPublic);
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

  // 配送先住所を保存
  const updateShippingAddress = async (address) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({
        shipping_name: address.shipping_name,
        shipping_zip: address.shipping_zip,
        shipping_prefecture: address.shipping_prefecture,
        shipping_city: address.shipping_city,
        shipping_address: address.shipping_address,
        shipping_building: address.shipping_building || null,
        shipping_phone: address.shipping_phone,
      })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  // 保存済み配送先住所を取得
  const getShippingAddress = () => {
    if (!profile || !profile.shipping_name) return null;
    return {
      shipping_name: profile.shipping_name,
      shipping_zip: profile.shipping_zip,
      shipping_prefecture: profile.shipping_prefecture,
      shipping_city: profile.shipping_city,
      shipping_address: profile.shipping_address,
      shipping_building: profile.shipping_building,
      shipping_phone: profile.shipping_phone,
    };
  };

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return {
    profile,
    loading,
    fetchProfile,
    updateName,
    updateEmail,
    requestPasswordReset,
    uploadAvatar,
    toggleNotifications,
    toggleTournamentEntry,
    toggleFavoriteOrganizer,
    toggleSponsorItems,
    togglePublicProfile,
    updateDisplayNames,
    switchDisplayName,
    getActiveDisplayName,
    updateShippingAddress,
    getShippingAddress,
  };
};
