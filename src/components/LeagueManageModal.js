import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, Alert, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useLeagues } from "../hooks/useLeagues";
import { useMasterData } from "../hooks/useMasterData";
import CSVImportModal from "./CSVImportModal";

export default function LeagueManageModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const {
    leagues, loading, fetchMyLeagues, createLeague, deleteLeague,
    completeLeague, fetchRounds, addRound, importRoundResults,
    updateStandings, fetchStandings,
  } = useLeagues();
  const { games: masterGames } = useMasterData();

  const [view, setView] = useState("list"); // list | create | detail
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [standings, setStandings] = useState([]);
  const [showCSV, setShowCSV] = useState(false);
  const [csvRoundId, setCsvRoundId] = useState(null);

  // 作成フォーム
  const [formName, setFormName] = useState("");
  const [formGame, setFormGame] = useState(null);
  const [formSeason, setFormSeason] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // 勝ち点設定
  const [pointRuleType, setPointRuleType] = useState("wld"); // wld | ranking
  const [pointWin, setPointWin] = useState("3");
  const [pointLoss, setPointLoss] = useState("0");
  const [pointDraw, setPointDraw] = useState("1");
  const [rankingPoints, setRankingPoints] = useState([
    { rank: 1, points: "10" },
    { rank: 2, points: "5" },
    { rank: 3, points: "3" },
    { rank: 4, points: "1" },
  ]);

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
  };

  const handleCreate = async () => {
    if (!formName || !formGame) {
      Alert.alert("エラー", "リーグ名とゲームは必須です");
      return;
    }
    setCreating(true);

    const leagueData = {
      name: formName,
      game: formGame.name,
      game_color: formGame.color,
      season_name: formSeason || null,
      description: formDesc || null,
      point_rule_type: pointRuleType,
      point_win: parseInt(pointWin, 10) || 0,
      point_loss: parseInt(pointLoss, 10) || 0,
      point_draw: parseInt(pointDraw, 10) || 0,
      point_ranking: pointRuleType === "ranking"
        ? rankingPoints.map((r) => parseInt(r.points, 10) || 0)
        : null,
    };

    const { error } = await createLeague(leagueData);
    setCreating(false);
    if (error) {
      Alert.alert("エラー", "作成に失敗しました");
    } else {
      resetForm();
      setView("list");
    }
  };

  const openDetail = async (league) => {
    setSelectedLeague(league);
    const r = await fetchRounds(league.id);
    setRounds(r);
    const s = await fetchStandings(league.id);
    setStandings(s);
    setView("detail");
  };

  const handleAddRound = async () => {
    if (!selectedLeague) return;
    const { data, error } = await addRound(selectedLeague.id, {});
    if (error) {
      Alert.alert("エラー", "ラウンド追加に失敗しました");
    } else {
      const r = await fetchRounds(selectedLeague.id);
      setRounds(r);
    }
  };

  const handleCSVImport = async (roundId) => {
    setCsvRoundId(roundId);
    setShowCSV(true);
  };

  const handleCSVData = async (parsedData) => {
    if (!csvRoundId || !selectedLeague) return;
    const { error } = await importRoundResults(csvRoundId, parsedData);
    if (error) throw error;
    await updateStandings(selectedLeague.id);
    const s = await fetchStandings(selectedLeague.id);
    setStandings(s);
  };

  const handleComplete = () => {
    Alert.alert("リーグ終了", "このリーグを完了にしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "完了にする",
        onPress: async () => {
          await completeLeague(selectedLeague.id);
          setView("list");
        },
      },
    ]);
  };

  const handleDelete = (league) => {
    Alert.alert("リーグ削除", `「${league.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await deleteLeague(league.id);
          if (selectedLeague?.id === league.id) setView("list");
        },
      },
    ]);
  };

  const addRankingRow = () => {
    setRankingPoints((prev) => [
      ...prev,
      { rank: prev.length + 1, points: "0" },
    ]);
  };

  const removeRankingRow = () => {
    if (rankingPoints.length > 1) {
      setRankingPoints((prev) => prev.slice(0, -1));
    }
  };

  const updateRankingPoint = (index, value) => {
    setRankingPoints((prev) =>
      prev.map((r, i) => (i === index ? { ...r, points: value } : r))
    );
  };

  // 勝ち点ルール表示ラベル
  const getPointRuleLabel = (league) => {
    if (!league) return "";
    if (league.point_rule_type === "ranking") {
      const pts = league.point_ranking || [];
      return pts.map((p, i) => `${i + 1}位:${p}pt`).join("  ");
    }
    return `勝${league.point_win ?? 3}  負${league.point_loss ?? 0}  分${league.point_draw ?? 1}`;
  };

  // === リスト表示 ===
  const renderList = () => (
    <>
      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>マイリーグ</Text>
        <TouchableOpacity onPress={() => setView("create")}>
          <Text style={styles.addBtn}>+ 新規作成</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : leagues.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trophy-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>リーグはまだありません</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setView("create")}>
            <Text style={styles.createBtnText}>リーグを作成</Text>
          </TouchableOpacity>
        </View>
      ) : (
        leagues.map((l) => (
          <TouchableOpacity key={l.id} style={styles.leagueItem} onPress={() => openDetail(l)}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.gameTag, { color: l.game_color }]}>{l.game}</Text>
                {l.status === "completed" && (
                  <View style={styles.completedBadge}><Text style={styles.completedText}>完了</Text></View>
                )}
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

  // === 作成フォーム ===
  const renderCreate = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}>
          <Text style={styles.backBtn}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>リーグ作成</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.label}>ゲーム *</Text>
      <View style={styles.gameRow}>
        {masterGames.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.gameBtn, formGame?.id === g.id && { backgroundColor: g.color, borderColor: g.color }]}
            onPress={() => setFormGame(g)}
          >
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

      {/* 勝ち点設定 */}
      <Text style={[styles.label, { marginTop: 24 }]}>勝ち点ルール</Text>
      <View style={styles.ruleToggle}>
        <TouchableOpacity
          style={[styles.ruleBtn, pointRuleType === "wld" && styles.ruleBtnActive]}
          onPress={() => setPointRuleType("wld")}
        >
          <Ionicons name="swap-horizontal-outline" size={16} color={pointRuleType === "wld" ? "#fff" : C.text} />
          <Text style={[styles.ruleBtnText, pointRuleType === "wld" && styles.ruleBtnTextActive]}>
            勝敗ベース
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ruleBtn, pointRuleType === "ranking" && styles.ruleBtnActive]}
          onPress={() => setPointRuleType("ranking")}
        >
          <Ionicons name="podium-outline" size={16} color={pointRuleType === "ranking" ? "#fff" : C.text} />
          <Text style={[styles.ruleBtnText, pointRuleType === "ranking" && styles.ruleBtnTextActive]}>
            順位ベース
          </Text>
        </TouchableOpacity>
      </View>

      {pointRuleType === "wld" ? (
        <View style={styles.wldConfig}>
          <Text style={styles.configHint}>各ラウンドの勝ち/負け/引分けに対するポイント</Text>
          <View style={styles.wldRow}>
            <View style={styles.wldItem}>
              <Text style={[styles.wldLabel, { color: C.success }]}>勝ち</Text>
              <TextInput
                style={styles.wldInput}
                keyboardType="number-pad"
                value={pointWin}
                onChangeText={setPointWin}
              />
            </View>
            <View style={styles.wldItem}>
              <Text style={[styles.wldLabel, { color: C.danger }]}>負け</Text>
              <TextInput
                style={styles.wldInput}
                keyboardType="number-pad"
                value={pointLoss}
                onChangeText={setPointLoss}
              />
            </View>
            <View style={styles.wldItem}>
              <Text style={[styles.wldLabel, { color: C.warning }]}>引分</Text>
              <TextInput
                style={styles.wldInput}
                keyboardType="number-pad"
                value={pointDraw}
                onChangeText={setPointDraw}
              />
            </View>
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
              <View style={styles.rankingLabel}>
                <Text style={styles.rankingRank}>{r.rank}位</Text>
              </View>
              <TextInput
                style={styles.rankingInput}
                keyboardType="number-pad"
                value={r.points}
                onChangeText={(v) => updateRankingPoint(i, v)}
                placeholder="0"
                placeholderTextColor={C.textSub}
              />
              <Text style={styles.rankingPt}>pt</Text>
            </View>
          ))}
          <View style={styles.rankingActions}>
            <TouchableOpacity style={styles.rankingActionBtn} onPress={addRankingRow}>
              <Ionicons name="add-circle-outline" size={18} color={C.primary} />
              <Text style={styles.rankingActionText}>追加</Text>
            </TouchableOpacity>
            {rankingPoints.length > 1 && (
              <TouchableOpacity style={styles.rankingActionBtn} onPress={removeRankingRow}>
                <Ionicons name="remove-circle-outline" size={18} color={C.danger} />
                <Text style={[styles.rankingActionText, { color: C.danger }]}>削除</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, creating && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>リーグを作成</Text>}
      </TouchableOpacity>
    </>
  );

  // === 詳細表示 ===
  const renderDetail = () => (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => setView("list")}>
          <Text style={styles.backBtn}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle} numberOfLines={1}>{selectedLeague?.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      {selectedLeague?.season_name && (
        <Text style={styles.detailSeason}>{selectedLeague.season_name}</Text>
      )}

      {/* 勝ち点ルール表示 */}
      <View style={styles.pointRuleCard}>
        <Ionicons name="calculator-outline" size={16} color={C.primary} />
        <Text style={styles.pointRuleCardText}>{getPointRuleLabel(selectedLeague)}</Text>
      </View>

      {/* ラウンド一覧 */}
      <View style={styles.roundsHeader}>
        <Text style={styles.sectionLabel}>ラウンド</Text>
        {selectedLeague?.status !== "completed" && (
          <TouchableOpacity onPress={handleAddRound}>
            <Text style={styles.addBtn}>+ 追加</Text>
          </TouchableOpacity>
        )}
      </View>

      {rounds.length === 0 ? (
        <Text style={styles.noDataText}>ラウンドはまだありません</Text>
      ) : (
        rounds.map((r) => (
          <View key={r.id} style={styles.roundItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roundName}>{r.name || `第${r.round_number}回`}</Text>
              {r.date && <Text style={styles.roundDate}>{new Date(r.date).toLocaleDateString("ja-JP")}</Text>}
            </View>
            {selectedLeague?.status !== "completed" && (
              <TouchableOpacity style={styles.csvBtn} onPress={() => handleCSVImport(r.id)}>
                <Ionicons name="cloud-upload-outline" size={16} color={C.primary} />
                <Text style={styles.csvBtnText}>CSV</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* スタンディング */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>スタンディング</Text>
      {standings.length === 0 ? (
        <Text style={styles.noDataText}>データなし（ラウンド結果をインポートしてください）</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.colRank]}>#</Text>
              <Text style={[styles.tableHeader, styles.colStName]}>プレイヤー</Text>
              <Text style={[styles.tableHeader, styles.colStNum]}>W</Text>
              <Text style={[styles.tableHeader, styles.colStNum]}>L</Text>
              <Text style={[styles.tableHeader, styles.colStNum]}>D</Text>
              <Text style={[styles.tableHeader, styles.colStNum]}>Pts</Text>
              <Text style={[styles.tableHeader, styles.colStNum]}>R</Text>
            </View>
            {standings.map((s, i) => (
              <View key={s.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.colRank, i < 3 && { fontWeight: "bold", color: C.primary }]}>{s.rank}</Text>
                <Text style={[styles.tableCell, styles.colStName]} numberOfLines={1}>{s.player_name}</Text>
                <Text style={[styles.tableCell, styles.colStNum]}>{s.total_wins}</Text>
                <Text style={[styles.tableCell, styles.colStNum]}>{s.total_losses}</Text>
                <Text style={[styles.tableCell, styles.colStNum]}>{s.total_draws}</Text>
                <Text style={[styles.tableCell, styles.colStNum, { fontWeight: "bold" }]}>{s.total_points}</Text>
                <Text style={[styles.tableCell, styles.colStNum]}>{s.rounds_played}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* リーグ完了ボタン */}
      {selectedLeague?.status !== "completed" && (
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.completeBtnText}>リーグを完了にする</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        {/* メインヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>リーグ管理</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {view === "list" && renderList()}
          {view === "create" && renderCreate()}
          {view === "detail" && renderDetail()}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* CSV インポートモーダル */}
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
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBtn: { minWidth: 60, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.primary },
  body: { padding: 16 },
  // サブヘッダー
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "bold", color: C.text, flex: 1, textAlign: "center" },
  backBtn: { fontSize: 14, color: C.primary, fontWeight: "600" },
  addBtn: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  // リスト
  emptyBox: { alignItems: "center", padding: 32, backgroundColor: C.card, borderRadius: 12 },
  emptyText: { fontSize: 14, color: C.textSub, marginVertical: 12 },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  leagueItem: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center", elevation: 2,
  },
  gameTag: { fontSize: 12, fontWeight: "bold" },
  leagueName: { fontSize: 15, fontWeight: "bold", color: C.text, marginTop: 2 },
  leagueSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  completedBadge: { backgroundColor: "#DCFCE7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  completedText: { fontSize: 11, fontWeight: "bold", color: C.success },
  pointRuleLabel: { fontSize: 11, color: C.textSub, marginTop: 4 },
  // フォーム
  label: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  gameRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gameBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  gameBtnText: { fontSize: 13, color: C.text },
  submitBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  // 勝ち点ルール切替
  ruleToggle: { flexDirection: "row", gap: 8 },
  ruleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  ruleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  ruleBtnText: { fontSize: 14, fontWeight: "bold", color: C.text },
  ruleBtnTextActive: { color: "#fff" },
  // WLD設定
  wldConfig: { marginTop: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  configHint: { fontSize: 12, color: C.textSub, marginBottom: 12 },
  wldRow: { flexDirection: "row", gap: 12 },
  wldItem: { flex: 1, alignItems: "center" },
  wldLabel: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  wldInput: {
    width: "100%", textAlign: "center", backgroundColor: C.bg, borderRadius: 8,
    paddingVertical: 10, fontSize: 20, fontWeight: "bold", color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  previewBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12, backgroundColor: C.bg, borderRadius: 8, padding: 10,
  },
  previewText: { fontSize: 12, color: C.textSub },
  // ランキング設定
  rankingConfig: { marginTop: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  rankingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rankingLabel: { width: 40, alignItems: "center" },
  rankingRank: { fontSize: 14, fontWeight: "bold", color: C.text },
  rankingInput: {
    flex: 1, textAlign: "center", backgroundColor: C.bg, borderRadius: 8,
    paddingVertical: 8, fontSize: 18, fontWeight: "bold", color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  rankingPt: { fontSize: 14, color: C.textSub, fontWeight: "bold", width: 24 },
  rankingActions: { flexDirection: "row", gap: 16, marginTop: 4 },
  rankingActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  rankingActionText: { fontSize: 13, fontWeight: "bold", color: C.primary },
  // 詳細
  detailSeason: { fontSize: 13, color: C.textSub, textAlign: "center", marginBottom: 8 },
  pointRuleCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  pointRuleCardText: { fontSize: 13, fontWeight: "bold", color: C.primary },
  roundsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 },
  noDataText: { fontSize: 13, color: C.textSub, textAlign: "center", paddingVertical: 16 },
  roundItem: {
    backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 6,
    flexDirection: "row", alignItems: "center",
  },
  roundName: { fontSize: 14, fontWeight: "bold", color: C.text },
  roundDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  csvBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.primary + "15", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  csvBtnText: { fontSize: 12, fontWeight: "bold", color: C.primary },
  // テーブル
  tableRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: "#F9F9F9" },
  tableHeader: { fontSize: 11, fontWeight: "bold", color: C.textSub, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: C.card },
  tableCell: { fontSize: 12, color: C.text, paddingVertical: 8, paddingHorizontal: 4 },
  colRank: { width: 32, textAlign: "center" },
  colStName: { width: 120 },
  colStNum: { width: 36, textAlign: "center" },
  // 完了ボタン
  completeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, marginTop: 24,
  },
  completeBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
