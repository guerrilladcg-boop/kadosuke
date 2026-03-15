import { Platform } from "react-native";

// Google AdMob リワード広告の設定
// 開発中はテスト広告 ID を使用
export const AD_UNIT_ID = Platform.select({
  ios: __DEV__
    ? "ca-app-pub-3940256099942544/1712485313" // テスト用リワード
    : "ca-app-pub-XXXXXXXX/XXXXXXXX",          // 本番用（要変更）
  android: __DEV__
    ? "ca-app-pub-3940256099942544/5224354917" // テスト用リワード
    : "ca-app-pub-XXXXXXXX/XXXXXXXX",          // 本番用（要変更）
});

// Google AdMob バナー広告の設定
export const BANNER_AD_UNIT_ID = Platform.select({
  ios: __DEV__
    ? "ca-app-pub-3940256099942544/2934735716" // テスト用バナー
    : "ca-app-pub-XXXXXXXX/XXXXXXXX",          // 本番用（要変更）
  android: __DEV__
    ? "ca-app-pub-3940256099942544/6300978111" // テスト用バナー
    : "ca-app-pub-XXXXXXXX/XXXXXXXX",          // 本番用（要変更）
});

// 1日の広告視聴上限
export const DAILY_AD_LIMIT = 5;

// 1回の視聴で獲得するポイント
export const POINTS_PER_AD = 50;

// 課金プラン
export const PREMIUM_PLANS = {
  onetime: { price: 980, label: "買い切りプラン", description: "一度の購入で永久に広告なし" },
  monthly: { price: 240, label: "月額プラン", description: "毎月自動更新で広告なし" },
};
