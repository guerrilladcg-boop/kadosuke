import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { PREMIUM_PLANS } from "../constants/adConfig";

export default function PremiumModal({ visible, onClose, isPremium, premiumType, onPurchase, onCancel }) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState("onetime");
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    // 本番では expo-in-app-purchases / RevenueCat を使用
    // ここでは DB 直接更新のモック実装
    Alert.alert(
      "購入確認",
      `${PREMIUM_PLANS[selectedPlan].label}（${PREMIUM_PLANS[selectedPlan].price}円）を購入しますか？\n\n※開発版のためテスト購入（実際の課金は発生しません）`,
      [
        { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
        {
          text: "購入する",
          onPress: async () => {
            const { error } = await onPurchase(selectedPlan);
            setLoading(false);
            if (!error) {
              Alert.alert("購入完了", "プレミアムプランが有効になりました！\n広告が非表示になります。");
              onClose();
            } else {
              Alert.alert("エラー", "購入処理に失敗しました");
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "プレミアム解約",
      "プレミアムプランを解約しますか？\n広告が再び表示されるようになります。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "解約する",
          style: "destructive",
          onPress: async () => {
            const { error } = await onCancel();
            if (!error) {
              Alert.alert("解約完了", "プレミアムプランを解約しました");
              onClose();
            } else {
              Alert.alert("エラー", "解約に失敗しました");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プレミアムプラン</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.body}>
          {isPremium ? (
            /* 既にプレミアムの場合 */
            <View style={styles.currentPlan}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={styles.premiumBadgeText}>プレミアム会員</Text>
              </View>
              <Text style={styles.currentPlanText}>
                {premiumType === "onetime" ? "買い切りプラン（永久）" : "月額プラン（自動更新）"}
              </Text>
              <Text style={styles.currentPlanDesc}>広告非表示が有効です</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>プレミアムを解約</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* プラン選択 */
            <>
              <View style={styles.heroSection}>
                <Ionicons name="star" size={40} color="#FFD700" />
                <Text style={styles.heroTitle}>広告を非表示に</Text>
                <Text style={styles.heroDesc}>
                  プレミアムプランに加入すると、すべてのバナー広告が非表示になります
                </Text>
              </View>

              {/* 買い切りプラン */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === "onetime" && styles.planCardSelected]}
                onPress={() => setSelectedPlan("onetime")}
              >
                <View style={[styles.radio, selectedPlan === "onetime" && styles.radioSelected]}>
                  {selectedPlan === "onetime" && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{PREMIUM_PLANS.onetime.label}</Text>
                    <View style={styles.recommendBadge}>
                      <Text style={styles.recommendText}>おすすめ</Text>
                    </View>
                  </View>
                  <Text style={styles.planDesc}>{PREMIUM_PLANS.onetime.description}</Text>
                </View>
                <Text style={styles.planPrice}>{PREMIUM_PLANS.onetime.price}円</Text>
              </TouchableOpacity>

              {/* 月額プラン */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === "monthly" && styles.planCardSelected]}
                onPress={() => setSelectedPlan("monthly")}
              >
                <View style={[styles.radio, selectedPlan === "monthly" && styles.radioSelected]}>
                  {selectedPlan === "monthly" && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{PREMIUM_PLANS.monthly.label}</Text>
                  <Text style={styles.planDesc}>{PREMIUM_PLANS.monthly.description}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPrice}>{PREMIUM_PLANS.monthly.price}円</Text>
                  <Text style={styles.planPeriod}>/月</Text>
                </View>
              </TouchableOpacity>

              {/* 購入ボタン */}
              <TouchableOpacity
                style={[styles.purchaseBtn, loading && styles.purchaseBtnDisabled]}
                onPress={handlePurchase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseBtnText}>
                    {PREMIUM_PLANS[selectedPlan].price}円で購入する
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.note}>
                ※ 開発版のためテスト購入です。実際のアプリ内課金は本番ビルドで有効になります。
              </Text>
            </>
          )}
        </View>
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
  body: { flex: 1, padding: 16 },
  heroSection: { alignItems: "center", paddingVertical: 24, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: "bold", color: C.text, marginTop: 12 },
  heroDesc: { fontSize: 14, color: C.textSub, textAlign: "center", marginTop: 8, lineHeight: 20 },
  planCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, borderWidth: 2, borderColor: C.border },
  planCardSelected: { borderColor: C.primary, backgroundColor: "#FFF3ED" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: C.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  planName: { fontSize: 16, fontWeight: "bold", color: C.text },
  planDesc: { fontSize: 13, color: C.textSub },
  planPrice: { fontSize: 20, fontWeight: "bold", color: C.primary },
  planPeriod: { fontSize: 12, color: C.textSub },
  recommendBadge: { backgroundColor: C.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  recommendText: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  purchaseBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  purchaseBtnDisabled: { opacity: 0.6 },
  purchaseBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  note: { fontSize: 11, color: C.textSub, textAlign: "center", marginTop: 16, lineHeight: 18 },
  currentPlan: { alignItems: "center", paddingTop: 40 },
  premiumBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF8E1", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 },
  premiumBadgeText: { fontSize: 18, fontWeight: "bold", color: "#D4A017" },
  currentPlanText: { fontSize: 16, fontWeight: "bold", color: C.text, marginTop: 20 },
  currentPlanDesc: { fontSize: 14, color: C.textSub, marginTop: 4 },
  cancelBtn: { marginTop: 40, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: C.danger, borderRadius: 8 },
  cancelBtnText: { fontSize: 14, color: C.danger },
});
