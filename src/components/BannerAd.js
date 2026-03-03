import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

/**
 * バナー広告コンポーネント
 * Expo Go ではネイティブ AdMob が使えないためモック広告を表示
 * 本番ビルド時は react-native-google-mobile-ads を使用
 */
export default function BannerAd({ isPremium, onPremiumPress }) {
  // プレミアムユーザーには広告を表示しない
  if (isPremium) return null;

  return (
    <View style={styles.container}>
      {/* モック広告エリア（本番では GoogleBanner に差し替え） */}
      <View style={styles.adBanner}>
        <View style={styles.adLabelWrap}>
          <Text style={styles.adLabel}>AD</Text>
        </View>
        <View style={styles.adContent}>
          <Text style={styles.adTitle}>カドスケ！ プレミアム</Text>
          <Text style={styles.adDesc}>広告なしで快適にプレイ</Text>
        </View>
        <Ionicons name="megaphone-outline" size={20} color="#999" />
      </View>
      {/* 広告非表示の導線 */}
      {onPremiumPress && (
        <TouchableOpacity style={styles.removeAdBtn} onPress={onPremiumPress}>
          <Ionicons name="star" size={12} color="#D4A017" />
          <Text style={styles.removeAdText}>広告を非表示にする</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8F8F8",
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  adBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  adLabelWrap: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  adLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#888",
  },
  adContent: {
    flex: 1,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  adDesc: {
    fontSize: 11,
    color: "#999",
    marginTop: 1,
  },
  removeAdBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 6,
    paddingTop: 2,
  },
  removeAdText: {
    fontSize: 11,
    color: "#D4A017",
    fontWeight: "bold",
  },
});
