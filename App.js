import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen    from "./src/screens/HomeScreen";
import SearchScreen  from "./src/screens/SearchScreen";
import SponsorScreen from "./src/screens/SponsorScreen";
import MyPageScreen  from "./src/screens/MyPageScreen";
import AuthScreen    from "./src/screens/AuthScreen";
import BannerAd      from "./src/components/BannerAd";
import PremiumModal  from "./src/components/PremiumModal";
import LoginBonusModal from "./src/components/LoginBonusModal";
import MissionAchievedModal from "./src/components/MissionAchievedModal";
import LevelUpModal from "./src/components/LevelUpModal";
import NotificationListModal from "./src/components/NotificationListModal";
import { C } from "./src/constants/theme";
import { useAuthStore } from "./src/store/useAuthStore";
import { usePremium } from "./src/hooks/usePremium";
import { useLoginBonus } from "./src/hooks/useLoginBonus";
import { useMissions } from "./src/hooks/useMissions";
import { useLevelStore } from "./src/store/useLevelStore";
import { useNotifications } from "./src/hooks/useNotifications";
const TABS = [
  { key: "home",    label: "ホーム",     icon: "home",   Screen: HomeScreen },
  { key: "search",  label: "検索",       icon: "search", Screen: SearchScreen },
  { key: "sponsor", label: "協賛",       icon: "gift",   Screen: SponsorScreen },
  { key: "mypage",  label: "マイページ", icon: "person", Screen: MyPageScreen },
];
export default function App() {
  const [activeTab, setActiveTab] = React.useState("home");
  const [showPremium, setShowPremium] = React.useState(false);
  const [showLoginBonus, setShowLoginBonus] = React.useState(false);
  const [showMission, setShowMission] = React.useState(false);
  const [currentMission, setCurrentMission] = React.useState(null);
  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const { session, loading, init } = useAuthStore();
  const pendingLevelUp = useLevelStore((s) => s.pendingLevelUp);
  const clearPendingLevelUp = useLevelStore((s) => s.clearPendingLevelUp);
  const { isPremium, premiumType, purchasePremium, cancelPremium } = usePremium();
  const { canClaim, totalDays, loading: bonusLoading, claimBonus, MILESTONES, BASE_POINTS } = useLoginBonus();
  const { unclaimedMissions, checkMissions, claimMission } = useMissions();
  const {
    notifications: notifList,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removePushToken,
  } = useNotifications();

  useEffect(() => { init(); }, []);

  // ログインボーナス: 認証済み & チェック完了 & 未受取 → モーダル表示
  useEffect(() => {
    if (session && !bonusLoading && canClaim) {
      // 少し遅延させて自然な表示に
      const timer = setTimeout(() => setShowLoginBonus(true), 800);
      return () => clearTimeout(timer);
    }
  }, [session, bonusLoading, canClaim]);

  // ミッションチェック: 認証済み & ボーナスチェック完了後に実行
  useEffect(() => {
    if (session && !bonusLoading) {
      // ログインボーナスモーダルの後にチェック（遅延）
      const timer = setTimeout(() => checkMissions(), canClaim ? 4000 : 1500);
      return () => clearTimeout(timer);
    }
  }, [session, bonusLoading]);

  // 未受取ミッションがあればモーダル表示
  useEffect(() => {
    if (unclaimedMissions.length > 0 && !showLoginBonus && !showMission) {
      const timer = setTimeout(() => {
        setCurrentMission(unclaimedMissions[0]);
        setShowMission(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [unclaimedMissions, showLoginBonus, showMission]);

  const handleMissionClose = () => {
    setShowMission(false);
    setCurrentMission(null);
  };

  // レベルアップ検知 → モーダル表示
  useEffect(() => {
    if (pendingLevelUp && !showLoginBonus && !showMission) {
      const timer = setTimeout(() => setShowLevelUp(true), 500);
      return () => clearTimeout(timer);
    }
  }, [pendingLevelUp, showLoginBonus, showMission]);

  const handleLevelUpClose = () => {
    setShowLevelUp(false);
    clearPendingLevelUp();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }
  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }
  const ActiveScreen = TABS.find((t) => t.key === activeTab)?.Screen || HomeScreen;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>カドスケ！</Text>
          <View style={styles.headerRight}>
            {!isPremium && (
              <TouchableOpacity style={styles.premiumBtn} onPress={() => setShowPremium(true)}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.premiumBtnText}>広告非表示</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.notifBtn} onPress={() => setShowNotifications(true)}>
              <Ionicons name="notifications-outline" size={24} color={C.text} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <ActiveScreen />
        </View>
        {/* バナー広告（タブの上に配置）+ 広告非表示導線 */}
        <BannerAd isPremium={isPremium} onPremiumPress={() => setShowPremium(true)} />
        <SafeAreaView edges={["bottom"]} style={styles.bottomTab}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === tab.key ? tab.icon : `${tab.icon}-outline`}
                size={24}
                color={activeTab === tab.key ? C.primary : C.textSub}
              />
              <Text style={[styles.tabLabel, { color: activeTab === tab.key ? C.primary : C.textSub }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </SafeAreaView>
        {/* プレミアム購入モーダル */}
        <PremiumModal
          visible={showPremium}
          onClose={() => setShowPremium(false)}
          isPremium={isPremium}
          premiumType={premiumType}
          onPurchase={purchasePremium}
          onCancel={cancelPremium}
        />
        {/* ログインボーナスモーダル */}
        <LoginBonusModal
          visible={showLoginBonus}
          onClose={() => setShowLoginBonus(false)}
          onClaim={claimBonus}
          totalDays={totalDays}
          bonusPoints={MILESTONES[totalDays + 1] || BASE_POINTS}
          isMilestone={MILESTONES.hasOwnProperty(totalDays + 1)}
        />
        {/* ミッション達成モーダル */}
        <MissionAchievedModal
          visible={showMission}
          onClose={handleMissionClose}
          onClaim={claimMission}
          mission={currentMission}
        />
        {/* レベルアップモーダル */}
        <LevelUpModal
          visible={showLevelUp}
          onClose={handleLevelUpClose}
          levelUp={pendingLevelUp}
        />
        {/* 通知一覧モーダル */}
        <NotificationListModal
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifList}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onNotificationPress={(notif) => {
            markAsRead(notif.id);
            setShowNotifications(false);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: C.primary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  premiumBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF8E1", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  premiumBtnText: { fontSize: 11, fontWeight: "bold", color: "#D4A017" },
  notifBtn: { padding: 4, position: "relative" },
  notifBadge: { position: "absolute", top: -2, right: -4, backgroundColor: C.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  bottomTab: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});
