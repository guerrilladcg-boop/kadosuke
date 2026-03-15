import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from "react-native";
import { C } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_ICONS = {
  tournament: "⚔️",
  result: "🏅",
  login: "📅",
  social: "👥",
  engagement: "🎬",
};

export default function MissionAchievedModal({
  visible,
  onClose,
  onClaim,
  mission,
}) {
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // アニメーション値
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const pointsFloat = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;

  const resetAll = () => {
    setClaimed(false);
    setClaiming(false);
    overlayOpacity.setValue(0);
    cardScale.setValue(0.5);
    cardOpacity.setValue(0);
    iconBounce.setValue(0);
    pointsFloat.setValue(0);
    pointsOpacity.setValue(0);
  };

  useEffect(() => {
    if (visible && mission) {
      resetAll();
      // フェードイン + カードスプリング
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // アイコンバウンス
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconBounce, {
            toValue: -8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(iconBounce, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      resetAll();
    }
  }, [visible, mission?.id]);

  const handleClaim = async () => {
    if (claiming || claimed || !mission) return;
    setClaiming(true);

    const result = await onClaim(mission.id);
    setClaiming(false);

    if (result?.error) return;

    setClaimed(true);

    // ポイント浮き上がりアニメーション
    Animated.parallel([
      Animated.timing(pointsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pointsFloat, {
        toValue: -40,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(pointsOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2秒後に自動で閉じる
    setTimeout(() => handleClose(), 2200);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetAll();
      onClose();
    });
  };

  if (!visible || !mission) return null;

  const categoryIcon = CATEGORY_ICONS[mission.category] || "🏆";

  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* アイコン */}
          <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
            <Text style={styles.icon}>🏆</Text>
          </Animated.View>

          {/* タイトル */}
          <Text style={styles.title}>ミッション達成！</Text>

          {/* ミッション名 */}
          <View style={styles.missionNameBox}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <Text style={styles.missionLabel}>{mission.label}</Text>
          </View>

          {/* 説明 */}
          <Text style={styles.missionDesc}>{mission.desc}</Text>

          {/* ポイント表示 */}
          <View style={styles.pointsBox}>
            <Text style={styles.pointsValue}>+{mission.reward}</Text>
            <Text style={styles.pointsUnit}>pt</Text>
          </View>

          {/* 浮き上がるポイント */}
          {claimed && (
            <Animated.Text
              style={[
                styles.floatingPoints,
                {
                  transform: [{ translateY: pointsFloat }],
                  opacity: pointsOpacity,
                },
              ]}
            >
              +{mission.reward}pt
            </Animated.Text>
          )}

          {/* ボタン */}
          {!claimed ? (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={handleClaim}
              disabled={claiming}
              activeOpacity={0.8}
            >
              <Text style={styles.claimBtnText}>
                {claiming ? "受け取り中..." : "受け取る"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.claimedContainer}>
              <Text style={styles.claimedText}>✅ 受け取りました！</Text>
            </View>
          )}

          {/* 閉じるリンク */}
          {!claimed && (
            <TouchableOpacity onPress={handleClose} style={styles.skipLink}>
              <Text style={styles.skipText}>あとで</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    width: SCREEN_WIDTH * 0.82,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#B8860B",
    marginBottom: 12,
  },
  missionNameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  missionLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.text,
  },
  missionDesc: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 16,
    textAlign: "center",
  },
  pointsBox: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FFF5F0",
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFD6C4",
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: C.primary,
  },
  pointsUnit: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.primary,
    marginLeft: 4,
  },
  floatingPoints: {
    position: "absolute",
    top: "40%",
    fontSize: 28,
    fontWeight: "bold",
    color: C.primary,
    textShadowColor: "rgba(232,93,38,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  claimBtn: {
    backgroundColor: "#DAA520",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginTop: 8,
    elevation: 3,
    shadowColor: "#DAA520",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  claimBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  claimedContainer: {
    marginTop: 8,
    paddingVertical: 12,
  },
  claimedText: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.success,
  },
  skipLink: {
    marginTop: 14,
    padding: 4,
  },
  skipText: {
    fontSize: 13,
    color: C.textSub,
  },
});
