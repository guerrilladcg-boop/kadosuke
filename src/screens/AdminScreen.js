import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Linking, Switch, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useAdmin } from "../hooks/useAdmin";

// ============================
// タブ定義（アイコン+説明付き）
// ============================
const TAB_CONFIG = [
  { key: "dashboard", icon: "grid-outline",           label: "ホーム" },
  { key: "sponsor",   icon: "gift-outline",            label: "商品管理" },
  { key: "exchanges", icon: "swap-horizontal-outline", label: "発送・対応" },
  { key: "pending",   icon: "person-add-outline",      label: "主催者申請" },
  { key: "history",   icon: "time-outline",            label: "申請履歴" },
];

export default function AdminScreen({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const {
    applications, history, loading, approveApplication, rejectApplication,
    sponsorItems, sponsorLoading, fetchSponsorItems,
    createSponsorItem, updateSponsorItem, toggleSponsorItemActive, deleteSponsorItem, drawLotteryWinner, uploadSponsorImage,
    pendingExchanges, completedExchanges, exchangesLoading, fulfillExchange,
    instantPrizesList, instantPrizesLoading,
    createInstantPrize, updateInstantPrize, deleteInstantPrize,
  } = useAdmin();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // 協賛商品作成/編集モーダル
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", icon: "🎁", point_cost: "", type: "exchange",
    sponsor_name: "", stock: "", sort_order: "0", delivery_type: "digital",
    lottery_type: "application", lottery_start_at: "", lottery_end_at: "",
  });

  // 商品画像
  const [itemImageUri, setItemImageUri] = useState(null);
  const [itemImageUploading, setItemImageUploading] = useState(false);

  // フルフィルメントモーダル
  const [fulfillModal, setFulfillModal] = useState(null);
  const [fulfillNote, setFulfillNote] = useState("");
  const [fulfillAction, setFulfillAction] = useState("");
  const [fulfillGiftCode, setFulfillGiftCode] = useState("");

  // 即時抽選景品管理モーダル
  const [prizeModal, setPrizeModal] = useState(null);
  const [prizeForm, setPrizeForm] = useState({
    name: "", description: "", icon: "🎁",
    probability_weight: "10", stock: "10", unlimitedStock: false,
    is_winning: false, point_refund: "0", delivery_type: "digital",
  });

  // ========================================
  // ハンドラー（変更なし）
  // ========================================
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

  // 日時のローカル表示用フォーマット（YYYY/MM/DD HH:mm）
  const formatDateTimeLocal = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${Y}/${M}/${D} ${h}:${m}`;
  };

  // 日時入力のパース（YYYY/MM/DD HH:mm → ISO文字列）
  const parseDateInput = (str) => {
    if (!str || !str.trim()) return null;
    const cleaned = str.replace(/\//g, "-").trim();
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      name: "", description: "", icon: "🎁", point_cost: "", type: "exchange",
      sponsor_name: "", stock: "", sort_order: "0", delivery_type: "digital",
      lottery_type: "application", lottery_start_at: "", lottery_end_at: "",
    });
    setItemImageUri(null);
    setItemModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      icon: item.icon || "🎁",
      point_cost: String(item.point_cost),
      type: item.type,
      sponsor_name: item.sponsor_name || "",
      stock: item.stock != null ? String(item.stock) : "",
      sort_order: String(item.sort_order || 0),
      delivery_type: item.delivery_type || "digital",
      lottery_type: item.lottery_type || "application",
      lottery_start_at: item.lottery_start_at ? formatDateTimeLocal(item.lottery_start_at) : "",
      lottery_end_at: item.lottery_end_at ? formatDateTimeLocal(item.lottery_end_at) : "",
    });
    setItemImageUri(item.image_url || null);
    setItemModal(true);
  };

  const pickItemImage = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("権限エラー", "写真ライブラリへのアクセスを許可してください");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setItemImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("エラー", "画像の選択に失敗しました");
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { Alert.alert("入力エラー", "商品名を入力してください"); return; }
    const cost = parseInt(itemForm.point_cost, 10);
    if (!cost || cost <= 0) { Alert.alert("入力エラー", "ポイントは1以上の数字を入力してください"); return; }

    const payload = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      icon: itemForm.icon || "🎁",
      point_cost: cost,
      type: itemForm.type,
      sponsor_name: itemForm.sponsor_name.trim() || null,
      stock: itemForm.stock ? parseInt(itemForm.stock, 10) : null,
      sort_order: parseInt(itemForm.sort_order, 10) || 0,
      delivery_type: itemForm.type === "exchange" ? itemForm.delivery_type : "digital",
      lottery_type: itemForm.type === "lottery" ? itemForm.lottery_type : null,
      lottery_start_at: itemForm.type === "lottery" ? parseDateInput(itemForm.lottery_start_at) : null,
      lottery_end_at: itemForm.type === "lottery" ? parseDateInput(itemForm.lottery_end_at) : null,
    };

    // 新しいローカル画像が選択されている場合（既存のURLではない）
    const isNewLocalImage = itemImageUri && !itemImageUri.startsWith("http");
    if (isNewLocalImage) {
      setItemImageUploading(true);
      const tempId = editingItem?.id || Date.now().toString();
      const { error: upErr, url } = await uploadSponsorImage(itemImageUri, tempId);
      setItemImageUploading(false);
      if (upErr) {
        Alert.alert("画像アップロードエラー", `${upErr?.message || upErr?.error || upErr?.statusCode || String(upErr)}`);
      } else {
        payload.image_url = url;
      }
    } else if (itemImageUri === null && editingItem?.image_url) {
      // 画像が削除された場合
      payload.image_url = null;
    }

    let result;
    if (editingItem) {
      result = await updateSponsorItem(editingItem.id, payload);
    } else {
      result = await createSponsorItem(payload);
    }

    if (!result.error) {
      setItemModal(false);
      Alert.alert("保存完了", editingItem ? "商品情報を更新しました" : "新しい商品を追加しました");
    } else {
      Alert.alert("エラー", `保存に失敗しました: ${JSON.stringify(result.error)}`);
    }
  };

  const handleToggleActive = (item) => {
    const isHide = item.is_active;
    Alert.alert(
      isHide ? "ユーザーに非表示にする" : "ユーザーに公開する",
      `「${item.name}」を${isHide ? "アプリから非表示に" : "アプリに公開"}しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: isHide ? "非表示にする" : "公開する", onPress: async () => {
          const { error } = await toggleSponsorItemActive(item.id, item.is_active);
          if (error) Alert.alert("エラー", "更新に失敗しました");
        }},
      ]
    );
  };

  const handleDeleteSponsorItem = (item) => {
    Alert.alert(
      "商品を削除",
      `「${item.name}」を完全に削除しますか？\n\n関連する応募・交換履歴もすべて削除されます。\nこの操作は取り消せません。`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "削除する", style: "destructive", onPress: async () => {
          const { error } = await deleteSponsorItem(item.id);
          if (error) Alert.alert("エラー", "削除に失敗しました");
          else Alert.alert("完了", "商品を削除しました");
        }},
      ]
    );
  };

  const handleDrawLottery = (item) => {
    Alert.alert(
      "当選者を決定する",
      `「${item.name}」の当選者を抽選で決めます。\n\n` +
      `参加者: ${item.total_entries || 0}人\n` +
      `合計投票: ${item.total_points_invested || 0}pt\n\n` +
      `⚠️ この操作は元に戻せません`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "抽選を実行", style: "destructive", onPress: async () => {
          const result = await drawLotteryWinner(item.id);
          if (result.error) {
            Alert.alert("エラー", typeof result.error === "string" ? result.error : "抽選に失敗しました");
          } else {
            Alert.alert("当選者が決まりました！", `当選者: ${result.winner?.name || "不明"}\n投票: ${result.winner?.total || 0}pt`);
          }
        }},
      ]
    );
  };

  const openFulfillModal = (exchange, action) => {
    setFulfillModal(exchange);
    setFulfillAction(action);
    setFulfillNote(exchange.admin_note || "");
    setFulfillGiftCode(exchange.gift_code || "");
  };

  const handleFulfill = async () => {
    if (!fulfillModal) return;
    const statusLabels = { shipped: "発送済み", completed: "対応完了", cancelled: "キャンセル" };
    const label = statusLabels[fulfillAction] || fulfillAction;

    Alert.alert(`ステータスを変更`, `「${label}」に変更しますか？`, [
      { text: "戻る", style: "cancel" },
      { text: `${label}にする`, style: fulfillAction === "cancelled" ? "destructive" : "default", onPress: async () => {
        const { error } = await fulfillExchange(fulfillModal.id, fulfillAction, fulfillNote, fulfillGiftCode);
        setFulfillModal(null);
        setFulfillNote("");
        setFulfillAction("");
        setFulfillGiftCode("");
        if (!error) Alert.alert("更新完了", `ステータスを「${label}」に変更しました`);
        else Alert.alert("エラー", "更新に失敗しました");
      }},
    ]);
  };

  // 即時抽選 景品管理
  const openPrizeModal = (item) => {
    setPrizeModal(item);
    resetPrizeForm();
  };

  const resetPrizeForm = () => {
    setPrizeForm({
      name: "", description: "", icon: "🎁",
      probability_weight: "10", stock: "10", unlimitedStock: false,
      is_winning: false, point_refund: "0", delivery_type: "digital",
    });
  };

  const handleAddPrize = async () => {
    if (!prizeModal) return;
    if (!prizeForm.name.trim()) { Alert.alert("入力エラー", "景品名を入力してください"); return; }
    const weight = parseInt(prizeForm.probability_weight, 10);
    if (!weight || weight <= 0) { Alert.alert("入力エラー", "確率は1%以上にしてください"); return; }
    const stock = prizeForm.unlimitedStock ? null : parseInt(prizeForm.stock, 10);
    if (stock !== null && (isNaN(stock) || stock < 0)) { Alert.alert("入力エラー", "在庫数は0以上にしてください"); return; }

    // 既存景品の確率合計 + 新規を足して100%チェック
    const existingPrizes = getPrizesForItem(prizeModal.id);
    const currentTotal = existingPrizes.reduce((sum, p) => sum + p.probability_weight, 0);
    if (currentTotal + weight > 100) {
      Alert.alert("入力エラー", `確率の合計が100%を超えます。\n現在の合計: ${currentTotal}%\n残り: ${100 - currentTotal}%`);
      return;
    }

    const { error } = await createInstantPrize({
      item_id: prizeModal.id,
      name: prizeForm.name.trim(),
      description: prizeForm.description.trim() || null,
      icon: prizeForm.icon || "🎁",
      probability_weight: weight,
      stock: stock,
      is_winning: prizeForm.is_winning,
      point_refund: parseInt(prizeForm.point_refund, 10) || 0,
      delivery_type: prizeForm.delivery_type || "digital",
    });

    if (!error) {
      resetPrizeForm();
      const newTotal = currentTotal + weight;
      if (newTotal < 100) {
        Alert.alert("追加完了", `景品を追加しました。\n\n確率合計: ${newTotal}% / 100%\n残り ${100 - newTotal}% を追加してください。`);
      } else {
        Alert.alert("追加完了", "景品を追加しました。確率合計が100%になりました！");
      }
    } else {
      Alert.alert("エラー", "景品の追加に失敗しました");
    }
  };

  const handleDeletePrize = (prize) => {
    Alert.alert("景品を削除", `「${prize.name}」を削除しますか？\n\n※削除すると元に戻せません`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除する", style: "destructive", onPress: async () => {
        const { error } = await deleteInstantPrize(prize.id);
        if (error) Alert.alert("エラー", "削除に失敗しました");
      }},
    ]);
  };

  const getPrizesForItem = (itemId) => {
    return instantPrizesList.filter((p) => p.item_id === itemId);
  };

  // ========================================
  // ダッシュボード（ホーム画面）
  // ========================================
  const renderDashboard = () => {
    const exchangeCount = sponsorItems.filter((i) => i.type === "exchange").length;
    const instantCount = sponsorItems.filter((i) => i.type === "lottery" && i.lottery_type === "instant").length;
    const applicationCount = sponsorItems.filter((i) => i.type === "lottery" && (i.lottery_type === "application" || !i.lottery_type)).length;

    return (
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 対応が必要なもの */}
        {(pendingExchanges.length > 0 || applications.length > 0) && (
          <>
            <View style={styles.dashSectionHeader}>
              <View style={styles.dashAlertDot} />
              <Text style={styles.dashSectionTitle}>対応が必要</Text>
            </View>
            {pendingExchanges.length > 0 && (
              <TouchableOpacity style={styles.dashAlertCard} onPress={() => setActiveTab("exchanges")}>
                <View style={styles.dashAlertIconWrap}>
                  <Ionicons name="cube-outline" size={22} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashAlertTitle}>未対応の交換が {pendingExchanges.length}件 あります</Text>
                  <Text style={styles.dashAlertSub}>発送・コード送付などの対応が必要です</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B45309" />
              </TouchableOpacity>
            )}
            {applications.length > 0 && (
              <TouchableOpacity style={[styles.dashAlertCard, { backgroundColor: "#EFF6FF", borderLeftColor: "#2563EB" }]} onPress={() => setActiveTab("pending")}>
                <View style={[styles.dashAlertIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="person-add-outline" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dashAlertTitle, { color: "#1E40AF" }]}>主催者申請が {applications.length}件 あります</Text>
                  <Text style={[styles.dashAlertSub, { color: "#2563EB" }]}>承認・却下の判断が必要です</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* クイックアクション */}
        <View style={[styles.dashSectionHeader, { marginTop: 20 }]}>
          <Text style={styles.dashSectionTitle}>クイックアクション</Text>
        </View>
        <View style={styles.dashGrid}>
          <TouchableOpacity style={[styles.dashTile, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={() => { setActiveTab("sponsor"); setTimeout(openCreateModal, 300); }}>
            <View style={[styles.dashTileIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </View>
            <Text style={[styles.dashTileLabel, { color: "#fff" }]}>新しい商品を{"\n"}追加する</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => setActiveTab("sponsor")}>
            <View style={[styles.dashTileIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="create-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.dashTileLabel}>既存の商品を{"\n"}編集する</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashTile} onPress={() => setActiveTab("exchanges")}>
            <View style={[styles.dashTileIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="checkmark-done-outline" size={24} color="#16A34A" />
            </View>
            <Text style={styles.dashTileLabel}>交換の発送{"\n"}対応をする</Text>
          </TouchableOpacity>
        </View>

        {/* 商品サマリー */}
        <View style={[styles.dashSectionHeader, { marginTop: 20 }]}>
          <Text style={styles.dashSectionTitle}>登録商品の概要</Text>
        </View>
        <View style={styles.dashSummaryCard}>
          <View style={styles.dashSummaryRow}>
            <View style={[styles.dashSummaryDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={styles.dashSummaryLabel}>ポイント交換アイテム</Text>
            <Text style={styles.dashSummaryValue}>{exchangeCount}件</Text>
          </View>
          <View style={styles.dashSummaryDivider} />
          <View style={styles.dashSummaryRow}>
            <View style={[styles.dashSummaryDot, { backgroundColor: "#7C3AED" }]} />
            <Text style={styles.dashSummaryLabel}>即時抽選（ルーレット）</Text>
            <Text style={styles.dashSummaryValue}>{instantCount}件</Text>
          </View>
          <View style={styles.dashSummaryDivider} />
          <View style={styles.dashSummaryRow}>
            <View style={[styles.dashSummaryDot, { backgroundColor: "#D97706" }]} />
            <Text style={styles.dashSummaryLabel}>応募抽選（後日当選発表）</Text>
            <Text style={styles.dashSummaryValue}>{applicationCount}件</Text>
          </View>
          <View style={styles.dashSummaryDivider} />
          <View style={styles.dashSummaryRow}>
            <View style={[styles.dashSummaryDot, { backgroundColor: C.textSub }]} />
            <Text style={styles.dashSummaryLabel}>対応済みの交換</Text>
            <Text style={styles.dashSummaryValue}>{completedExchanges.length}件</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ========================================
  // 商品管理タブ
  // ========================================
  const renderSponsorTab = () => {
    if (sponsorLoading) {
      return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    }

    const activeItems = sponsorItems.filter((i) => i.is_active);
    const inactiveItems = sponsorItems.filter((i) => !i.is_active);

    return (
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* セクション説明 */}
        <View style={styles.sectionDesc}>
          <Ionicons name="information-circle-outline" size={16} color={C.textSub} />
          <Text style={styles.sectionDescText}>
            ここではアプリに表示する商品（交換・抽選）を追加・編集できます。
            即時抽選の場合は、商品を作成後に「景品を設定」から景品を登録してください。
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>新しい商品を追加</Text>
        </TouchableOpacity>

        {sponsorItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="gift-outline" size={48} color={C.textSub} />
            <Text style={styles.emptyTitle}>まだ商品がありません</Text>
            <Text style={styles.emptyDesc}>上のボタンから最初の商品を追加しましょう</Text>
          </View>
        ) : (
          <>
            {activeItems.length > 0 && (
              <>
                <View style={styles.sectionLabelRow}>
                  <View style={[styles.sectionLabelDot, { backgroundColor: C.success }]} />
                  <Text style={styles.sectionLabel}>公開中の商品 ({activeItems.length})</Text>
                </View>
                {activeItems.map((item) => renderSponsorCard(item))}
              </>
            )}
            {inactiveItems.length > 0 && (
              <>
                <View style={[styles.sectionLabelRow, { marginTop: 20 }]}>
                  <View style={[styles.sectionLabelDot, { backgroundColor: C.textSub }]} />
                  <Text style={styles.sectionLabel}>非公開の商品 ({inactiveItems.length})</Text>
                </View>
                {inactiveItems.map((item) => renderSponsorCard(item))}
              </>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderSponsorCard = (item) => {
    const isLottery = item.type === "lottery";
    const isInstant = isLottery && item.lottery_type === "instant";
    const isApplication = isLottery && (item.lottery_type === "application" || !item.lottery_type);
    const isDrawn = item.lottery_status === "drawn";
    const isClosed = item.lottery_status === "closed";
    const itemPrizes = isInstant ? getPrizesForItem(item.id) : [];

    // カードの左ボーダー色を種別で変える
    const borderColor = isInstant ? "#7C3AED" : isApplication ? "#D97706" : "#3B82F6";
    const typeLabelText = isInstant ? "即時抽選（ルーレット）" : isApplication ? "応募抽選（後日当選）" : item.delivery_type === "physical" ? "ポイント交換（配送あり）" : "ポイント交換（デジタル）";
    const typeLabelBg = isInstant ? "#F3E8FF" : isApplication ? "#FEF3C7" : "#DBEAFE";
    const typeLabelColor = isInstant ? "#7C3AED" : isApplication ? "#92400E" : "#1E40AF";

    return (
      <View key={item.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }, !item.is_active && styles.cardInactive]}>
        {/* ヘッダー */}
        <View style={styles.sponsorCardHeader}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.sponsorThumb} />
          ) : (
            <Text style={styles.sponsorIcon}>{item.icon}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, !item.is_active && { opacity: 0.5 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {item.point_cost}pt{isLottery ? " / 1回" : ""} ・ {item.sponsor_name || "提供元未設定"}
            </Text>
          </View>
        </View>

        {/* 種別ラベル */}
        <View style={[styles.typeLabel, { backgroundColor: typeLabelBg }]}>
          <Text style={[styles.typeLabelText, { color: typeLabelColor }]}>{typeLabelText}</Text>
        </View>

        {item.stock != null && (
          <View style={styles.infoRow}>
            <Ionicons name="archive-outline" size={14} color={C.textSub} />
            <Text style={styles.infoRowText}>在庫: <Text style={{ fontWeight: "bold", color: item.stock > 0 ? C.text : C.danger }}>{item.stock > 0 ? `${item.stock}個` : "在庫切れ"}</Text></Text>
          </View>
        )}

        {/* 抽選期間表示 */}
        {isLottery && (item.lottery_start_at || item.lottery_end_at) && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={C.textSub} />
            <Text style={styles.infoRowText}>
              期間: {item.lottery_start_at ? formatDateTimeLocal(item.lottery_start_at) : "未設定"}
              {" 〜 "}
              {item.lottery_end_at ? formatDateTimeLocal(item.lottery_end_at) : "未設定"}
            </Text>
          </View>
        )}

        {/* 応募抽選の統計 */}
        {isApplication && (
          <>
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 6 }} />
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={14} color={C.textSub} />
              <Text style={styles.statText}>{item.total_entries || 0}人参加</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="ticket-outline" size={14} color={C.textSub} />
              <Text style={styles.statText}>{item.total_points_invested || 0}pt投票</Text>
            </View>
            {isDrawn && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={14} color={C.warning} />
                  <Text style={[styles.statText, { color: C.warning, fontWeight: "bold" }]}>当選者決定済み</Text>
                </View>
              </>
            )}
            {isClosed && !isDrawn && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="lock-closed" size={14} color={C.danger} />
                  <Text style={[styles.statText, { color: C.danger }]}>受付終了</Text>
                </View>
              </>
            )}
          </View>
          </>
        )}

        {/* 即時抽選の景品サマリー */}
        {isInstant && itemPrizes.length > 0 && (() => {
          const totalProb = itemPrizes.reduce((sum, p) => sum + p.probability_weight, 0);
          return (
            <View style={styles.prizeSummaryBox}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.prizeSummaryTitle}>登録済み景品 ({itemPrizes.length})</Text>
                <Text style={[styles.prizeSummaryTitle, totalProb !== 100 && { color: C.danger }]}>
                  合計: {totalProb}%{totalProb !== 100 ? " ⚠️" : " ✓"}
                </Text>
              </View>
              {totalProb !== 100 && (
                <View style={{ backgroundColor: "#FEF2F2", borderRadius: 6, padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: C.danger, fontWeight: "600" }}>
                    確率の合計が100%ではありません（残り{100 - totalProb}%）
                  </Text>
                </View>
              )}
              {itemPrizes.map((p) => (
                <View key={p.id} style={styles.prizeSummaryRow}>
                  <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                  <Text style={[styles.prizeSummaryName, !p.is_winning && { color: C.textSub }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={[styles.prizeMiniTag, p.is_winning ? { backgroundColor: "#DCFCE7" } : { backgroundColor: "#F3F4F6" }]}>
                    <Text style={[styles.prizeMiniTagText, { color: p.is_winning ? "#16A34A" : C.textSub }]}>
                      {p.is_winning ? "当たり" : "はずれ"}
                    </Text>
                  </View>
                  <Text style={styles.prizeSummaryDetail}>{p.probability_weight}%</Text>
                  <Text style={[styles.prizeSummaryStock, p.stock !== null && p.stock <= 0 && { color: C.danger }]}>
                    {p.stock === null ? "∞" : `残${p.stock}`}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}
        {isInstant && itemPrizes.length === 0 && (
          <View style={styles.noPrizeWarning}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.noPrizeWarningText}>景品が未登録です。下の「景品を設定」から追加してください</Text>
          </View>
        )}

        {isDrawn && item.winner_user_id && (
          <View style={styles.winnerRow}>
            <Ionicons name="trophy" size={16} color={C.warning} />
            <Text style={styles.winnerText}>当選者ID: {item.winner_user_id.slice(0, 8)}...</Text>
            <Text style={styles.winnerDate}>{formatDate(item.drawn_at)}</Text>
          </View>
        )}

        {/* アクションボタン群（2段構成） */}
        <View style={styles.actionBar}>
          {/* 主要アクション（全幅） */}
          {isInstant && (
            <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: "#7C3AED" }]} onPress={() => openPrizeModal(item)}>
              <Ionicons name="gift-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnFilledText}>景品を設定する</Text>
            </TouchableOpacity>
          )}
          {isApplication && !isDrawn && item.lottery_status !== "closed" && (
            <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: C.warning }]} onPress={() => handleDrawLottery(item)}>
              <Ionicons name="dice-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnFilledText}>当選者を決める</Text>
            </TouchableOpacity>
          )}
          {/* 編集・公開切替・削除（横並び） */}
          <View style={styles.actionBarRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
              <Ionicons name="create-outline" size={16} color={C.primary} />
              <Text style={[styles.actionBtnText, { color: C.primary }]}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, item.is_active ? styles.actionBtnDanger : styles.actionBtnSuccess]}
              onPress={() => handleToggleActive(item)}
            >
              <Ionicons name={item.is_active ? "eye-off-outline" : "eye-outline"} size={16} color={item.is_active ? C.danger : C.success} />
              <Text style={[styles.actionBtnText, { color: item.is_active ? C.danger : C.success }]}>
                {item.is_active ? "非公開" : "公開"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => handleDeleteSponsorItem(item)}
            >
              <Ionicons name="trash-outline" size={16} color={C.danger} />
              <Text style={[styles.actionBtnText, { color: C.danger }]}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ========================================
  // 発送・対応管理タブ
  // ========================================
  const renderExchangesTab = () => {
    if (exchangesLoading) {
      return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
    }

    return (
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionDesc}>
          <Ionicons name="information-circle-outline" size={16} color={C.textSub} />
          <Text style={styles.sectionDescText}>
            ユーザーがポイントで交換した商品の発送・対応状況を管理できます。
            配送アイテムは「発送済み→完了」、デジタルは「対応済み」に変更してください。
          </Text>
        </View>

        {/* 対応待ち */}
        <View style={styles.sectionLabelRow}>
          <View style={[styles.sectionLabelDot, { backgroundColor: "#D97706" }]} />
          <Text style={styles.sectionLabel}>対応待ち ({pendingExchanges.length})</Text>
        </View>
        {pendingExchanges.length === 0 ? (
          <View style={styles.emptySmall}>
            <Ionicons name="checkmark-circle-outline" size={32} color={C.success} />
            <Text style={styles.emptySmallText}>すべて対応済みです！</Text>
          </View>
        ) : (
          pendingExchanges.map((ex) => renderExchangeCard(ex))
        )}

        {/* 対応済み */}
        {completedExchanges.length > 0 && (
          <>
            <View style={[styles.sectionLabelRow, { marginTop: 20 }]}>
              <View style={[styles.sectionLabelDot, { backgroundColor: C.success }]} />
              <Text style={styles.sectionLabel}>対応済み ({completedExchanges.length})</Text>
            </View>
            {completedExchanges.map((ex) => renderExchangeCard(ex, true))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderExchangeCard = (ex, isHistory = false) => {
    const isPhysical = ex.delivery_type === "physical" || ex.sponsor_items?.delivery_type === "physical";
    const statusConfig = {
      pending: { bg: "#FEF3C7", text: "#D97706", label: "対応待ち", icon: "time-outline" },
      shipped: { bg: "#DBEAFE", text: "#2563EB", label: "発送済み", icon: "cube-outline" },
      completed: { bg: "#DCFCE7", text: "#16A34A", label: "対応完了", icon: "checkmark-circle" },
      cancelled: { bg: "#FEE2E2", text: "#EF4444", label: "キャンセル", icon: "close-circle" },
    };
    const sc = statusConfig[ex.status] || statusConfig.pending;

    return (
      <View key={ex.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: isPhysical ? "#2563EB" : "#7C3AED" }]}>
        <View style={styles.exchangeCardHeader}>
          {ex.sponsor_items?.image_url ? (
            <Image source={{ uri: ex.sponsor_items.image_url }} style={styles.sponsorThumb} />
          ) : (
            <Text style={styles.sponsorIcon}>{ex.sponsor_items?.icon || "🎁"}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{ex.sponsor_items?.name || "不明な商品"}</Text>
            <Text style={styles.cardSubtitle}>
              {ex.profiles?.name || "不明"} ・ {ex.profiles?.email || ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon} size={12} color={sc.text} />
            <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* 配送アイテムのステータス進捗バー */}
        {isPhysical && !isHistory && ex.status !== "cancelled" && (
          <View style={styles.progressStrip}>
            {[
              { key: "pending", label: "対応待ち" },
              { key: "shipped", label: "発送済み" },
              { key: "completed", label: "配送完了" },
            ].map((step, idx) => {
              const stepStatuses = ["pending", "shipped", "completed"];
              const currentIdx = stepStatuses.indexOf(ex.status);
              const isStepDone = idx <= currentIdx;
              const isCurrentStep = idx === currentIdx;
              return (
                <React.Fragment key={step.key}>
                  <View style={[
                    styles.progressStep,
                    isStepDone && styles.progressStepDone,
                    isCurrentStep && styles.progressStepCurrent,
                  ]}>
                    <Text style={[
                      styles.progressStepText,
                      isStepDone && !isCurrentStep && styles.progressStepTextDone,
                      isCurrentStep && { color: "#fff" },
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                  {idx < 2 && (
                    <View style={[
                      styles.progressLine,
                      isStepDone && idx < currentIdx && styles.progressLineDone,
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}

        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>消費ポイント</Text>
            <Text style={styles.detailValue}>{ex.points_spent}pt</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>申請日時</Text>
            <Text style={styles.detailValue}>{formatDate(ex.created_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>受渡し方法</Text>
            <View style={[styles.deliveryTypeBadge, isPhysical ? { backgroundColor: "#DBEAFE" } : { backgroundColor: "#F3E8FF" }]}>
              <Text style={[styles.deliveryTypeBadgeText, isPhysical ? { color: "#1D4ED8" } : { color: "#6D28D9" }]}>
                {isPhysical ? "📦 配送" : "🎫 デジタル"}
              </Text>
            </View>
          </View>
        </View>

        {isPhysical && ex.shipping_name && (
          <View style={styles.shippingBox}>
            <View style={styles.shippingHeader}>
              <Ionicons name="location-outline" size={14} color="#0369A1" />
              <Text style={styles.shippingTitle}>配送先住所</Text>
            </View>
            <Text style={styles.shippingLine}>{ex.shipping_name}</Text>
            <Text style={styles.shippingLine}>〒{ex.shipping_zip}</Text>
            <Text style={styles.shippingLine}>
              {ex.shipping_prefecture}{ex.shipping_city}{ex.shipping_address}
            </Text>
            {ex.shipping_building && <Text style={styles.shippingLine}>{ex.shipping_building}</Text>}
            <Text style={styles.shippingLine}>TEL: {ex.shipping_phone}</Text>
          </View>
        )}

        {ex.admin_note && (
          <View style={styles.adminNoteBox}>
            <Ionicons name="document-text-outline" size={14} color="#92400E" />
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.adminNoteLabel}>管理者メモ</Text>
              <Text style={styles.adminNoteText}>{ex.admin_note}</Text>
            </View>
          </View>
        )}

        {!isHistory && (
          <View style={styles.actionBar}>
            {/* 主要アクション（全幅） */}
            {isPhysical && ex.status === "pending" && (
              <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: "#2563EB" }]} onPress={() => openFulfillModal(ex, "shipped")}>
                <Ionicons name="cube-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnFilledText}>発送済みにする</Text>
              </TouchableOpacity>
            )}
            {isPhysical && ex.status === "shipped" && (
              <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: C.success }]} onPress={() => openFulfillModal(ex, "completed")}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnFilledText}>配送完了にする</Text>
              </TouchableOpacity>
            )}
            {!isPhysical && ex.status === "pending" && (
              <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: C.success }]} onPress={() => openFulfillModal(ex, "completed")}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnFilledText}>対応済みにする</Text>
              </TouchableOpacity>
            )}
            {ex.status === "pending" && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => openFulfillModal(ex, "cancelled")}>
                <Ionicons name="close-circle-outline" size={16} color={C.danger} />
                <Text style={[styles.actionBtnText, { color: C.danger }]}>キャンセル</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ========================================
  // メインレンダリング
  // ========================================
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

        {/* タブバー（固定5等分） */}
        <View style={styles.tabRow}>
          {TAB_CONFIG.map((t) => {
            const isActive = activeTab === t.key;
            const badgeCount = t.key === "exchanges" ? pendingExchanges.length : t.key === "pending" ? applications.length : 0;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name={t.icon} size={isActive ? 20 : 18} color={isActive ? C.primary : C.textSub} />
                  {badgeCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{badgeCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* タブコンテンツ */}
        {activeTab === "dashboard" ? (
          renderDashboard()
        ) : activeTab === "sponsor" ? (
          renderSponsorTab()
        ) : activeTab === "exchanges" ? (
          renderExchangesTab()
        ) : loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === "pending" ? (
              <>
                <View style={styles.sectionDesc}>
                  <Ionicons name="information-circle-outline" size={16} color={C.textSub} />
                  <Text style={styles.sectionDescText}>
                    大会主催者になりたいユーザーからの申請です。SNSアカウント等を確認して承認・却下してください。
                  </Text>
                </View>
                {applications.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="checkmark-circle-outline" size={48} color={C.success} />
                    <Text style={styles.emptyTitle}>申請はありません</Text>
                    <Text style={styles.emptyDesc}>新しい申請が届くとここに表示されます</Text>
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
                          <Text style={styles.cardTitle}>{app.profiles?.name || "名前未設定"}</Text>
                          <Text style={styles.cardSubtitle}>申請日: {formatDate(app.applied_at)}</Text>
                        </View>
                      </View>
                      {(app.x_account || app.tonamel_url) && (
                        <View style={styles.socialInfo}>
                          {app.x_account ? (
                            <TouchableOpacity
                              style={styles.socialRow}
                              onPress={() => Linking.openURL(`https://x.com/${app.x_account}`)}
                            >
                              <Ionicons name="logo-twitter" size={14} color="#1DA1F2" />
                              <Text style={styles.socialText}>@{app.x_account}</Text>
                              <Ionicons name="open-outline" size={12} color={C.textSub} />
                            </TouchableOpacity>
                          ) : null}
                          {app.tonamel_url ? (
                            <TouchableOpacity
                              style={styles.socialRow}
                              onPress={() => Linking.openURL(app.tonamel_url)}
                            >
                              <Ionicons name="trophy-outline" size={14} color={C.primary} />
                              <Text style={styles.socialText} numberOfLines={1}>Tonamel</Text>
                              <Ionicons name="open-outline" size={12} color={C.textSub} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}
                      <View style={styles.actionBar}>
                        <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: C.success }]} onPress={() => handleApprove(app)}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.actionBtnFilledText}>承認する</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setRejectModal(app); setRejectReason(""); }}>
                          <Ionicons name="close" size={16} color={C.danger} />
                          <Text style={[styles.actionBtnText, { color: C.danger }]}>却下する</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {history.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="time-outline" size={48} color={C.textSub} />
                    <Text style={styles.emptyTitle}>履歴はまだありません</Text>
                    <Text style={styles.emptyDesc}>承認・却下した申請がここに表示されます</Text>
                  </View>
                ) : (
                  history.map((app) => (
                    <View key={app.id} style={styles.card}>
                      <View style={styles.cardInfo}>
                        <View style={[styles.statusDot, { backgroundColor: app.status === "approved" ? C.success : C.danger }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{app.profiles?.name || "名前未設定"}</Text>
                          <Text style={styles.cardSubtitle}>
                            {app.status === "approved" ? "✅ 承認済み" : "❌ 却下済み"} ・ {formatDate(app.reviewed_at)}
                          </Text>
                          {app.reason ? <Text style={styles.reasonText}>理由: {app.reason}</Text> : null}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}

        {/* 却下理由モーダル */}
        <Modal visible={!!rejectModal} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>却下理由を入力</Text>
              <Text style={styles.modalSubtitle}>理由は任意です。空欄でも却下できます。</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="却下理由を入力..."
                placeholderTextColor={C.textSub}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModal(null)}>
                  <Text style={styles.modalCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: C.danger }]} onPress={handleReject}>
                  <Text style={styles.modalConfirmText}>却下する</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* フルフィルメントモーダル */}
        <Modal visible={!!fulfillModal} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>
                {fulfillAction === "shipped" ? "発送済みに変更" :
                 fulfillAction === "completed" ? "対応完了に変更" : "この交換をキャンセル"}
              </Text>
              <View style={styles.fulfillItemInfo}>
                <Text style={{ fontSize: 20 }}>{fulfillModal?.prize_icon || fulfillModal?.sponsor_items?.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {fulfillModal?.prize_name || fulfillModal?.sponsor_items?.name}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    送り先: {fulfillModal?.profiles?.name}
                    {fulfillModal?.type === "instant_lottery_win" && " (即時抽選当選)"}
                  </Text>
                </View>
              </View>

              {/* ギフトコード入力（ギフトコード配送タイプの場合） */}
              {fulfillModal?.delivery_type === "gift_code" && fulfillAction === "completed" && (
                <>
                  <Text style={styles.formLabel}>
                    ギフトコード <Text style={{ color: C.danger }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { fontFamily: "monospace", fontSize: 16, letterSpacing: 1 }]}
                    placeholder="例: XXXX-XXXX-XXXX"
                    placeholderTextColor={C.textSub}
                    value={fulfillGiftCode}
                    onChangeText={setFulfillGiftCode}
                    autoCapitalize="characters"
                  />
                  <Text style={{ fontSize: 11, color: C.textSub, marginBottom: 8 }}>
                    ユーザーの交換履歴にこのコードが表示されます
                  </Text>
                </>
              )}

              <Text style={styles.formLabel}>
                管理者メモ（追跡番号・備考等）
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="例: 追跡番号や備考等"
                placeholderTextColor={C.textSub}
                value={fulfillNote}
                onChangeText={setFulfillNote}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setFulfillModal(null); setFulfillNote(""); setFulfillAction(""); setFulfillGiftCode(""); }}>
                  <Text style={styles.modalCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, fulfillAction === "cancelled" ? { backgroundColor: C.danger } : { backgroundColor: C.primary }]}
                  onPress={handleFulfill}
                >
                  <Text style={styles.modalConfirmText}>
                    {fulfillAction === "shipped" ? "発送済みにする" :
                     fulfillAction === "completed" ? "完了にする" : "キャンセルする"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 協賛商品作成/編集モーダル */}
        <Modal visible={itemModal} animationType="fade" transparent>
          <View style={styles.overlay}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>
                  {editingItem ? "商品を編集" : "新しい商品を追加"}
                </Text>
                {!editingItem && (
                  <Text style={styles.modalSubtitle}>アプリのポイント交換・抽選に表示される商品を登録します</Text>
                )}

                <Text style={styles.formLabel}>商品名 <Text style={{ color: C.danger }}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="例: 限定スリーブセット"
                  placeholderTextColor={C.textSub}
                  value={itemForm.name}
                  onChangeText={(v) => setItemForm({ ...itemForm, name: v })}
                />

                <Text style={styles.formLabel}>商品の説明</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 60, textAlignVertical: "top" }]}
                  placeholder="ユーザーに表示される説明文"
                  placeholderTextColor={C.textSub}
                  value={itemForm.description}
                  onChangeText={(v) => setItemForm({ ...itemForm, description: v })}
                  multiline
                />

                <Text style={styles.formLabel}>商品画像（任意）</Text>
                <Text style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>
                  画像がある場合はアイコン絵文字より優先して表示されます
                </Text>
                {itemImageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: itemImageUri }} style={styles.imagePreview} />
                    <View style={styles.imagePreviewActions}>
                      <TouchableOpacity style={styles.imagePreviewBtn} onPress={pickItemImage}>
                        <Ionicons name="camera-outline" size={16} color={C.primary} />
                        <Text style={styles.imagePreviewBtnText}>変更</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.imagePreviewBtn} onPress={() => setItemImageUri(null)}>
                        <Ionicons name="trash-outline" size={16} color={C.danger} />
                        <Text style={[styles.imagePreviewBtnText, { color: C.danger }]}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={pickItemImage}>
                    <Ionicons name="image-outline" size={28} color={C.textSub} />
                    <Text style={styles.imagePickerBtnText}>タップして画像を選択</Text>
                  </TouchableOpacity>
                )}
                {itemImageUploading && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={{ fontSize: 12, color: C.textSub }}>アップロード中...</Text>
                  </View>
                )}

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>アイコン（絵文字）</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="🎁"
                      placeholderTextColor={C.textSub}
                      value={itemForm.icon}
                      onChangeText={(v) => setItemForm({ ...itemForm, icon: v })}
                    />
                  </View>
                  <View style={{ flex: 2, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>提供元（スポンサー名）</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="例: カドスケ運営"
                      placeholderTextColor={C.textSub}
                      value={itemForm.sponsor_name}
                      onChangeText={(v) => setItemForm({ ...itemForm, sponsor_name: v })}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>商品の種類</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeOption, itemForm.type === "exchange" && styles.typeOptionActive]}
                    onPress={() => setItemForm({ ...itemForm, type: "exchange" })}
                  >
                    <Text style={styles.typeOptionEmoji}>🔄</Text>
                    <Text style={[styles.typeOptionLabel, itemForm.type === "exchange" && styles.typeOptionLabelActive]}>ポイント交換</Text>
                    <Text style={styles.typeOptionDesc}>ポイントで交換</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeOption, itemForm.type === "lottery" && styles.typeOptionActive]}
                    onPress={() => setItemForm({ ...itemForm, type: "lottery" })}
                  >
                    <Text style={styles.typeOptionEmoji}>🎰</Text>
                    <Text style={[styles.typeOptionLabel, itemForm.type === "lottery" && styles.typeOptionLabelActive]}>抽選</Text>
                    <Text style={styles.typeOptionDesc}>ポイントで応募</Text>
                  </TouchableOpacity>
                </View>

                {/* 抽選タイプ選択 */}
                {itemForm.type === "lottery" && (
                  <>
                    <Text style={styles.formLabel}>抽選の方式</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[styles.typeOption, itemForm.lottery_type === "instant" && styles.typeOptionActiveInstant]}
                        onPress={() => setItemForm({ ...itemForm, lottery_type: "instant" })}
                      >
                        <Text style={styles.typeOptionEmoji}>🎰</Text>
                        <Text style={[styles.typeOptionLabel, itemForm.lottery_type === "instant" && { color: "#7C3AED" }]}>即時抽選</Text>
                        <Text style={styles.typeOptionDesc}>その場で結果</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeOption, itemForm.lottery_type === "application" && styles.typeOptionActive]}
                        onPress={() => setItemForm({ ...itemForm, lottery_type: "application" })}
                      >
                        <Text style={styles.typeOptionEmoji}>📮</Text>
                        <Text style={[styles.typeOptionLabel, itemForm.lottery_type === "application" && styles.typeOptionLabelActive]}>応募抽選</Text>
                        <Text style={styles.typeOptionDesc}>後日当選発表</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* 抽選期間入力 */}
                {itemForm.type === "lottery" && (
                  <>
                    <Text style={styles.formLabel}>抽選期間</Text>
                    <Text style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>
                      期間外になると自動的にユーザーに非表示になります。空欄の場合は常時表示されます。
                    </Text>
                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>開始日時</Text>
                        <TextInput
                          style={styles.formInput}
                          placeholder="例: 2026/03/15 12:00"
                          placeholderTextColor={C.textSub}
                          value={itemForm.lottery_start_at}
                          onChangeText={(v) => setItemForm({ ...itemForm, lottery_start_at: v })}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.formLabel}>終了日時</Text>
                        <TextInput
                          style={styles.formInput}
                          placeholder="例: 2026/03/31 23:59"
                          placeholderTextColor={C.textSub}
                          value={itemForm.lottery_end_at}
                          onChangeText={(v) => setItemForm({ ...itemForm, lottery_end_at: v })}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* 配送タイプ選択 */}
                {itemForm.type === "exchange" && (
                  <>
                    <Text style={styles.formLabel}>受渡し方法</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[styles.typeOption, itemForm.delivery_type === "physical" && styles.typeOptionActive]}
                        onPress={() => setItemForm({ ...itemForm, delivery_type: "physical" })}
                      >
                        <Text style={styles.typeOptionEmoji}>📦</Text>
                        <Text style={[styles.typeOptionLabel, itemForm.delivery_type === "physical" && styles.typeOptionLabelActive]}>配送</Text>
                        <Text style={styles.typeOptionDesc}>住所入力あり</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeOption, itemForm.delivery_type === "digital" && styles.typeOptionActive]}
                        onPress={() => setItemForm({ ...itemForm, delivery_type: "digital" })}
                      >
                        <Text style={styles.typeOptionEmoji}>🎫</Text>
                        <Text style={[styles.typeOptionLabel, itemForm.delivery_type === "digital" && styles.typeOptionLabelActive]}>デジタル</Text>
                        <Text style={styles.typeOptionDesc}>コード等を送付</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>
                      必要ポイント <Text style={{ color: C.danger }}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={itemForm.type === "lottery" ? "1回あたり" : "交換に必要なpt"}
                      placeholderTextColor={C.textSub}
                      value={itemForm.point_cost}
                      onChangeText={(v) => setItemForm({ ...itemForm, point_cost: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>在庫数</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="空欄=無制限"
                      placeholderTextColor={C.textSub}
                      value={itemForm.stock}
                      onChangeText={(v) => setItemForm({ ...itemForm, stock: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>表示順</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="0"
                      placeholderTextColor={C.textSub}
                      value={itemForm.sort_order}
                      onChangeText={(v) => setItemForm({ ...itemForm, sort_order: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setItemModal(false)}>
                    <Text style={styles.modalCancelText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: C.primary }]} onPress={handleSaveItem}>
                    <Text style={styles.modalConfirmText}>{editingItem ? "保存する" : "追加する"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* 即時抽選 景品管理モーダル */}
        <Modal visible={!!prizeModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setPrizeModal(null)} style={styles.headerBtn}>
                <Text style={styles.cancel}>閉じる</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>景品の設定</Text>
              <View style={styles.headerBtn} />
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* 対象アイテム情報 */}
              {prizeModal && (
                <View style={styles.prizeTargetInfo}>
                  <Text style={{ fontSize: 28 }}>{prizeModal.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{prizeModal.name}</Text>
                    <Text style={styles.cardSubtitle}>1回チャレンジ = {prizeModal.point_cost}pt</Text>
                  </View>
                </View>
              )}

              <View style={styles.sectionDesc}>
                <Ionicons name="information-circle-outline" size={16} color={C.textSub} />
                <Text style={styles.sectionDescText}>
                  ユーザーがルーレットを回したときに出る景品を登録します。{"\n"}
                  「当たり」と「はずれ」の両方を登録してください。{"\n"}
                  確率は%で入力し、合計が100%になるようにしてください。
                </Text>
              </View>

              {/* 確率合計バー */}
              {prizeModal && (() => {
                const prizes = getPrizesForItem(prizeModal.id);
                const totalProb = prizes.reduce((sum, p) => sum + p.probability_weight, 0);
                if (prizes.length === 0) return null;
                return (
                  <View style={{ backgroundColor: totalProb === 100 ? "#DCFCE7" : "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: "bold", color: totalProb === 100 ? "#16A34A" : C.danger }}>
                        確率合計: {totalProb}% / 100%
                      </Text>
                      {totalProb !== 100 && (
                        <Text style={{ fontSize: 12, color: C.danger }}>残り {100 - totalProb}%</Text>
                      )}
                      {totalProb === 100 && (
                        <Text style={{ fontSize: 12, color: "#16A34A" }}>✓ OK</Text>
                      )}
                    </View>
                    <View style={{ height: 6, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 3, marginTop: 8 }}>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: totalProb === 100 ? "#16A34A" : totalProb > 100 ? C.danger : C.warning, width: `${Math.min(totalProb, 100)}%` }} />
                    </View>
                  </View>
                );
              })()}

              {/* 既存景品一覧 */}
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>
                  登録済みの景品 ({prizeModal ? getPrizesForItem(prizeModal.id).length : 0})
                </Text>
              </View>

              {prizeModal && getPrizesForItem(prizeModal.id).length === 0 ? (
                <View style={styles.emptySmall}>
                  <Ionicons name="alert-circle-outline" size={32} color="#D97706" />
                  <Text style={styles.emptySmallText}>景品がまだ登録されていません</Text>
                  <Text style={[styles.emptySmallText, { fontSize: 12, color: C.textSub }]}>下のフォームから追加してください</Text>
                </View>
              ) : (
                prizeModal && getPrizesForItem(prizeModal.id).map((prize) => (
                  <View key={prize.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: prize.is_winning ? "#16A34A" : C.textSub }]}>
                    <View style={styles.prizeCardRow}>
                      <Text style={{ fontSize: 24 }}>{prize.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.cardTitle}>{prize.name}</Text>
                          <View style={[styles.miniTag, prize.is_winning ? { backgroundColor: "#DCFCE7" } : { backgroundColor: "#F3F4F6" }]}>
                            <Text style={[styles.miniTagText, { color: prize.is_winning ? "#16A34A" : C.textSub }]}>
                              {prize.is_winning ? "当たり" : "はずれ"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.cardSubtitle}>
                          確率: {prize.probability_weight}% ・ 残り在庫: {prize.stock === null ? "無制限" : prize.stock}
                          {prize.point_refund > 0 && ` ・ ポイント還元: ${prize.point_refund}pt`}
                          {` ・ ${prize.delivery_type === "physical" ? "📦郵送" : prize.delivery_type === "gift_code" ? "🎫コード" : "💻デジタル"}`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeletePrize(prize)} style={styles.deletePrizeBtn}>
                        <Ionicons name="trash-outline" size={20} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* 景品追加フォーム */}
              <View style={[styles.sectionLabelRow, { marginTop: 20 }]}>
                <Text style={styles.sectionLabel}>新しい景品を追加</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.formLabel}>景品名 <Text style={{ color: C.danger }}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="例: スタバカード1000円分"
                  placeholderTextColor={C.textSub}
                  value={prizeForm.name}
                  onChangeText={(v) => setPrizeForm({ ...prizeForm, name: v })}
                />

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>アイコン</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="🎁"
                      placeholderTextColor={C.textSub}
                      value={prizeForm.icon}
                      onChangeText={(v) => setPrizeForm({ ...prizeForm, icon: v })}
                    />
                  </View>
                  <View style={{ flex: 2, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>説明（任意）</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="ユーザーに表示される説明"
                      placeholderTextColor={C.textSub}
                      value={prizeForm.description}
                      onChangeText={(v) => setPrizeForm({ ...prizeForm, description: v })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>確率 (%) <Text style={{ color: C.danger }}>*</Text></Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="例: 5"
                      placeholderTextColor={C.textSub}
                      value={prizeForm.probability_weight}
                      onChangeText={(v) => setPrizeForm({ ...prizeForm, probability_weight: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>在庫数</Text>
                    {prizeForm.unlimitedStock ? (
                      <View style={[styles.formInput, { justifyContent: "center" }]}>
                        <Text style={{ color: C.textSub, fontSize: 14 }}>∞ 無制限</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.formInput}
                        placeholder="例: 3"
                        placeholderTextColor={C.textSub}
                        value={prizeForm.stock}
                        onChangeText={(v) => setPrizeForm({ ...prizeForm, stock: v })}
                        keyboardType="number-pad"
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.formLabel}>pt還元</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="0"
                      placeholderTextColor={C.textSub}
                      value={prizeForm.point_refund}
                      onChangeText={(v) => setPrizeForm({ ...prizeForm, point_refund: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.formLabel, { marginTop: 0 }]}>在庫を無制限にする</Text>
                    <Text style={{ fontSize: 11, color: C.textSub }}>
                      ONにすると在庫が減りません
                    </Text>
                  </View>
                  <Switch
                    value={prizeForm.unlimitedStock}
                    onValueChange={(v) => setPrizeForm({ ...prizeForm, unlimitedStock: v })}
                    trackColor={{ true: "#7C3AED" }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.formLabel, { marginTop: 0 }]}>これは「当たり」景品ですか？</Text>
                    <Text style={{ fontSize: 11, color: C.textSub }}>
                      ONにするとユーザーに当選演出が表示されます
                    </Text>
                  </View>
                  <Switch
                    value={prizeForm.is_winning}
                    onValueChange={(v) => setPrizeForm({ ...prizeForm, is_winning: v })}
                    trackColor={{ true: C.success }}
                    thumbColor="#fff"
                  />
                </View>

                {prizeForm.is_winning && (
                  <>
                    <Text style={[styles.formLabel, { marginTop: 14 }]}>配送タイプ</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                      {[
                        { value: "digital", label: "💻 デジタル" },
                        { value: "physical", label: "📦 郵送" },
                        { value: "gift_code", label: "🎫 ギフトコード" },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.deliveryTypeBtn,
                            prizeForm.delivery_type === opt.value && styles.deliveryTypeBtnActive,
                          ]}
                          onPress={() => setPrizeForm({ ...prizeForm, delivery_type: opt.value })}
                        >
                          <Text style={[
                            styles.deliveryTypeBtnText,
                            prizeForm.delivery_type === opt.value && styles.deliveryTypeBtnTextActive,
                          ]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: C.textSub }}>
                      {prizeForm.delivery_type === "physical" ? "当選者に配送先を入力してもらいます" :
                       prizeForm.delivery_type === "gift_code" ? "管理画面からギフトコードを入力して配布します" :
                       "手動で対応してください"}
                    </Text>
                  </>
                )}

                <TouchableOpacity style={[styles.actionBtnFilled, { backgroundColor: "#7C3AED", marginTop: 16 }]} onPress={handleAddPrize}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnFilledText}>この景品を追加する</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.primary, fontWeight: "bold" },

  // タブバー（固定5等分）
  tabRow: { flexDirection: "row", backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 2, gap: 3, minHeight: 56 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.primary },
  tabText: { fontSize: 10, color: C.textSub, fontWeight: "600" },
  tabTextActive: { color: C.primary, fontWeight: "bold" },
  tabBadge: { position: "absolute", top: -5, right: -6, backgroundColor: C.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, color: "#fff", fontWeight: "bold" },

  body: { flex: 1, padding: 16 },

  // セクション説明（控えめな左ストライプ）
  sectionDesc: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: "#93C5FD" },
  sectionDescText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },

  // セクションラベル
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionLabelDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 14, fontWeight: "bold", color: C.text },

  // カード共通
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardInactive: { opacity: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  cardSubtitle: { fontSize: 12, color: C.textSub, marginTop: 2 },
  cardInfo: { flexDirection: "row", alignItems: "center", gap: 12 },

  // 空状態
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  emptyDesc: { fontSize: 13, color: C.textSub },
  emptySmall: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptySmallText: { fontSize: 14, color: C.textSub },

  // ダッシュボード
  dashSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  dashSectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  dashAlertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  dashAlertCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: "#D97706", elevation: 3, shadowColor: "#D97706", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dashAlertIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  dashAlertTitle: { fontSize: 15, fontWeight: "bold", color: "#92400E" },
  dashAlertSub: { fontSize: 12, color: "#B45309", marginTop: 2 },
  dashGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dashTile: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: "center", elevation: 2, gap: 8, borderWidth: 1, borderColor: C.border },
  dashTileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  dashTileLabel: { fontSize: 11, fontWeight: "700", color: C.text, textAlign: "center", lineHeight: 16 },
  dashSummaryCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, elevation: 2 },
  dashSummaryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  dashSummaryDot: { width: 4, height: 32, borderRadius: 2 },
  dashSummaryLabel: { flex: 1, fontSize: 13, color: C.text },
  dashSummaryValue: { fontSize: 20, fontWeight: "bold", color: C.text, minWidth: 40, textAlign: "right" },
  dashSummaryDivider: { height: 1, backgroundColor: C.border },

  // 商品カード
  sponsorCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sponsorIcon: { fontSize: 28 },
  sponsorThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: C.bg },
  typeLabel: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  typeLabelText: { fontSize: 12, fontWeight: "bold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoRowText: { fontSize: 12, color: C.textSub },
  statsBar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", paddingVertical: 8, paddingHorizontal: 2, gap: 4, marginBottom: 6 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13, color: C.textSub },
  statDivider: { width: 1, height: 14, backgroundColor: C.border, marginHorizontal: 4 },

  // 即時抽選景品サマリー（薄紫テーマ）
  prizeSummaryBox: { backgroundColor: "#F9F5FF", borderRadius: 10, padding: 12, marginBottom: 10, gap: 0, borderWidth: 1, borderColor: "#E9D5FF" },
  prizeSummaryTitle: { fontSize: 12, fontWeight: "bold", color: "#7C3AED", marginBottom: 8 },
  prizeSummaryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3E8FF" },
  prizeSummaryName: { flex: 1, fontSize: 13, color: C.text, fontWeight: "600" },
  prizeMiniTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  prizeMiniTagText: { fontSize: 10, fontWeight: "bold" },
  prizeSummaryDetail: { fontSize: 11, color: C.textSub },
  prizeSummaryStock: { fontSize: 12, color: C.success, fontWeight: "bold", minWidth: 32, textAlign: "right" },
  noPrizeWarning: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10, marginBottom: 8 },
  noPrizeWarningText: { flex: 1, fontSize: 12, color: "#92400E" },

  winnerRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", padding: 10, borderRadius: 8, marginBottom: 8 },
  winnerText: { fontSize: 13, color: C.warning, fontWeight: "bold", flex: 1 },
  winnerDate: { fontSize: 11, color: C.textSub },

  // アクションバー（2段構成）
  actionBar: { gap: 8, marginTop: 12 },
  actionBarRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: C.card, minHeight: 44 },
  actionBtnDanger: { borderColor: "#FCA5A5", backgroundColor: "#FFF5F5" },
  actionBtnSuccess: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  actionBtnFilled: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10, minHeight: 44 },
  actionBtnFilledText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 15, marginBottom: 16, minHeight: 52 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  // その他
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { fontSize: 12, color: C.textSub, marginTop: 4, fontStyle: "italic" },
  socialInfo: { marginTop: 10, backgroundColor: C.bg, borderRadius: 8, padding: 10, gap: 6 },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  socialText: { fontSize: 13, color: C.primary, flex: 1 },

  // モーダル共通
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%" },
  modalTitle: { fontSize: 17, fontWeight: "bold", color: C.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: C.textSub, marginBottom: 12 },
  modalInput: { backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: "top", marginTop: 6 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: C.textSub },
  modalConfirmBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  modalConfirmText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // フォーム
  formLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 4, marginTop: 12 },
  formInput: { backgroundColor: C.bg, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  formRow: { flexDirection: "row" },
  typeSelector: { flexDirection: "row", gap: 10 },
  typeOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, gap: 2 },
  typeOptionActive: { borderColor: C.primary, backgroundColor: "#FFF5F0" },
  typeOptionActiveInstant: { borderColor: "#7C3AED", backgroundColor: "#F5F0FF" },
  typeOptionEmoji: { fontSize: 22 },
  typeOptionLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub },
  typeOptionLabelActive: { color: C.primary },
  typeOptionDesc: { fontSize: 10, color: C.textSub },

  fulfillItemInfo: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 8 },

  // 交換カード詳細
  exchangeCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "bold" },
  detailBox: { backgroundColor: C.bg, borderRadius: 8, padding: 10, gap: 8, marginBottom: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 12, color: C.textSub },
  detailValue: { fontSize: 12, color: C.text },
  shippingBox: { backgroundColor: "#F0F9FF", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#BAE6FD", marginBottom: 8 },
  shippingHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  shippingTitle: { fontSize: 12, fontWeight: "bold", color: "#0369A1" },
  shippingLine: { fontSize: 12, color: C.text, lineHeight: 18 },
  adminNoteBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FEFCE8", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 8 },
  adminNoteLabel: { fontSize: 11, fontWeight: "bold", color: "#92400E", marginBottom: 2 },
  adminNoteText: { fontSize: 13, color: C.text },

  // 配送タイプバッジ
  deliveryTypeBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  deliveryTypeBadgeText: { fontSize: 12, fontWeight: "bold" },

  // ステータス進捗バー
  progressStrip: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 2 },
  progressStep: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, alignItems: "center", borderRadius: 6, backgroundColor: C.bg },
  progressStepDone: { backgroundColor: "#DCFCE7" },
  progressStepCurrent: { backgroundColor: "#D97706" },
  progressStepText: { fontSize: 10, color: C.textSub, fontWeight: "600" },
  progressStepTextDone: { color: "#16A34A", fontWeight: "bold" },
  progressLine: { height: 2, width: 12, backgroundColor: C.border },
  progressLineDone: { backgroundColor: "#16A34A" },

  // 景品管理モーダル
  prizeTargetInfo: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2 },
  prizeCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  deletePrizeBtn: { padding: 8 },
  miniTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  miniTagText: { fontSize: 11, fontWeight: "bold" },
  deliveryTypeBtn: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: C.bg },
  deliveryTypeBtnActive: { borderColor: "#7C3AED", backgroundColor: "#F3E8FF" },
  deliveryTypeBtnText: { fontSize: 12, color: C.textSub, fontWeight: "600" },
  deliveryTypeBtnTextActive: { color: "#7C3AED" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 },

  // 画像ピッカー
  imagePickerBtn: { alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderColor: C.border, borderStyle: "dashed", borderRadius: 10, paddingVertical: 20, backgroundColor: C.bg },
  imagePickerBtnText: { fontSize: 12, color: C.textSub },
  imagePreviewContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  imagePreview: { width: 160, height: 120, borderRadius: 10, backgroundColor: C.bg },
  imagePreviewActions: { gap: 8 },
  imagePreviewBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  imagePreviewBtnText: { fontSize: 12, fontWeight: "600", color: C.primary },
});
