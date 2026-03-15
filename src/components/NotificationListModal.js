import React from "react";
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";

const TYPE_CONFIG = {
  tournament_reminder: { icon: "trophy-outline", color: C.primary },
  new_tournament_by_followed: { icon: "heart-outline", color: "#EF4444" },
  sponsor_item: { icon: "gift-outline", color: "#D97706" },
  system: { icon: "information-circle-outline", color: C.textSub },
};

const getTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
};

export default function NotificationListModal({
  visible,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationPress,
}) {
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
        activeOpacity={0.7}
        onPress={() => {
          if (!item.is_read) onMarkAsRead(item.id);
          if (onNotificationPress) onNotificationPress(item);
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: config.color + "15" }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancel}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>通知</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Text style={[styles.markAllRead, unreadCount === 0 && { color: C.border }]}>
              すべて既読
            </Text>
          </TouchableOpacity>
        </View>

        {/* 通知リスト */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={C.border} />
              <Text style={styles.emptyText}>通知はありません</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  headerBtn: { width: 80 },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: C.text },
  cancel: { fontSize: 15, color: C.primary },
  markAllRead: { fontSize: 13, color: C.primary, textAlign: "right" },
  // 通知アイテム
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  notifItemUnread: { backgroundColor: C.primary + "08" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 2 },
  notifBody: { fontSize: 13, color: C.textSub, lineHeight: 18 },
  notifTime: { fontSize: 11, color: C.textSub, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
    marginLeft: 8,
  },
  // 空状態
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: C.textSub },
});
