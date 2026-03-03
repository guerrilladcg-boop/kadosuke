import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from "react-native";
import { C } from "../constants/theme";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuthStore();

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
      : await signUp(email, password);
    setLoading(false);
    if (error) {
      // エラーメッセージを日本語化
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>カドスケ！</Text>
        <Text style={styles.subtitle}>カードゲームの戦績を管理しよう</Text>
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
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={C.textSub}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（6文字以上）"
          placeholderTextColor={C.textSub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{isLogin ? "ログイン" : "アカウント作成"}</Text>
          }
        </TouchableOpacity>
        {isLogin && (
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>パスワードを忘れた方はこちら</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { fontSize: 36, fontWeight: "bold", color: C.primary, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textSub, textAlign: "center", marginBottom: 40 },
  tabRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 10, marginBottom: 24, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: C.textSub },
  tabTextActive: { color: "#fff" },
  input: { backgroundColor: C.card, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  btn: { backgroundColor: C.primary, borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  forgotBtn: { alignItems: "center", marginTop: 16 },
  forgotText: { fontSize: 13, color: C.textSub, textDecorationLine: "underline" },
});
