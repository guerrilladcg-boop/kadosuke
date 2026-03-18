import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useLeagues } from "../hooks/useLeagues";
import { useMasterData } from "../hooks/useMasterData";
import CSVImportModal from "./CSVImportModal";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeagueManageModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const {
    leagues, loading, fetchMyLeagues, createLeague, deleteLeague,
    completeLeagueWithNotification, fetchRounds, addRound, deleteRound,
    fetchRoundResults, importRoundResults,
    updateStandings, fetchStandings, fetchParticipants, removeParticipant,
  } = useLeagues();
  const { games: masterGames } = useMasterData();

  const [view, setView] = useState("list"); // list | create | detail | roundResults | participants
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [standings, setStandings] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showCSV, setShowCSV] = useState(false);
  const [csvRoundId, setCsvRoundId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  // ラウンド結果表示
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundResults, setRoundResults] = useState([]);
  const [roundResultsLoading, setRoundResultsLoading] = useState(false);

  // 作成フォーム
  const [formName, setFormName] = useState("");
  const [formGame, setFormGame] = useState(null);
  const [formSeason, setFormSeason] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // 勝ち点設定
  const [pointRuleType, setPointRuleType] = useState("wld");
  const [pointWin, setPointWin] = useState("3");
  const [pointLoss, setPointLoss] = useState("0");
  const [pointDraw, setPointDraw] = useState("1");
  const [rankingPoints, setRankingPoints] = useState([
    { rank: 1, points: "10" }, { rank: 2, points: "5" },
    { rank: 3, points: "3" }, { rank: 4, points: "1" },
  ]);
  const [scaleByParticipants, setScaleByParticipants] = useState(false);

  useEffect(() => {
    if (visible) fetchMyLeagues();
  }, [visible]);

  const resetForm = () => {
    setFormName(""); setFormGame(null); setFormSeason(""); setFormDesc("");
    setPointRuleType("wld"); setPointWin("3"); setPointLoss("0"); setPointDraw("1");
    setRankingPoints([
      { rank: 1, points: "10" }, { rank: 2, points: "5" },
      { rank: 3, points: "3" }, { rank: 4, points: "1" },
    ]);
    setScaleByParticipants(false);
  };

  const handleCreate = async () => {
    if (!formName || !formGame) {
      Alert.alert("エラー", "リーグ名とゲームは必須です");
      return;
    }
    setCreating(true);
    const leagueData = {
      name: formName, game: formGame.name, game_color: formGame.color,
      season_name: formSeason || null, description: formDesc || null,
      point_rule_type: pointRuleType,
      point_win: parseInt(pointWin, 10) || 0,
      point_loss: parseInt(pointLoss, 10) || 0,
      point_draw: parseInt(pointDraw, 10) || 0,
      point_ranking: pointRuleType === "ranking"
        ? rankingPoints.map((r) => parseInt(r.points, 10) || 0) : null,
      ranking_scale_by_participants: pointRuleType === "ranking" ? scaleByParticipants : false,
    };
    const { data, error } = await createLeague(leagueData);
    setCreating(false);
    if (error) {
      console.error("[LeagueManage] create error:", JSON.stringify(error));
      Alert.alert("エラー", `作成に失敗しました\n${error.message || JSON.stringify(error)}`);
    } else {
      resetForm(); setView("list");
    }
  };

  const openDetail = async (league) => {
    setSelectedLeague(league);
    const [r, s, p] = await Promise.all([
      fetchRounds(league.id),
      fetchStandings(league.id),
      fetchParticipants(league.id),
    ]);
    setRounds(r); setStandings(s); setParticipants(p);
    setView("detail");
  };

  const handleAddRound = async () => {
    if (!selectedLeague) return;
    const { error } = await addRound(selectedLeague.id, {});
    if (error) Alert.alert("エラー", "ラウンド追加に失敗しました");
    else setRounds(await fetchRounds(selectedLeague.id));
  };

  const handleDeleteRound = (round) => {
    Alert.alert("ラウンド削除", `「${round.name || `第${round.round_number}回`}」を削除しますか？\nこのラウンドの結果もすべて削除されます。`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除", style: "destructive",
        onPress: async () => {
          await deleteRound(round.id);
          setRounds(await fetchRounds(selectedLeague.id));
          await handleRecalculate();
        },
      },
    ]);
  };

  const handleCSVImport = (roundId) => { setCsvRoundId(roundId); setShowCSV(true); };

  const handleCSVData = async (parsedData) => {
    if (!csvRoundId || !selectedLeague) return;
    const { error } = await importRoundResults(csvRoundId, parsedData);
    if (error) throw error;
    await updateStandings(selectedLeague.id);
    setStandings(await fetchStandings(selectedLeague.id));
  };

  const handleRecalculate = async () => {
    if (!selectedLeague) return;
    setRecalculating(true);
    await updateStandings(selectedLeague.id);
    setStandings(await fetchStandings(selectedLeague.id));
    setRecalculating(false);
  };

  const handleComplete = () => {
    Alert.alert("リーグ終了", "このリーグを完了にしますか？\n参加者全員に結果が通知されます。", [
      { text: "キャンセル", style: "cancel" },
      { text: "完了にする", onPress: async () => { await completeLeagueWithNotification(selectedLeague.id); setView("list"); } },
    ]);
  };

  const handleDelete = (league) => {
    Alert.alert("リーグ削除", `「${league.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: async () => {
        await deleteLeague(league.id);
        if (selectedLeague?.id === league.id) setView("list");
      }},
    ]);
  };

  const handleViewRoundResults = async (round) => {
    setSelectedRound(round);
    setRoundResultsLoading(true);
    const results = await fetchRoundResults(round.id);
    setRoundResults(results);
    setRoundResultsLoading(false);
    setView("roundResults");
  };

  const handleRemoveParticipant = (p) => {
    Alert.alert("参加者を削除", `「${p.player_name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: async () => {
        await removeParticipant(p.id);
        setParticipants(await fetchParticipants(selectedLeague.id));
      }},
    ]);
  };

  const addRankingRow = () => setRankingPoints((prev) => [...prev, { rank: prev.length + 1, points: "0" }]);
  const removeRankingRow = () => { if (rankingPoints.length > 1) setRankingPoints((prev) => prev.slice(0, -1)); };
  const updateRankingPoint = (i, v) => setRankingPoints((prev) => prev.map((r, idx) => idx === i ? { ...r, points: v } : r));

  const getPointRuleLabel = (league) => {
    if (!league) return "";
    if (league.point_rule_type === "ranking") {
      const base = (league.point_ranking || []).map((p, i) => `${i + 1}位:${p}pt`).join("  ");
      return base + (league.ranking_scale_by_participants ? "  (傾斜配点)" : "");
    }
    return `勝${league.point_win ?? 3}pt  負${league.point_loss ?? 0}pt  分${league.point_draw ?? 1}pt`;
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return MEDAL[rank - 1];
    return `${rank}`;
  };

  // ========== VIEWS ==========

  const renderList = () => (
    <>
      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>マイリーグ</Text>
        <TouchableOpacity onPress={() => setView("create")}><Text style={styles.addBtn}>+ 新規作成</Text></TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : leagues.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trophy-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>リーグはまだありません</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setView("create")}><Text style={styles.createBtnText}>リーグを作成</Text></TouchableOpacity>
        </View>
      ) : (
        leagues.map((l) => (
          <TouchableOpacity key={l.id} style={styles.leagueItem} onPress={() => openDetail(l)}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.gameTag, { color: l.game_color }]}>{l.game}</Text>
                <View style={[styles.statusBadge, l.status === "completed" ? styles.statusCompleted : styles.statusActive]}>
                  <Text style={[styles.statusBadgeText, l.status === "completed" ? { color: C.success } : { color: C.primary }]}>
                    {l.status === "completed" ? "完了" : "開催中"}
                  </Text>
                </View>
              </View>
              <Text style={styles.leagueName}>{l.name}</Text>
              {l.season_name && <Text style={styles.leagueSub}>{l.season_name}</Text>}
              <Text style={styles.pointRuleLabel}>{getPointRuleLabel(l)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(l)} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color={C.textSub} />
          </TouchableOpacity>
        ))
      )}
    </>
  );

  const renderCreate = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}><Text style={styles.backBtn}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.subTitle}>リーグ作成</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.label}>ゲーム *</Text>
      <View style={styles.gameRow}>
        {masterGames.map((g) => (
          <TouchableOpacity key={g.id} style={[styles.gameBtn, formGame?.id === g.id && { backgroundColor: g.color, borderColor: g.color }]} onPress={() => setFormGame(g)}>
            <Text style={[styles.gameBtnText, formGame?.id === g.id && { color: "#fff" }]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>リーグ名 *</Text>
      <TextInput style={styles.input} placeholder="例: ポケカリーグ 渋谷" placeholderTextColor={C.textSub} value={formName} onChangeText={setFormName} />
      <Text style={styles.label}>シーズン名</Text>
      <TextInput style={styles.input} placeholder="例: 2026 Spring Season" placeholderTextColor={C.textSub} value={formSeason} onChangeText={setFormSeason} />
      <Text style={styles.label}>説明</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} placeholder="リーグの説明" placeholderTextColor={C.textSub} value={formDesc} onChangeText={setFormDesc} multiline />

      <Text style={[styles.label, { marginTop: 24 }]}>勝ち点ルール</Text>
      <View style={styles.ruleToggle}>
        <TouchableOpacity style={[styles.ruleBtn, pointRuleType === "wld" && styles.ruleBtnActive]} onPress={() => setPointRuleType("wld")}>
          <Ionicons name="swap-horizontal-outline" size={16} color={pointRuleType === "wld" ? "#fff" : C.text} />
          <Text style={[styles.ruleBtnText, pointRuleType === "wld" && styles.ruleBtnTextActive]}>勝敗ベース</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ruleBtn, pointRuleType === "ranking" && styles.ruleBtnActive]} onPress={() => setPointRuleType("ranking")}>
          <Ionicons name="podium-outline" size={16} color={pointRuleType === "ranking" ? "#fff" : C.text} />
          <Text style={[styles.ruleBtnText, pointRuleType === "ranking" && styles.ruleBtnTextActive]}>順位ベース</Text>
        </TouchableOpacity>
      </View>
      {pointRuleType === "wld" ? (
        <View style={styles.wldConfig}>
          <Text style={styles.configHint}>各ラウンドの勝ち/負け/引分けに対するポイント</Text>
          <View style={styles.wldRow}>
            {[["勝ち", C.success, pointWin, setPointWin], ["負け", C.danger, pointLoss, setPointLoss], ["引分", C.warning, pointDraw, setPointDraw]].map(([label, color, val, setter]) => (
              <View key={label} style={styles.wldItem}>
                <Text style={[styles.wldLabel, { color }]}>{label}</Text>
                <TextInput style={styles.wldInput} keyboardType="number-pad" value={val} onChangeText={setter} />
              </View>
            ))}
          </View>
          <View style={styles.previewBox}>
            <Ionicons name="information-circle-outline" size={14} color={C.textSub} />
            <Text style={styles.previewText}>
              例: 3勝1敗1分 → {3 * (parseInt(pointWin, 10) || 0) + 1 * (parseInt(pointLoss, 10) || 0) + 1 * (parseInt(pointDraw, 10) || 0)}pt
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.rankingConfig}>
          <Text style={styles.configHint}>各ラウンドの順位に対するポイント</Text>
          {rankingPoints.map((r, i) => (
            <View key={i} style={styles.rankingRow}>
              <View style={styles.rankingLabelWrap}><Text style={styles.rankingRank}>{r.rank}位</Text></View>
              <TextInput style={styles.rankingInput} keyboardType="number-pad" value={r.points} onChangeText={(v) => updateRankingPoint(i, v)} placeholder="0" placeholderTextColor={C.textSub} />
              <Text style={styles.rankingPt}>pt</Text>
            </View>
          ))}
          <View style={styles.rankingActions}>
            <TouchableOpacity style={styles.rankingActionBtn} onPress={addRankingRow}>
              <Ionicons name="add-circle-outline" size={18} color={C.primary} /><Text style={styles.rankingActionText}>追加</Text>
            </TouchableOpacity>
            {rankingPoints.length > 1 && (
              <TouchableOpacity style={styles.rankingActionBtn} onPress={removeRankingRow}>
                <Ionicons name="remove-circle-outline" size={18} color={C.danger} /><Text style={[styles.rankingActionText, { color: C.danger }]}>削除</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 傾斜配点トグル */}
          <View style={styles.scaleToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scaleToggleLabel}>大会規模で傾斜配点</Text>
              <Text style={styles.scaleToggleDesc}>参加人数が多い大会ほど高いポイントが付きます</Text>
            </View>
            <Switch
              value={scaleByParticipants}
              onValueChange={setScaleByParticipants}
              trackColor={{ true: C.primary, false: C.border }}
              thumbColor="#fff"
            />
          </View>
          {scaleByParticipants && (
            <View style={styles.scaleHint}>
              <Ionicons name="information-circle-outline" size={14} color={C.textSub} />
              <Text style={styles.scaleHintText}>
                倍率 = そのラウンドの参加人数 ÷ 全ラウンド平均人数{"\n"}
                例: 平均8人のリーグで16人の大会 → ポイント2倍
              </Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity style={[styles.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>リーグを作成</Text>}
      </TouchableOpacity>
    </>
  );

  const renderDetail = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}><Text style={styles.backBtn}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.subTitle} numberOfLines={1}>{selectedLeague?.name}</Text>
        <View style={{ width: 60 }} />
      </View>
      {selectedLeague?.season_name && <Text style={styles.detailSeason}>{selectedLeague.season_name}</Text>}

      {/* 勝ち点ルール */}
      <View style={styles.pointRuleCard}>
        <Ionicons name="calculator-outline" size={16} color={C.primary} />
        <Text style={styles.pointRuleCardText}>{getPointRuleLabel(selectedLeague)}</Text>
      </View>

      {/* 統計サマリー */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{rounds.length}</Text>
          <Text style={styles.summaryLabel}>ラウンド</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{standings.length}</Text>
          <Text style={styles.summaryLabel}>参加者</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: C.primary }]}>{standings[0]?.total_points || 0}</Text>
          <Text style={styles.summaryLabel}>最高得点</Text>
        </View>
      </View>

      {/* ラウンド一覧 */}
      <View style={styles.roundsHeader}>
        <Text style={styles.sectionLabel}>ラウンド</Text>
        {selectedLeague?.status !== "completed" && (
          <TouchableOpacity onPress={handleAddRound}><Text style={styles.addBtn}>+ 追加</Text></TouchableOpacity>
        )}
      </View>
      {rounds.length === 0 ? (
        <Text style={styles.noDataText}>ラウンドはまだありません</Text>
      ) : (
        rounds.map((r) => (
          <View key={r.id} style={styles.roundItem}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => handleViewRoundResults(r)}>
              <Text style={styles.roundName}>{r.name || `第${r.round_number}回`}</Text>
              {r.date && <Text style={styles.roundDate}>{new Date(r.date).toLocaleDateString("ja-JP")}</Text>}
              <Text style={styles.roundTapHint}>タップで結果を表示</Text>
            </TouchableOpacity>
            {selectedLeague?.status !== "completed" && (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity style={styles.csvBtn} onPress={() => handleCSVImport(r.id)}>
                  <Ionicons name="cloud-upload-outline" size={14} color={C.primary} />
                  <Text style={styles.csvBtnText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.roundDeleteBtn} onPress={() => handleDeleteRound(r)}>
                  <Ionicons name="trash-outline" size={14} color={C.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {/* 順位表 */}
      <View style={[styles.roundsHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>順位表</Text>
        {selectedLeague?.status !== "completed" && (
          <TouchableOpacity style={styles.recalcBtn} onPress={handleRecalculate} disabled={recalculating}>
            {recalculating
              ? <ActivityIndicator color={C.primary} size="small" />
              : <><Ionicons name="refresh-outline" size={14} color={C.primary} /><Text style={styles.recalcBtnText}>再集計</Text></>
            }
          </TouchableOpacity>
        )}
      </View>
      {standings.length === 0 ? (
        <Text style={styles.noDataText}>データなし（ラウンド結果をインポートしてください）</Text>
      ) : (
        <View style={styles.standingsCard}>
          {standings.map((s, i) => {
            const totalGames = s.total_wins + s.total_losses + s.total_draws;
            const winRate = totalGames > 0 ? ((s.total_wins / totalGames) * 100).toFixed(0) : "-";
            return (
              <View key={s.id} style={[styles.standingRow, i === 0 && styles.standingRowFirst]}>
                <View style={[styles.standingRank, s.rank <= 3 && styles.standingRankTop]}>
                  <Text style={[styles.standingRankText, s.rank <= 3 && { color: C.primary }]}>
                    {getRankIcon(s.rank)}
                  </Text>
                </View>
                <View style={styles.standingInfo}>
                  <Text style={styles.standingName} numberOfLines={1}>{s.player_name}</Text>
                  {s.deck_name && <Text style={styles.standingDeck} numberOfLines={1}>{s.deck_name}</Text>}
                </View>
                <View style={styles.standingStats}>
                  <Text style={styles.standingRecord}>
                    {s.total_wins}W {s.total_losses}L{s.total_draws > 0 ? ` ${s.total_draws}D` : ""}
                  </Text>
                  <Text style={styles.standingWinRate}>勝率{winRate}%</Text>
                </View>
                <View style={styles.standingPts}>
                  <Text style={styles.standingPtsValue}>{s.total_points}</Text>
                  <Text style={styles.standingPtsLabel}>pt</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 参加者管理 */}
      <View style={[styles.roundsHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>登録済み参加者 ({participants.length})</Text>
        <TouchableOpacity onPress={() => setView("participants")}><Text style={styles.addBtn}>管理</Text></TouchableOpacity>
      </View>

      {/* リーグ完了ボタン */}
      {selectedLeague?.status !== "completed" && (
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.completeBtnText}>リーグを完了にする</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // ラウンド結果表示
  const renderRoundResults = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("detail")}><Text style={styles.backBtn}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.subTitle} numberOfLines={1}>{selectedRound?.name || `第${selectedRound?.round_number}回`}</Text>
        <View style={{ width: 60 }} />
      </View>
      {roundResultsLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : roundResults.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>結果がまだインポートされていません</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => { setView("detail"); handleCSVImport(selectedRound.id); }}>
            <Text style={styles.createBtnText}>CSVをインポート</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.standingsCard}>
          {/* ヘッダー */}
          <View style={[styles.rrHeader]}>
            <Text style={[styles.rrHeaderText, { width: 32 }]}>#</Text>
            <Text style={[styles.rrHeaderText, { flex: 1 }]}>プレイヤー</Text>
            <Text style={[styles.rrHeaderText, { width: 80, textAlign: "center" }]}>戦績</Text>
            <Text style={[styles.rrHeaderText, { width: 40, textAlign: "right" }]}>Pts</Text>
          </View>
          {roundResults.map((r, i) => (
            <View key={r.id} style={[styles.rrRow, i % 2 === 0 && { backgroundColor: C.bg }]}>
              <View style={{ width: 32, alignItems: "center" }}>
                <Text style={[styles.rrRank, r.ranking <= 3 && { color: C.primary, fontWeight: "bold" }]}>
                  {r.ranking ? getRankIcon(r.ranking) : "-"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rrName} numberOfLines={1}>{r.player_name}</Text>
                {r.deck_name && <Text style={styles.rrDeck} numberOfLines={1}>{r.deck_name}</Text>}
              </View>
              <Text style={styles.rrRecord}>
                {r.wins}W {r.losses}L{r.draws > 0 ? ` ${r.draws}D` : ""}
              </Text>
              <Text style={styles.rrPts}>{r.points || 0}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  // 参加者管理
  const renderParticipants = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("detail")}><Text style={styles.backBtn}>← 戻る</Text></TouchableOpacity>
        <Text style={styles.subTitle}>参加者管理</Text>
        <View style={{ width: 60 }} />
      </View>
      {participants.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>登録済みの参加者はいません</Text>
          <Text style={[styles.emptyText, { fontSize: 12, marginTop: 0 }]}>
            参加者がアプリからリーグに参加すると表示されます
          </Text>
        </View>
      ) : (
        participants.map((p, i) => (
          <View key={p.id} style={styles.participantItem}>
            <View style={styles.participantAvatar}>
              <Text style={styles.participantAvatarText}>{(p.player_name || "?").charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.participantName}>{p.player_name}</Text>
              <Text style={styles.participantDate}>
                {new Date(p.created_at).toLocaleDateString("ja-JP")} 参加
              </Text>
            </View>
            {selectedLeague?.status !== "completed" && (
              <TouchableOpacity onPress={() => handleRemoveParticipant(p)} style={{ padding: 8 }}>
                <Ionicons name="person-remove-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}><Text style={styles.cancel}>閉じる</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>リーグ管理 v2</Text>
          <View style={styles.headerBtn} />
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {view === "list" && renderList()}
          {view === "create" && renderCreate()}
          {view === "detail" && renderDetail()}
          {view === "roundResults" && renderRoundResults()}
          {view === "participants" && renderParticipants()}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
      <CSVImportModal
        visible={showCSV}
        onClose={() => { setShowCSV(false); setCsvRoundId(null); }}
        onImport={handleCSVData}
        title="ラウンド結果インポート"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { minWidth: 60, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.primary },
  body: { padding: 16 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "bold", color: C.text, flex: 1, textAlign: "center" },
  backBtn: { fontSize: 14, color: C.primary, fontWeight: "600" },
  addBtn: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  emptyBox: { alignItems: "center", padding: 32, backgroundColor: C.card, borderRadius: 12 },
  emptyText: { fontSize: 14, color: C.textSub, marginVertical: 12 },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  // リスト
  leagueItem: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 2 },
  gameTag: { fontSize: 12, fontWeight: "bold" },
  leagueName: { fontSize: 15, fontWeight: "bold", color: C.text, marginTop: 2 },
  leagueSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusCompleted: { backgroundColor: "#DCFCE7" },
  statusActive: { backgroundColor: C.primaryBg },
  statusBadgeText: { fontSize: 11, fontWeight: "bold" },
  pointRuleLabel: { fontSize: 11, color: C.textSub, marginTop: 4 },
  // フォーム
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  gameBtnText: { fontSize: 13, color: C.text },
  submitBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  ruleToggle: { flexDirection: "row", gap: 8 },
  ruleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  ruleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  ruleBtnText: { fontSize: 14, fontWeight: "bold", color: C.text },
  ruleBtnTextActive: { color: "#fff" },
  wldConfig: { marginTop: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  configHint: { fontSize: 12, color: C.textSub, marginBottom: 12 },
  wldRow: { flexDirection: "row", gap: 12 },
  wldItem: { flex: 1, alignItems: "center" },
  wldLabel: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  wldInput: { width: "100%", textAlign: "center", backgroundColor: C.bg, borderRadius: 8, paddingVertical: 10, fontSize: 20, fontWeight: "bold", color: C.text, borderWidth: 1, borderColor: C.border },
  previewBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: C.bg, borderRadius: 8, padding: 10 },
  previewText: { fontSize: 12, color: C.textSub },
  rankingConfig: { marginTop: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  rankingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rankingLabelWrap: { width: 40, alignItems: "center" },
  rankingRank: { fontSize: 14, fontWeight: "bold", color: C.text },
  rankingInput: { flex: 1, textAlign: "center", backgroundColor: C.bg, borderRadius: 8, paddingVertical: 8, fontSize: 18, fontWeight: "bold", color: C.text, borderWidth: 1, borderColor: C.border },
  rankingPt: { fontSize: 14, color: C.textSub, fontWeight: "bold", width: 24 },
  rankingActions: { flexDirection: "row", gap: 16, marginTop: 4 },
  rankingActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  rankingActionText: { fontSize: 13, fontWeight: "bold", color: C.primary },
  scaleToggle: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  scaleToggleLabel: { fontSize: 14, fontWeight: "bold", color: C.text },
  scaleToggleDesc: { fontSize: 11, color: C.textSub, marginTop: 2 },
  scaleHint: { flexDirection: "row", gap: 6, backgroundColor: C.bg, borderRadius: 8, padding: 10, marginTop: 8 },
  scaleHintText: { fontSize: 11, color: C.textSub, flex: 1, lineHeight: 16 },
  // 詳細
  detailSeason: { fontSize: 13, color: C.textSub, textAlign: "center", marginBottom: 8 },
  pointRuleCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primaryBg, borderRadius: 10, padding: 12, marginBottom: 12 },
  pointRuleCardText: { fontSize: 13, fontWeight: "bold", color: C.primary },
  summaryRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "bold", color: C.text },
  summaryLabel: { fontSize: 11, color: C.textSub, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
  roundsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 },
  noDataText: { fontSize: 13, color: C.textSub, textAlign: "center", paddingVertical: 16 },
  roundItem: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6, flexDirection: "row", alignItems: "center" },
  roundName: { fontSize: 14, fontWeight: "bold", color: C.text },
  roundDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  roundTapHint: { fontSize: 10, color: C.primary, marginTop: 2 },
  csvBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.primary + "15", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  csvBtnText: { fontSize: 11, fontWeight: "bold", color: C.primary },
  roundDeleteBtn: { backgroundColor: C.danger + "15", borderRadius: 8, padding: 6 },
  recalcBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.primary + "15", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  recalcBtnText: { fontSize: 11, fontWeight: "bold", color: C.primary },
  // 順位表（カード型）
  standingsCard: { backgroundColor: C.card, borderRadius: 12, overflow: "hidden", elevation: 2, marginBottom: 8 },
  standingRow: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  standingRowFirst: { borderTopWidth: 0 },
  standingRank: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", marginRight: 10 },
  standingRankTop: { backgroundColor: "#FFF8E1" },
  standingRankText: { fontSize: 14, fontWeight: "bold", color: C.textSub },
  standingInfo: { flex: 1, marginRight: 8 },
  standingName: { fontSize: 14, fontWeight: "bold", color: C.text },
  standingDeck: { fontSize: 11, color: C.textSub, marginTop: 1 },
  standingStats: { alignItems: "flex-end", marginRight: 10 },
  standingRecord: { fontSize: 12, color: C.text, fontWeight: "600" },
  standingWinRate: { fontSize: 10, color: C.textSub, marginTop: 1 },
  standingPts: { alignItems: "center", minWidth: 40 },
  standingPtsValue: { fontSize: 18, fontWeight: "bold", color: C.primary },
  standingPtsLabel: { fontSize: 10, color: C.textSub },
  // ラウンド結果
  rrHeader: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  rrHeaderText: { fontSize: 11, fontWeight: "bold", color: C.textSub },
  rrRow: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rrRank: { fontSize: 14, color: C.text },
  rrName: { fontSize: 14, fontWeight: "bold", color: C.text },
  rrDeck: { fontSize: 11, color: C.textSub, marginTop: 1 },
  rrRecord: { width: 80, fontSize: 12, color: C.text, textAlign: "center" },
  rrPts: { width: 40, fontSize: 14, fontWeight: "bold", color: C.primary, textAlign: "right" },
  // 参加者
  participantItem: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6, flexDirection: "row", alignItems: "center" },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary + "20", alignItems: "center", justifyContent: "center", marginRight: 12 },
  participantAvatarText: { fontSize: 16, fontWeight: "bold", color: C.primary },
  participantName: { fontSize: 14, fontWeight: "bold", color: C.text },
  participantDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  // 完了ボタン
  completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, marginTop: 24 },
  completeBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
