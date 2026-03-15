import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { C } from "../constants/theme";

// --- Optional haptics (Expo Go compatible) ---
let Haptics = null;
try {
  Haptics = require("expo-haptics");
} catch (_) {
  // expo-haptics not available, haptic feedback will be silently skipped
}

const haptic = {
  tick: () => {
    try {
      Haptics?.selectionAsync();
    } catch (_) {}
  },
  medium: () => {
    try {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  },
  heavy: () => {
    try {
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
  },
  success: () => {
    try {
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  },
  warning: () => {
    try {
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
  },
};

// --- Constants ---
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 3;
const STRIP_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const STRIP_REPETITIONS = 10;

const PARTICLE_COLORS = [
  "#FFD700",
  "#FF3B3B",
  C.primary,
  "#FF69B4",
  "#00E5FF",
  "#4CAF50",
  "#E040FB",
  "#2196F3",
];

const PARTICLE_COUNT = 50;

const SAFETY_TIMEOUT_MS = 12000;

export default function RouletteModal({
  visible,
  prizes,
  result,
  pointCost,
  onClose,
}) {
  // Phase: idle | spinning | decelerating | reach | revealing | result
  const [phase, setPhase] = useState("idle");

  // =========================================================
  // Animated values
  // =========================================================

  // --- Native-driven (opacity, transform) ---
  const spinY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const titlePulse = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const goldenFlashOpacity = useRef(new Animated.Value(0)).current;
  const reachTextOpacity = useRef(new Animated.Value(0)).current;
  const reachTextScale = useRef(new Animated.Value(0.3)).current;
  const confirmTextOpacity = useRef(new Animated.Value(0)).current;
  const confirmTextScale = useRef(new Animated.Value(0.3)).current;
  const resultScale = useRef(new Animated.Value(0.5)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const goldenGlowOpacity = useRef(new Animated.Value(0)).current;
  const resultBorderAnim = useRef(new Animated.Value(0)).current;

  // --- Particles (all native-driven) ---
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      size: 6 + Math.random() * 8, // 6-14px, computed once
      colorIndex: i % PARTICLE_COLORS.length,
    }))
  ).current;

  // =========================================================
  // Refs for loops, timers, and intervals
  // =========================================================
  const spinLoopRef = useRef(null);
  const titleLoopRef = useRef(null);
  const borderLoopRef = useRef(null);
  const glowLoopRef = useRef(null);
  const safetyTimerRef = useRef(null);
  const timerRefs = useRef([]);
  const intervalRefs = useRef([]);

  // =========================================================
  // Derived data
  // =========================================================
  const displayPrizes = useMemo(
    () =>
      prizes && prizes.length > 0
        ? prizes
        : [{ id: "empty", icon: "?", name: "---" }],
    [prizes]
  );

  // =========================================================
  // Timer/interval management helpers
  // =========================================================
  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timerRefs.current.push(id);
    return id;
  }, []);

  const addInterval = useCallback((fn, delay) => {
    const id = setInterval(fn, delay);
    intervalRefs.current.push(id);
    return id;
  }, []);

  // =========================================================
  // Stop all animations, timers, and intervals
  // =========================================================
  const stopAllAnimations = useCallback(() => {
    // Stop all loop refs
    const loopRefs = [
      spinLoopRef,
      titleLoopRef,
      borderLoopRef,
      glowLoopRef,
    ];
    loopRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.stop();
        ref.current = null;
      }
    });

    // Clear safety timer
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    // Clear all scheduled timers
    timerRefs.current.forEach((id) => clearTimeout(id));
    timerRefs.current = [];

    // Clear all intervals
    intervalRefs.current.forEach((id) => clearInterval(id));
    intervalRefs.current = [];
  }, []);

  // =========================================================
  // Reset all animated values to initial state
  // =========================================================
  const resetAnimation = useCallback(() => {
    stopAllAnimations();
    setPhase("idle");

    spinY.setValue(0);
    overlayOpacity.setValue(0);
    titlePulse.setValue(1);
    shakeX.setValue(0);
    flashOpacity.setValue(0);
    goldenFlashOpacity.setValue(0);
    reachTextOpacity.setValue(0);
    reachTextScale.setValue(0.3);
    confirmTextOpacity.setValue(0);
    confirmTextScale.setValue(0.3);
    resultScale.setValue(0.5);
    resultOpacity.setValue(0);
    goldenGlowOpacity.setValue(0);
    resultBorderAnim.setValue(0);

    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });
  }, [
    stopAllAnimations,
    spinY,
    overlayOpacity,
    titlePulse,
    shakeX,
    flashOpacity,
    goldenFlashOpacity,
    reachTextOpacity,
    reachTextScale,
    confirmTextOpacity,
    confirmTextScale,
    resultScale,
    resultOpacity,
    goldenGlowOpacity,
    resultBorderAnim,
    particles,
  ]);

  // =========================================================
  // Compute target Y for reel stop position
  // =========================================================
  const computeTargetY = useCallback(
    (resolvedIndex, repOffset = 0) => {
      const targetRep = STRIP_REPETITIONS - 2 + repOffset;
      const targetItemPosition =
        (targetRep * displayPrizes.length + resolvedIndex) * ITEM_HEIGHT;
      return -(targetItemPosition - ITEM_HEIGHT);
    },
    [displayPrizes.length]
  );

  // =========================================================
  // Particle wave launcher (non-memoized, called only internally)
  // =========================================================
  const launchParticleWave = (startIdx, count, baseDelay) => {
    const endIdx = Math.min(startIdx + count, particles.length);
    for (let i = startIdx; i < endIdx; i++) {
      const p = particles[i];
      const angle =
        (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const distance = 80 + Math.random() * 100;
      const targetX = Math.cos(angle) * distance;
      const targetPY = Math.sin(angle) * distance - 30;
      const delay = baseDelay + Math.random() * 200;

      p.opacity.setValue(1);
      p.scale.setValue(0);
      p.x.setValue(0);
      p.y.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: targetX,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: targetPY,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.scale, {
              toValue: 1.5,
              duration: 200,
              easing: Easing.out(Easing.back(2)),
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 0.8,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }
  };

  // =========================================================
  // Celebration: 3 particle waves
  // =========================================================
  const startCelebration = () => {
    launchParticleWave(0, PARTICLE_COUNT, 0);
    addTimer(() => launchParticleWave(0, 30, 0), 500);
    addTimer(() => launchParticleWave(0, 20, 0), 1000);
  };

  // =========================================================
  // Result border rainbow loop (non-native)
  // =========================================================
  const startResultBorderLoop = () => {
    borderLoopRef.current = Animated.loop(
      Animated.timing(resultBorderAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    borderLoopRef.current.start();
  };

  // =========================================================
  // Golden glow pulse loop (native)
  // =========================================================
  const startGoldenGlowLoop = () => {
    glowLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(goldenGlowOpacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(goldenGlowOpacity, {
          toValue: 0.15,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoopRef.current.start();
  };

  // =========================================================
  // PHASE 5: Show result
  // =========================================================
  const showResult = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    setPhase("result");

    Animated.parallel([
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    if (result?.isWin) {
      startCelebration();
      startResultBorderLoop();
      startGoldenGlowLoop();
    }
  };

  // =========================================================
  // PHASE 4: Reveal (flash)
  // =========================================================
  const startReveal = () => {
    setPhase("revealing");

    // Stop title pulse
    if (titleLoopRef.current) {
      titleLoopRef.current.stop();
      titleLoopRef.current = null;
    }

    const isWin = result?.isWin;

    if (isWin) {
      haptic.success();

      Animated.sequence([
        Animated.parallel([
          Animated.timing(goldenFlashOpacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(shakeX, {
              toValue: 9,
              duration: 25,
              useNativeDriver: true,
            }),
            Animated.timing(shakeX, {
              toValue: -9,
              duration: 25,
              useNativeDriver: true,
            }),
            Animated.timing(shakeX, {
              toValue: 7,
              duration: 25,
              useNativeDriver: true,
            }),
            Animated.timing(shakeX, {
              toValue: -7,
              duration: 25,
              useNativeDriver: true,
            }),
            Animated.timing(shakeX, {
              toValue: 0,
              duration: 25,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(goldenFlashOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => {
        shakeX.setValue(0);
        showResult();
      });
    } else {
      haptic.warning();

      Animated.sequence([
        Animated.timing(flashOpacity, {
          toValue: 0.9,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        showResult();
      });
    }
  };

  // =========================================================
  // "確定!!!" text explosion
  // =========================================================
  const showConfirmText = () => {
    haptic.heavy();
    addTimer(() => haptic.heavy(), 120);
    addTimer(() => haptic.heavy(), 240);

    Animated.parallel([
      Animated.spring(confirmTextScale, {
        toValue: 1,
        friction: 3,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.timing(confirmTextOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Heavy screen shake (4 iterations)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, {
          toValue: 7,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -7,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 6,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -6,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: 30,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    ).start();

    addTimer(() => {
      Animated.timing(confirmTextOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      shakeX.setValue(0);
      startReveal();
    }, 900);
  };

  // =========================================================
  // PHASE 3: REACH (WIN only, ~2.5s)
  // =========================================================
  const startReach = (resolvedIndex) => {
    setPhase("reach");

    haptic.heavy();

    // "リーチ!?" text with spring
    Animated.parallel([
      Animated.spring(reachTextScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(reachTextOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Light screen shake
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 5,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -5,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 3,
        duration: 35,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -3,
        duration: 35,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 30,
        useNativeDriver: true,
      }),
    ]).start();

    // Dramatic pause (600ms), then creep back
    addTimer(() => {
      haptic.heavy();

      Animated.timing(reachTextOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const finalY = computeTargetY(resolvedIndex);
      Animated.timing(spinY, {
        toValue: finalY,
        duration: 1400,
        easing: Easing.bezier(0.3, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start(() => {
        showConfirmText();
      });
    }, 600);
  };

  // =========================================================
  // PHASE 2: DECELERATING (2.5s)
  // =========================================================
  const startDeceleration = () => {
    setPhase("decelerating");

    const targetIndex = displayPrizes.findIndex(
      (p) => p.id === result?.prize?.id
    );
    const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
    const isWin = result?.isWin;

    spinY.setValue(0);

    // Slowing haptic impacts
    let hapticCount = 0;
    const decHapticId = addInterval(() => {
      hapticCount++;
      if (hapticCount < 8) {
        haptic.medium();
      } else {
        clearInterval(decHapticId);
      }
    }, 300);

    if (isWin) {
      const overshootIndex = (resolvedIndex + 1) % displayPrizes.length;
      const repOffset = resolvedIndex + 1 >= displayPrizes.length ? 1 : 0;
      const overshootY = computeTargetY(overshootIndex, repOffset);

      Animated.timing(spinY, {
        toValue: overshootY,
        duration: 2500,
        easing: Easing.bezier(0.12, 0.8, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        clearInterval(decHapticId);
        startReach(resolvedIndex);
      });
    } else {
      const targetY = computeTargetY(resolvedIndex);

      Animated.timing(spinY, {
        toValue: targetY,
        duration: 2500,
        easing: Easing.bezier(0.12, 0.8, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        clearInterval(decHapticId);
        startReveal();
      });
    }
  };

  // =========================================================
  // PHASE 1: SPINNING (2s)
  // =========================================================
  const startSpinning = () => {
    setPhase("spinning");

    // Title pulse loop (native)
    titleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulse, {
          toValue: 1.15,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(titlePulse, {
          toValue: 0.92,
          duration: 280,
          useNativeDriver: true,
        }),
      ])
    );
    titleLoopRef.current.start();

    // Reel spin loop (native)
    const totalStripHeight = ITEM_HEIGHT * displayPrizes.length;
    spinLoopRef.current = Animated.loop(
      Animated.timing(spinY, {
        toValue: -totalStripHeight,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoopRef.current.start();

    // Haptic ticking during spin
    addInterval(() => {
      haptic.tick();
    }, 100);

    // After 2s, transition to deceleration
    addTimer(() => {
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
      // Stop haptic tick intervals
      intervalRefs.current.forEach((id) => clearInterval(id));
      intervalRefs.current = [];

      startDeceleration();
    }, 2000);
  };

  // =========================================================
  // Handle close (result screen only)
  // =========================================================
  const handleClose = useCallback(() => {
    stopAllAnimations();
    resetAnimation();
    onClose();
  }, [stopAllAnimations, resetAnimation, onClose]);

  // =========================================================
  // Handle skip — skip animation and jump to result
  // =========================================================
  const handleSkip = useCallback(() => {
    stopAllAnimations();
    shakeX.setValue(0);
    showResult();
  }, [stopAllAnimations, shakeX]);

  // =========================================================
  // Main effect: start animation when visible + result ready
  // =========================================================
  useEffect(() => {
    if (visible && result) {
      resetAnimation();

      // Phase 0: fade in overlay
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        startSpinning();
      });

      // Safety timeout: force result display after 12 seconds
      safetyTimerRef.current = setTimeout(() => {
        stopAllAnimations();
        setPhase("result");
        resultScale.setValue(1);
        resultOpacity.setValue(1);
        if (result?.isWin) {
          startCelebration();
          startResultBorderLoop();
          startGoldenGlowLoop();
        }
      }, SAFETY_TIMEOUT_MS);
    } else if (!visible) {
      resetAnimation();
    }

    return () => {
      stopAllAnimations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, result]);

  // =========================================================
  // Render strip items
  // =========================================================
  const renderStripItems = () => {
    const items = [];
    for (let rep = 0; rep < STRIP_REPETITIONS; rep++) {
      displayPrizes.forEach((prize, idx) => {
        items.push(
          <View key={`${rep}-${idx}`} style={styles.stripItem}>
            <Text style={styles.stripIcon}>{prize.icon}</Text>
            <Text style={styles.stripName} numberOfLines={1}>
              {prize.name}
            </Text>
          </View>
        );
      });
    }
    return items;
  };

  // =========================================================
  // Early return
  // =========================================================
  if (!visible) return null;

  // =========================================================
  // Interpolations
  // =========================================================

  // Result border rainbow color (SEPARATE non-native View only)
  const resultBorderColor = resultBorderAnim.interpolate({
    inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    outputRange: [
      "#FFD700",
      "#FF3B3B",
      C.primary,
      "#E040FB",
      "#2196F3",
      "#4CAF50",
      "#FFD700",
    ],
  });

  const showStrip =
    phase === "spinning" ||
    phase === "decelerating" ||
    phase === "reach" ||
    phase === "revealing";

  const showCancel = phase !== "result" && phase !== "idle";

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
      {/* LAYER 0: White overlay with native-driven opacity */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: overlayOpacity },
        ]}
      >
        {/*
          LAYER 1: Shake wrapper (native-driven translateX).
          Everything visible shakes together.
        */}
        <Animated.View
          style={[
            styles.shakeWrapper,
            { transform: [{ translateX: shakeX }] },
          ]}
        >
          {/* Title (hidden during result phase) */}
          {phase !== "result" && (
            <Animated.View
              style={[
                styles.titleContainer,
                { transform: [{ scale: titlePulse }] },
              ]}
            >
              <Text style={styles.title}>🎰 即時抽選チャレンジ</Text>
              <Text style={styles.subtitle}>{pointCost}pt 消費</Text>
            </Animated.View>
          )}

          {/* Reach text overlay */}
          {phase === "reach" && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.reachOverlay,
                {
                  opacity: reachTextOpacity,
                  transform: [{ scale: reachTextScale }],
                },
              ]}
            >
              <Text style={styles.reachText}>リーチ!?</Text>
            </Animated.View>
          )}

          {/* Confirm text overlay (always mounted for animation continuity) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.confirmOverlay,
              {
                opacity: confirmTextOpacity,
                transform: [{ scale: confirmTextScale }],
              },
            ]}
          >
            <Text style={styles.confirmText}>確定!!!</Text>
          </Animated.View>

          {/* Reel strip */}
          {showStrip && (
            <View style={styles.stripContainer}>
              <View style={styles.stripFadeTop} pointerEvents="none" />
              <View style={styles.stripFadeBottom} pointerEvents="none" />

              <Animated.View
                style={[
                  styles.stripWrapper,
                  { transform: [{ translateY: spinY }] },
                ]}
              >
                {renderStripItems()}
              </Animated.View>
            </View>
          )}

          {/* White flash (LOSE) - native opacity only */}
          <Animated.View
            style={[styles.flash, { opacity: flashOpacity }]}
            pointerEvents="none"
          />

          {/* Golden flash (WIN) - native opacity only */}
          <Animated.View
            style={[styles.goldenFlash, { opacity: goldenFlashOpacity }]}
            pointerEvents="none"
          />

          {/* Result display */}
          {phase === "result" && result && (
            <Animated.View
              style={[
                styles.resultCardOuter,
                {
                  transform: [{ scale: resultScale }],
                  opacity: resultOpacity,
                },
              ]}
            >
              {/* Golden glow behind card (native opacity) */}
              {result.isWin && (
                <Animated.View
                  style={[styles.goldenGlow, { opacity: goldenGlowOpacity }]}
                  pointerEvents="none"
                />
              )}

              {/*
                Rainbow border: SEPARATE non-native Animated.View
                for borderColor interpolation. Never mix with native-driven
                transform/opacity on the same element.
              */}
              {result.isWin && (
                <Animated.View
                  style={[
                    styles.rainbowBorder,
                    { borderColor: resultBorderColor },
                  ]}
                  pointerEvents="none"
                />
              )}

              <View
                style={[
                  styles.resultContainer,
                  result.isWin && styles.resultContainerWin,
                ]}
              >
                {result.isWin ? (
                  <>
                    <Text style={styles.winLabel}>🎉 大当たり！</Text>
                    <Text style={styles.resultIcon}>
                      {result.prize?.icon || "🎁"}
                    </Text>
                    <Text style={styles.resultName}>
                      {result.prize?.name || "景品"}
                    </Text>
                    {result.prize?.description ? (
                      <Text style={styles.resultDesc}>
                        {result.prize.description}
                      </Text>
                    ) : null}
                    <Text style={styles.winMessage}>おめでとうございます！</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.loseLabel}>残念...</Text>
                    <Text style={styles.resultIcon}>
                      {result.prize?.icon || "💨"}
                    </Text>
                    <Text style={styles.resultName}>
                      {result.prize?.name || "はずれ"}
                    </Text>
                    {result.pointsRefunded > 0 && (
                      <Text style={styles.refundText}>
                        🔄 {result.pointsRefunded}pt 還元されました！
                      </Text>
                    )}
                    <Text style={styles.loseMessage}>また挑戦してね！</Text>
                  </>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeBtnText}>閉じる</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Particles (all native-driven) */}
          {particles.map((p, i) => (
            <Animated.View
              key={`p-${i}`}
              pointerEvents="none"
              style={[
                styles.particleBase,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  marginLeft: -(p.size / 2),
                  marginTop: -(p.size / 2),
                  backgroundColor: PARTICLE_COLORS[p.colorIndex],
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

          {/* Skip link (visible during animation phases, not idle or result) */}
          {showCancel && (
            <TouchableOpacity
              style={styles.skipLink}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>スキップ ▶▶</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// =========================================================
// Styles
// =========================================================
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#FFF5EE",
  },
  shakeWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Title
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#8B5E3C",
    marginTop: 6,
  },

  // Reach text
  reachOverlay: {
    position: "absolute",
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  reachText: {
    fontSize: 54,
    fontWeight: "900",
    color: C.primary,
    textShadowColor: "rgba(232,93,38,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 5,
  },

  // Confirm text
  confirmOverlay: {
    position: "absolute",
    zIndex: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 60,
    fontWeight: "900",
    color: C.primary,
    textShadowColor: "rgba(232,93,38,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 8,
  },

  // Reel strip
  stripContainer: {
    width: SCREEN_WIDTH * 0.75,
    height: STRIP_HEIGHT,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: "#fff",
    position: "relative",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    fontSize: 28,
  },
  stripName: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.text,
    maxWidth: "70%",
  },
  stripFadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.65,
    backgroundColor: "rgba(255,255,255,0.85)",
    zIndex: 5,
  },
  stripFadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.65,
    backgroundColor: "rgba(255,255,255,0.85)",
    zIndex: 5,
  },

  // White flash (LOSE)
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 20,
  },

  // Golden flash (WIN)
  goldenFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(232,93,38,0.2)",
    zIndex: 20,
  },

  // Result card outer (native-driven transform + opacity ONLY)
  resultCardOuter: {
    alignItems: "center",
    justifyContent: "center",
    width: SCREEN_WIDTH * 0.85,
  },

  // Rainbow border: SEPARATE non-native Animated.View for borderColor
  rainbowBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    borderWidth: 3,
    zIndex: 1,
  },

  // Golden glow behind card (native opacity)
  goldenGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 30,
    backgroundColor: "rgba(232,93,38,0.15)",
    zIndex: 0,
  },

  // Result card content
  resultContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    borderWidth: 2,
    borderColor: "#FFE0CC",
    zIndex: 2,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  resultContainerWin: {
    borderColor: C.primary,
  },
  winLabel: {
    fontSize: 34,
    fontWeight: "bold",
    color: C.primary,
    marginBottom: 16,
  },
  loseLabel: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 16,
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: 14,
  },
  resultName: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  winMessage: {
    fontSize: 17,
    color: C.primary,
    fontWeight: "600",
    marginTop: 6,
  },
  loseMessage: {
    fontSize: 14,
    color: "#888",
    marginTop: 6,
  },
  refundText: {
    fontSize: 15,
    color: "#16A34A",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 26,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 52,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  // Particles
  particleBase: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },

  // Skip link
  skipLink: {
    marginTop: 34,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    color: "#C07040",
    letterSpacing: 1,
  },
});
