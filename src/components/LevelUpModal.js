import React, { useRef, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from "react-native";
import { C } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LevelUpModal({ visible, onClose, levelUp }) {
  // levelUp: { oldLevel, newLevel, oldTitle, newTitle }

  // アニメーション値
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const starSpin = useRef(new Animated.Value(0)).current;
  const levelScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const resetAll = () => {
    overlayOpacity.setValue(0);
    cardScale.setValue(0.5);
    cardOpacity.setValue(0);
    starSpin.setValue(0);
    levelScale.setValue(0);
    titleOpacity.setValue(0);
  };

  useEffect(() => {
    if (visible && levelUp) {
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

      // 星キラキラ回転
      Animated.loop(
        Animated.timing(starSpin, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // レベル数字ポップイン
      Animated.spring(levelScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        delay: 500,
        useNativeDriver: true,
      }).start();

      // 称号フェードイン
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 800,
        useNativeDriver: true,
      }).start();
    } else {
      resetAll();
    }
  }, [visible, levelUp?.newLevel]);

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

  if (!visible || !levelUp) return null;

  const spinRotation = starSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const titleChanged = levelUp.oldTitle !== levelUp.newTitle;

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
          {/* 星アイコン */}
          <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
            <Text style={styles.icon}>⭐</Text>
          </Animated.View>

          {/* タイトル */}
          <Text style={styles.title}>レベルアップ！</Text>

          {/* レベル表示 */}
          <Animated.View style={[styles.levelBox, { transform: [{ scale: levelScale }] }]}>
            <Text style={styles.levelFrom}>Lv.{levelUp.oldLevel}</Text>
            <Text style={styles.levelArrow}>→</Text>
            <Text style={styles.levelTo}>Lv.{levelUp.newLevel}</Text>
          </Animated.View>

          {/* 称号表示 */}
          <Animated.View style={[styles.titleBox, { opacity: titleOpacity }]}>
            {titleChanged ? (
              <>
                <Text style={styles.titleLabel}>新しい称号</Text>
                <View style={styles.titleBadge}>
                  <Text style={styles.titleText}>{levelUp.newTitle}</Text>
                </View>
              </>
            ) : (
              <View style={styles.titleBadge}>
                <Text style={styles.titleText}>{levelUp.newTitle}</Text>
              </View>
            )}
          </Animated.View>

          {/* OKボタン */}
          <TouchableOpacity
            style={styles.okBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.okBtnText}>OK</Text>
          </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#B8860B",
    marginBottom: 20,
  },
  levelBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  levelFrom: {
    fontSize: 24,
    fontWeight: "bold",
    color: C.textSub,
  },
  levelArrow: {
    fontSize: 24,
    color: "#FFD700",
    fontWeight: "bold",
  },
  levelTo: {
    fontSize: 36,
    fontWeight: "bold",
    color: C.primary,
  },
  titleBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleLabel: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 6,
  },
  titleBadge: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#B8860B",
  },
  okBtn: {
    backgroundColor: "#DAA520",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 60,
    marginTop: 4,
    elevation: 3,
    shadowColor: "#DAA520",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  okBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
