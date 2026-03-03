import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions,
} from "react-native";
import { C } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 3;
const STRIP_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const STRIP_REPETITIONS = 8;

const PARTICLE_COLORS = [C.primary, "#FFD700", "#FF6B6B", "#4CAF50", "#2196F3", "#FF9800"];

export default function RouletteModal({ visible, prizes, result, pointCost, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | spinning | decelerating | revealing | result
  const spinY = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.5)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titlePulse = useRef(new Animated.Value(1)).current;

  // パーティクル（当たり演出用）
  const particles = useRef(
    Array.from({ length: 24 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  const spinLoopRef = useRef(null);
  const displayPrizes = prizes.length > 0 ? prizes : [{ id: "empty", icon: "❓", name: "---" }];

  // リセット
  const resetAnimation = useCallback(() => {
    setPhase("idle");
    spinY.setValue(0);
    flashOpacity.setValue(0);
    resultScale.setValue(0.5);
    resultOpacity.setValue(0);
    overlayOpacity.setValue(0);
    titlePulse.setValue(1);
    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });
  }, [spinY, flashOpacity, resultScale, resultOpacity, overlayOpacity, titlePulse, particles]);

  // モーダル表示時にアニメーション開始
  useEffect(() => {
    if (visible && result) {
      resetAnimation();
      // フェードイン
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        startSpinning();
      });
    } else if (!visible) {
      resetAnimation();
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
    }
  }, [visible, result]);

  // フェーズ1: 高速回転
  const startSpinning = () => {
    setPhase("spinning");

    // タイトルパルスアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulse, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.timing(titlePulse, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])
    ).start();

    const totalStripHeight = ITEM_HEIGHT * displayPrizes.length;

    spinLoopRef.current = Animated.loop(
      Animated.timing(spinY, {
        toValue: -totalStripHeight,
        duration: 150,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoopRef.current.start();

    // 1.5秒後に減速フェーズへ
    setTimeout(() => {
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
      startDeceleration();
    }, 1500);
  };

  // フェーズ2: 減速 → 当選景品で停止
  const startDeceleration = () => {
    setPhase("decelerating");

    const targetIndex = displayPrizes.findIndex((p) => p.id === result?.prize?.id);
    const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;

    // 何周か回してから止まる（煽り感UP）
    const extraSpins = STRIP_REPETITIONS - 2;
    const totalStripHeight = ITEM_HEIGHT * displayPrizes.length;
    const targetY = -(extraSpins * totalStripHeight + resolvedIndex * ITEM_HEIGHT);

    spinY.setValue(0);

    Animated.timing(spinY, {
      toValue: targetY,
      duration: 2500,
      easing: Easing.bezier(0.15, 0.85, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      startReveal();
    });
  };

  // フェーズ3: フラッシュ → 結果表示
  const startReveal = () => {
    setPhase("revealing");

    Animated.sequence([
      // 白フラッシュ
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase("result");

      // 結果カードのスプリングアニメーション
      Animated.parallel([
        Animated.spring(resultScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 当たりならパーティクル発射
      if (result?.isWin) {
        startCelebration();
      }
    });
  };

  // 当たり演出: パーティクル爆発
  const startCelebration = () => {
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 120 + Math.random() * 100;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 50;
      const delay = Math.random() * 200;

      p.opacity.setValue(1);
      p.scale.setValue(0);
      p.x.setValue(0);
      p.y.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.x, { toValue: targetX, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: targetY, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 0.6, duration: 300, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    // 2回目の波
    setTimeout(() => {
      particles.forEach((p, i) => {
        if (i % 3 !== 0) return;
        const angle = (i / particles.length) * Math.PI * 2 + Math.random();
        const distance = 80 + Math.random() * 60;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        p.opacity.setValue(1);
        p.scale.setValue(0);
        p.x.setValue(0);
        p.y.setValue(0);

        Animated.parallel([
          Animated.timing(p.x, { toValue: targetX, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: targetY, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }, 500);
  };

  const handleClose = () => {
    if (spinLoopRef.current) {
      spinLoopRef.current.stop();
      spinLoopRef.current = null;
    }
    resetAnimation();
    onClose();
  };

  // ストリップ行をレンダリング
  const renderStripItems = () => {
    const items = [];
    for (let rep = 0; rep < STRIP_REPETITIONS; rep++) {
      displayPrizes.forEach((prize, idx) => {
        items.push(
          <View key={`${rep}-${idx}`} style={styles.stripItem}>
            <Text style={styles.stripIcon}>{prize.icon}</Text>
            <Text style={styles.stripName} numberOfLines={1}>{prize.name}</Text>
          </View>
        );
      });
    }
    return items;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* タイトル */}
        <Animated.View style={[styles.titleContainer, { transform: [{ scale: titlePulse }] }]}>
          <Text style={styles.title}>🎰 即時抽選チャレンジ</Text>
          <Text style={styles.subtitle}>{pointCost}pt 消費</Text>
        </Animated.View>

        {/* ルーレットストリップ（結果表示前） */}
        {phase !== "result" && (
          <View style={styles.stripContainer}>
            {/* 中央ハイライト枠 */}
            <View style={styles.centerHighlight} pointerEvents="none" />
            {/* 上部グラデーション風 */}
            <View style={styles.stripFadeTop} pointerEvents="none" />
            <View style={styles.stripFadeBottom} pointerEvents="none" />

            <Animated.View
              style={[
                styles.stripWrapper,
                { transform: [{ translateY: Animated.modulo(spinY, -(ITEM_HEIGHT * displayPrizes.length)) }] },
              ]}
            >
              {renderStripItems()}
            </Animated.View>
          </View>
        )}

        {/* フラッシュエフェクト */}
        <Animated.View
          style={[styles.flash, { opacity: flashOpacity }]}
          pointerEvents="none"
        />

        {/* 結果表示 */}
        {phase === "result" && result && (
          <Animated.View
            style={[
              styles.resultContainer,
              {
                transform: [{ scale: resultScale }],
                opacity: resultOpacity,
              },
            ]}
          >
            {result.isWin ? (
              <>
                <Text style={styles.winLabel}>🎉 大当たり！</Text>
                <Text style={styles.resultIcon}>{result.prize?.icon || "🎁"}</Text>
                <Text style={styles.resultName}>{result.prize?.name || "景品"}</Text>
                {result.prize?.description && (
                  <Text style={styles.resultDesc}>{result.prize.description}</Text>
                )}
                <Text style={styles.winMessage}>おめでとうございます！</Text>
              </>
            ) : (
              <>
                <Text style={styles.loseLabel}>残念...</Text>
                <Text style={styles.resultIcon}>{result.prize?.icon || "💨"}</Text>
                <Text style={styles.resultName}>{result.prize?.name || "はずれ"}</Text>
                {result.pointsRefunded > 0 && (
                  <Text style={styles.refundText}>
                    🔄 {result.pointsRefunded}pt 還元されました！
                  </Text>
                )}
                <Text style={styles.loseMessage}>また挑戦してね！</Text>
              </>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>閉じる</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

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

        {/* 回転中のキャンセルはなし（結果表示まで待つ） */}
        {phase === "idle" && (
          <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#aaa",
    marginTop: 6,
  },

  // ルーレットストリップ
  stripContainer: {
    width: SCREEN_WIDTH * 0.75,
    height: STRIP_HEIGHT,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: "#fff",
    position: "relative",
  },
  stripWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  stripItem: {
    height: ITEM_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  stripIcon: {
    fontSize: 26,
  },
  stripName: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.text,
    maxWidth: "70%",
  },
  centerHighlight: {
    position: "absolute",
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: "rgba(232, 93, 38, 0.08)",
    zIndex: 10,
    borderRadius: 4,
  },
  stripFadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.6,
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 5,
  },
  stripFadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.6,
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 5,
  },

  // フラッシュ
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 20,
  },

  // 結果表示
  resultContainer: {
    alignItems: "center",
    backgroundColor: "rgba(30,30,50,0.95)",
    borderRadius: 24,
    padding: 32,
    width: SCREEN_WIDTH * 0.8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  winLabel: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 16,
    textShadowColor: "rgba(255,215,0,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  loseLabel: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#aaa",
    marginBottom: 16,
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 8,
  },
  winMessage: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "600",
    marginTop: 4,
  },
  loseMessage: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  refundText: {
    fontSize: 15,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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

  // キャンセル
  cancelLink: {
    marginTop: 30,
  },
  cancelText: {
    fontSize: 15,
    color: "#888",
  },
});
