import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { C } from "../constants/theme";
import { useResults } from "../hooks/useResults";
import { useMasterData } from "../hooks/useMasterData";
export default function AddResultModal({ visible, onClose }) {
  const [game, setGame] = useState(null);
  const { games: masterGames, loading: masterLoading } = useMasterData();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rank, setRank] = useState("");
  const [total, setTotal] = useState("");
  const [loading, setLoading] = useState(false);
  const { addResult } = useResults();
  const handleSave = async () => {
    if (!name || !rank || !date || !game) {
      Alert.alert("エラー", "ゲーム・大会名・順位・日付は必須です");
      return;
    }
    setLoading(true);
    const { error } = await addResult({
      tournament_name: name,
      game: game.name,
      game_color: game.color,
      date,
      rank: parseInt(rank),
      total_players: total ? parseInt(total) : null,
    });
    setLoading(false);
    if (error) {
      Alert.alert("エラー", "保存に失敗しました");
    } else {
      setName(""); setRank(""); setTotal("");
      onClose();
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>戦績を追加</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color={C.primary} />
              : <Text style={styles.save}>保存</Text>
            }
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
          <Text style={styles.label}>ゲーム *</Text>
          {masterLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.gameRow}>
              {masterGames.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.gameBtn, game?.id === g.id && { backgroundColor: g.color, borderColor: g.color }]}
                  onPress={() => setGame(g)}
                >
                  <Text style={[styles.gameBtnText, game?.id === g.id && { color: "#fff" }]}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.label}>大会名 *</Text>
          <TextInput
            style={styles.input}
            placeholder="例：ビヨンド杯 vol.5"
            placeholderTextColor={C.textSub}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>日付 *</Text>
          <TextInput
            style={styles.input}
            placeholder="例：2026-02-21"
            placeholderTextColor={C.textSub}
            value={date}
            onChangeText={setDate}
          />
          <Text style={styles.label}>順位 *</Text>
          <TextInput
            style={styles.input}
            placeholder="例：1"
            placeholderTextColor={C.textSub}
            value={rank}
            onChangeText={setRank}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>参加人数</Text>
          <TextInput
            style={styles.input}
            placeholder="例：32"
            placeholderTextColor={C.textSub}
            value={total}
            onChangeText={setTotal}
            keyboardType="number-pad"
          />
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
  save: { fontSize: 15, fontWeight: "bold", color: C.primary },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  gameBtnText: { fontSize: 13, color: C.text },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
});
