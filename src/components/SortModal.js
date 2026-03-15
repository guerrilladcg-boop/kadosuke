import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

const SORT_OPTIONS = [
  { key: "date_asc", label: "日付（近い順）", icon: "calendar-outline" },
  { key: "date_desc", label: "日付（遠い順）", icon: "calendar-outline" },
  { key: "name", label: "名前（あいうえお順）", icon: "text-outline" },
  { key: "popularity", label: "人気順", icon: "people-outline" },
];

export default function SortModal({ visible, onClose, sortBy, onSelect }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>並び替え</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, sortBy === opt.key && styles.optionActive]}
              onPress={() => { onSelect(opt.key); onClose(); }}
            >
              <Ionicons name={opt.icon} size={18} color={sortBy === opt.key ? C.primary : C.textSub} />
              <Text style={[styles.optionText, sortBy === opt.key && { color: C.primary, fontWeight: "bold" }]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && (
                <Ionicons name="checkmark" size={18} color={C.primary} style={{ marginLeft: "auto" }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export { SORT_OPTIONS };

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 32 },
  title: { fontSize: 16, fontWeight: "bold", color: C.text, textAlign: "center", marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10 },
  optionActive: { backgroundColor: "#FFF3ED" },
  optionText: { fontSize: 15, color: C.text },
});
