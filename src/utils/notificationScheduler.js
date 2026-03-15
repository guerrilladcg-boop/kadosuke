import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY_PREFIX = "reminder_";

/**
 * 大会の1時間前にローカル通知をスケジュール
 */
export const scheduleReminder = async (tournament) => {
  try {
    const tournamentDate = new Date(tournament.date);
    const triggerDate = new Date(tournamentDate.getTime() - 60 * 60 * 1000); // 1時間前

    // 過去の日時ならスケジュールしない
    if (triggerDate <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "大会リマインダー",
        body: `「${tournament.name}」が1時間後に開始します！`,
        data: { type: "tournament_reminder", tournament_id: tournament.id },
        ...(Platform.OS === "android" ? { channelId: "tournament" } : {}),
      },
      trigger: { type: 'date', timestamp: triggerDate.getTime() },
    });

    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + tournament.id, id);
    return id;
  } catch (e) {
    console.warn("Failed to schedule reminder:", e);
    return null;
  }
};

/**
 * スケジュール済み通知をキャンセル
 */
export const cancelReminder = async (tournamentId) => {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + tournamentId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(STORAGE_KEY_PREFIX + tournamentId);
    }
  } catch (e) {
    console.warn("Failed to cancel reminder:", e);
  }
};
