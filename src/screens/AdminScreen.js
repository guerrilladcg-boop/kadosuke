import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useAdmin } from "../hooks/useAdmin";

export default function AdminScreen({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { applications, history, loading, approveApplication, rejectApplication } = useAdmin();
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (app) => {
    Alert.alert("承認確認", `${app.profiles?.name || "ユーザー"}を主催者として承認しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "承認する", onPress: async () => {
        const { error } = await approveApplication(app.id, app.user_id);
        if (!error) Alert.alert("完了", "主催者として承認しました");
        else Alert.alert("エラー", "承認に失敗しました");
      }},
    ]);
  };

  const handleReject = () => {
    if (!rejectModal) return;
    Alert.alert("却下確認", "この申請を却下しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "却下する", style: "destructive", onPress: async () => {
        const { error } = await rejectApplication(rejectModal.id, rejectModal.user_id, rejectReason);
        setRejectModal(null);
        setRejectReason("");
        if (!error) Alert.alert("完了", "申請を却下しました");
        else Alert.alert("エラー", "却下に失敗しました");
      }},
    ]);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>管理画面</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* タブ切替 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pending" && styles.tabActive]}
            onPress={() => setActiveTab("pending")}
          >
            <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
              保留中 ({applications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
              履歴
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === "pending" ? (
              applications.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={C.textSub} />
                  <Text style={styles.emptyText}>保留中の申請はありません</Text>
                </View>
              ) : (
                applications.map((app) => (
                  <View key={app.id} style={styles.card}>
                    <View style={styles.cardInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(app.profiles?.name || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{app.profiles?.name || "名前未設定"}</Text>
                        <Text style={styles.dateText}>申請日: {formatDate(app.applied_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(app)}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>承認</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => { setRejectModal(app); setRejectReason(""); }}>
                        <Ionicons name="close" size={16} color={C.danger} />
                        <Text style={styles.rejectBtnText}>却下</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            ) : (
              history.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>履歴はありません</Text>
                </View>
              ) : (
                history.map((app) => (
                  <View key={app.id} style={styles.card}>
                    <View style={styles.cardInfo}>
                      <View style={[styles.statusDot, { backgroundColor: app.status === "approved" ? C.success : C.danger }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{app.profiles?.name || "名前未設定"}</Text>
                        <Text style={styles.dateText}>
                          {app.status === "approved" ? "承認" : "却下"} - {formatDate(app.reviewed_at)}
                        </Text>
                        {app.reason ? <Text style={styles.reasonText}>理由: {app.reason}</Text> : null}
                      </View>
                    </View>
                  </View>
                ))
              )
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}

        {/* 却下理由モーダル */}
        <Modal visible={!!rejectModal} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.rejectSheet}>
              <Text style={styles.rejectTitle}>却下理由（任意）</Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="却下理由を入力..."
                placeholderTextColor={C.textSub}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
              <View style={styles.rejectActions}>
                <TouchableOpacity style={styles.rejectCancelBtn} onPress={() => setRejectModal(null)}>
                  <Text style={styles.rejectCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectConfirmBtn} onPress={handleReject}>
                  <Text style={styles.rejectConfirmText}>却下する</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.primary, fontWeight: "bold" },
  tabRow: { flexDirection: "row", backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabText: { fontSize: 14, color: C.textSub },
  tabTextActive: { color: C.primary, fontWeight: "bold" },
  body: { flex: 1, padding: 16 },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.textSub },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  cardInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  userName: { fontSize: 15, fontWeight: "bold", color: C.text },
  dateText: { fontSize: 12, color: C.textSub, marginTop: 2 },
  reasonText: { fontSize: 12, color: C.textSub, marginTop: 4, fontStyle: "italic" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  rejectBtnText: { color: C.danger, fontWeight: "bold", fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  rejectSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%" },
  rejectTitle: { fontSize: 16, fontWeight: "bold", color: C.text, marginBottom: 12 },
  rejectInput: { backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: "top" },
  rejectActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  rejectCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  rejectCancelText: { fontSize: 14, color: C.textSub },
  rejectConfirmBtn: { backgroundColor: C.danger, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  rejectConfirmText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
