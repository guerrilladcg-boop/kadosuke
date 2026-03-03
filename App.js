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
import { C } from "./src/constants/theme";
import { useAuthStore } from "./src/store/useAuthStore";
import { usePremium } from "./src/hooks/usePremium";
const TABS = [
  { key: "home",    label: "ホーム",     icon: "home",   Screen: HomeScreen },
  { key: "search",  label: "検索",       icon: "search", Screen: SearchScreen },
  { key: "sponsor", label: "協賛",       icon: "gift",   Screen: SponsorScreen },
  { key: "mypage",  label: "マイページ", icon: "person", Screen: MyPageScreen },
];
export default function App() {
  const [activeTab, setActiveTab] = React.useState("home");
  const [showPremium, setShowPremium] = React.useState(false);
  const { session, loading, init } = useAuthStore();
  const { isPremium, premiumType, purchasePremium, cancelPremium } = usePremium();
  useEffect(() => { init(); }, []);
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
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color={C.text} />
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
  notifBtn: { padding: 4 },
  bottomTab: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});
