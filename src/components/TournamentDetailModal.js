import React from "react";
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
export default function TournamentDetailModal({ tournament, visible, onClose, onToggleFavorite, onToggleEntry }) {
  if (!tournament) return null;
  const dateStr = new Date(tournament.date).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>大会詳細</Text>
          <TouchableOpacity onPress={() => onToggleFavorite(tournament)} style={styles.headerBtn}>
            <Ionicons
              name={tournament.isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={tournament.isFavorite ? "#EF4444" : C.text}
            />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
          <View style={[styles.gameBar, { backgroundColor: tournament.game_color }]}>
            <Text style={styles.gameBarText}>{tournament.game}</Text>
          </View>
          <Text style={styles.name}>{tournament.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={C.textSub} />
            <Text style={styles.infoText}>{dateStr}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={C.textSub} />
            <Text style={styles.infoText}>
              {tournament.location_type === "online" ? "オンライン" : (tournament.prefecture ? `${tournament.prefecture} - ` : "") + (tournament.location || "未設定")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={C.textSub} />
            <Text style={styles.infoText}>{tournament.organizer}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color={C.textSub} />
            <Text style={styles.infoText}>
              {tournament.entry_fee_type === "paid"
                ? `有料${tournament.entry_fee_amount ? ` (¥${tournament.entry_fee_amount.toLocaleString()})` : ""}`
                : "無料"}
            </Text>
          </View>
          {tournament.max_players && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={C.textSub} />
              <Text style={styles.infoText}>定員 {tournament.max_players}名</Text>
            </View>
          )}
          {tournament.description && (
            <View style={styles.descBox}>
              <Text style={styles.descTitle}>大会説明</Text>
              <Text style={styles.descText}>{tournament.description}</Text>
            </View>
          )}
          <View style={styles.tagRow}>
            {(tournament.tags || []).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.entryBtn, tournament.isEntered && styles.entryBtnActive]}
            onPress={() => onToggleEntry(tournament)}
          >
            <Ionicons
              name={tournament.isEntered ? "checkmark-circle" : "add-circle-outline"}
              size={20}
              color={tournament.isEntered ? "#fff" : C.primary}
            />
            <Text style={[styles.entryBtnText, tournament.isEntered && { color: "#fff" }]}>
              {tournament.isEntered ? "エントリー済み" : "エントリーする"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { width: 40, alignItems: "center" },
  body: { flex: 1, padding: 16 },
  gameBar: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  gameBarText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  name: { fontSize: 22, fontWeight: "bold", color: C.text, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  infoText: { fontSize: 14, color: C.textSub },
  descBox: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 8 },
  descTitle: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6 },
  descText: { fontSize: 14, color: C.text, lineHeight: 22 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  tag: { backgroundColor: C.card, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: C.textSub },
  footer: { padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  entryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 2, borderColor: C.primary, paddingVertical: 14 },
  entryBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  entryBtnText: { fontSize: 16, fontWeight: "bold", color: C.primary },
});
