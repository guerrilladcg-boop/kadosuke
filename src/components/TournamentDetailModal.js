import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Alert, Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { shareTournament } from "../utils/share";
import PublicProfileModal from "./PublicProfileModal";
import OrganizerReviewModal from "./OrganizerReviewModal";
import { useTournaments } from "../hooks/useTournaments";

export default function TournamentDetailModal({ tournament, visible, onClose, onToggleFavorite, onToggleEntry, onToggleFollow, isFollowingOrganizer }) {
  const [profileUserId, setProfileUserId] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [tournamentResults, setTournamentResults] = useState(null);
  const { fetchTournamentResults } = useTournaments();

  useEffect(() => {
    if (visible && tournament?.results_public && tournament?.status === "completed") {
      fetchTournamentResults(tournament.id).then(setTournamentResults);
    } else {
      setTournamentResults(null);
      setShowResults(false);
    }
  }, [visible, tournament?.id]);

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
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => tournament.created_by && setProfileUserId(tournament.created_by)}
            >
              <Text style={[styles.infoText, tournament.created_by && { color: C.primary }]}>{tournament.organizer}</Text>
            </TouchableOpacity>
            {onToggleFollow && tournament.created_by && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowingOrganizer && styles.followBtnActive]}
                onPress={() => onToggleFollow(tournament.created_by)}
              >
                <Ionicons
                  name={isFollowingOrganizer ? "person-remove" : "person-add"}
                  size={14}
                  color={isFollowingOrganizer ? "#fff" : C.primary}
                />
                <Text style={[styles.followBtnText, isFollowingOrganizer && { color: "#fff" }]}>
                  {isFollowingOrganizer ? "フォロー中" : "フォロー"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* 主催者評価 + レビューボタン */}
          {tournament.created_by && (
            <TouchableOpacity
              style={styles.ratingRow}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingValue}>
                {tournament.organizer_avg_rating || "-"}
              </Text>
              <Text style={styles.ratingCount}>
                ({tournament.organizer_review_count || 0}件)
              </Text>
              {tournament.isEntered && tournament.status === "completed" && (
                <Text style={styles.writeReviewLink}>レビューを書く</Text>
              )}
            </TouchableOpacity>
          )}
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
          {/* 参加者プログレスバー（アプリ内管理の場合のみ） */}
          {tournament.max_players && !tournament.external_url && (
            <View style={styles.capacityBox}>
              <View style={styles.capacityBarBg}>
                <View style={[styles.capacityBarFill, {
                  width: `${Math.min(100, ((tournament.entryCount || 0) / tournament.max_players) * 100)}%`,
                  backgroundColor: tournament.isCapacityFull ? C.danger : (tournament.remainingSlots != null && tournament.remainingSlots <= 3 ? C.warning : C.primary),
                }]} />
              </View>
              <Text style={[styles.capacityText, tournament.isCapacityFull && { color: C.danger }]}>
                {tournament.entryCount || 0} / {tournament.max_players}名
                {tournament.isCapacityFull ? "（満員）" : tournament.remainingSlots != null ? ` （残り${tournament.remainingSlots}枠）` : ""}
              </Text>
            </View>
          )}
          {/* エントリー締切 */}
          {tournament.entry_deadline && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={tournament.isDeadlinePassed ? C.danger : C.textSub} />
              <Text style={[styles.infoText, tournament.isDeadlinePassed && { color: C.danger, fontWeight: "bold" }]}>
                {tournament.isDeadlinePassed ? "締切済み" : `締切: ${new Date(tournament.entry_deadline).toLocaleDateString("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
              </Text>
            </View>
          )}
          {/* 外部URL表示 */}
          {tournament.external_url && (
            <TouchableOpacity
              style={styles.externalUrlBox}
              onPress={() => Linking.openURL(tournament.external_url)}
            >
              <Ionicons name="open-outline" size={16} color={C.primary} />
              <Text style={styles.externalUrlText} numberOfLines={1}>{tournament.external_url}</Text>
            </TouchableOpacity>
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

          {/* === 大会結果セクション === */}
          {tournament.results_public && tournament.status === "completed" && tournamentResults && (
            <View style={styles.resultsSection}>
              <TouchableOpacity style={styles.resultsSectionHeader} onPress={() => setShowResults(!showResults)}>
                <Ionicons name="podium-outline" size={18} color={C.primary} />
                <Text style={styles.resultsSectionTitle}>大会結果</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name={showResults ? "chevron-up" : "chevron-down"} size={18} color={C.textSub} />
              </TouchableOpacity>
              {showResults && (
                <>
                  {/* デッキ分布 */}
                  {tournamentResults.deckDistribution.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.resultsSubTitle}>デッキ分布</Text>
                      {tournamentResults.deckDistribution.slice(0, 8).map((d, i) => (
                        <View key={i} style={styles.deckDistRow}>
                          <Text style={styles.deckDistName} numberOfLines={1}>{d.name}</Text>
                          <View style={styles.deckDistBarBg}>
                            <View style={[styles.deckDistBarFill, { width: `${d.percent}%` }]} />
                          </View>
                          <Text style={styles.deckDistPercent}>{d.percent}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* 順位表 */}
                  <Text style={styles.resultsSubTitle}>順位表</Text>
                  <View style={styles.resultsTable}>
                    <View style={styles.resultsTableHeader}>
                      <Text style={[styles.resultsTableCell, { width: 32 }]}>#</Text>
                      <Text style={[styles.resultsTableCell, { flex: 1 }]}>プレイヤー</Text>
                      <Text style={[styles.resultsTableCell, { width: 60 }]}>成績</Text>
                      <Text style={[styles.resultsTableCell, { width: 80 }]}>デッキ</Text>
                    </View>
                    {tournamentResults.results.map((r, i) => (
                      <View key={i} style={[styles.resultsTableRow, i % 2 === 0 && { backgroundColor: C.bg }]}>
                        <Text style={[styles.resultsTableCellVal, { width: 32, fontWeight: "bold" }]}>{r.ranking || "-"}</Text>
                        <Text style={[styles.resultsTableCellVal, { flex: 1 }]} numberOfLines={1}>{r.player_name || "-"}</Text>
                        <Text style={[styles.resultsTableCellVal, { width: 60 }]}>{r.wins || 0}-{r.losses || 0}-{r.draws || 0}</Text>
                        <Text style={[styles.resultsTableCellVal, { width: 80 }]} numberOfLines={1}>{r.deck_name || "-"}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            {tournament.external_url ? (
              <TouchableOpacity
                style={[styles.entryBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={() => Linking.openURL(tournament.external_url)}
              >
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text style={[styles.entryBtnText, { color: "#fff" }]}>外部サイトで参加する</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.entryBtn,
                  tournament.isEntered && styles.entryBtnActive,
                  (tournament.isDeadlinePassed || tournament.isCapacityFull) && !tournament.isEntered && styles.entryBtnDisabled,
                ]}
                onPress={() => {
                  if ((tournament.isDeadlinePassed || tournament.isCapacityFull) && !tournament.isEntered) {
                    Alert.alert("エントリー不可", tournament.isDeadlinePassed ? "エントリー締切を過ぎています" : "定員に達しています");
                    return;
                  }
                  onToggleEntry(tournament);
                }}
              >
                <Ionicons
                  name={tournament.isEntered ? "checkmark-circle" : "add-circle-outline"}
                  size={20}
                  color={tournament.isEntered ? "#fff" : (tournament.isDeadlinePassed || tournament.isCapacityFull) ? C.textSub : C.primary}
                />
                <Text style={[
                  styles.entryBtnText,
                  tournament.isEntered && { color: "#fff" },
                  (tournament.isDeadlinePassed || tournament.isCapacityFull) && !tournament.isEntered && { color: C.textSub },
                ]}>
                  {tournament.isEntered ? "エントリー済み" : tournament.isCapacityFull ? "満員" : tournament.isDeadlinePassed ? "締切済み" : "エントリーする"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareBtnFooter} onPress={() => shareTournament(tournament)}>
              <Ionicons name="share-social-outline" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <PublicProfileModal visible={!!profileUserId} onClose={() => setProfileUserId(null)} userId={profileUserId} />
      <OrganizerReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        organizerId={tournament?.created_by}
        tournamentId={tournament?.isEntered && tournament?.status === "completed" ? tournament?.id : null}
        organizerName={tournament?.organizer}
      />
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
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  entryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 2, borderColor: C.primary, paddingVertical: 14 },
  entryBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  entryBtnText: { fontSize: 16, fontWeight: "bold", color: C.primary },
  shareBtnFooter: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: C.primary, alignItems: "center", justifyContent: "center" },
  followBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.primary, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  followBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  followBtnText: { fontSize: 12, fontWeight: "bold", color: C.primary },
  entryBtnDisabled: { borderColor: C.border, backgroundColor: C.bg },
  capacityBox: { marginBottom: 10, marginTop: -2 },
  capacityBarBg: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: "hidden" },
  capacityBarFill: { height: 8, borderRadius: 4 },
  capacityText: { fontSize: 12, color: C.textSub, marginTop: 4 },
  externalUrlBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primary + "10", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4, marginBottom: 8 },
  externalUrlText: { fontSize: 13, color: C.primary, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10, marginLeft: 24 },
  ratingValue: { fontSize: 14, fontWeight: "bold", color: "#B8860B" },
  ratingCount: { fontSize: 12, color: C.textSub },
  writeReviewLink: { fontSize: 12, color: C.primary, fontWeight: "bold", marginLeft: "auto" },
  // Results section
  resultsSection: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginTop: 12 },
  resultsSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultsSectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  resultsSubTitle: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 8, marginTop: 8 },
  deckDistRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  deckDistName: { fontSize: 12, color: C.text, width: 80 },
  deckDistBarBg: { flex: 1, height: 12, borderRadius: 6, backgroundColor: C.border, overflow: "hidden" },
  deckDistBarFill: { height: 12, borderRadius: 6, backgroundColor: C.primary },
  deckDistPercent: { fontSize: 12, fontWeight: "bold", color: C.primary, width: 36, textAlign: "right" },
  resultsTable: { borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  resultsTableHeader: { flexDirection: "row", backgroundColor: C.primary + "15", paddingVertical: 8, paddingHorizontal: 8 },
  resultsTableCell: { fontSize: 11, fontWeight: "bold", color: C.textSub },
  resultsTableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  resultsTableCellVal: { fontSize: 12, color: C.text },
});
