import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
const SUPABASE_URL = "https://zheiyyjsbgqywesqfzqr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j2IOWXMCBuCogllLYAo9iA_zYseUmWZ";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
