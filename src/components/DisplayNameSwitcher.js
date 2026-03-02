import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

export default function DisplayNameSwitcher({ visible, onClose, profile, onSave }) {
  const primaryName = profile?.name || "";
  const [displayNames, setDisplayNames] = useState(profile?.display_names || []);
  const [activeIndex, setActiveIndex] = useState(profile?.active_display_name_index || 0);
  const [newName, setNewName] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setDisplayNames(profile?.display_names || []);
      setActiveIndex(profile?.active_display_name_index || 0);
      setNewName("");
      setShowAddInput(false);
    }
  }, [visible, profile]);

  const allNames = [primaryName, ...displayNames];

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (allNames.includes(newName.trim())) {
      Alert.alert("エラー", "同じ名前が既に存在します");
      return;
    }
    setDisplayNames([...displayNames, newName.trim()]);
    setNewName("");
    setShowAddInput(false);
  };

  const handleDelete = (idx) => {
    // idx は displayNames 配列内のインデックス（0始まり）
    // allNames では idx+1 に相当
    if (activeIndex === idx + 1) {
      Alert.alert("エラー", "現在使用中の名前は削除できません");
      return;
    }
    const updated = displayNames.filter((_, i) => i !== idx);
    setDisplayNames(updated);
    // activeIndex がずれる場合の調整
    if (activeIndex > idx + 1) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleSave = () => {
    onSave(displayNames, activeIndex);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>表示名の切り替え</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.save}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <Text style={styles.desc}>使用する表示名を選択してください</Text>

          {allNames.map((name, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.nameItem, activeIndex === i && styles.nameItemActive]}
              onPress={() => setActiveIndex(i)}
            >
              <View style={[styles.radio, activeIndex === i && styles.radioActive]}>
                {activeIndex === i && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.nameText, activeIndex === i && { fontWeight: "bold", color: C.primary }]}>
                {name}
              </Text>
              {i === 0 && <Text style={styles.primaryLabel}>メイン</Text>}
              {i > 0 && (
                <TouchableOpacity onPress={() => handleDelete(i - 1)} style={styles.deleteBtn}>
                  <Ionicons name="close-circle" size={20} color={C.textSub} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {showAddInput ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="新しい表示名..."
                placeholderTextColor={C.textSub}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAdd}>
                <Text style={styles.addConfirmText}>追加</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddInput(false); setNewName(""); }}>
                <Text style={styles.addCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddInput(true)}>
              <Ionicons name="add-circle-outline" size={20} color={C.primary} />
              <Text style={styles.addBtnText}>表示名を追加</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.textSub },
  save: { fontSize: 15, fontWeight: "bold", color: C.primary },
  body: { padding: 16 },
  desc: { fontSize: 13, color: C.textSub, marginBottom: 16 },
  nameItem: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: C.border },
  nameItemActive: { borderColor: C.primary, backgroundColor: "#FFF3ED" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  nameText: { flex: 1, fontSize: 15, color: C.text },
  primaryLabel: { fontSize: 11, color: C.textSub, backgroundColor: C.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deleteBtn: { padding: 4 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  addInput: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  addConfirmBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addConfirmText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  addCancelText: { color: C.textSub, fontSize: 13, paddingHorizontal: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  addBtnText: { fontSize: 14, color: C.primary },
});
