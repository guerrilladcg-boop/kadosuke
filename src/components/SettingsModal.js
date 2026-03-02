import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Modal, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { useProfile } from "../hooks/useProfile";
import ProfileImagePicker from "./ProfileImagePicker";
import DisplayNameSwitcher from "./DisplayNameSwitcher";

export default function SettingsModal({ visible, onClose, profile: externalProfile }) {
  const insets = useSafeAreaInsets();
  const { profile, fetchProfile, updateName, updateEmail, uploadAvatar, toggleNotifications, togglePublicProfile, updateDisplayNames, switchDisplayName } = useProfile();
  const [showDisplayNames, setShowDisplayNames] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) fetchProfile();
  }, [visible]);

  const currentProfile = profile || externalProfile;
  const displayName = currentProfile?.name || "";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  const handleImageSelected = async (uri) => {
    setUploading(true);
    const { error } = await uploadAvatar(uri);
    setUploading(false);
    if (error) Alert.alert("エラー", "画像のアップロードに失敗しました");
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const { error } = await updateName(newName);
    if (!error) { setEditingName(false); setNewName(""); }
    else Alert.alert("エラー", "保存に失敗しました");
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) return;
    const { error } = await updateEmail(newEmail.trim());
    if (!error) {
      Alert.alert("確認メール送信", "新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。");
      setEditingEmail(false);
      setNewEmail("");
    } else {
      Alert.alert("エラー", "メールアドレスの変更に失敗しました");
    }
  };

  const handleToggleNotifications = async (value) => {
    const { error } = await toggleNotifications(value);
    if (error) Alert.alert("エラー", "設定の更新に失敗しました");
  };

  const handleTogglePublic = async (value) => {
    const { error } = await togglePublicProfile(value);
    if (error) Alert.alert("エラー", "設定の更新に失敗しました");
  };

  const handleSaveDisplayNames = async (names, activeIdx) => {
    await updateDisplayNames(names);
    await switchDisplayName(activeIdx);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* プロフィールセクション */}
          <Text style={styles.sectionLabel}>プロフィール</Text>
          <View style={styles.section}>
            {/* アバター */}
            <View style={styles.avatarRow}>
              {uploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : (
                <ProfileImagePicker
                  avatarUrl={currentProfile?.avatar_url}
                  initial={initial}
                  size={64}
                  onImageSelected={handleImageSelected}
                />
              )}
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.profileName}>{displayName || "名前未設定"}</Text>
                <Text style={styles.profileSub}>タップして画像を変更</Text>
              </View>
            </View>

            {/* 名前変更 */}
            <TouchableOpacity style={styles.settingItem} onPress={() => { setNewName(displayName); setEditingName(true); }}>
              <Text style={styles.settingLabel}>プロフィール名</Text>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>{displayName || "未設定"}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </View>
            </TouchableOpacity>

            {/* メールアドレス変更 */}
            <TouchableOpacity style={styles.settingItem} onPress={() => { setNewEmail(""); setEditingEmail(true); }}>
              <Text style={styles.settingLabel}>メールアドレス</Text>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText} numberOfLines={1}>{currentProfile?.email || ""}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </View>
            </TouchableOpacity>

            {/* 表示名切り替え */}
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowDisplayNames(true)}>
              <Text style={styles.settingLabel}>表示名の切り替え</Text>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {(currentProfile?.display_names?.length || 0) + 1}件登録
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </View>
            </TouchableOpacity>
          </View>

          {/* 通知設定 */}
          <Text style={styles.sectionLabel}>通知</Text>
          <View style={styles.section}>
            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>プッシュ通知</Text>
                <Text style={styles.settingDesc}>大会のお知らせやリマインダーを受け取る</Text>
              </View>
              <Switch
                value={currentProfile?.push_notifications_enabled ?? true}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: C.primary, false: C.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* プライバシー */}
          <Text style={styles.sectionLabel}>プライバシー</Text>
          <View style={styles.section}>
            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>プロフィール公開</Text>
                <Text style={styles.settingDesc}>他のユーザーにプロフィールを公開する</Text>
              </View>
              <Switch
                value={currentProfile?.is_public ?? true}
                onValueChange={handleTogglePublic}
                trackColor={{ true: C.primary, false: C.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* 名前編集モーダル */}
        <Modal visible={editingName} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.editSheet}>
              <Text style={styles.editTitle}>プロフィール名を変更</Text>
              <TextInput
                style={styles.editInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="名前を入力"
                placeholderTextColor={C.textSub}
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setEditingName(false)} style={styles.editCancelBtn}>
                  <Text style={styles.editCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveName} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* メール編集モーダル */}
        <Modal visible={editingEmail} animationType="fade" transparent>
          <View style={styles.overlay}>
            <View style={styles.editSheet}>
              <Text style={styles.editTitle}>メールアドレスを変更</Text>
              <Text style={styles.editDesc}>新しいメールアドレスに確認メールが送信されます</Text>
              <TextInput
                style={styles.editInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="新しいメールアドレス"
                placeholderTextColor={C.textSub}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setEditingEmail(false)} style={styles.editCancelBtn}>
                  <Text style={styles.editCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEmail} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>変更</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 表示名切り替えモーダル */}
        <DisplayNameSwitcher
          visible={showDisplayNames}
          onClose={() => setShowDisplayNames(false)}
          profile={currentProfile}
          onSave={handleSaveDisplayNames}
        />
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
  sectionLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 8, marginTop: 8 },
  section: { backgroundColor: C.card, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  avatarRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  avatarLoading: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 16, fontWeight: "bold", color: C.text },
  profileSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  settingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  settingLabel: { fontSize: 15, color: C.text },
  settingDesc: { fontSize: 12, color: C.textSub, marginTop: 2 },
  settingValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingValueText: { fontSize: 14, color: C.textSub, maxWidth: 160 },
  toggleItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  editSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%" },
  editTitle: { fontSize: 16, fontWeight: "bold", color: C.text, marginBottom: 8 },
  editDesc: { fontSize: 13, color: C.textSub, marginBottom: 12 },
  editInput: { backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  editCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  editCancelText: { fontSize: 14, color: C.textSub },
  editSaveBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  editSaveText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
