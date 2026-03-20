import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, RefreshControl, Share, Animated, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// react-native-view-shot はネイティブモジュールのため Expo Go では使えない
let ViewShot;
try {
  ViewShot = require("react-native-view-shot").default;
} catch (e) {
  // Expo Go: 普通のViewで代用
  ViewShot = View;
}
import { C } from "../constants/theme";
import { useResults } from "../hooks/useResults";
import { useTournaments } from "../hooks/useTournaments";
import { useOrganizerFollows } from "../hooks/useOrganizerFollows";
import { useLeagues } from "../hooks/useLeagues";
import { shareTournamentResult } from "../utils/share";
import AddResultModal from "../components/AddResultModal";
import TournamentDetailModal from "../components/TournamentDetailModal";
import { hapticLight, hapticSelection } from "../utils/haptics";

// Android で LayoutAnimation を有効化
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getMedal = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
};

// スケルトンローディングコンポーネント
function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.resultRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={styles.skelLine40} />
            <View style={styles.skelLine60} />
          </View>
          <View style={[styles.skelLine, { width: "70%", marginTop: 8 }]} />
        </View>
        <View style={styles.skelBadge} />
      </View>
    </Animated.View>
  );
}

function SkeletonLoading() {
  return (
    <View style={{ paddingTop: 8 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("results");
  const { results, loading, deleteResult, refetch: refetchResults } = useResults();
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showGameFilter, setShowGameFilter] = useState(false);
  const summaryRef = useRef();
  const [refreshing, setRefreshing] = useState(false);

  // フォロー中タブ用
  const { tournaments, loading: tourLoading, search, toggleFavorite, toggleEntry } = useTournaments();
  const { followedIdsArray, isFollowing, toggleFollow, loading: followLoading } = useOrganizerFollows();
  const [selectedTournament, setSelectedTournament] = useState(null);

  // リーグ参加中データ
  const { participatingLeagues, fetchMyParticipatingLeagues, fetchUnseenCompletions, markCompletionSeen, fetchStandings } = useLeagues();
  const [leagueLoading, setLeagueLoading] = useState(false);

  // リーグ完了通知
  const [completionModal, setCompletionModal] = useState(null); // { notification, league, standings }
  const [completionQueue, setCompletionQueue] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLeagueLoading(true);
        await fetchMyParticipatingLeagues();
        setLeagueLoading(false);
        // 未読のリーグ完了通知をチェック
        const unseen = await fetchUnseenCompletions();
        if (unseen.length > 0) {
          setCompletionQueue(unseen);
        }
      } catch (e) {
        console.error("[HomeScreen] league fetch error:", e);
        setLeagueLoading(false);
      }
    })();
  }, [fetchMyParticipatingLeagues]);

  // キューの先頭を表示
  useEffect(() => {
    if (completionQueue.length > 0 && !completionModal) {
      const notif = completionQueue[0];
      (async () => {
        const standings = await fetchStandings(notif.league_id);
        setCompletionModal({ notification: notif, league: notif.leagues, standings });
      })();
    }
  }, [completionQueue, completionModal]);

  const handleDismissCompletion = async () => {
    if (completionModal) {
      await markCompletionSeen(completionModal.notification.id);
      setCompletionQueue((prev) => prev.slice(1));
      setCompletionModal(null);
    }
  };

  // フォロー中タブが選択されたらフォロー主催者の大会を取得
  useEffect(() => {
    if (activeTab === "following" && followedIdsArray.length > 0) {
      search({ followedOrganizerIds: followedIdsArray });
    }
  }, [activeTab, followedIdsArray.length]);

  // プルトゥリフレッシュ
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "results") {
      await refetchResults();
    } else {
      if (followedIdsArray.length > 0) {
        await search({ followedOrganizerIds: followedIdsArray });
      }
    }
    setRefreshing(false);
  }, [activeTab, refetchResults, search, followedIdsArray]);

  // ゲーム名一覧（ドロップダウン用）
  const uniqueGames = useMemo(() => [...new Set(results.map((r) => r.game))], [results]);

  // 選択ゲームでフィルタ
  const filteredResults = useMemo(() => {
    if (!selectedGame) return results;
    return results.filter((r) => r.game === selectedGame);
  }, [results, selectedGame]);

  const gold   = filteredResults.filter((r) => r.rank === 1).length;
  const silver = filteredResults.filter((r) => r.rank === 2).length;
  const bronze = filteredResults.filter((r) => r.rank === 3).length;

  // 勝率・統計データ
  const stats = useMemo(() => {
    const totalWins = filteredResults.reduce((s, r) => s + (r.wins || 0), 0);
    const totalLosses = filteredResults.reduce((s, r) => s + (r.losses || 0), 0);
    const totalDraws = filteredResults.reduce((s, r) => s + (r.draws || 0), 0);
    const totalGames = totalWins + totalLosses + totalDraws;
    const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : null;
    return { totalWins, totalLosses, totalDraws, totalGames, winRate, count: filteredResults.length };
  }, [filteredResults]);

  const handleDelete = (item) => {
    Alert.alert(
      "戦績を削除",
      `「${item.tournament_name}」を削除しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => deleteResult(item.id) },
      ]
    );
  };

  const handleToggleFavorite = async (t) => {
    await toggleFavorite(t);
    if (selectedTournament?.id === t.id) setSelectedTournament({ ...t, isFavorite: !t.isFavorite });
  };
  const handleToggleEntry = async (t) => {
    await toggleEntry(t);
    if (selectedTournament?.id === t.id) setSelectedTournament({ ...t, isEntered: !t.isEntered });
  };

  const hasWL = (item) => (item.wins || 0) > 0 || (item.losses || 0) > 0 || (item.draws || 0) > 0;

  const handleExpand = useCallback((id) => {
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ネイティブシェアシートでサマリーをシェア
  const handleShareSummary = async () => {
    try {
      const winText = stats.winRate ? `勝率 ${stats.winRate}%` : "";
      const text =
        `🏆 TCG大会の戦績まとめ！\n` +
        `🥇${gold} 🥈${silver} 🥉${bronze}\n` +
        (winText ? `📊 ${winText} (${stats.totalGames}戦)\n` : "") +
        `カドスケ！で記録してます📊\n\n` +
        `#カドスケ #TCG #カードゲーム`;
      await Share.share({ message: text });
    } catch (e) {
      if (e.message !== "User did not share") {
        Alert.alert("エラー", "シェアに失敗しました");
      }
    }
  };

  const renderResultCard = useCallback(({ item }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        onPress={() => handleExpand(item.id)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        {/* ゲームカラーバー */}
        {item.game_color && (
          <View style={[styles.cardColorBar, { backgroundColor: item.game_color }]} />
        )}

        {/* メイン情報 */}
        <View style={styles.resultRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.resultMeta}>
              <Text style={[styles.gameTag, { color: item.game_color }]}>{item.game}</Text>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <Text style={styles.tournamentName}>{item.tournament_name}</Text>
            {item.deck_name ? (
              <View style={styles.deckRow}>
                <Text style={styles.deckIcon}>🃏</Text>
                <Text style={styles.deckText}>{item.deck_name}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.resultRight}>
            <View style={[styles.rankBadge, item.rank <= 3 && styles.rankBadgeTop]}>
              <Text style={[styles.rankText, item.rank <= 3 && styles.rankTextTop]}>
                {getMedal(item.rank)} {item.rank}位
              </Text>
            </View>
            {hasWL(item) && (
              <Text style={styles.wlCompact}>
                {item.wins || 0}勝{item.losses || 0}敗
                {(item.draws || 0) > 0 ? `${item.draws}分` : ""}
              </Text>
            )}
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedArea}>
            {hasWL(item) && (
              <View style={styles.expandedWL}>
                <View style={[styles.wlItem, { backgroundColor: C.successBg }]}>
                  <Text style={[styles.wlLabel, { color: C.success }]}>勝ち</Text>
                  <Text style={[styles.wlValue, { color: C.success }]}>{item.wins || 0}</Text>
                </View>
                <View style={[styles.wlItem, { backgroundColor: C.dangerBg }]}>
                  <Text style={[styles.wlLabel, { color: C.danger }]}>負け</Text>
                  <Text style={[styles.wlValue, { color: C.danger }]}>{item.losses || 0}</Text>
                </View>
                <View style={[styles.wlItem, { backgroundColor: C.warningBg }]}>
                  <Text style={[styles.wlLabel, { color: C.warning }]}>引分</Text>
                  <Text style={[styles.wlValue, { color: C.warning }]}>{item.draws || 0}</Text>
                </View>
              </View>
            )}
            {item.total_players && (
              <Text style={styles.expandedMeta}>参加人数: {item.total_players}人</Text>
            )}
            {item.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>メモ</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}
            <View style={styles.expandedActions}>
              <TouchableOpacity
                style={styles.expandedBtn}
                onPress={() => shareTournamentResult(item)}
              >
                <Ionicons name="share-social-outline" size={16} color={C.primary} />
                <Text style={styles.expandedBtnText}>シェア</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.expandedBtn, { borderColor: C.danger }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color={C.danger} />
                <Text style={[styles.expandedBtnText, { color: C.danger }]}>削除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.expandIndicator}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={C.border}
          />
        </View>
      </TouchableOpacity>
    );
  }, [expandedId, handleExpand]);

  // サマリーヘッダー（FlatListのListHeaderComponent）
  const ResultsHeader = useMemo(() => (
    <>
      <ViewShot
        ref={summaryRef}
        options={{ format: "png", quality: 0.95 }}
        style={styles.viewShotContainer}
      >
        <View style={[styles.summaryCard, showGameFilter && styles.cardDropdownOpen]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>戦績サマリー</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => setShowGameFilter(!showGameFilter)}
            >
              <Text style={styles.filterText}>{selectedGame || "すべて"}</Text>
              <Ionicons name={showGameFilter ? "chevron-up" : "chevron-down"} size={14} color={C.textSub} />
            </TouchableOpacity>
          </View>
          <View style={styles.medalRow}>
            {[{ icon: "🥇", count: gold }, { icon: "🥈", count: silver }, { icon: "🥉", count: bronze }].map((m, i) => (
              <View key={i} style={styles.medalItem}>
                <Text style={styles.medalIcon}>{m.icon}</Text>
                <Text style={styles.medalCount}>{m.count}</Text>
              </View>
            ))}
          </View>

          {/* 統計バー */}
          {stats.count > 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.count}</Text>
                <Text style={styles.statLabel}>大会数</Text>
              </View>
            </View>
          )}

          {/* 勝敗プログレスバー */}
          {stats.totalGames > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressWin, { flex: stats.totalWins || 0.01 }]} />
                {stats.totalDraws > 0 && (
                  <View style={[styles.progressDraw, { flex: stats.totalDraws }]} />
                )}
                <View style={[styles.progressLoss, { flex: stats.totalLosses || 0.01 }]} />
              </View>
              <View style={styles.progressLegend}>
                <Text style={[styles.progressLegendText, { color: C.success }]}>
                  {stats.totalWins}W
                </Text>
                {stats.totalDraws > 0 && (
                  <Text style={[styles.progressLegendText, { color: C.warning }]}>
                    {stats.totalDraws}D
                  </Text>
                )}
                <Text style={[styles.progressLegendText, { color: C.danger }]}>
                  {stats.totalLosses}L
                </Text>
              </View>
            </View>
          )}

          <View style={styles.captureFooter}>
            <Text style={styles.captureFooterText}>📊 カドスケ！で戦績を記録中</Text>
            <Text style={styles.captureHashtags}>#カドスケ #TCG #カードゲーム</Text>
          </View>

          {showGameFilter && (
            <>
              <TouchableOpacity
                style={styles.filterBackdrop}
                activeOpacity={1}
                onPress={() => setShowGameFilter(false)}
              />
              <View style={styles.filterMenu}>
                <TouchableOpacity
                  style={[styles.filterMenuItem, !selectedGame && styles.filterMenuItemActive]}
                  onPress={() => { setSelectedGame(null); setShowGameFilter(false); }}
                >
                  <Text style={[styles.filterMenuText, !selectedGame && { color: C.primary, fontWeight: "bold" }]}>すべて</Text>
                </TouchableOpacity>
                {uniqueGames.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.filterMenuItem, selectedGame === g && styles.filterMenuItemActive]}
                    onPress={() => { setSelectedGame(g); setShowGameFilter(false); }}
                  >
                    <Text style={[styles.filterMenuText, selectedGame === g && { color: C.primary, fontWeight: "bold" }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShareSummary}>
        <Ionicons name="share-social-outline" size={14} color="#fff" />
        <Text style={styles.shareBtnText}>シェア</Text>
      </TouchableOpacity>

      {/* 参加中リーグサマリー */}
      {participatingLeagues.length > 0 && (
        <View style={styles.leagueSummarySection}>
          <View style={styles.leagueSummaryHeader}>
            <Ionicons name="trophy" size={18} color={C.primary} />
            <Text style={styles.leagueSummaryTitle}>参加中のリーグ</Text>
          </View>
          {participatingLeagues.map((league) => {
            const MEDAL = ["🥇", "🥈", "🥉"];
            const myRank = league.myStanding?.rank;
            const myRankIcon = myRank && myRank <= 3 ? MEDAL[myRank - 1] : null;
            const roundsPlayed = league.myStanding?.rounds_played || 0;
            const progressPct = league.totalRounds > 0 ? (roundsPlayed / league.totalRounds) * 100 : 0;

            return (
              <View key={league.id} style={styles.leagueCard}>
                {/* ゲームカラーバー */}
                {league.game_color && (
                  <View style={[styles.leagueColorBar, { backgroundColor: league.game_color }]} />
                )}

                <View style={styles.leagueCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.gameTag, { color: league.game_color }]}>{league.game}</Text>
                      <View style={styles.leagueActiveBadge}>
                        <Text style={styles.leagueActiveBadgeText}>開催中</Text>
                      </View>
                    </View>
                    <Text style={styles.leagueCardName}>{league.name}</Text>
                    {league.season_name && (
                      <Text style={styles.leagueCardSeason}>{league.season_name}</Text>
                    )}
                  </View>
                  {/* 自分の順位を大きく表示 */}
                  {league.myStanding && (
                    <View style={[styles.myRankBig, myRank <= 3 && styles.myRankBigTop]}>
                      <Text style={styles.myRankBigText}>{myRankIcon || `${myRank}位`}</Text>
                      {!myRankIcon && <Text style={styles.myRankBigSub}>/{league.totalPlayers}</Text>}
                    </View>
                  )}
                </View>

                {/* 自分のステータス */}
                {league.myStanding ? (
                  <View style={styles.myStandingRow}>
                    <View style={styles.myRankBox}>
                      <Text style={styles.myRankLabel}>ポイント</Text>
                      <Text style={[styles.myRankValue, { color: C.primary }]}>{league.myStanding.total_points}pt</Text>
                    </View>
                    <View style={styles.myStandingDivider} />
                    <View style={styles.myRankBox}>
                      <Text style={styles.myRankLabel}>戦績</Text>
                      <Text style={styles.myRankValue}>
                        {league.myStanding.total_wins}W {league.myStanding.total_losses}L
                        {league.myStanding.total_draws > 0 ? ` ${league.myStanding.total_draws}D` : ""}
                      </Text>
                    </View>
                    <View style={styles.myStandingDivider} />
                    <View style={styles.myRankBox}>
                      <Text style={styles.myRankLabel}>参加R</Text>
                      <Text style={styles.myRankValue}>{roundsPlayed}/{league.totalRounds}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.myStandingEmpty}>
                    <Ionicons name="hourglass-outline" size={16} color={C.textSub} />
                    <Text style={styles.myStandingEmptyText}>まだ結果がありません</Text>
                  </View>
                )}

                {/* ラウンド進捗バー */}
                {league.totalRounds > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(progressPct, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{roundsPlayed}/{league.totalRounds} ラウンド消化</Text>
                  </View>
                )}

                {/* トップ5のミニランキング */}
                {league.topStandings.length > 0 && (
                  <View style={styles.miniRanking}>
                    {league.topStandings.map((s, i) => {
                      const isMe = s.player_name === league.myPlayerName;
                      const rankIcon = i < 3 ? MEDAL[i] : `${s.rank}`;
                      return (
                        <View key={s.id || i} style={[styles.miniRankRow, isMe && styles.miniRankRowMe]}>
                          <Text style={styles.miniRankNum}>{rankIcon}</Text>
                          <Text style={[styles.miniRankName, isMe && { fontWeight: "bold", color: C.primary }]} numberOfLines={1}>
                            {s.player_name}{isMe ? " (自分)" : ""}
                          </Text>
                          <Text style={[styles.miniRankPts, isMe && { color: C.primary }]}>{s.total_points}pt</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 勝ち点ルール表示 */}
                <View style={styles.leagueRuleInfo}>
                  <Ionicons name="calculator-outline" size={12} color={C.textSub} />
                  <Text style={styles.leagueRuleText}>
                    {league.point_rule_type === "ranking"
                      ? (league.point_ranking || []).map((p, i) => `${i + 1}位:${p}pt`).join("  ")
                      : `勝${league.point_win ?? 3}  負${league.point_loss ?? 0}  分${league.point_draw ?? 1}`
                    }
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>直近の戦績</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={[styles.cardSub, { color: C.primary }]}>+ 手動追加</Text>
        </TouchableOpacity>
      </View>
      {results.length > 0 && (
        <Text style={styles.hint}>タップで詳細 / 長押しで削除</Text>
      )}
    </>
  ), [gold, silver, bronze, stats, showGameFilter, selectedGame, uniqueGames, results.length, participatingLeagues]);

  return (
    <>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "results" && styles.tabActive]}
          onPress={() => setActiveTab("results")}
        >
          <Text style={[styles.tabText, activeTab === "results" && styles.tabTextActive]}>戦績</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.tabActive]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.tabTextActive]}>フォロー中</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "results" ? (
        loading ? (
          <View style={styles.screen}>
            <SkeletonLoading />
          </View>
        ) : results.length === 0 ? (
          <FlatList
            style={styles.screen}
            data={[]}
            renderItem={null}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
            ListHeaderComponent={ResultsHeader}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="trophy-outline" size={48} color={C.border} />
                <Text style={styles.emptyText}>まだ戦績がありません</Text>
                <Text style={styles.emptySubText}>大会に参加したら記録してみましょう</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => setShowAdd(true)}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.emptyCtaText}>戦績を追加する</Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={<View style={{ height: 20 }} />}
          />
        ) : (
          <FlatList
            style={styles.screen}
            data={filteredResults}
            renderItem={renderResultCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
            ListHeaderComponent={ResultsHeader}
            ListFooterComponent={<View style={{ height: 20 }} />}
            extraData={expandedId}
          />
        )
      ) : (
        <FlatList
          style={styles.screen}
          data={followLoading || tourLoading ? [] : tournaments}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedTournament(t)}
              activeOpacity={0.7}
            >
              <View style={styles.followCardTop}>
                <View style={styles.resultMeta}>
                  <Text style={[styles.gameTag, { color: t.game_color }]}>{t.game}</Text>
                  <Text style={styles.dateText}>
                    {new Date(t.date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleToggleFavorite(t)}>
                  <Ionicons name={t.isFavorite ? "heart" : "heart-outline"} size={20} color={t.isFavorite ? "#EF4444" : C.textSub} />
                </TouchableOpacity>
              </View>
              <Text style={styles.tournamentName}>{t.name}</Text>
              <View style={styles.organizerRow}>
                <Ionicons name="person-outline" size={13} color={C.textSub} />
                <Text style={styles.organizerText}>{t.organizer}</Text>
              </View>
              {t.location ? <Text style={styles.locationText}>{t.location}</Text> : null}
              {t.isEntered && (
                <View style={styles.enteredBadge}>
                  <Text style={styles.enteredBadgeText}>エントリー済</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          ListEmptyComponent={
            followLoading || tourLoading ? (
              <SkeletonLoading />
            ) : followedIdsArray.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={C.border} />
                <Text style={styles.emptyText}>フォロー中の主催者がいません</Text>
                <Text style={styles.emptySubText}>検索画面から大会詳細を開いて{"\n"}主催者をフォローしましょう</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={C.border} />
                <Text style={styles.emptyText}>フォロー中の主催者の大会はありません</Text>
              </View>
            )
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

      {/* リーグ完了結果モーダル */}
      <Modal visible={!!completionModal} animationType="fade" transparent>
        <View style={styles.completionOverlay}>
          <View style={styles.completionSheet}>
            {completionModal && (() => {
              const { league, standings } = completionModal;
              const MEDAL = ["🥇", "🥈", "🥉"];
              return (
                <>
                  <View style={styles.completionHeader}>
                    <Text style={styles.completionTrophy}>🏆</Text>
                    <Text style={styles.completionTitle}>リーグ終了</Text>
                    <Text style={styles.completionLeagueName}>{league?.name}</Text>
                    {league?.season_name && (
                      <Text style={styles.completionSeason}>{league.season_name}</Text>
                    )}
                  </View>
                  <Text style={styles.completionSubtitle}>最終順位</Text>
                  <View style={styles.completionStandings}>
                    {standings.slice(0, 10).map((s, i) => (
                      <View key={s.id} style={[styles.completionRow, i === 0 && { borderTopWidth: 0 }]}>
                        <View style={[styles.completionRank, s.rank <= 3 && styles.completionRankTop]}>
                          <Text style={styles.completionRankText}>
                            {s.rank <= 3 ? MEDAL[s.rank - 1] : s.rank}
                          </Text>
                        </View>
                        <Text style={styles.completionName} numberOfLines={1}>{s.player_name}</Text>
                        <Text style={styles.completionPts}>{s.total_points}pt</Text>
                      </View>
                    ))}
                    {standings.length > 10 && (
                      <Text style={styles.completionMore}>他{standings.length - 10}名</Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.completionCloseBtn} onPress={handleDismissCompletion}>
                    <Text style={styles.completionCloseBtnText}>閉じる</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <AddResultModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <TournamentDetailModal
        tournament={selectedTournament}
        visible={!!selectedTournament}
        onClose={() => setSelectedTournament(null)}
        onToggleFavorite={handleToggleFavorite}
        onToggleEntry={handleToggleEntry}
        onToggleFollow={toggleFollow}
        isFollowingOrganizer={selectedTournament ? isFollowing(selectedTournament.created_by) : false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: C.textSub },
  tabTextActive: { color: C.primary },
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10,
    elevation: 2, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardExpanded: {
    borderWidth: 1, borderColor: C.primary + "30",
    shadowOpacity: 0.12, elevation: 4,
  },
  cardColorBar: {
    position: "absolute", top: 0, left: 0, width: 4, height: "100%", borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
  },
  viewShotContainer: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  cardSub: { fontSize: 13, color: C.textSub },
  medalRow: { flexDirection: "row", justifyContent: "space-around" },
  medalItem: { alignItems: "center" },
  medalIcon: { fontSize: 32 },
  medalCount: { fontSize: 20, fontWeight: "bold", color: C.text, marginTop: 4 },

  // 統計バー
  statsBar: {
    flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 12,
    marginTop: 14, marginBottom: 4,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: C.text },
  statLabel: { fontSize: 10, color: C.textSub, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 2 },

  // プログレスバー（勝敗）
  progressContainer: { marginTop: 8, paddingHorizontal: 4 },
  progressBar: {
    flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden",
    backgroundColor: C.bg,
  },
  progressWin: { backgroundColor: C.success, borderRadius: 3 },
  progressDraw: { backgroundColor: C.warning },
  progressLoss: { backgroundColor: C.danger, borderRadius: 3 },
  progressLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  progressLegendText: { fontSize: 11, fontWeight: "bold" },

  filterDropdown: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 13, color: C.text, fontWeight: "600" },
  cardDropdownOpen: { overflow: "visible", zIndex: 10 },
  filterBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  filterMenu: { position: "absolute", top: 48, right: 16, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, minWidth: 170, overflow: "hidden", zIndex: 100, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
  filterMenuItem: { paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  filterMenuItemActive: { backgroundColor: C.primary + "10" },
  filterMenuText: { fontSize: 14, color: C.text },
  captureFooter: { alignItems: "center", marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  captureFooterText: { fontSize: 12, color: C.textSub },
  captureHashtags: { fontSize: 10, color: C.primary, marginTop: 3, letterSpacing: 0.5 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: C.primary, marginBottom: 10 },
  shareBtnText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  hint: { fontSize: 11, color: C.textSub, marginBottom: 8, textAlign: "right" },
  resultRow: { flexDirection: "row", alignItems: "flex-start" },
  resultMeta: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 },
  gameTag: { fontSize: 12, fontWeight: "bold" },
  dateText: { fontSize: 12, color: C.textSub },
  tournamentName: { fontSize: 15, fontWeight: "bold", color: C.text },
  resultRight: { alignItems: "flex-end", marginLeft: 8 },
  rankBadge: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rankBadgeTop: { backgroundColor: "#FFF8E1", borderWidth: 1, borderColor: "#FFE082" },
  rankText: { fontSize: 13, fontWeight: "bold", color: C.text },
  rankTextTop: { color: "#B8860B" },
  wlCompact: { fontSize: 11, color: C.textSub, marginTop: 4 },
  deckRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  deckIcon: { fontSize: 12 },
  deckText: { fontSize: 12, color: C.textSub },
  expandIndicator: { alignItems: "center", marginTop: 6 },
  expandedArea: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  expandedWL: { flexDirection: "row", gap: 8, marginBottom: 10 },
  wlItem: { flex: 1, alignItems: "center", borderRadius: 8, paddingVertical: 8 },
  wlLabel: { fontSize: 11, fontWeight: "bold" },
  wlValue: { fontSize: 20, fontWeight: "bold", marginTop: 2 },
  expandedMeta: { fontSize: 13, color: C.textSub, marginBottom: 8 },
  notesBox: { backgroundColor: C.bg, borderRadius: 8, padding: 12, marginBottom: 10 },
  notesLabel: { fontSize: 11, fontWeight: "bold", color: C.textSub, marginBottom: 4 },
  notesText: { fontSize: 13, color: C.text, lineHeight: 20 },
  expandedActions: { flexDirection: "row", gap: 10 },
  expandedBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.primary },
  expandedBtnText: { fontSize: 13, fontWeight: "bold", color: C.primary },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: C.textSub },
  emptySubText: { fontSize: 13, color: C.textSub, marginTop: 4, textAlign: "center", lineHeight: 20 },
  emptyCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 12 },
  emptyCtaText: { fontSize: 14, fontWeight: "bold", color: "#fff" },
  followCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  organizerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  organizerText: { fontSize: 13, color: C.textSub },
  locationText: { fontSize: 12, color: C.textSub, marginTop: 2 },
  enteredBadge: { backgroundColor: C.successBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 6 },
  enteredBadgeText: { fontSize: 11, color: C.success, fontWeight: "bold" },

  // スケルトン
  skelLine: { height: 12, backgroundColor: C.border, borderRadius: 6 },
  skelLine40: { height: 10, width: 40, backgroundColor: C.border, borderRadius: 5 },
  skelLine60: { height: 10, width: 60, backgroundColor: C.border, borderRadius: 5 },
  skelBadge: { width: 56, height: 32, backgroundColor: C.border, borderRadius: 8 },

  // リーグサマリー
  leagueSummarySection: { marginBottom: 16 },
  leagueSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  leagueSummaryTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  leagueCard: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    overflow: "hidden",
  },
  leagueColorBar: { position: "absolute", top: 0, left: 0, width: 4, height: "100%", borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  leagueCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  leagueCardName: { fontSize: 15, fontWeight: "bold", color: C.text, marginTop: 4 },
  leagueCardSeason: { fontSize: 12, color: C.textSub, marginTop: 2 },
  leagueActiveBadge: { backgroundColor: C.successBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  leagueActiveBadgeText: { fontSize: 10, fontWeight: "bold", color: C.success },
  myRankBig: { alignItems: "center", justifyContent: "center", backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 10 },
  myRankBigTop: { backgroundColor: "#FFF8E1" },
  myRankBigText: { fontSize: 22, fontWeight: "bold", color: C.text },
  myRankBigSub: { fontSize: 11, color: C.textSub },
  // 自分のステータス
  myStandingRow: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 10 },
  myRankBox: { flex: 1, alignItems: "center" },
  myRankLabel: { fontSize: 10, color: C.textSub, marginBottom: 2 },
  myRankValue: { fontSize: 15, fontWeight: "bold", color: C.text },
  myStandingDivider: { width: 1, backgroundColor: C.border, marginVertical: 2 },
  myStandingEmpty: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: C.bg, borderRadius: 10, marginBottom: 10 },
  myStandingEmptyText: { fontSize: 12, color: C.textSub },
  // 進捗バー
  progressSection: { marginBottom: 10 },
  progressBarBg: { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  progressText: { fontSize: 10, color: C.textSub, textAlign: "right", marginTop: 3 },
  // ミニランキング
  miniRanking: { marginBottom: 8 },
  miniRankRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  miniRankRowMe: { backgroundColor: C.primaryBg, borderRadius: 6 },
  miniRankNum: { width: 28, fontSize: 14, textAlign: "center" },
  miniRankName: { flex: 1, fontSize: 13, color: C.text, marginLeft: 4 },
  miniRankPts: { fontSize: 13, fontWeight: "bold", color: C.text, marginLeft: 8 },
  // 勝ち点ルール
  leagueRuleInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  leagueRuleText: { fontSize: 11, color: C.textSub },
  // リーグ完了モーダル
  completionOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  completionSheet: { backgroundColor: C.card, borderRadius: 20, padding: 24, width: "100%", maxHeight: "80%" },
  completionHeader: { alignItems: "center", marginBottom: 20 },
  completionTrophy: { fontSize: 48, marginBottom: 8 },
  completionTitle: { fontSize: 20, fontWeight: "bold", color: C.text },
  completionLeagueName: { fontSize: 16, fontWeight: "bold", color: C.primary, marginTop: 4, textAlign: "center" },
  completionSeason: { fontSize: 13, color: C.textSub, marginTop: 2 },
  completionSubtitle: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 },
  completionStandings: { backgroundColor: C.bg, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  completionRow: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  completionRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginRight: 10 },
  completionRankTop: { backgroundColor: "#FFF8E1" },
  completionRankText: { fontSize: 14, fontWeight: "bold", color: C.text },
  completionName: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  completionPts: { fontSize: 15, fontWeight: "bold", color: C.primary, marginLeft: 8 },
  completionMore: { fontSize: 12, color: C.textSub, textAlign: "center", paddingVertical: 8 },
  completionCloseBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  completionCloseBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
