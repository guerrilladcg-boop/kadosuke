import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useOrganizerAnalytics } from "../hooks/useOrganizerAnalytics";

export default function OrganizerAnalyticsModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { analytics, loading, fetchAnalytics } = useOrganizerAnalytics();

  useEffect(() => {
    if (visible) fetchAnalytics();
  }, [visible]);

  const KpiCard = ({ icon, label, value, color, suffix }) => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: (color || C.primary) + "15" }]}>
        <Ionicons name={icon} size={20} color={color || C.primary} />
      </View>
      <Text style={styles.kpiValue}>{value}{suffix || ""}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );

  const BarItem = ({ label, value, maxValue, color }) => {
    const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 4;
    return (
      <View style={styles.barItem}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color || C.primary }]} />
        </View>
        <Text style={styles.barValue}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>分析ダッシュボード</Text>
          <View style={styles.headerBtn} />
        </View>

        {loading || !analytics ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* === KPI === */}
            <View style={styles.kpiRow}>
              <KpiCard icon="trophy-outline" label="大会数" value={analytics.totalTournaments} color={C.primary} />
              <KpiCard icon="people-outline" label="総参加者" value={analytics.totalParticipants} color="#3B82F6" />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard icon="person-outline" label="平均参加者" value={analytics.avgParticipants} color="#8B5CF6" suffix="人" />
              <KpiCard icon="repeat-outline" label="リピーター率" value={analytics.repeaterRate} color={C.success} suffix="%" />
            </View>

            {/* 定員充足率 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>定員充足率</Text>
              <View style={styles.fillRateBox}>
                <View style={styles.fillRateBarTrack}>
                  <View style={[styles.fillRateBarFill, { width: `${analytics.fillRate}%` }]} />
                </View>
                <Text style={styles.fillRateText}>{analytics.fillRate}%</Text>
              </View>
            </View>

            {/* ゲーム別分布 */}
            {analytics.gameDistribution.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ゲーム別参加者</Text>
                {analytics.gameDistribution.map((g) => (
                  <BarItem
                    key={g.game}
                    label={g.game}
                    value={g.participants}
                    maxValue={Math.max(...analytics.gameDistribution.map((x) => x.participants))}
                    color={g.color}
                  />
                ))}
              </View>
            )}

            {/* 月別トレンド */}
            {analytics.monthlyTrend.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>月別参加者（過去6ヶ月）</Text>
                <View style={styles.chartRow}>
                  {analytics.monthlyTrend.map((m) => {
                    const maxP = Math.max(...analytics.monthlyTrend.map((x) => x.participants), 1);
                    const h = Math.max((m.participants / maxP) * 100, 4);
                    return (
                      <View key={m.month} style={styles.chartCol}>
                        <Text style={styles.chartValue}>{m.participants}</Text>
                        <View style={styles.chartBarWrap}>
                          <View style={[styles.chartBar, { height: `${h}%` }]} />
                        </View>
                        <Text style={styles.chartLabel}>{m.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 人気デッキ TOP5 */}
            {analytics.topDecks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>人気デッキ TOP5</Text>
                {analytics.topDecks.map((d, i) => (
                  <View key={d.name} style={styles.deckItem}>
                    <Text style={[styles.deckRank, i < 3 && { color: C.primary, fontWeight: "bold" }]}>
                      {i + 1}
                    </Text>
                    <Text style={styles.deckName} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.deckCount}>{d.count}人</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
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
  // KPI
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14,
    alignItems: "center", elevation: 2,
  },
  kpiIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiValue: { fontSize: 24, fontWeight: "bold", color: C.text },
  kpiLabel: { fontSize: 12, color: C.textSub, marginTop: 4 },
  // セクション
  section: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginTop: 12, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 12 },
  // 充足率
  fillRateBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  fillRateBarTrack: { flex: 1, height: 10, backgroundColor: "#F0F0F0", borderRadius: 5, overflow: "hidden" },
  fillRateBarFill: { height: "100%", backgroundColor: C.primary, borderRadius: 5 },
  fillRateText: { fontSize: 16, fontWeight: "bold", color: C.text, minWidth: 50, textAlign: "right" },
  // バーチャート
  barItem: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  barLabel: { width: 80, fontSize: 12, color: C.text },
  barTrack: { flex: 1, height: 16, backgroundColor: "#F0F0F0", borderRadius: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 8 },
  barValue: { fontSize: 12, fontWeight: "bold", color: C.text, minWidth: 30, textAlign: "right" },
  // 月別チャート
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 130 },
  chartCol: { flex: 1, alignItems: "center" },
  chartValue: { fontSize: 10, color: C.textSub, marginBottom: 4 },
  chartBarWrap: { width: 24, height: 80, justifyContent: "flex-end", backgroundColor: "#F0F0F0", borderRadius: 4, overflow: "hidden" },
  chartBar: { width: "100%", backgroundColor: C.primary, borderRadius: 4 },
  chartLabel: { fontSize: 11, color: C.textSub, marginTop: 6 },
  // デッキランキング
  deckItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  deckRank: { width: 24, fontSize: 14, textAlign: "center", color: C.textSub },
  deckName: { flex: 1, fontSize: 14, color: C.text, marginLeft: 8 },
  deckCount: { fontSize: 13, color: C.textSub, fontWeight: "600" },
});
