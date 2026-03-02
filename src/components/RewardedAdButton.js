import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { POINTS_PER_AD } from "../constants/adConfig";

export default function RewardedAdButton({ canWatchAd, remainingViews, adLoading, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="videocam" size={20} color={C.primary} />
        <Text style={styles.title}>動画を見てポイントGET!</Text>
      </View>

      <Text style={styles.desc}>
        動画広告を視聴すると {POINTS_PER_AD}pt 獲得できます
      </Text>

      <TouchableOpacity
        style={[styles.watchBtn, !canWatchAd && styles.watchBtnDisabled]}
        onPress={onPress}
        disabled={!canWatchAd || adLoading}
        activeOpacity={0.7}
      >
        {adLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.watchBtnText}>
              {canWatchAd ? `動画を見て ${POINTS_PER_AD}pt GET!` : "本日の上限に達しました"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.remaining}>
        {canWatchAd
          ? `本日残り ${remainingViews} 回`
          : "明日またご利用ください"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "bold", color: C.text },
  desc: { fontSize: 13, color: C.textSub, marginBottom: 12 },
  watchBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  watchBtnDisabled: { backgroundColor: C.textSub },
  watchBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  remaining: { fontSize: 12, color: C.textSub, textAlign: "center", marginTop: 8 },
});
