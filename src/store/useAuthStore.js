import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { addExperience } from "./useLevelStore";
import { EXP_REWARDS } from "../constants/levels";

// 招待コード生成（紛らわしい文字を除外: 0,O,1,I,L）
const generateReferralCode = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const REFERRAL_BONUS_REFERRER = 100;
const REFERRAL_BONUS_NEW_USER = 50;

// profiles テーブルにレコードがなければ作成する
const ensureProfile = async (user, opts = {}) => {
  if (!user) return;
  const { data } = await supabase
    .from("profiles")
    .select("id, referral_code")
    .eq("id", user.id)
    .single();

  if (!data) {
    // プロフィールが存在しない → 新規作成
    let referralCode = generateReferralCode();
    // UNIQUE制約違反の場合はリトライ（最大3回）
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        name: user.email?.split("@")[0] || "プレイヤー",
        push_notifications_enabled: true,
        notify_tournament_entry: true,
        notify_favorite_organizer: true,
        notify_sponsor_items: true,
        is_public: true,
        is_premium: false,
        referral_code: referralCode,
        ...(opts.referred_by ? { referred_by: opts.referred_by } : {}),
      });
      if (!error) break;
      // UNIQUE制約違反 → コード再生成
      if (error.code === "23505" && error.message?.includes("referral_code")) {
        referralCode = generateReferralCode();
      } else {
        break;
      }
    }
  } else if (!data.referral_code) {
    // 既存ユーザーでreferral_codeが未設定 → コードを生成
    const code = generateReferralCode();
    await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", user.id);
  }
};

// 招待コードからリファラーを検索し、ポイント付与
const processReferral = async (newUserId, referralCode) => {
  if (!referralCode || !newUserId) return;

  // 招待コードからリファラーを検索
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id, points")
    .eq("referral_code", referralCode.toUpperCase().trim())
    .single();

  if (!referrer || referrer.id === newUserId) return; // 自分自身は除外

  // referred_by を設定
  await supabase
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", newUserId);

  // 紹介報酬レコード作成
  const { error: rewardError } = await supabase.from("referral_rewards").insert({
    referrer_id: referrer.id,
    new_user_id: newUserId,
    referrer_points: REFERRAL_BONUS_REFERRER,
    new_user_points: REFERRAL_BONUS_NEW_USER,
  });

  if (rewardError) return; // 既に報酬済み等

  // 紹介者にポイント付与
  await supabase
    .from("profiles")
    .update({ points: (referrer.points || 0) + REFERRAL_BONUS_REFERRER })
    .eq("id", referrer.id);
  // 紹介者に経験値加算
  await addExperience(referrer.id, EXP_REWARDS.REFERRAL_REFERRER);

  // 新規ユーザーにポイント付与
  const { data: newProfile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", newUserId)
    .single();
  await supabase
    .from("profiles")
    .update({ points: (newProfile?.points || 0) + REFERRAL_BONUS_NEW_USER })
    .eq("id", newUserId);
  // 新規ユーザーに経験値加算
  await addExperience(newUserId, EXP_REWARDS.REFERRAL_NEW_USER);
};

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (user) await ensureProfile(user);
    set({ session, user, loading: false });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      if (_event === "SIGNED_IN" && u) await ensureProfile(u);
      set({ session, user: u });
    });
  },
  signUp: async (email, password, referralCode) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data?.user) {
      // 招待コード検証してリファラーIDを取得
      let referredBy = null;
      if (referralCode) {
        const { data: referrer } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", referralCode.toUpperCase().trim())
          .single();
        if (referrer) referredBy = referrer.id;
      }
      await ensureProfile(data.user, { referred_by: referredBy });
      // 有効な招待コードがあればポイント付与
      if (referredBy) {
        await processReferral(data.user.id, referralCode);
      }
    }
    return { error };
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      await ensureProfile(data.user);
    }
    return { error };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
