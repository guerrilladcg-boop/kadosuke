import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useOrganizerReviews } from "../hooks/useOrganizerReviews";

export default function OrganizerReviewModal({ visible, onClose, organizerId, tournamentId, organizerName }) {
  const { reviews, loading, fetchReviews, submitReview, deleteReview } = useOrganizerReviews();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && organizerId) {
      fetchReviews(organizerId);
      setRating(0);
      setComment("");
    }
  }, [visible, organizerId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("エラー", "評価を選択してください");
      return;
    }
    setSubmitting(true);
    const { error } = await submitReview(organizerId, tournamentId, rating, comment);
    setSubmitting(false);
    if (error) {
      Alert.alert("エラー", "投稿に失敗しました");
    } else {
      Alert.alert("完了", "レビューを投稿しました");
      setRating(0);
      setComment("");
    }
  };

  const handleDelete = (review) => {
    Alert.alert("レビュー削除", "このレビューを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => deleteReview(review.id, organizerId) },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>レビュー</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* 主催者名 */}
          <Text style={styles.organizerName}>{organizerName || "主催者"}のレビュー</Text>

          {/* レビュー投稿フォーム */}
          {tournamentId && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>評価を投稿</Text>
              {/* 星評価 */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} style={styles.starBtn}>
                    <Ionicons
                      name={n <= rating ? "star" : "star-outline"}
                      size={32}
                      color={n <= rating ? "#FFD700" : C.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {/* コメント */}
              <TextInput
                style={styles.commentInput}
                placeholder="コメント（任意・200文字以内）"
                placeholderTextColor={C.textSub}
                value={comment}
                onChangeText={(t) => setComment(t.slice(0, 200))}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.submitBtn, rating === 0 && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>投稿する</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* レビュー一覧 */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : reviews.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={C.border} />
              <Text style={styles.emptyText}>まだレビューがありません</Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{r.reviewer?.name || "匿名"}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= r.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(r.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  headerBtn: { width: 40, alignItems: "center" },
  body: { flex: 1, padding: 16 },
  organizerName: { fontSize: 18, fontWeight: "bold", color: C.text, marginBottom: 16 },

  // Form
  formCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 20 },
  formTitle: { fontSize: 14, fontWeight: "bold", color: C.textSub, marginBottom: 12 },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  starBtn: { padding: 4 },
  commentInput: {
    backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 14, color: C.text,
    borderWidth: 1, borderColor: C.border, height: 80, textAlignVertical: "top", marginBottom: 12,
  },
  submitBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  // Empty
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: C.textSub },

  // Review cards
  reviewCard: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  reviewerName: { fontSize: 13, fontWeight: "bold", color: C.text },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewDate: { fontSize: 11, color: C.textSub, marginLeft: "auto" },
  reviewComment: { fontSize: 13, color: C.text, lineHeight: 20 },
});
