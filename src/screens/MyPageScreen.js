import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { useOrganizer } from "../hooks/useOrganizer";
import { useAdmin } from "../hooks/useAdmin";
import CreateTournamentModal from "../components/CreateTournamentModal";
import AdminScreen from "./AdminScreen";
import SettingsModal from "../components/SettingsModal";

export default function MyPageScreen() {
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [showEditName, setShowEditName] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const { isOrganizer, organizerStatus, myTournaments, applyOrganizer, cancelApplication, deleteTournament } = useOrganizer();
  const { isAdmin } = useAdmin();
  const insets = useSafeAreaInsets();

  React.useEffect(() => { fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ name: newName.trim() }).eq("id", user.id);
    setLoading(false);
    if (!error) { await fetchProfile(); setShowEditName(false); }
    else Alert.alert("エラー", "保存に失敗しました");
  };

  const handleSignOut = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const handleApplyOrganizer = () => {
    Alert.alert("主催者権限の申請", "主催者として大会を投稿できるようになります。\n申請後、管理者の承認をお待ちください。", [
      { text: "キャンセル", style: "cancel" },
      { text: "申請する", onPress: async () => {
        const { error } = await applyOrganizer();
        if (!error) Alert.alert("申請完了", "管理者の承認をお待ちください");
        else Alert.alert("エラー", "申請に失敗しました");
      }},
    ]);
  };

  const handleCancelApplication = () => {
    Alert.alert("申請の取り消し", "主催者申請を取り消しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "取り消す", style: "destructive", onPress: async () => {
        const { error } = await cancelApplication();
        if (!error) Alert.alert("完了", "申請を取り消しました");
        else Alert.alert("エラー", "取り消しに失敗しました");
      }},
    ]);
  };

  const handleDeleteTournament = (t) => {
    Alert.alert("大会を削除", `「${t.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => deleteTournament(t.id) },
    ]);
  };

  const displayName = profile?.name || user?.email || "プレイヤー";
  const initial = displayName.charAt(0).toUpperCase();

  const MENU = [
    { icon: "person-outline",         label: "プロフィール名を変更", onPress: () => { setNewName(displayName); setShowEditName(true); } },
    { icon: "settings-outline",       label: "設定",                onPress: () => setShowSettings(true) },
    ...(isAdmin ? [{ icon: "shield-checkmark-outline", label: "管理画面", onPress: () => setShowAdmin(true) }] : []),
    { icon: "document-text-outline",  label: "利用規約",             onPress: () => {} },
    { icon: "shield-outline",         label: "プライバシーポリシー", onPress: () => {} },
    { icon: "log-out-outline",        label: "ログアウト",           onPress: handleSignOut, danger: true },
  ];

  // 主催者ステータスに応じたバッジ
  const renderOrganizerBadge = () => {
    if (organizerStatus === "approved") {
      return (
        <View style={styles.organizerBadge}>
          <Text style={styles.organizerBadgeText}>主催者</Text>
        </View>
      );
    }
    if (organizerStatus === "pending") {
      return (
        <View style={[styles.organizerBadge, { backgroundColor: "#FEF9C3" }]}>
          <Text style={[styles.organizerBadgeText, { color: C.pending }]}>審査中</Text>
        </View>
      );
    }
    return null;
  };

  // 主催者セクションのレンダリング
  const renderOrganizerSection = () => {
    if (isOrganizer) {
      return (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>主催している大会</Text>
            <TouchableOpacity onPress={() => setShowCreateTournament(true)}>
              <Text style={styles.addBtn}>+ 新規投稿</Text>
            </TouchableOpacity>
          </View>
          {myTournaments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>まだ大会を投稿していません</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateTournament(true)}>
                <Text style={styles.createBtnText}>大会を投稿する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myTournaments.map((t) => (
              <View key={t.id} style={styles.tournamentItem}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gameTag, { color: t.game_color }]}>{t.game}</Text>
                  <Text style={styles.tournamentName}>{t.name}</Text>
                  <Text style={styles.tournamentDate}>
                    {new Date(t.date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteTournament(t)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      );
    }

    if (organizerStatus === "pending") {
      return (
        <View style={styles.pendingCard}>
          <Ionicons name="time-outline" size={24} color={C.pending} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.applyTitle}>主催者申請 審査中</Text>
            <Text style={styles.applySub}>管理者の承認をお待ちください</Text>
          </View>
          <TouchableOpacity onPress={handleCancelApplication}>
            <Text style={{ fontSize: 13, color: C.danger }}>取消</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (organizerStatus === "rejected") {
      return (
        <View style={styles.rejectedCard}>
          <Ionicons name="close-circle-outline" size={24} color={C.danger} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.applyTitle}>主催者申請が却下されました</Text>
            <Text style={styles.applySub}>再度申請することができます</Text>
          </View>
          <TouchableOpacity onPress={handleApplyOrganizer}>
            <Ionicons name="refresh" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.applyCard} onPress={handleApplyOrganizer}>
        <Ionicons name="ribbon-outline" size={24} color={C.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.applyTitle}>主催者として申請する</Text>
          <Text style={styles.applySub}>大会を投稿・管理できるようになります</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textSub} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* プロフィール */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileSub}>{user?.email}</Text>
          </View>
          {renderOrganizerBadge()}
        </View>

        {/* 主催者セクション */}
        {renderOrganizerSection()}

        {/* メニュー */}
        <View style={{ marginTop: 8 }}>
          {MENU.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={item.danger ? C.danger : C.text} />
              <Text style={[styles.menuLabel, item.danger && { color: C.danger }]}>{item.label}</Text>
              <View style={{ flex: 1 }} />
              {!item.danger && <Ionicons name="chevron-forward" size={18} color={C.textSub} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* プロフィール名編集モーダル */}
      <Modal visible={showEditName} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditName(false)} style={styles.headerBtn}>
              <Text style={styles.cancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>プロフィール名を変更</Text>
            <TouchableOpacity onPress={handleSaveName} disabled={loading} style={styles.headerBtn}>
              {loading ? <ActivityIndicator color={C.primary} /> : <Text style={styles.save}>保存</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.label}>表示名</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="名前を入力" placeholderTextColor={C.textSub} autoFocus />
          </View>
        </View>
      </Modal>

      {/* 大会投稿モーダル */}
      <CreateTournamentModal visible={showCreateTournament} onClose={() => setShowCreateTournament(false)} />

      {/* 設定モーダル */}
      <SettingsModal visible={showSettings} onClose={() => { setShowSettings(false); fetchProfile(); }} profile={profile} />

      {/* 管理画面モーダル */}
      <AdminScreen visible={showAdmin} onClose={() => setShowAdmin(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  profileCard: { backgroundColor: C.card, borderRadius: 12, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  profileName: { fontSize: 18, fontWeight: "bold", color: C.text },
  profileSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  organizerBadge: { backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  organizerBadgeText: { fontSize: 12, fontWeight: "bold", color: C.warning },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  addBtn: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  emptyBox: { backgroundColor: C.card, borderRadius: 12, padding: 24, alignItems: "center", marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.textSub, marginBottom: 12 },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  tournamentItem: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 2 },
  gameTag: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  tournamentName: { fontSize: 15, fontWeight: "bold", color: C.text },
  tournamentDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  deleteBtn: { padding: 8 },
  applyCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2 },
  pendingCard: { backgroundColor: "#FFFBEB", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#FDE68A" },
  rejectedCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#FECACA" },
  applyTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  applySub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  menuItem: { backgroundColor: C.card, flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 2, gap: 12 },
  menuLabel: { fontSize: 15, color: C.text },
  menuValue: { fontSize: 14, color: C.textSub, marginRight: 4 },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.textSub },
  save: { fontSize: 15, fontWeight: "bold", color: C.primary },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
});
