import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { C } from "../constants/theme";
import { useResults } from "../hooks/useResults";
import AddResultModal from "../components/AddResultModal";
const getMedal = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
};
export default function HomeScreen() {
  const { results, loading, deleteResult } = useResults();
  const [showAdd, setShowAdd] = useState(false);
  const gold   = results.filter((r) => r.rank === 1).length;
  const silver = results.filter((r) => r.rank === 2).length;
  const bronze = results.filter((r) => r.rank === 3).length;
  const handleLongPress = (item) => {
    Alert.alert(
      "戦績を削除",
      `「${item.tournament_name}」を削除しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => deleteResult(item.id) },
      ]
    );
  };
  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* 戦績サマリー */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>戦績サマリー</Text>
            <Text style={styles.cardSub}>すべて ▼</Text>
          </View>
          <View style={styles.medalRow}>
            {[{ icon: "🥇", count: gold }, { icon: "🥈", count: silver }, { icon: "🥉", count: bronze }].map((m, i) => (
              <View key={i} style={styles.medalItem}>
                <Text style={styles.medalIcon}>{m.icon}</Text>
                <Text style={styles.medalCount}>{m.count}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* 直近の戦績 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>直近の戦績</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)}>
            <Text style={[styles.cardSub, { color: C.primary }]}>+ 手動追加</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>まだ戦績がありません</Text>
            <Text style={styles.emptySubText}>「+ 手動追加」から登録しましょう</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>長押しで削除できます</Text>
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.resultMeta}>
                      <Text style={[styles.gameTag, { color: item.game_color }]}>{item.game}</Text>
                      <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                    <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                  </View>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{getMedal(item.rank)} {item.rank}位</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <AddResultModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  cardSub: { fontSize: 13, color: C.textSub },
  medalRow: { flexDirection: "row", justifyContent: "space-around" },
  medalItem: { alignItems: "center" },
  medalIcon: { fontSize: 32 },
  medalCount: { fontSize: 20, fontWeight: "bold", color: C.text, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  hint: { fontSize: 11, color: C.textSub, marginBottom: 8, textAlign: "right" },
  resultRow: { flexDirection: "row", alignItems: "center" },
  resultMeta: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  gameTag: { fontSize: 12, fontWeight: "bold" },
  dateText: { fontSize: 12, color: C.textSub },
  tournamentName: { fontSize: 15, fontWeight: "bold", color: C.text },
  rankBadge: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rankText: { fontSize: 13, fontWeight: "bold", color: C.text },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: C.textSub },
  emptySubText: { fontSize: 13, color: C.textSub, marginTop: 8 },
});
