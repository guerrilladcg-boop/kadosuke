import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

// フォアグラウンド通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const notificationListener = useRef();
  const responseListener = useRef();
  const tapHandlerRef = useRef(null);

  // --- トークン登録 ---
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    // Android通知チャンネル
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "デフォルト",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E85D26",
      });
      await Notifications.setNotificationChannelAsync("tournament", {
        name: "大会リマインダー",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    setExpoPushToken(tokenData.data);
    return tokenData.data;
  }, []);

  // --- トークンをSupabaseに保存 ---
  const savePushToken = useCallback(
    async (token) => {
      if (!user || !token) return;
      await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
    },
    [user]
  );

  // --- トークン削除（ログアウト時） ---
  const removePushToken = useCallback(async () => {
    if (!user || !expoPushToken) return;
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", expoPushToken);
  }, [user, expoPushToken]);

  // --- 通知履歴取得 ---
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
    setLoading(false);
  }, [user]);

  // --- 既読にする ---
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [user]
  );

  // --- すべて既読 ---
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  // --- 通知タップハンドラ ---
  const setOnNotificationTap = (handler) => {
    tapHandlerRef.current = handler;
  };

  const handleNotificationTap = (data) => {
    if (tapHandlerRef.current) tapHandlerRef.current(data);
  };

  // --- 初期化 ---
  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then((token) => {
      if (token) savePushToken(token);
    });

    fetchNotifications();

    // フォアグラウンドで通知を受信したとき
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      fetchNotifications();
    });

    // 通知タップでアプリを開いたとき
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [user]);

  // AppState foreground復帰時に再取得
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) fetchNotifications();
    });
    return () => sub.remove();
  }, [user, fetchNotifications]);

  return {
    expoPushToken,
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removePushToken,
    setOnNotificationTap,
  };
};
