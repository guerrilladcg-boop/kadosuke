import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";

export default function ShippingAddressModal({ visible, onClose, onSubmit, initialAddress, loading }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    shipping_name: "",
    shipping_zip: "",
    shipping_prefecture: "",
    shipping_city: "",
    shipping_address: "",
    shipping_building: "",
    shipping_phone: "",
  });

  // モーダルが開いたときに初期値をセット
  useEffect(() => {
    if (visible && initialAddress) {
      setForm({
        shipping_name: initialAddress.shipping_name || "",
        shipping_zip: initialAddress.shipping_zip || "",
        shipping_prefecture: initialAddress.shipping_prefecture || "",
        shipping_city: initialAddress.shipping_city || "",
        shipping_address: initialAddress.shipping_address || "",
        shipping_building: initialAddress.shipping_building || "",
        shipping_phone: initialAddress.shipping_phone || "",
      });
    } else if (visible && !initialAddress) {
      setForm({
        shipping_name: "", shipping_zip: "", shipping_prefecture: "",
        shipping_city: "", shipping_address: "", shipping_building: "", shipping_phone: "",
      });
    }
  }, [visible, initialAddress]);

  const handleSubmit = () => {
    if (!form.shipping_name.trim()) {
      Alert.alert("入力エラー", "お名前を入力してください");
      return;
    }
    if (!form.shipping_zip.trim()) {
      Alert.alert("入力エラー", "郵便番号を入力してください");
      return;
    }
    if (!form.shipping_prefecture.trim()) {
      Alert.alert("入力エラー", "都道府県を入力してください");
      return;
    }
    if (!form.shipping_city.trim()) {
      Alert.alert("入力エラー", "市区町村を入力してください");
      return;
    }
    if (!form.shipping_address.trim()) {
      Alert.alert("入力エラー", "番地を入力してください");
      return;
    }
    if (!form.shipping_phone.trim()) {
      Alert.alert("入力エラー", "電話番号を入力してください");
      return;
    }

    onSubmit({
      shipping_name: form.shipping_name.trim(),
      shipping_zip: form.shipping_zip.trim(),
      shipping_prefecture: form.shipping_prefecture.trim(),
      shipping_city: form.shipping_city.trim(),
      shipping_address: form.shipping_address.trim(),
      shipping_building: form.shipping_building.trim() || null,
      shipping_phone: form.shipping_phone.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>配送先を入力</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* 案内 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={C.primary} />
            <Text style={styles.infoText}>
              入力した住所はプロフィールに保存され、{"\n"}次回以降自動入力されます。
            </Text>
          </View>

          {/* お名前 */}
          <Text style={styles.label}>お名前（受取人） <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_name}
            onChangeText={(v) => setForm({ ...form, shipping_name: v })}
            placeholder="山田 太郎"
            placeholderTextColor={C.textSub}
          />

          {/* 郵便番号 */}
          <Text style={styles.label}>郵便番号 <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_zip}
            onChangeText={(v) => setForm({ ...form, shipping_zip: v })}
            placeholder="123-4567"
            placeholderTextColor={C.textSub}
            keyboardType="number-pad"
          />

          {/* 都道府県 */}
          <Text style={styles.label}>都道府県 <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_prefecture}
            onChangeText={(v) => setForm({ ...form, shipping_prefecture: v })}
            placeholder="東京都"
            placeholderTextColor={C.textSub}
          />

          {/* 市区町村 */}
          <Text style={styles.label}>市区町村 <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_city}
            onChangeText={(v) => setForm({ ...form, shipping_city: v })}
            placeholder="渋谷区神宮前"
            placeholderTextColor={C.textSub}
          />

          {/* 番地 */}
          <Text style={styles.label}>番地 <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_address}
            onChangeText={(v) => setForm({ ...form, shipping_address: v })}
            placeholder="1-2-3"
            placeholderTextColor={C.textSub}
          />

          {/* 建物名 */}
          <Text style={styles.label}>建物名・部屋番号</Text>
          <TextInput
            style={styles.input}
            value={form.shipping_building}
            onChangeText={(v) => setForm({ ...form, shipping_building: v })}
            placeholder="○○マンション 101号室"
            placeholderTextColor={C.textSub}
          />

          {/* 電話番号 */}
          <Text style={styles.label}>電話番号 <Text style={styles.required}>*必須</Text></Text>
          <TextInput
            style={styles.input}
            value={form.shipping_phone}
            onChangeText={(v) => setForm({ ...form, shipping_phone: v })}
            placeholder="090-1234-5678"
            placeholderTextColor={C.textSub}
            keyboardType="phone-pad"
          />

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>この住所で交換する</Text>
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
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  submitBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
