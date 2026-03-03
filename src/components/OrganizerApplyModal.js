import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";

export default function OrganizerApplyModal({ visible, onClose, onApply }) {
  const insets = useSafeAreaInsets();
  const [xAccount, setXAccount] = useState("");
  const [tonamelUrl, setTonamelUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // バリデーション
    if (!xAccount.trim()) {
      Alert.alert("入力エラー", "Xアカウントを入力してください");
      return;
    }
    if (!tonamelUrl.trim()) {
      Alert.alert("入力エラー", "Tonamelの大会ページURLを入力してください");
      return;
    }

    // Tonamel URL のバリデーション
    if (!tonamelUrl.trim().includes("tonamel.com")) {
      Alert.alert("入力エラー", "正しいTonamelのURLを入力してください\n例: https://tonamel.com/competition/xxxxx");
      return;
    }

    setLoading(true);
    const { error } = await onApply(xAccount.trim(), tonamelUrl.trim());
    setLoading(false);

    if (!error) {
      Alert.alert("申請完了", "管理者の承認をお待ちください");
      setXAccount("");
      setTonamelUrl("");
      onClose();
    } else {
      Alert.alert("エラー", "申請に失敗しました");
    }
  };

  const handleClose = () => {
    setXAccount("");
    setTonamelUrl("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>主催者申請</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={C.primary} />
            <Text style={styles.infoText}>
              主催者として大会を投稿・管理できるようになります。{"\n"}
              審査のため、以下の情報を提出してください。
            </Text>
          </View>

          {/* Xアカウント */}
          <Text style={styles.label}>Xアカウント <Text style={styles.required}>*必須</Text></Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.inputWithPrefix}
              value={xAccount}
              onChangeText={setXAccount}
              placeholder="アカウント名"
              placeholderTextColor={C.textSub}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hint}>例: kadosuke_official</Text>

          {/* Tonamel URL */}
          <Text style={styles.label}>Tonamel 大会ページURL <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={tonamelUrl}
            onChangeText={setTonamelUrl}
            placeholder="https://tonamel.com/competition/xxxxx"
            placeholderTextColor={C.textSub}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>過去に主催した大会のTonamelページURL</Text>

          {/* 注意事項 */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>審査について</Text>
            <Text style={styles.noteText}>
              ・提出された情報をもとに管理者が審査を行います{"\n"}
              ・審査には数日かかる場合があります{"\n"}
              ・承認後、大会の投稿・管理が可能になります{"\n"}
              ・虚偽の情報を提出した場合、権限が取り消される場合があります
            </Text>
          </View>

          {/* 申請ボタン */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>申請する</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { minWidth: 60, alignItems: "center" },
  cancel: { fontSize: 15, color: C.primary, fontWeight: "bold" },
  body: { flex: 1, padding: 16 },
  infoBox: { flexDirection: "row", backgroundColor: "#FFF3ED", borderRadius: 10, padding: 14, gap: 10, marginBottom: 20, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8, marginTop: 16 },
  required: { fontSize: 12, color: C.danger, fontWeight: "normal" },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  prefix: { fontSize: 16, color: C.textSub, paddingLeft: 14, fontWeight: "bold" },
  inputWithPrefix: { flex: 1, padding: 14, fontSize: 15, color: C.text },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  hint: { fontSize: 12, color: C.textSub, marginTop: 4 },
  noteBox: { backgroundColor: C.card, borderRadius: 10, padding: 16, marginTop: 24, borderWidth: 1, borderColor: C.border },
  noteTitle: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 },
  noteText: { fontSize: 13, color: C.textSub, lineHeight: 22 },
  submitBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
