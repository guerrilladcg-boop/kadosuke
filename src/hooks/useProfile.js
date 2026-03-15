import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { addExperience } from "../store/useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const { user } = useAuthStore();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    if (!initialLoadDone.current) setLoading(true);
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
    initialLoadDone.current = true;
  }, [user]);

  const updateName = async (name) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);
    if (!error) {
      await addExperience(user.id, EXP_REWARDS.UPDATE_NAME);
      await fetchProfile();
    }
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

      if (!updateError) {
        await addExperience(user.id, EXP_REWARDS.UPLOAD_AVATAR);
        await fetchProfile();
      }
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
    if (!error) {
      await addExperience(user.id, EXP_REWARDS.UPDATE_SHIPPING);
      await fetchProfile();
    }
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

  // 他ユーザーの公開プロフィールを取得
  const fetchPublicProfile = async (userId) => {
    if (!userId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, is_public, level, experience, is_premium, organizer_status, bio, main_deck, achievement_badges, avg_rating, review_count")
      .eq("id", userId)
      .single();
    return data;
  };

  // 他ユーザーの公開統計情報を取得（戦績含む）
  const fetchPublicProfileStats = async (userId) => {
    if (!userId) return { tournamentCount: 0, mainGame: null, results: [], medals: { gold: 0, silver: 0, bronze: 0 }, winRate: 0, gameStats: [] };
    // 大会参加数
    const { count } = await supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    // 戦績データ
    const { data: results } = await supabase
      .from("results")
      .select("game, game_color, rank, wins, losses, draws, deck_name, tournament_name, date")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    const allResults = results || [];
    // メダル数
    const medals = { gold: 0, silver: 0, bronze: 0 };
    allResults.forEach((r) => {
      if (r.rank === 1) medals.gold++;
      else if (r.rank === 2) medals.silver++;
      else if (r.rank === 3) medals.bronze++;
    });
    // 勝率
    const totalW = allResults.reduce((s, r) => s + (r.wins || 0), 0);
    const totalL = allResults.reduce((s, r) => s + (r.losses || 0), 0);
    const winRate = totalW + totalL > 0 ? Math.round((totalW / (totalW + totalL)) * 100) : 0;
    // ゲーム別統計
    const gameMap = {};
    allResults.forEach((r) => {
      if (!gameMap[r.game]) gameMap[r.game] = { game: r.game, color: r.game_color, count: 0, wins: 0, losses: 0 };
      gameMap[r.game].count++;
      gameMap[r.game].wins += r.wins || 0;
      gameMap[r.game].losses += r.losses || 0;
    });
    const gameStats = Object.values(gameMap).sort((a, b) => b.count - a.count);
    const mainGame = gameStats[0]?.game || null;
    return { tournamentCount: count || 0, mainGame, results: allResults.slice(0, 5), medals, winRate, gameStats };
  };

  // 自分の bio / メインデッキを更新
  const updateBio = async (bio) => {
    if (!user) return;
    await supabase.from("profiles").update({ bio }).eq("id", user.id);
    await fetchProfile();
  };

  const updateMainDeck = async (mainDeck) => {
    if (!user) return;
    await supabase.from("profiles").update({ main_deck: mainDeck }).eq("id", user.id);
    await fetchProfile();
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
    fetchPublicProfile,
    fetchPublicProfileStats,
    updateBio,
    updateMainDeck,
  };
};
