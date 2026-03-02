import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, ScrollView } from "react-native";
import { C, GAME_TITLES } from "../constants/theme";

export default function FilterModal({ visible, onClose, filters, onApply }) {
  const [games, setGames] = useState(filters.games || []);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
  const [dateTo, setDateTo] = useState(filters.dateTo || "");
  const [location, setLocation] = useState(filters.location || "");

  React.useEffect(() => {
    if (visible) {
      setGames(filters.games || []);
      setDateFrom(filters.dateFrom || "");
      setDateTo(filters.dateTo || "");
      setLocation(filters.location || "");
    }
  }, [visible]);

  const toggleGame = (name) => {
    setGames((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleApply = () => {
    onApply({ games, dateFrom, dateTo, location });
    onClose();
  };

  const handleClear = () => {
    setGames([]);
    setDateFrom("");
    setDateTo("");
    setLocation("");
    onApply({ games: [], dateFrom: "", dateTo: "", location: "" });
    onClose();
  };

  const activeCount = games.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (location ? 1 : 0);

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
        <ScrollView style={styles.body}>
          {/* ゲーム選択 */}
          <Text style={styles.label}>ゲーム</Text>
          <View style={styles.gameRow}>
            {GAME_TITLES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.gameChip, games.includes(g.name) && { backgroundColor: g.color, borderColor: g.color }]}
                onPress={() => toggleGame(g.name)}
              >
                <Text style={[styles.gameChipText, games.includes(g.name) && { color: "#fff" }]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 日付範囲 */}
          <Text style={styles.label}>開催期間</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="開始日 (例: 2026-03-01)"
              placeholderTextColor={C.textSub}
              value={dateFrom}
              onChangeText={setDateFrom}
            />
            <Text style={styles.dateSep}>〜</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="終了日 (例: 2026-03-31)"
              placeholderTextColor={C.textSub}
              value={dateTo}
              onChangeText={setDateTo}
            />
          </View>

          {/* 場所フィルター */}
          <Text style={styles.label}>開催場所</Text>
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
              <Text style={styles.clearBtnText}>フィルターをクリア</Text>
            </TouchableOpacity>
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
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 10, marginTop: 16 },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  gameChipText: { fontSize: 13, color: C.text },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateSep: { fontSize: 14, color: C.textSub },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  clearBtn: { marginTop: 24, alignItems: "center", paddingVertical: 12 },
  clearBtnText: { color: C.danger, fontSize: 14, fontWeight: "bold" },
});
