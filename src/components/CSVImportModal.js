import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { C } from "../constants/theme";
import { parseResultsCSV } from "../utils/csvParser";

/**
 * CSVインポートモーダル
 * props:
 *   visible, onClose
 *   onImport(parsedData) — インポート実行コールバック
 *   title — モーダルタイトル（デフォルト: 「結果をインポート」）
 */
export default function CSVImportModal({ visible, onClose, onImport, title }) {
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      setFileName(file.name || "file.csv");
      const csvText = await FileSystem.readAsStringAsync(file.uri);
      const { data, errors: parseErrors } = parseResultsCSV(csvText);
      setParsed(data);
      setErrors(parseErrors);
    } catch (e) {
      Alert.alert("エラー", "ファイルの読み込みに失敗しました");
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      await onImport(parsed);
      Alert.alert("完了", `${parsed.length}件のデータをインポートしました`);
      handleReset();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "インポートに失敗しました");
    }
    setImporting(false);
  };

  const handleReset = () => {
    setParsed(null);
    setErrors([]);
    setFileName("");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { handleReset(); onClose(); }} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title || "結果をインポート"}</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* ファイル選択 */}
          <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
            <Ionicons name="document-text-outline" size={24} color={C.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pickBtnTitle}>
                {fileName || "CSVファイルを選択"}
              </Text>
              <Text style={styles.pickBtnSub}>
                必須列: player_name / 任意: ranking, wins, losses, draws, deck_name
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textSub} />
          </TouchableOpacity>

          {/* エラー表示 */}
          {errors.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>
                <Ionicons name="warning-outline" size={14} color={C.danger} /> バリデーションエラー
              </Text>
              {errors.map((e, i) => (
                <Text key={i} style={styles.errorText}>• {e}</Text>
              ))}
            </View>
          )}

          {/* プレビュー */}
          {parsed && parsed.length > 0 && (
            <>
              <Text style={styles.previewTitle}>
                プレビュー（{parsed.length}件）
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* テーブルヘッダー */}
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableHeader, styles.colRank]}>#</Text>
                    <Text style={[styles.tableHeader, styles.colName]}>プレイヤー</Text>
                    <Text style={[styles.tableHeader, styles.colNum]}>W</Text>
                    <Text style={[styles.tableHeader, styles.colNum]}>L</Text>
                    <Text style={[styles.tableHeader, styles.colNum]}>D</Text>
                    <Text style={[styles.tableHeader, styles.colNum]}>Pts</Text>
                    <Text style={[styles.tableHeader, styles.colDeck]}>デッキ</Text>
                  </View>
                  {/* テーブルボディ */}
                  {parsed.slice(0, 20).map((row, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, styles.colRank]}>{row.ranking ?? "-"}</Text>
                      <Text style={[styles.tableCell, styles.colName]} numberOfLines={1}>{row.player_name}</Text>
                      <Text style={[styles.tableCell, styles.colNum]}>{row.wins}</Text>
                      <Text style={[styles.tableCell, styles.colNum]}>{row.losses}</Text>
                      <Text style={[styles.tableCell, styles.colNum]}>{row.draws}</Text>
                      <Text style={[styles.tableCell, styles.colNum, { fontWeight: "bold" }]}>{row.points}</Text>
                      <Text style={[styles.tableCell, styles.colDeck]} numberOfLines={1}>{row.deck_name || "-"}</Text>
                    </View>
                  ))}
                  {parsed.length > 20 && (
                    <Text style={styles.moreText}>…他 {parsed.length - 20} 件</Text>
                  )}
                </View>
              </ScrollView>

              {/* インポートボタン */}
              <TouchableOpacity
                style={[styles.importBtn, importing && { opacity: 0.6 }]}
                onPress={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                    <Text style={styles.importBtnText}>{parsed.length}件をインポート</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
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
  title: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.primary },
  body: { padding: 16 },
  // ファイル選択
  pickBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border,
  },
  pickBtnTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  pickBtnSub: { fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 16 },
  // エラー
  errorBox: {
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorTitle: { fontSize: 13, fontWeight: "bold", color: C.danger, marginBottom: 6 },
  errorText: { fontSize: 12, color: C.danger, lineHeight: 18 },
  // プレビュー
  previewTitle: { fontSize: 14, fontWeight: "bold", color: C.text, marginTop: 20, marginBottom: 10 },
  tableRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: "#F9F9F9" },
  tableHeader: { fontSize: 11, fontWeight: "bold", color: C.textSub, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: C.card },
  tableCell: { fontSize: 12, color: C.text, paddingVertical: 8, paddingHorizontal: 4 },
  colRank: { width: 36, textAlign: "center" },
  colName: { width: 120 },
  colNum: { width: 36, textAlign: "center" },
  colDeck: { width: 100 },
  moreText: { fontSize: 12, color: C.textSub, textAlign: "center", paddingVertical: 8 },
  // インポートボタン
  importBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16,
    marginTop: 20, gap: 8,
  },
  importBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
