import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Animated, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 浮遊するカードアイコンの装飾
function FloatingCards() {
  const cards = useRef(
    ["♠", "♥", "♦", "♣", "🃏", "⚔️"].map((icon, i) => ({
      icon,
      anim: new Animated.Value(0),
      x: (i * SCREEN_WIDTH * 0.18) + 10,
      delay: i * 400,
      size: 18 + Math.random() * 14,
    }))
  ).current;

  useEffect(() => {
    cards.forEach((card) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(card.anim, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            delay: card.delay,
            useNativeDriver: true,
          }),
          Animated.timing(card.anim, {
            toValue: 0,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.floatingContainer} pointerEvents="none">
      {cards.map((card, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.floatingCard,
            {
              left: card.x,
              fontSize: card.size,
              opacity: card.anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.08, 0.2, 0.08],
              }),
              transform: [{
                translateY: card.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              }],
            },
          ]}
        >
          {card.icon}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuthStore();

  // 入場アニメーション
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert("メールアドレスを入力", "パスワードリセット用のメールを送信するため、メールアドレスを入力してください。");
      return;
    }
    Alert.alert(
      "パスワードリセット",
      `${email} にパスワードリセット用のメールを送信しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "送信する",
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (!error) {
              Alert.alert("送信完了", "パスワードリセット用のメールを送信しました。メールをご確認ください。");
            } else {
              Alert.alert("エラー", "メールの送信に失敗しました。メールアドレスをご確認ください。");
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("エラー", "メールアドレスとパスワードを入力してください");
      return;
    }
    if (password.length < 6) {
      Alert.alert("エラー", "パスワードは6文字以上にしてください");
      return;
    }
    setLoading(true);
    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, referralCode.trim() || undefined);
    setLoading(false);
    if (error) {
      let msg = error.message;
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        msg = "このメールアドレスは既に登録されています。ログインしてください。";
      } else if (msg.includes("Invalid login")) {
        msg = "メールアドレスまたはパスワードが正しくありません。";
      } else if (msg.includes("Email not confirmed")) {
        msg = "メールアドレスが確認されていません。確認メールをご確認ください。";
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        msg = "リクエストが多すぎます。しばらく待ってからお試しください。";
      }
      Alert.alert("エラー", msg);
    }
  };

  return (
    <LinearGradient
      colors={["#1A1A2E", "#2D1B3D", "#1A1A2E"]}
      style={styles.gradient}
    >
      <FloatingCards />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.inner,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ロゴ部分 */}
          <View style={styles.logoSection}>
            <View style={styles.logoIconWrap}>
              <Text style={styles.logoIcon}>🏆</Text>
            </View>
            <Text style={styles.logo}>カドスケ！</Text>
            <Text style={styles.subtitle}>カードゲームの戦績を管理しよう</Text>
            <View style={styles.featureRow}>
              {[
                { icon: "trophy-outline", text: "戦績記録" },
                { icon: "search-outline", text: "大会検索" },
                { icon: "gift-outline", text: "協賛品" },
              ].map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <Ionicons name={f.icon} size={16} color="#FF7A45" />
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* フォーム部分 */}
          <View style={styles.formCard}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.tabActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>ログイン</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.tabActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>新規登録</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={C.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="パスワード（6文字以上）"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputWrap}>
                <Ionicons name="ticket-outline" size={18} color={C.textSub} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.referralInput]}
                  placeholder="招待コード（任意）"
                  placeholderTextColor="#999"
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>{isLogin ? "ログイン" : "アカウント作成"}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>パスワードを忘れた方はこちら</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },

  // 浮遊カード
  floatingContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  floatingCard: { position: "absolute", top: "15%", color: "#fff" },

  // ロゴ
  logoSection: { alignItems: "center", marginBottom: 28 },
  logoIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(232,93,38,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: { fontSize: 36 },
  logo: { fontSize: 36, fontWeight: "bold", color: "#fff", letterSpacing: 2 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 6 },
  featureRow: { flexDirection: "row", gap: 20, marginTop: 16 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  featureText: { fontSize: 12, color: "rgba(255,255,255,0.5)" },

  // フォームカード
  formCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabRow: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 12, marginBottom: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 15, fontWeight: "700", color: C.textSub },
  tabTextActive: { color: "#fff" },

  // 入力フィールド
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bg, borderRadius: 12,
    marginBottom: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "transparent",
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: C.text },
  referralInput: { letterSpacing: 4, fontSize: 16, textAlign: "center" },
  eyeBtn: { padding: 4 },

  // ボタン
  btn: {
    flexDirection: "row",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  forgotBtn: { alignItems: "center", marginTop: 16 },
  forgotText: { fontSize: 13, color: C.textSub, textDecorationLine: "underline" },
});
