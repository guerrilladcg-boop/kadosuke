import { create } from "zustand";
import { supabase } from "../lib/supabase";

// profiles テーブルにレコードがなければ作成する
const ensureProfile = async (user) => {
  if (!user) return;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!data) {
    // プロフィールが存在しない → 新規作成
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      name: user.email?.split("@")[0] || "プレイヤー",
      push_notifications_enabled: true,
      notify_tournament_entry: true,
      notify_favorite_organizer: true,
      notify_sponsor_items: true,
      is_public: true,
      is_premium: false,
    });
  }
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
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data?.user) {
      await ensureProfile(data.user);
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
