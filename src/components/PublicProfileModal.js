import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
  ScrollView, Share, Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useProfile } from "../hooks/useProfile";
import { getLevelFromExp, getTitleForLevel } from "../constants/levels";
import { getAchievementByCode } from "../constants/achievements";

export default function PublicProfileModal({ visible, onClose, userId }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchPublicProfile, fetchPublicProfileStats } = useProfile();

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    Promise.all([
      fetchPublicProfile(userId),
      fetchPublicProfileStats(userId),
    ]).then(([p, s]) => {
      setProfile(p);
      setStats(s);
      setLoading(false);
    });
  }, [visible, userId]);

  if (!visible) return null;

  const initial = profile?.name?.charAt(0)?.toUpperCase() || "?";
  const level = profile ? (profile.level || getLevelFromExp(profile.experience || 0)) : 1;
  const title = getTitleForLevel(level);
  const badges = (profile?.achievement_badges || [])
    .map(getAchievementByCode)
    .filter(Boolean);

  const handleShare = async () => {
    if (!profile) return;
    const medalStr = stats ? `${stats.medals.gold}優勝 ${stats.medals.silver}準優勝 ${stats.medals.bronze}入賞` : "";
    const text = `${profile.name} | Lv.${level} ${title}${medalStr ? ` | ${medalStr}` : ""}${profile.main_deck ? ` | デッキ: ${profile.main_deck}` : ""} #カドスケ`;
    await Share.share({ message: text });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール</Text>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-social-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : !profile ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>プロフィールが見つかりません</Text>
          </View>
        ) : !profile.is_public ? (
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>非公開プロフィール</Text>
            <Text style={styles.emptySub}>このユーザーのプロフィールは非公開です</Text>
          </View>
        ) : (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* === ヘッダー: アバター + 名前 + 称号 === */}
            <View style={styles.profileHeader}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <Text style={styles.name}>{profile.name || "プレイヤー"}</Text>
              <View style={styles.titleRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>Lv.{level}</Text>
                </View>
                <Text style={styles.titleText}>{title}</Text>
                {profile.organizer_status === "approved" && (
                  <View style={styles.organizerBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                    <Text style={styles.organizerBadgeText}>主催者</Text>
                  </View>
                )}
              </View>
              {/* 主催者評価 */}
              {profile.organizer_status === "approved" && profile.avg_rating != null && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{profile.avg_rating}</Text>
                  <Text style={styles.ratingCount}>({profile.review_count}件)</Text>
                </View>
              )}
            </View>

            {/* === 自己紹介 === */}
            {profile.bio ? (
              <View style={styles.section}>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            ) : null}

            {/* === メインデッキ === */}
            {profile.main_deck ? (
              <View style={styles.deckBox}>
                <Ionicons name="albums-outline" size={16} color={C.primary} />
                <Text style={styles.deckLabel}>メインデッキ</Text>
                <Text style={styles.deckName}>{profile.main_deck}</Text>
              </View>
            ) : null}

            {/* === 戦績サマリー === */}
            {stats && (
              <View style={styles.statsCard}>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.tournamentCount}</Text>
                    <Text style={styles.statLabel}>大会参加</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.winRate}%</Text>
                    <Text style={styles.statLabel}>勝率</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: "#FFD700" }]}>{stats.medals.gold}</Text>
                    <Text style={styles.statLabel}>優勝</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: "#C0C0C0" }]}>{stats.medals.silver}</Text>
                    <Text style={styles.statLabel}>準優勝</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: "#CD7F32" }]}>{stats.medals.bronze}</Text>
                    <Text style={styles.statLabel}>入賞</Text>
                  </View>
                </View>
              </View>
            )}

            {/* === ゲーム別成績 === */}
            {stats?.gameStats?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ゲーム別成績</Text>
                {stats.gameStats.map((gs) => {
                  const wr = gs.wins + gs.losses > 0 ? Math.round((gs.wins / (gs.wins + gs.losses)) * 100) : 0;
                  return (
                    <View key={gs.game} style={styles.gameStatRow}>
                      <View style={[styles.gameColorDot, { backgroundColor: gs.color || C.primary }]} />
                      <Text style={styles.gameStatName} numberOfLines={1}>{gs.game}</Text>
                      <Text style={styles.gameStatCount}>{gs.count}大会</Text>
                      <Text style={styles.gameStatWr}>{wr}%</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* === 実績バッジ === */}
            {badges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>実績</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.badgeScrollRow}>
                    {badges.map((b) => (
                      <View key={b.code} style={styles.achievementChip}>
                        <Text style={styles.achievementIcon}>{b.icon}</Text>
                        <Text style={styles.achievementLabel}>{b.label}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* === 直近の大会結果 === */}
            {stats?.results?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>直近の大会結果</Text>
                {stats.results.map((r, i) => (
                  <View key={i} style={styles.resultRow}>
                    <View style={[styles.rankBadge, r.rank === 1 && { backgroundColor: "#FFD700" }, r.rank === 2 && { backgroundColor: "#C0C0C0" }, r.rank === 3 && { backgroundColor: "#CD7F32" }]}>
                      <Text style={styles.rankText}>{r.rank || "-"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{r.tournament_name}</Text>
                      <Text style={styles.resultSub}>{r.game} · {new Date(r.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}{r.deck_name ? ` · ${r.deck_name}` : ""}</Text>
                    </View>
                    <Text style={styles.resultWL}>{r.wins || 0}W-{r.losses || 0}L</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        )}
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
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: C.textSub },
  emptySub: { fontSize: 13, color: C.textSub },

  // Profile header
  profileHeader: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarInitial: { fontSize: 32, fontWeight: "bold", color: "#fff" },
  name: { fontSize: 22, fontWeight: "bold", color: C.text, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  levelBadge: { backgroundColor: "#FFF8E1", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "#FFD700" },
  levelBadgeText: { fontSize: 13, fontWeight: "bold", color: "#B8860B" },
  titleText: { fontSize: 14, fontWeight: "bold", color: "#B8860B" },
  organizerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  organizerBadgeText: { fontSize: 11, fontWeight: "bold", color: "#fff" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ratingText: { fontSize: 15, fontWeight: "bold", color: "#B8860B" },
  ratingCount: { fontSize: 12, color: C.textSub },

  // Bio
  bioText: { fontSize: 14, color: C.text, lineHeight: 22, textAlign: "center" },

  // Deck
  deckBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary + "10", borderRadius: 10, padding: 12, marginBottom: 16 },
  deckLabel: { fontSize: 12, color: C.textSub },
  deckName: { fontSize: 14, fontWeight: "bold", color: C.text, flex: 1 },

  // Stats card
  statsCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  statsGrid: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "bold", color: C.text },
  statLabel: { fontSize: 11, color: C.textSub },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: C.textSub, marginBottom: 10 },

  // Game stats
  gameStatRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  gameColorDot: { width: 10, height: 10, borderRadius: 5 },
  gameStatName: { flex: 1, fontSize: 14, color: C.text },
  gameStatCount: { fontSize: 12, color: C.textSub, width: 50, textAlign: "right" },
  gameStatWr: { fontSize: 14, fontWeight: "bold", color: C.primary, width: 40, textAlign: "right" },

  // Achievements
  badgeScrollRow: { flexDirection: "row", gap: 8 },
  achievementChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  achievementIcon: { fontSize: 16 },
  achievementLabel: { fontSize: 12, fontWeight: "bold", color: C.text },

  // Results
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  resultName: { fontSize: 13, fontWeight: "bold", color: C.text },
  resultSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  resultWL: { fontSize: 13, fontWeight: "bold", color: C.textSub },
});
