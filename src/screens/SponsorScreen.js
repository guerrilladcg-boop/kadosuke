import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { C } from "../constants/theme";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
const REWARDS = [
  { icon: "🃏", name: "限定スリーブ", pt: 500 },
  { icon: "🥤", name: "ドリンクチケット", pt: 150 },
];
export default function SponsorScreen() {
  const { user } = useAuthStore();
  const [points, setPoints] = React.useState(0);
  React.useEffect(() => {
    fetchPoints();
  }, [user]);
  const fetchPoints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    if (data) setPoints(data.points || 0);
  };
  const handleExchange = (item) => {
    if (points < item.pt) {
      Alert.alert("ポイント不足", `${item.pt}pt必要です（現在${points}pt）`);
      return;
    }
    Alert.alert("交換確認", `${item.name}と交換しますか？\\n${item.pt}ptを消費します`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "交換する", onPress: async () => {
          const { error } = await supabase
            .from("profiles")
            .update({ points: points - item.pt })
            .eq("id", user.id);
          if (!error) {
            setPoints(points - item.pt);
            Alert.alert("交換完了！", `${item.name}と交換しました🎉`);
          }
        }
      },
    ]);
  };
  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.pointCard}>
        <Text style={styles.pointLabel}>現在の保有ポイント</Text>
        <Text style={styles.pointValue}>{points.toLocaleString()} pt</Text>
        <Text style={styles.pointBonus}>大会参加でポイントが貯まります 🎉</Text>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎁 ポイント交換所</Text>
      </View>
      <View style={styles.rewardGrid}>
        {REWARDS.map((item, i) => (
          <View key={i} style={styles.rewardCard}>
            <Text style={styles.rewardIcon}>{item.icon}</Text>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={styles.rewardPt}>{item.pt} pt</Text>
            <TouchableOpacity style={styles.exchangeBtn} onPress={() => handleExchange(item)}>
              <Text style={styles.exchangeBtnText}>交換する</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.lotteryCard} onPress={() => handleExchange({ icon: "🎰", name: "激選最新BOX", pt: 1000 })}>
        <Text style={styles.lotteryIcon}>🎰</Text>
        <Text style={styles.lotteryName}>「激選」最新BOX</Text>
        <Text style={styles.rewardPt}>1000 pt</Text>
        <View style={[styles.exchangeBtn, { backgroundColor: C.primary, width: "100%" }]}>
          <Text style={[styles.exchangeBtnText, { color: "#fff" }]}>抽選に参加</Text>
        </View>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  pointCard: { backgroundColor: C.dark, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16 },
  pointLabel: { color: "#aaa", fontSize: 13, marginBottom: 4 },
  pointValue: { color: "#fff", fontSize: 40, fontWeight: "bold", marginBottom: 6 },
  pointBonus: { color: "#4CAF50", fontSize: 12 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  rewardGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  rewardCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: "center", elevation: 2 },
  rewardIcon: { fontSize: 36, marginBottom: 8 },
  rewardName: { fontSize: 13, fontWeight: "bold", color: C.text, textAlign: "center", marginBottom: 4 },
  rewardPt: { fontSize: 14, color: C.primary, fontWeight: "bold", marginBottom: 10 },
  exchangeBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  exchangeBtnText: { fontSize: 13, color: C.text, fontWeight: "bold" },
  lotteryCard: { backgroundColor: C.card, borderRadius: 12, padding: 20, alignItems: "center", elevation: 2, marginBottom: 10 },
  lotteryIcon: { fontSize: 48, marginBottom: 8 },
  lotteryName: { fontSize: 15, fontWeight: "bold", color: C.text, marginBottom: 4 },
});
