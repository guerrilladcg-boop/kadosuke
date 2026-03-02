import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, GAME_TITLES } from "../constants/theme";
import { useOrganizer } from "../hooks/useOrganizer";
export default function CreateTournamentModal({ visible, onClose }) {
  const [game, setGame] = useState(GAME_TITLES[0]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTournament } = useOrganizer();
  const insets = useSafeAreaInsets();
  const handleSave = async () => {
    if (!name || !date || !organizer) {
      Alert.alert("エラー", "大会名・日時・主催者名は必須です");
      return;
    }
    setLoading(true);
    const { error } = await createTournament({
      name,
      game: game.name,
      game_color: game.color,
      date: new Date(date).toISOString(),
      location,
      organizer,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
      description,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
    });
    setLoading(false);
    if (error) {
      Alert.alert("エラー", "投稿に失敗しました");
    } else {
      Alert.alert("完了", "大会を投稿しました！");
      setName(""); setDate(""); setLocation("");
      setOrganizer(""); setMaxPlayers(""); setDescription(""); setTags("");
      onClose();
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>大会を投稿</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.headerBtn}>
            {loading
              ? <ActivityIndicator color={C.primary} />
              : <Text style={styles.save}>投稿</Text>
            }
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
          <Text style={styles.label}>ゲーム *</Text>
          <View style={styles.gameRow}>
            {GAME_TITLES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.gameBtn, game.id === g.id && { backgroundColor: g.color }]}
                onPress={() => setGame(g)}
              >
                <Text style={[styles.gameBtnText, game.id === g.id && { color: "#fff" }]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>大会名 *</Text>
          <TextInput style={styles.input} placeholder="例：ビヨンド杯 vol.6" placeholderTextColor={C.textSub} value={name} onChangeText={setName} />
          <Text style={styles.label}>日時 * （例：2026-03-01T14:00）</Text>
          <TextInput style={styles.input} placeholder="2026-03-01T14:00" placeholderTextColor={C.textSub} value={date} onChangeText={setDate} />
          <Text style={styles.label}>主催者名 *</Text>
          <TextInput style={styles.input} placeholder="例：カードショップ○○" placeholderTextColor={C.textSub} value={organizer} onChangeText={setOrganizer} />
          <Text style={styles.label}>開催場所</Text>
          <TextInput style={styles.input} placeholder="例：東京都渋谷区○○" placeholderTextColor={C.textSub} value={location} onChangeText={setLocation} />
          <Text style={styles.label}>定員</Text>
          <TextInput style={styles.input} placeholder="例：32" placeholderTextColor={C.textSub} value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
          <Text style={styles.label}>大会説明</Text>
          <TextInput style={[styles.input, { height: 100, textAlignVertical: "top" }]} placeholder="大会のルールや注意事項など" placeholderTextColor={C.textSub} value={description} onChangeText={setDescription} multiline />
          <Text style={styles.label}>タグ（カンマ区切り）</Text>
          <TextInput style={styles.input} placeholder="例：賞金あり, 初心者歓迎" placeholderTextColor={C.textSub} value={tags} onChangeText={setTags} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.textSub },
  save: { fontSize: 15, fontWeight: "bold", color: C.primary },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  gameBtnText: { fontSize: 13, color: C.text },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
});
