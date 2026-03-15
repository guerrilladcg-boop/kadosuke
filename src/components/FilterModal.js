import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useMasterData } from "../hooks/useMasterData";
import { REGIONS } from "../constants/prefectures";

const formatDate = (d) => d.toISOString().split("T")[0];

const DATE_PRESETS = [
  {
    label: "今週末",
    calc: () => {
      const now = new Date();
      const day = now.getDay();
      const sat = new Date(now); sat.setDate(now.getDate() + (6 - day));
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      return { from: formatDate(sat), to: formatDate(sun) };
    },
  },
  {
    label: "来週",
    calc: () => {
      const now = new Date();
      const day = now.getDay();
      const nextMon = new Date(now); nextMon.setDate(now.getDate() + (8 - day));
      const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);
      return { from: formatDate(nextMon), to: formatDate(nextSun) };
    },
  },
  {
    label: "今月",
    calc: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: formatDate(first), to: formatDate(last) };
    },
  },
  {
    label: "来月",
    calc: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return { from: formatDate(first), to: formatDate(last) };
    },
  },
];

export default function FilterModal({ visible, onClose, filters, onApply }) {
  const [games, setGames] = useState(filters.games || []);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
  const [dateTo, setDateTo] = useState(filters.dateTo || "");
  const [activePreset, setActivePreset] = useState("");
  const [location, setLocation] = useState(filters.location || "");
  const [entryFeeType, setEntryFeeType] = useState(filters.entryFeeType || "");
  const [locationType, setLocationType] = useState(filters.locationType || "");
  const [prefecture, setPrefecture] = useState(filters.prefecture || "");
  const [selectedTags, setSelectedTags] = useState(filters.selectedTags || []);

  const { games: masterGames, tags: masterTags, loading: masterLoading } = useMasterData();

  React.useEffect(() => {
    if (visible) {
      setGames(filters.games || []);
      setDateFrom(filters.dateFrom || "");
      setDateTo(filters.dateTo || "");
      setLocation(filters.location || "");
      setEntryFeeType(filters.entryFeeType || "");
      setLocationType(filters.locationType || "");
      setPrefecture(filters.prefecture || "");
      setSelectedTags(filters.selectedTags || []);
    }
  }, [visible]);

  const toggleGame = (name) => {
    setGames((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const toggleTag = (label) => {
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  const handleApply = () => {
    onApply({ games, dateFrom, dateTo, location, entryFeeType, locationType, prefecture, selectedTags });
    onClose();
  };

  const handleClear = () => {
    setGames([]);
    setDateFrom("");
    setDateTo("");
    setActivePreset("");
    setLocation("");
    setEntryFeeType("");
    setLocationType("");
    setPrefecture("");
    setSelectedTags([]);
    onApply({ games: [], dateFrom: "", dateTo: "", location: "", entryFeeType: "", locationType: "", prefecture: "", selectedTags: [] });
    onClose();
  };

  const activeCount =
    games.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (location ? 1 : 0) +
    (entryFeeType ? 1 : 0) +
    (locationType ? 1 : 0) +
    (prefecture ? 1 : 0) +
    selectedTags.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>フィルター</Text>
          <TouchableOpacity onPress={handleApply}>
            <Text style={styles.apply}>適用</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {masterLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ゲーム選択 */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="game-controller-outline" size={14} color={C.textSub} /> ゲーム
              </Text>
              <View style={styles.chipRow}>
                {masterGames.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, games.includes(g.name) && { backgroundColor: g.color, borderColor: g.color }]}
                    onPress={() => toggleGame(g.name)}
                  >
                    <Text style={[styles.chipText, games.includes(g.name) && { color: "#fff" }]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 参加費 */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="cash-outline" size={14} color={C.textSub} /> 参加費
              </Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, styles.chipMd, entryFeeType === "free" && styles.chipActive]}
                  onPress={() => setEntryFeeType(entryFeeType === "free" ? "" : "free")}
                >
                  <Ionicons name="checkmark-circle" size={14} color={entryFeeType === "free" ? "#fff" : C.success} />
                  <Text style={[styles.chipText, entryFeeType === "free" && { color: "#fff" }]}>無料</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, styles.chipMd, entryFeeType === "paid" && styles.chipActive]}
                  onPress={() => setEntryFeeType(entryFeeType === "paid" ? "" : "paid")}
                >
                  <Ionicons name="card-outline" size={14} color={entryFeeType === "paid" ? "#fff" : C.warning} />
                  <Text style={[styles.chipText, entryFeeType === "paid" && { color: "#fff" }]}>有料</Text>
                </TouchableOpacity>
              </View>

              {/* 開催形式 */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="globe-outline" size={14} color={C.textSub} /> 開催形式
              </Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, styles.chipMd, locationType === "online" && styles.chipActive]}
                  onPress={() => {
                    setLocationType(locationType === "online" ? "" : "online");
                    if (locationType !== "online") setPrefecture("");
                  }}
                >
                  <Ionicons name="wifi-outline" size={14} color={locationType === "online" ? "#fff" : "#3B82F6"} />
                  <Text style={[styles.chipText, locationType === "online" && { color: "#fff" }]}>オンライン</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, styles.chipMd, locationType === "offline" && styles.chipActive]}
                  onPress={() => setLocationType(locationType === "offline" ? "" : "offline")}
                >
                  <Ionicons name="storefront-outline" size={14} color={locationType === "offline" ? "#fff" : "#EF4444"} />
                  <Text style={[styles.chipText, locationType === "offline" && { color: "#fff" }]}>オフライン</Text>
                </TouchableOpacity>
              </View>

              {/* 都道府県（オフライン選択時のみ） */}
              {locationType === "offline" && (
                <>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="location-outline" size={14} color={C.textSub} /> 都道府県
                  </Text>
                  {REGIONS.map((region) => (
                    <View key={region.name}>
                      <Text style={styles.regionLabel}>{region.name}</Text>
                      <View style={styles.chipRow}>
                        {region.prefectures.map((pref) => (
                          <TouchableOpacity
                            key={pref}
                            style={[styles.chipSm, prefecture === pref && styles.chipSmActive]}
                            onPress={() => setPrefecture(prefecture === pref ? "" : pref)}
                          >
                            <Text style={[styles.chipSmText, prefecture === pref && { color: "#fff" }]}>{pref}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ハッシュタグ */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="pricetag-outline" size={14} color={C.textSub} /> ハッシュタグ
              </Text>
              <View style={styles.chipRow}>
                {masterTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.chip, selectedTags.includes(tag.label) && styles.chipTagActive]}
                    onPress={() => toggleTag(tag.label)}
                  >
                    <Text style={[styles.chipText, selectedTags.includes(tag.label) && { color: "#fff" }]}>#{tag.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 日付範囲 */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="calendar-outline" size={14} color={C.textSub} /> 開催期間
              </Text>
              <View style={styles.chipRow}>
                {DATE_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.chip, styles.chipMd, activePreset === preset.label && styles.chipActive]}
                    onPress={() => {
                      if (activePreset === preset.label) {
                        setActivePreset("");
                        setDateFrom("");
                        setDateTo("");
                      } else {
                        const { from, to } = preset.calc();
                        setActivePreset(preset.label);
                        setDateFrom(from);
                        setDateTo(to);
                      }
                    }}
                  >
                    <Ionicons name="calendar" size={14} color={activePreset === preset.label ? "#fff" : C.primary} />
                    <Text style={[styles.chipText, activePreset === preset.label && { color: "#fff" }]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.dateRow, { marginTop: 10 }]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="開始日 (例: 2026-03-01)"
                  placeholderTextColor={C.textSub}
                  value={dateFrom}
                  onChangeText={(v) => { setDateFrom(v); setActivePreset(""); }}
                />
                <Text style={styles.dateSep}>〜</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="終了日 (例: 2026-03-31)"
                  placeholderTextColor={C.textSub}
                  value={dateTo}
                  onChangeText={(v) => { setDateTo(v); setActivePreset(""); }}
                />
              </View>

              {/* 場所フリーテキスト */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="search-outline" size={14} color={C.textSub} /> 場所キーワード
              </Text>
              <TextInput
                style={styles.input}
                placeholder="場所で絞り込み..."
                placeholderTextColor={C.textSub}
                value={location}
                onChangeText={setLocation}
              />

              {/* クリアボタン */}
              {activeCount > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Ionicons name="trash-outline" size={16} color={C.danger} />
                  <Text style={styles.clearBtnText}>フィルターをクリア ({activeCount})</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.textSub },
  apply: { fontSize: 15, fontWeight: "bold", color: C.primary },
  body: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 10, marginTop: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipText: { fontSize: 13, color: C.text },
  chipMd: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 10 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTagActive: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
  chipSm: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipSmActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipSmText: { fontSize: 12, color: C.text },
  regionLabel: { fontSize: 11, color: C.textSub, marginTop: 8, marginBottom: 4, marginLeft: 2 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateSep: { fontSize: 14, color: C.textSub },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  clearBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.danger },
  clearBtnText: { color: C.danger, fontSize: 14, fontWeight: "bold" },
});
