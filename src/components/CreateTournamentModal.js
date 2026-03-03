import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useOrganizer } from "../hooks/useOrganizer";
import { useMasterData } from "../hooks/useMasterData";
import { REGIONS } from "../constants/prefectures";

export default function CreateTournamentModal({ visible, onClose }) {
  const [game, setGame] = useState(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [entryFeeType, setEntryFeeType] = useState("free");
  const [entryFeeAmount, setEntryFeeAmount] = useState("");
  const [locationType, setLocationType] = useState("offline");
  const [prefecture, setPrefecture] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTournament } = useOrganizer();
  const { games: masterGames, tags: masterTags, loading: masterLoading } = useMasterData();
  const insets = useSafeAreaInsets();

  const toggleTag = (label) => {
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    if (!name || !date || !organizer || !game) {
      Alert.alert("エラー", "ゲーム・大会名・日時・主催者名は必須です");
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
      tags: selectedTags,
      entry_fee_type: entryFeeType,
      entry_fee_amount: entryFeeType === "paid" && entryFeeAmount ? parseInt(entryFeeAmount) : null,
      location_type: locationType,
      prefecture: locationType === "offline" ? prefecture : null,
    });
    setLoading(false);
    if (error) {
      Alert.alert("エラー", "投稿に失敗しました");
    } else {
      Alert.alert("完了", "大会を投稿しました！");
      setName(""); setDate(""); setLocation("");
      setOrganizer(""); setMaxPlayers(""); setDescription("");
      setSelectedTags([]); setEntryFeeType("free"); setEntryFeeAmount("");
      setLocationType("offline"); setPrefecture(""); setGame(null);
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
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {masterLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ゲーム選択 */}
              <Text style={styles.label}>
                <Ionicons name="game-controller-outline" size={13} color={C.textSub} /> ゲーム *
              </Text>
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

              {/* 大会名 */}
              <Text style={styles.label}>大会名 *</Text>
              <TextInput style={styles.input} placeholder="例：ビヨンド杯 vol.6" placeholderTextColor={C.textSub} value={name} onChangeText={setName} />

              {/* 日時 */}
              <Text style={styles.label}>日時 * （例：2026-03-01T14:00）</Text>
              <TextInput style={styles.input} placeholder="2026-03-01T14:00" placeholderTextColor={C.textSub} value={date} onChangeText={setDate} />

              {/* 主催者名 */}
              <Text style={styles.label}>主催者名 *</Text>
              <TextInput style={styles.input} placeholder="例：カードショップ○○" placeholderTextColor={C.textSub} value={organizer} onChangeText={setOrganizer} />

              {/* 参加費 */}
              <Text style={styles.label}>
                <Ionicons name="cash-outline" size={13} color={C.textSub} /> 参加費
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, entryFeeType === "free" && styles.toggleBtnActive]}
                  onPress={() => { setEntryFeeType("free"); setEntryFeeAmount(""); }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={entryFeeType === "free" ? "#fff" : C.success} />
                  <Text style={[styles.toggleBtnText, entryFeeType === "free" && { color: "#fff" }]}>無料</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, entryFeeType === "paid" && styles.toggleBtnActive]}
                  onPress={() => setEntryFeeType("paid")}
                >
                  <Ionicons name="card-outline" size={16} color={entryFeeType === "paid" ? "#fff" : C.warning} />
                  <Text style={[styles.toggleBtnText, entryFeeType === "paid" && { color: "#fff" }]}>有料</Text>
                </TouchableOpacity>
              </View>
              {entryFeeType === "paid" && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="参加費（円）例：500"
                  placeholderTextColor={C.textSub}
                  value={entryFeeAmount}
                  onChangeText={setEntryFeeAmount}
                  keyboardType="number-pad"
                />
              )}

              {/* 開催形式 */}
              <Text style={styles.label}>
                <Ionicons name="globe-outline" size={13} color={C.textSub} /> 開催形式
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, locationType === "online" && styles.toggleBtnActive]}
                  onPress={() => { setLocationType("online"); setPrefecture(""); }}
                >
                  <Ionicons name="wifi-outline" size={16} color={locationType === "online" ? "#fff" : "#3B82F6"} />
                  <Text style={[styles.toggleBtnText, locationType === "online" && { color: "#fff" }]}>オンライン</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, locationType === "offline" && styles.toggleBtnActive]}
                  onPress={() => setLocationType("offline")}
                >
                  <Ionicons name="storefront-outline" size={16} color={locationType === "offline" ? "#fff" : "#EF4444"} />
                  <Text style={[styles.toggleBtnText, locationType === "offline" && { color: "#fff" }]}>オフライン</Text>
                </TouchableOpacity>
              </View>

              {/* 都道府県（オフライン時のみ） */}
              {locationType === "offline" && (
                <>
                  <Text style={styles.label}>
                    <Ionicons name="location-outline" size={13} color={C.textSub} /> 都道府県
                  </Text>
                  {REGIONS.map((region) => (
                    <View key={region.name}>
                      <Text style={styles.regionLabel}>{region.name}</Text>
                      <View style={styles.prefRow}>
                        {region.prefectures.map((pref) => (
                          <TouchableOpacity
                            key={pref}
                            style={[styles.prefChip, prefecture === pref && styles.prefChipActive]}
                            onPress={() => setPrefecture(prefecture === pref ? "" : pref)}
                          >
                            <Text style={[styles.prefChipText, prefecture === pref && { color: "#fff" }]}>{pref}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* 開催場所 */}
              <Text style={styles.label}>開催場所（詳細）</Text>
              <TextInput style={styles.input} placeholder="例：東京都渋谷区○○ビル3F" placeholderTextColor={C.textSub} value={location} onChangeText={setLocation} />

              {/* 定員 */}
              <Text style={styles.label}>定員</Text>
              <TextInput style={styles.input} placeholder="例：32" placeholderTextColor={C.textSub} value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />

              {/* 大会説明 */}
              <Text style={styles.label}>大会説明</Text>
              <TextInput style={[styles.input, { height: 100, textAlignVertical: "top" }]} placeholder="大会のルールや注意事項など" placeholderTextColor={C.textSub} value={description} onChangeText={setDescription} multiline />

              {/* タグ選択 */}
              <Text style={styles.label}>
                <Ionicons name="pricetag-outline" size={13} color={C.textSub} /> タグ
              </Text>
              <View style={styles.tagRow}>
                {masterTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagBtn, selectedTags.includes(tag.label) && styles.tagBtnActive]}
                    onPress={() => toggleTag(tag.label)}
                  >
                    <Text style={[styles.tagBtnText, selectedTags.includes(tag.label) && { color: "#fff" }]}>#{tag.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.textSub },
  save: { fontSize: 15, fontWeight: "bold", color: C.primary },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  gameBtnText: { fontSize: 13, color: C.text },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  toggleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: C.text },
  regionLabel: { fontSize: 11, color: C.textSub, marginTop: 8, marginBottom: 4, marginLeft: 2 },
  prefRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  prefChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  prefChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  prefChipText: { fontSize: 12, color: C.text },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tagBtnActive: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
  tagBtnText: { fontSize: 13, color: C.text },
});
