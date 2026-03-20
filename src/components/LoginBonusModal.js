import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from "react-native";
import { C } from "../constants/theme";
import { hapticSuccess } from "../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PARTICLE_COLORS = ["#FFD700", "#FF6B6B", C.primary, "#4CAF50", "#FF9800", "#E040FB"];

export default function LoginBonusModal({
  visible,
  onClose,
  onClaim,
  totalDays,
  bonusPoints,
  isMilestone,
}) {
  const [claimed, setClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [claiming, setClaiming] = useState(false);

  // アニメーション値
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const pointsFloat = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;
  const shineRotate = useRef(new Animated.Value(0)).current;

  // マイルストーン用パーティクル
  const particles = useRef(
    Array.from({ length: 16 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  // リセット
  const resetAll = () => {
    setClaimed(false);
    setClaimResult(null);
    setClaiming(false);
    overlayOpacity.setValue(0);
    cardScale.setValue(0.5);
    cardOpacity.setValue(0);
    iconBounce.setValue(0);
    pointsFloat.setValue(0);
    pointsOpacity.setValue(0);
    shineRotate.setValue(0);
    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });
  };

  // モーダル表示時のアニメーション
  useEffect(() => {
    if (visible) {
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

      // アイコンバウンス（ループ）
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

      // 輝きの回転（マイルストーン時）
      Animated.loop(
        Animated.timing(shineRotate, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      resetAll();
    }
  }, [visible]);

  const handleClaim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);

    const result = await onClaim();
    setClaiming(false);

    if (result?.error) {
      return;
    }

    setClaimed(true);
    setClaimResult(result);
    hapticSuccess();

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

    // マイルストーン時のパーティクル
    if (result?.isMilestone) {
      fireParticles();
    }

    // 2秒後に自動で閉じる
    setTimeout(() => {
      handleClose();
    }, 2200);
  };

  const fireParticles = () => {
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = 100 + Math.random() * 80;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 30;

      p.opacity.setValue(1);
      p.scale.setValue(0);
      p.x.setValue(0);
      p.y.setValue(0);

      Animated.parallel([
        Animated.timing(p.x, { toValue: targetX, duration: 900, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: targetY, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    });
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

  if (!visible) return null;

  const displayPoints = claimResult?.points || bonusPoints || 10;
  const displayMilestone = claimResult?.isMilestone ?? isMilestone;
  const displayTotalDays = claimResult?.totalDays || (totalDays + 1);

  const spinInterpolate = shineRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            displayMilestone && styles.cardMilestone,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* マイルストーン時の輝きリング */}
          {displayMilestone && (
            <Animated.View
              style={[
                styles.shineRing,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
              pointerEvents="none"
            >
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <View
                  key={deg}
                  style={[
                    styles.shineDot,
                    { transform: [{ rotate: `${deg}deg` }, { translateY: -70 }] },
                  ]}
                />
              ))}
            </Animated.View>
          )}

          {/* アイコン */}
          <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
            <Text style={styles.icon}>{displayMilestone ? "🏆" : "🎁"}</Text>
          </Animated.View>

          {/* タイトル */}
          <Text style={[styles.title, displayMilestone && styles.titleMilestone]}>
            {displayMilestone ? "🎉 マイルストーン達成！" : "ログインボーナス！"}
          </Text>

          {/* 通算日数 */}
          <Text style={styles.daysText}>
            通算 <Text style={styles.daysNumber}>{displayTotalDays}</Text> 日目
          </Text>

          {/* ポイント表示 */}
          <View style={[styles.pointsBox, displayMilestone && styles.pointsBoxMilestone]}>
            <Text style={[styles.pointsValue, displayMilestone && styles.pointsValueMilestone]}>
              +{displayPoints}
            </Text>
            <Text style={[styles.pointsUnit, displayMilestone && styles.pointsUnitMilestone]}>
              pt
            </Text>
          </View>

          {/* マイルストーン説明 */}
          {displayMilestone && (
            <Text style={styles.milestoneDesc}>
              🎊 {displayTotalDays}日目の特別ボーナス！
            </Text>
          )}

          {/* 浮き上がるポイント表示 */}
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
              +{displayPoints}pt
            </Animated.Text>
          )}

          {/* ボタン */}
          {!claimed ? (
            <TouchableOpacity
              style={[styles.claimBtn, displayMilestone && styles.claimBtnMilestone]}
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

        {/* パーティクル */}
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.particle,
              {
                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        ))}
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
  },
  cardMilestone: {
    backgroundColor: "#FFFDF0",
    borderWidth: 2,
    borderColor: "#FFD700",
  },

  // 輝きリング
  shineRing: {
    position: "absolute",
    top: 20,
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  shineDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
    opacity: 0.6,
  },

  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.text,
    marginBottom: 4,
  },
  titleMilestone: {
    color: "#B8860B",
  },
  daysText: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 16,
  },
  daysNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.primary,
  },

  // ポイント表示
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
  pointsBoxMilestone: {
    backgroundColor: "#FFF8E1",
    borderColor: "#FFD700",
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: C.primary,
  },
  pointsValueMilestone: {
    color: "#B8860B",
    fontSize: 42,
  },
  pointsUnit: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.primary,
    marginLeft: 4,
  },
  pointsUnitMilestone: {
    color: "#B8860B",
  },

  milestoneDesc: {
    fontSize: 14,
    color: "#B8860B",
    fontWeight: "600",
    marginBottom: 8,
  },

  // 浮き上がるポイント
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

  // ボタン
  claimBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginTop: 8,
    elevation: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  claimBtnMilestone: {
    backgroundColor: "#DAA520",
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

  // パーティクル
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    top: "50%",
    left: "50%",
    marginLeft: -5,
    marginTop: -5,
  },
});
