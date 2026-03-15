import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { C } from "../constants/theme";
import { useResults } from "../hooks/useResults";
import { useMasterData } from "../hooks/useMasterData";
import { showError } from "../utils/errorHelper";

const Stepper = ({ label, value, onDecrement, onIncrement, color }) => (
  <View style={styles.stepperCol}>
    <Text style={[styles.stepperLabel, color && { color }]}>{label}</Text>
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onDecrement}
        disabled={value <= 0}
        activeOpacity={0.6}
      >
        <Ionicons name="remove" size={18} color={value <= 0 ? C.border : C.text} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onIncrement}
        activeOpacity={0.6}
      >
        <Ionicons name="add" size={18} color={C.text} />
      </TouchableOpacity>
    </View>
  </View>
);

export default function AddResultModal({ visible, onClose }) {
  const [game, setGame] = useState(null);
  const { games: masterGames, loading: masterLoading } = useMasterData();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rank, setRank] = useState("");
  const [total, setTotal] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [deckName, setDeckName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { addResult } = useResults();

  const formatDate = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!name || !rank || !game) {
      Alert.alert("エラー", "ゲーム・大会名・順位は必須です");
      return;
    }
    setLoading(true);
    const { error } = await addResult({
      tournament_name: name,
      game: game.name,
      game_color: game.color,
      date: formatDate(date),
      rank: parseInt(rank),
      total_players: total ? parseInt(total) : null,
      wins,
      losses,
      draws,
      deck_name: deckName.trim() || null,
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) {
      showError(error, "保存に失敗しました");
    } else {
      setName(""); setRank(""); setTotal("");
      setWins(0); setLosses(0); setDraws(0);
      setDeckName(""); setNotes("");
      setDate(new Date());
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
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={C.primary} />
            <Text style={styles.dateBtnText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                locale="ja"
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>完了</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>順位 *</Text>
              <TextInput
                style={styles.input}
                placeholder="例：1"
                placeholderTextColor={C.textSub}
                value={rank}
                onChangeText={setRank}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>参加人数</Text>
              <TextInput
                style={styles.input}
                placeholder="例：32"
                placeholderTextColor={C.textSub}
                value={total}
                onChangeText={setTotal}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* W/L戦績 */}
          <Text style={styles.label}>対戦成績</Text>
          <View style={styles.stepperContainer}>
            <Stepper
              label="勝ち"
              value={wins}
              onDecrement={() => setWins((v) => Math.max(0, v - 1))}
              onIncrement={() => setWins((v) => v + 1)}
              color={C.success}
            />
            <Stepper
              label="負け"
              value={losses}
              onDecrement={() => setLosses((v) => Math.max(0, v - 1))}
              onIncrement={() => setLosses((v) => v + 1)}
              color={C.danger}
            />
            <Stepper
              label="引分"
              value={draws}
              onDecrement={() => setDraws((v) => Math.max(0, v - 1))}
              onIncrement={() => setDraws((v) => v + 1)}
              color={C.warning}
            />
          </View>

          {/* デッキ名 */}
          <Text style={styles.label}>デッキ名</Text>
          <TextInput
            style={styles.input}
            placeholder="例：青黒ミッドレンジ"
            placeholderTextColor={C.textSub}
            value={deckName}
            onChangeText={setDeckName}
          />

          {/* メモ */}
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="反省点・次回の改善点など"
            placeholderTextColor={C.textSub}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{notes.length}/500</Text>

          <View style={{ height: 40 }} />
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
  rowInputs: { flexDirection: "row", gap: 12 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  dateBtnText: { fontSize: 15, color: C.text },
  datePickerDone: { alignItems: "flex-end", paddingRight: 16, paddingBottom: 8 },
  datePickerDoneText: { fontSize: 15, fontWeight: "bold", color: C.primary },
  // ステッパー
  stepperContainer: { flexDirection: "row", gap: 12 },
  stepperCol: { flex: 1, alignItems: "center" },
  stepperLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6 },
  stepperRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  stepperBtn: { width: 36, height: 40, justifyContent: "center", alignItems: "center" },
  stepperValue: { fontSize: 18, fontWeight: "bold", color: C.text, minWidth: 28, textAlign: "center" },
  // テキストエリア
  textArea: { minHeight: 80, paddingTop: 12 },
  charCount: { fontSize: 11, color: C.textSub, textAlign: "right", marginTop: 4 },
});
