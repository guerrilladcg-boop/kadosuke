import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useSponsorRequests } from "../hooks/useSponsorRequests";

export default function SponsorRequestModal({ visible, onClose, myTournaments }) {
  const insets = useSafeAreaInsets();
  const {
    myRequests, loading, fetchMyRequests, createRequest,
    closeRequest, fetchOffersForRequest, acceptOffer, rejectOffer,
  } = useSponsorRequests();

  const [view, setView] = useState("list"); // list | create | offers
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offers, setOffers] = useState([]);

  // 作成フォーム
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formItems, setFormItems] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formTournament, setFormTournament] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) fetchMyRequests();
  }, [visible]);

  const handleCreate = async () => {
    if (!formTitle) {
      Alert.alert("エラー", "タイトルは必須です");
      return;
    }
    setCreating(true);
    const { error } = await createRequest({
      title: formTitle,
      description: formDesc || null,
      desired_items: formItems || null,
      desired_budget: formBudget ? parseInt(formBudget) : null,
      tournament_id: formTournament?.id || null,
    });
    setCreating(false);
    if (error) {
      Alert.alert("エラー", "作成に失敗しました");
    } else {
      setFormTitle(""); setFormDesc(""); setFormItems(""); setFormBudget(""); setFormTournament(null);
      setView("list");
    }
  };

  const handleClose = (req) => {
    Alert.alert("募集を終了", "このスポンサー募集を終了しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "終了する",
        onPress: async () => {
          await closeRequest(req.id);
        },
      },
    ]);
  };

  const openOffers = async (req) => {
    setSelectedRequest(req);
    const data = await fetchOffersForRequest(req.id);
    setOffers(data);
    setView("offers");
  };

  const handleAcceptOffer = (offer) => {
    Alert.alert("オファーを承認", "このオファーを承認しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "承認",
        onPress: async () => {
          await acceptOffer(offer.id, selectedRequest.id);
          const data = await fetchOffersForRequest(selectedRequest.id);
          setOffers(data);
        },
      },
    ]);
  };

  const handleRejectOffer = (offer) => {
    Alert.alert("オファーを拒否", "このオファーを拒否しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "拒否",
        style: "destructive",
        onPress: async () => {
          await rejectOffer(offer.id);
          const data = await fetchOffersForRequest(selectedRequest.id);
          setOffers(data);
        },
      },
    ]);
  };

  const STATUS_LABELS = { open: "募集中", matched: "マッチ済", closed: "終了" };
  const STATUS_COLORS = { open: C.success, matched: "#3B82F6", closed: C.textSub };

  // === リスト ===
  const renderList = () => (
    <>
      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>スポンサー募集</Text>
        <TouchableOpacity onPress={() => setView("create")}>
          <Text style={styles.addBtn}>+ 新規募集</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : myRequests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>スポンサー募集はまだありません</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setView("create")}>
            <Text style={styles.createBtnText}>募集を作成</Text>
          </TouchableOpacity>
        </View>
      ) : (
        myRequests.map((req) => (
          <TouchableOpacity key={req.id} style={styles.requestItem} onPress={() => openOffers(req)}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.requestTitle} numberOfLines={1}>{req.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[req.status] + "20" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[req.status] }]}>
                    {STATUS_LABELS[req.status]}
                  </Text>
                </View>
              </View>
              {req.tournaments?.name && (
                <Text style={styles.requestSub}>🏆 {req.tournaments.name}</Text>
              )}
              {req.desired_budget && (
                <Text style={styles.requestSub}>💰 希望予算: ¥{req.desired_budget.toLocaleString()}</Text>
              )}
            </View>
            {req.status === "open" && (
              <TouchableOpacity onPress={() => handleClose(req)} style={{ padding: 8 }}>
                <Ionicons name="close-circle-outline" size={20} color={C.textSub} />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={18} color={C.textSub} />
          </TouchableOpacity>
        ))
      )}
    </>
  );

  // === 作成フォーム ===
  const renderCreate = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}>
          <Text style={styles.backBtn}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>募集作成</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.label}>タイトル *</Text>
      <TextInput style={styles.input} placeholder="例: ポケカ大会のスポンサー募集" placeholderTextColor={C.textSub} value={formTitle} onChangeText={setFormTitle} />

      <Text style={styles.label}>説明</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} placeholder="大会の概要やスポンサーに期待すること" placeholderTextColor={C.textSub} value={formDesc} onChangeText={setFormDesc} multiline />

      <Text style={styles.label}>希望アイテム</Text>
      <TextInput style={styles.input} placeholder="例: オリパ、プレイマット、スリーブ" placeholderTextColor={C.textSub} value={formItems} onChangeText={setFormItems} />

      <Text style={styles.label}>希望予算（円）</Text>
      <TextInput style={styles.input} placeholder="例: 10000" placeholderTextColor={C.textSub} value={formBudget} onChangeText={setFormBudget} keyboardType="number-pad" />

      {/* 大会紐付け */}
      {myTournaments && myTournaments.length > 0 && (
        <>
          <Text style={styles.label}>紐付け大会（任意）</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[styles.tournamentChip, !formTournament && styles.tournamentChipActive]}
                onPress={() => setFormTournament(null)}
              >
                <Text style={[styles.chipText, !formTournament && { color: "#fff" }]}>なし</Text>
              </TouchableOpacity>
              {myTournaments.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tournamentChip, formTournament?.id === t.id && styles.tournamentChipActive]}
                  onPress={() => setFormTournament(t)}
                >
                  <Text style={[styles.chipText, formTournament?.id === t.id && { color: "#fff" }]} numberOfLines={1}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, creating && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>募集を作成</Text>}
      </TouchableOpacity>
    </>
  );

  // === オファー一覧 ===
  const renderOffers = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}>
          <Text style={styles.backBtn}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle} numberOfLines={1}>{selectedRequest?.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      {selectedRequest?.description && (
        <Text style={styles.requestDesc}>{selectedRequest.description}</Text>
      )}

      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
        オファー一覧 ({offers.length}件)
      </Text>

      {offers.length === 0 ? (
        <View style={styles.noOffers}>
          <Ionicons name="mail-outline" size={32} color={C.border} />
          <Text style={styles.noOffersText}>まだオファーはありません</Text>
        </View>
      ) : (
        offers.map((offer) => (
          <View key={offer.id} style={styles.offerItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerName}>{offer.sponsor_name}</Text>
              {offer.offer_description && (
                <Text style={styles.offerDesc} numberOfLines={3}>{offer.offer_description}</Text>
              )}
              {offer.offer_amount && (
                <Text style={styles.offerAmount}>¥{offer.offer_amount.toLocaleString()}</Text>
              )}
              {offer.sponsor_contact && (
                <Text style={styles.offerContact}>📧 {offer.sponsor_contact}</Text>
              )}
              <View style={[styles.offerStatusBadge, { backgroundColor: offer.status === "accepted" ? "#DCFCE7" : offer.status === "rejected" ? "#FEE2E2" : "#FEF3C7" }]}>
                <Text style={[styles.offerStatusText, { color: offer.status === "accepted" ? C.success : offer.status === "rejected" ? C.danger : C.warning }]}>
                  {offer.status === "accepted" ? "承認済" : offer.status === "rejected" ? "拒否済" : "検討中"}
                </Text>
              </View>
            </View>
            {offer.status === "pending" && (
              <View style={styles.offerActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOffer(offer)}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectOffer(offer)}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>スポンサー</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {view === "list" && renderList()}
          {view === "create" && renderCreate()}
          {view === "offers" && renderOffers()}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBtn: { minWidth: 60, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.primary },
  body: { padding: 16 },
  // サブヘッダー
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "bold", color: C.text, flex: 1, textAlign: "center" },
  backBtn: { fontSize: 14, color: C.primary, fontWeight: "600" },
  addBtn: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  // 空状態
  emptyBox: { alignItems: "center", padding: 32, backgroundColor: C.card, borderRadius: 12 },
  emptyText: { fontSize: 14, color: C.textSub, marginVertical: 12 },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  // リスト
  requestItem: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center", elevation: 2,
  },
  requestTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  requestSub: { fontSize: 12, color: C.textSub, marginTop: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "bold" },
  // フォーム
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  tournamentChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tournamentChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.text },
  submitBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  // オファー
  sectionLabel: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 },
  requestDesc: { fontSize: 13, color: C.textSub, lineHeight: 20, backgroundColor: C.card, borderRadius: 10, padding: 14 },
  noOffers: { alignItems: "center", paddingVertical: 32 },
  noOffersText: { fontSize: 14, color: C.textSub, marginTop: 8 },
  offerItem: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "flex-start", elevation: 2,
  },
  offerName: { fontSize: 15, fontWeight: "bold", color: C.text },
  offerDesc: { fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 18 },
  offerAmount: { fontSize: 14, fontWeight: "bold", color: C.primary, marginTop: 6 },
  offerContact: { fontSize: 12, color: C.textSub, marginTop: 4 },
  offerStatusBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  offerStatusText: { fontSize: 11, fontWeight: "bold" },
  offerActions: { gap: 8, marginLeft: 12 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.danger, alignItems: "center", justifyContent: "center" },
});
