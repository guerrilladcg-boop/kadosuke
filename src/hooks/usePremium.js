import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumType, setPremiumType] = useState(null); // 'onetime' | 'monthly'
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchPremiumStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("is_premium, premium_type, premium_expires_at")
      .eq("id", user.id)
      .single();

    if (data) {
      // 月額プランの場合、期限切れチェック
      if (data.premium_type === "monthly" && data.premium_expires_at) {
        const expires = new Date(data.premium_expires_at);
        if (expires < new Date()) {
          // 期限切れ → プレミアム解除
          await supabase
            .from("profiles")
            .update({ is_premium: false, premium_type: null, premium_expires_at: null })
            .eq("id", user.id);
          setIsPremium(false);
          setPremiumType(null);
          setPremiumExpiresAt(null);
        } else {
          setIsPremium(true);
          setPremiumType(data.premium_type);
          setPremiumExpiresAt(data.premium_expires_at);
        }
      } else {
        setIsPremium(data.is_premium || false);
        setPremiumType(data.premium_type || null);
        setPremiumExpiresAt(data.premium_expires_at || null);
      }
    }
    setLoading(false);
  }, [user]);

  // プレミアム購入処理（実際のアプリ内課金の代わりにDBを直接更新）
  // 本番ではRevenueCat/expo-in-app-purchases等を使用
  const purchasePremium = async (type) => {
    if (!user) return { error: "未ログイン" };

    const updateData = { is_premium: true, premium_type: type };

    if (type === "monthly") {
      // 月額: 30日後に期限設定
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      updateData.premium_expires_at = expires.toISOString();
    } else {
      // 買い切り: 期限なし
      updateData.premium_expires_at = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (!error) {
      setIsPremium(true);
      setPremiumType(type);
      setPremiumExpiresAt(updateData.premium_expires_at);
    }
    return { error };
  };

  // プレミアム解約
  const cancelPremium = async () => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: false, premium_type: null, premium_expires_at: null })
      .eq("id", user.id);
    if (!error) {
      setIsPremium(false);
      setPremiumType(null);
      setPremiumExpiresAt(null);
    }
    return { error };
  };

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  return {
    isPremium,
    premiumType,
    premiumExpiresAt,
    loading,
    purchasePremium,
    cancelPremium,
    refetch: fetchPremiumStatus,
  };
};
