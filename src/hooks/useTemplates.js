import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

export const useTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_templates")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, [user]);

  const saveTemplate = async (templateData) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase.from("tournament_templates").insert({
      ...templateData,
      created_by: user.id,
    });
    if (!error) await fetchTemplates();
    return { error };
  };

  const deleteTemplate = async (id) => {
    if (!user) return { error: "未ログイン" };
    const { error } = await supabase
      .from("tournament_templates")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);
    if (!error) await fetchTemplates();
    return { error };
  };

  return { templates, loading, fetchTemplates, saveTemplate, deleteTemplate };
};
