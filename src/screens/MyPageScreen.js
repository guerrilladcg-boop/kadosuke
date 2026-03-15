import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, Alert, Modal, ActivityIndicator, RefreshControl } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";
import { getLevelFromExp, getTitleForLevel } from "../constants/levels";
import { useAuthStore } from "../store/useAuthStore";
import { useOrganizer } from "../hooks/useOrganizer";
import { useAdmin } from "../hooks/useAdmin";
import { usePremium } from "../hooks/usePremium";
import { useProfile } from "../hooks/useProfile";
import { useSponsorItems } from "../hooks/useSponsorItems";
import CreateTournamentModal from "../components/CreateTournamentModal";
import AdminScreen from "./AdminScreen";
import OrganizerApplyModal from "../components/OrganizerApplyModal";
import PremiumModal from "../components/PremiumModal";
import ProfileImagePicker from "../components/ProfileImagePicker";
import DisplayNameSwitcher from "../components/DisplayNameSwitcher";
import OrganizerAnalyticsModal from "../components/OrganizerAnalyticsModal";
import LeagueManageModal from "../components/LeagueManageModal";
import SponsorRequestModal from "../components/SponsorRequestModal";
import CSVImportModal from "../components/CSVImportModal";
import { shareProfile, shareReferralCode } from "../utils/share";
import { showError } from "../utils/errorHelper";

export default function MyPageScreen() {
  const { user, signOut } = useAuthStore();
  const {
    profile, fetchProfile, updateName, updateEmail, requestPasswordReset, uploadAvatar,
    toggleNotifications, toggleTournamentEntry, toggleFavoriteOrganizer, toggleSponsorItems,
    updateDisplayNames, switchDisplayName,
    updateShippingAddress, getShippingAddress,
    updateBio, updateMainDeck,
  } = useProfile();
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showDisplayNames, setShowDisplayNames] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  // 主催者ツール用モーダル
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLeague, setShowLeague] = useState(false);
  const [showSponsorReq, setShowSponsorReq] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvTargetTournament, setCsvTargetTournament] = useState(null);
  // 編集状態
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [addressForm, setAddressForm] = useState({});

  const { isOrganizer, organizerStatus, myTournaments, applyOrganizer, cancelApplication, deleteTournament, importTournamentResults } = useOrganizer();
  const { isAdmin } = useAdmin();
  const { isPremium, premiumType, purchasePremium, cancelPremium } = usePremium();
  const { myExchanges } = useSponsorItems();
  const insets = useSafeAreaInsets();

  const displayName = profile?.name || user?.email || "プレイヤー";
  const initial = displayName.charAt(0).toUpperCase();

  // --- ハンドラ ---
  const handleSignOut = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const { error } = await updateName(newName);
    if (!error) { setEditingName(false); setNewName(""); }
    else showError(error, "名前の保存に失敗しました");
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) return;
    const { error } = await updateEmail(newEmail.trim());
    if (!error) {
      Alert.alert("確認メール送信", "新しいメールアドレスに確認メールを送信しました。");
      setEditingEmail(false);
      setNewEmail("");
    } else {
      showError(error, "メールアドレスの変更に失敗しました");
    }
  };

  const handleImageSelected = async (uri) => {
    setUploading(true);
    const { error } = await uploadAvatar(uri);
    setUploading(false);
    if (error) showError(error, "画像のアップロードに失敗しました");
  };

  const handleSaveDisplayNames = async (names, activeIdx) => {
    await updateDisplayNames(names);
    await switchDisplayName(activeIdx);
  };

  const handleApplyOrganizer = () => setShowApplyModal(true);

  const handleCancelApplication = () => {
    Alert.alert("申請の取り消し", "主催者申請を取り消しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "取り消す", style: "destructive", onPress: async () => {
        const { error } = await cancelApplication();
        if (!error) Alert.alert("完了", "申請を取り消しました");
        else Alert.alert("エラー", "取り消しに失敗しました");
      }},
    ]);
  };

  const handleDeleteTournament = (t) => {
    Alert.alert("大会を削除", `「${t.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => deleteTournament(t.id) },
    ]);
  };

  // 通知ハンドラ
  const handleToggleNotifications = async (value) => {
    const { error } = await toggleNotifications(value);
    if (error) showError(error, "設定の更新に失敗しました");
  };
  const handleToggleTournamentEntry = async (value) => {
    const { error } = await toggleTournamentEntry(value);
    if (error) showError(error, "設定の更新に失敗しました");
  };
  const handleToggleFavoriteOrganizer = async (value) => {
    const { error } = await toggleFavoriteOrganizer(value);
    if (error) showError(error, "設定の更新に失敗しました");
  };
  const handleToggleSponsorItems = async (value) => {
    const { error } = await toggleSponsorItems(value);
    if (error) showError(error, "設定の更新に失敗しました");
  };

  const handlePasswordReset = () => {
    Alert.alert(
      "パスワード変更",
      `${user?.email} にパスワードリセット用のメールを送信します。メール内のリンクからパスワードを変更できます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "送信する",
          onPress: async () => {
            const { error } = await requestPasswordReset();
            if (!error) {
              Alert.alert("メール送信完了", "パスワードリセット用のメールを送信しました。メールをご確認ください。");
            } else {
              Alert.alert("エラー", "メールの送信に失敗しました。しばらく待ってから再度お試しください。");
            }
          },
        },
      ]
    );
  };

  const handleOpenAddressEdit = () => {
    const addr = getShippingAddress() || {};
    setAddressForm(addr);
    setShowAccountSettings(false);
    setTimeout(() => setShowAddressEdit(true), 350);
  };

  const handleSaveAddress = async () => {
    if (!addressForm.shipping_name || !addressForm.shipping_zip || !addressForm.shipping_prefecture || !addressForm.shipping_city || !addressForm.shipping_address || !addressForm.shipping_phone) {
      Alert.alert("エラー", "必須項目を入力してください");
      return;
    }
    const { error } = await updateShippingAddress(addressForm);
    if (!error) {
      Alert.alert("完了", "配送先住所を保存しました");
      setShowAddressEdit(false);
      setTimeout(() => setShowAccountSettings(true), 350);
    } else {
      showError(error, "住所の保存に失敗しました");
    }
  };

  const masterNotifEnabled = profile?.push_notifications_enabled ?? true;

  const handleInvite = () => {
    const code = profile?.referral_code;
    if (!code) {
      Alert.alert("招待コード", "招待コードの生成中です。再度お試しください。");
      return;
    }
    Alert.alert(
      "友達を招待",
      `あなたの招待コード:\n\n${code}\n\n友達がこのコードで登録すると、あなたに100pt・友達に50ptが付与されます。`,
      [
        { text: "閉じる", style: "cancel" },
        { text: "コードをシェア", onPress: () => shareReferralCode(code) },
      ]
    );
  };

  const MENU = [
    { icon: "people-outline", label: "友達を招待", onPress: handleInvite },
    { icon: "share-social-outline", label: "プロフィールをシェア", onPress: () => shareProfile(displayName) },
    { icon: "notifications-outline", label: "通知設定", onPress: () => setShowNotifSettings(true) },
    ...(isAdmin ? [{ icon: "shield-checkmark-outline", label: "管理画面", onPress: () => setShowAdmin(true) }] : []),
    { icon: "log-out-outline", label: "ログアウト", onPress: handleSignOut, danger: true },
  ];

  // --- 主催者バッジ ---
  const renderOrganizerBadge = () => {
    if (organizerStatus === "approved") {
      return <View style={styles.organizerBadge}><Text style={styles.organizerBadgeText}>主催者</Text></View>;
    }
    if (organizerStatus === "pending") {
      return <View style={[styles.organizerBadge, { backgroundColor: "#FEF9C3" }]}><Text style={[styles.organizerBadgeText, { color: C.pending }]}>審査中</Text></View>;
    }
    return null;
  };

  // CSV結果インポートハンドラ
  const handleCSVImportForTournament = (tournament) => {
    setCsvTargetTournament(tournament);
    setShowCSVImport(true);
  };

  const handleCSVImportData = async (parsedData) => {
    if (!csvTargetTournament) return;
    const { error } = await importTournamentResults(csvTargetTournament.id, parsedData);
    if (error) throw error;
  };

  // --- 主催者セクション ---
  const renderOrganizerSection = () => {
    if (isOrganizer) {
      return (
        <>
          {/* 主催者ツールバー */}
          <View style={styles.toolbarRow}>
            <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowAnalytics(true)}>
              <View style={[styles.toolbarIconWrap, { backgroundColor: "#3B82F620" }]}>
                <Ionicons name="bar-chart-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.toolbarLabel}>分析</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowCreateTournament(true)}>
              <View style={[styles.toolbarIconWrap, { backgroundColor: C.primary + "20" }]}>
                <Ionicons name="clipboard-outline" size={22} color={C.primary} />
              </View>
              <Text style={styles.toolbarLabel}>テンプレート</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowLeague(true)}>
              <View style={[styles.toolbarIconWrap, { backgroundColor: "#8B5CF620" }]}>
                <Ionicons name="trophy-outline" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.toolbarLabel}>リーグ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowSponsorReq(true)}>
              <View style={[styles.toolbarIconWrap, { backgroundColor: "#16A34A20" }]}>
                <Ionicons name="people-outline" size={22} color="#16A34A" />
              </View>
              <Text style={styles.toolbarLabel}>スポンサー</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>主催している大会</Text>
            <TouchableOpacity onPress={() => setShowCreateTournament(true)}>
              <Text style={styles.addBtn}>+ 新規投稿</Text>
            </TouchableOpacity>
          </View>
          {myTournaments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>まだ大会を投稿していません</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateTournament(true)}>
                <Text style={styles.createBtnText}>大会を投稿する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myTournaments.map((t) => (
              <View key={t.id} style={styles.tournamentItem}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gameTag, { color: t.game_color }]}>{t.game}</Text>
                  <Text style={styles.tournamentName}>{t.name}</Text>
                  <Text style={styles.tournamentDate}>
                    {new Date(t.date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleCSVImportForTournament(t)} style={styles.csvImportBtn}>
                  <Ionicons name="cloud-upload-outline" size={16} color={C.primary} />
                  <Text style={styles.csvImportBtnText}>結果</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTournament(t)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      );
    }

    if (organizerStatus === "pending") {
      return (
        <View style={styles.pendingCard}>
          <Ionicons name="time-outline" size={24} color={C.pending} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.applyTitle}>主催者申請 審査中</Text>
            <Text style={styles.applySub}>管理者の承認をお待ちください</Text>
          </View>
          <TouchableOpacity onPress={handleCancelApplication}>
            <Text style={{ fontSize: 13, color: C.danger }}>取消</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (organizerStatus === "rejected") {
      return (
        <View style={styles.rejectedCard}>
          <Ionicons name="close-circle-outline" size={24} color={C.danger} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.applyTitle}>主催者申請が却下されました</Text>
            <Text style={styles.applySub}>再度申請することができます</Text>
          </View>
          <TouchableOpacity onPress={handleApplyOrganizer}>
            <Ionicons name="refresh" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.applyCard} onPress={handleApplyOrganizer}>
        <Ionicons name="ribbon-outline" size={24} color={C.primary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.applyTitle}>主催者として申請する</Text>
          <Text style={styles.applySub}>大会を投稿・管理できるようになります</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textSub} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchProfile(); setRefreshing(false); }} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* === プロフィールカード（直接編集可能） === */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            {/* アバター */}
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (
              <ProfileImagePicker
                avatarUrl={profile?.avatar_url}
                initial={initial}
                size={64}
                onImageSelected={handleImageSelected}
              />
            )}
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                {renderOrganizerBadge()}
              </View>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>

          {/* 登録情報の照会・変更 */}
          <TouchableOpacity
            style={styles.accountSettingsItem}
            onPress={() => setShowAccountSettings(true)}
          >
            <Ionicons name="create-outline" size={18} color={C.primary} />
            <Text style={styles.accountSettingsLabel}>登録情報の照会・変更</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color={C.textSub} />
          </TouchableOpacity>

          {/* === レベル・称号 === */}
          {profile && (() => {
            const exp = profile.experience || 0;
            const level = profile.level || getLevelFromExp(exp);
            const title = getTitleForLevel(level);
            return (
              <View style={styles.levelSection}>
                <View style={styles.levelRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>Lv.{level}</Text>
                  </View>
                  <Text style={styles.levelTitle}>{title}</Text>
                </View>
              </View>
            );
          })()}

          {/* === 自己紹介・メインデッキ === */}
          <TouchableOpacity
            style={styles.accountSettingsItem}
            onPress={() => {
              Alert.prompt
                ? Alert.prompt("自己紹介", "200文字以内で入力", (text) => { if (text !== null) updateBio(text.slice(0, 200)); }, "plain-text", profile?.bio || "")
                : Alert.alert("自己紹介", profile?.bio || "未設定", [
                    { text: "閉じる", style: "cancel" },
                  ]);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.primary} />
            <Text style={styles.accountSettingsLabel}>自己紹介</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 12, color: C.textSub, maxWidth: 150 }} numberOfLines={1}>{profile?.bio || "未設定"}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.accountSettingsItem}
            onPress={() => {
              Alert.prompt
                ? Alert.prompt("メインデッキ", "使用デッキ名を入力", (text) => { if (text !== null) updateMainDeck(text); }, "plain-text", profile?.main_deck || "")
                : Alert.alert("メインデッキ", profile?.main_deck || "未設定", [
                    { text: "閉じる", style: "cancel" },
                  ]);
            }}
          >
            <Ionicons name="albums-outline" size={18} color={C.primary} />
            <Text style={styles.accountSettingsLabel}>メインデッキ</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 12, color: C.textSub, maxWidth: 150 }} numberOfLines={1}>{profile?.main_deck || "未設定"}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* === 主催者セクション === */}
        {renderOrganizerSection()}

        {/* === 交換履歴 === */}
        {myExchanges.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>交換履歴</Text>
            </View>
            {myExchanges.map((ex) => {
              const displayIcon = ex.prize_icon || ex.sponsor_items?.icon || "🎁";
              const displayName = ex.type === "instant_lottery_win"
                ? (ex.prize_name || ex.sponsor_items?.name || "即時抽選当選")
                : (ex.sponsor_items?.name || "不明な商品");
              const hasGiftCode = ex.status === "completed" && ex.gift_code;

              return (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.exchangeHistoryItem}
                  activeOpacity={hasGiftCode ? 0.6 : 1}
                  onPress={() => {
                    if (hasGiftCode) {
                      Alert.alert(
                        "🎫 ギフトコード",
                        ex.gift_code,
                        [
                          { text: "閉じる", style: "cancel" },
                          {
                            text: "コピー",
                            onPress: async () => {
                              await Clipboard.setStringAsync(ex.gift_code);
                              Alert.alert("コピーしました", "ギフトコードをクリップボードにコピーしました");
                            },
                          },
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.exchangeHistoryIcon}>{displayIcon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.exchangeHistoryName}>{displayName}</Text>
                      {ex.type === "instant_lottery_win" && (
                        <Text style={{ fontSize: 10, color: C.primary, fontWeight: "bold" }}>抽選</Text>
                      )}
                    </View>
                    <Text style={styles.exchangeHistoryDate}>
                      {new Date(ex.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      {" · "}{ex.points_spent}pt
                    </Text>
                    {hasGiftCode && (
                      <Text style={{ fontSize: 11, color: C.primary, marginTop: 2 }}>
                        🎫 タップしてコードを表示
                      </Text>
                    )}
                  </View>
                  <View style={[
                    styles.exchangeStatusBadge,
                    ex.status === "pending" && { backgroundColor: "#FEF3C7" },
                    ex.status === "shipped" && { backgroundColor: "#DBEAFE" },
                    ex.status === "completed" && { backgroundColor: "#DCFCE7" },
                    ex.status === "cancelled" && { backgroundColor: "#FEE2E2" },
                  ]}>
                    <Text style={[
                      styles.exchangeStatusText,
                      ex.status === "pending" && { color: "#D97706" },
                      ex.status === "shipped" && { color: "#2563EB" },
                      ex.status === "completed" && { color: "#16A34A" },
                      ex.status === "cancelled" && { color: "#EF4444" },
                    ]}>
                      {ex.status === "pending" ? "対応待ち" :
                       ex.status === "shipped" ? "発送済み" :
                       ex.status === "completed" ? "完了" : "キャンセル"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* === プレミアムプラン導線 === */}
        {!isPremium && (
          <TouchableOpacity style={styles.premiumCard} onPress={() => setShowPremium(true)}>
            <View style={styles.premiumCardLeft}>
              <View style={styles.premiumIconWrap}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumCardTitle}>プレミアムプラン</Text>
                <Text style={styles.premiumCardSub}>広告を非表示にして快適に利用 ¥240/月〜</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D4A017" />
          </TouchableOpacity>
        )}

        {/* === メニュー === */}
        <View style={{ marginTop: 8 }}>
          {MENU.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={item.danger ? C.danger : C.text} />
              <Text style={[styles.menuLabel, item.danger && { color: C.danger }]}>{item.label}</Text>
              <View style={{ flex: 1 }} />
              {!item.danger && <Ionicons name="chevron-forward" size={18} color={C.textSub} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* === 利用規約・プライバシーポリシー === */}
        <View style={styles.legalFooter}>
          <TouchableOpacity onPress={() => setShowTerms(true)}>
            <Text style={styles.legalLink}>利用規約</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>|</Text>
          <TouchableOpacity onPress={() => setShowPrivacy(true)}>
            <Text style={styles.legalLink}>プライバシーポリシー</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* === 名前編集モーダル === */}
      <Modal visible={editingName} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>プロフィール名を変更</Text>
            <TextInput
              style={styles.editInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="名前を入力"
              placeholderTextColor={C.textSub}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveName} style={styles.editSaveBtn}>
                <Text style={styles.editSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === メール編集モーダル === */}
      <Modal visible={editingEmail} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>メールアドレスを変更</Text>
            <Text style={styles.editDesc}>新しいメールアドレスに確認メールが送信されます</Text>
            <TextInput
              style={styles.editInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="新しいメールアドレス"
              placeholderTextColor={C.textSub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setEditingEmail(false)} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEmail} style={styles.editSaveBtn}>
                <Text style={styles.editSaveText}>変更</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === 通知設定モーダル === */}
      <Modal visible={showNotifSettings} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNotifSettings(false)} style={styles.modalHeaderBtn}>
              <Text style={styles.modalHeaderClose}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>通知設定</Text>
            <View style={styles.modalHeaderBtn} />
          </View>
          <ScrollView style={{ padding: 16 }}>
            <Text style={styles.notifSectionLabel}>プッシュ通知</Text>
            <View style={styles.notifSection}>
              {/* マスタートグル */}
              <View style={styles.notifToggleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifLabel}>プッシュ通知</Text>
                  <Text style={styles.notifDesc}>すべての通知を一括で切り替え</Text>
                </View>
                <Switch
                  value={masterNotifEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ true: C.primary, false: C.border }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.notifDivider} />
              {/* エントリー済み大会 */}
              <View style={[styles.notifToggleItem, !masterNotifEnabled && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifLabelRow}>
                    <Ionicons name="trophy-outline" size={16} color={masterNotifEnabled ? C.primary : C.textSub} />
                    <Text style={styles.notifLabel}>エントリー大会リマインダー</Text>
                  </View>
                  <Text style={styles.notifDesc}>参加予定の大会の開催通知</Text>
                </View>
                <Switch
                  value={(profile?.notify_tournament_entry ?? true) && masterNotifEnabled}
                  onValueChange={handleToggleTournamentEntry}
                  disabled={!masterNotifEnabled}
                  trackColor={{ true: C.primary, false: C.border }}
                  thumbColor="#fff"
                />
              </View>
              {/* お気に入り主催者 */}
              <View style={[styles.notifToggleItem, !masterNotifEnabled && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifLabelRow}>
                    <Ionicons name="heart-outline" size={16} color={masterNotifEnabled ? "#EF4444" : C.textSub} />
                    <Text style={styles.notifLabel}>お気に入り主催者の新着</Text>
                  </View>
                  <Text style={styles.notifDesc}>フォロー中の主催者が大会を公開した時</Text>
                </View>
                <Switch
                  value={(profile?.notify_favorite_organizer ?? true) && masterNotifEnabled}
                  onValueChange={handleToggleFavoriteOrganizer}
                  disabled={!masterNotifEnabled}
                  trackColor={{ true: C.primary, false: C.border }}
                  thumbColor="#fff"
                />
              </View>
              {/* 目玉協賛商品 */}
              <View style={[styles.notifToggleItem, !masterNotifEnabled && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifLabelRow}>
                    <Ionicons name="gift-outline" size={16} color={masterNotifEnabled ? "#D97706" : C.textSub} />
                    <Text style={styles.notifLabel}>目玉協賛商品のお知らせ</Text>
                  </View>
                  <Text style={styles.notifDesc}>注目の協賛商品が追加された時</Text>
                </View>
                <Switch
                  value={(profile?.notify_sponsor_items ?? true) && masterNotifEnabled}
                  onValueChange={handleToggleSponsorItems}
                  disabled={!masterNotifEnabled}
                  trackColor={{ true: C.primary, false: C.border }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* === 利用規約モーダル === */}
      <Modal visible={showTerms} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.legalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.legalHeader}>
            <TouchableOpacity onPress={() => setShowTerms(false)}>
              <Text style={styles.legalClose}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.legalTitle}>利用規約</Text>
            <View style={{ minWidth: 60 }} />
          </View>
          <ScrollView style={styles.legalBody}>
            <Text style={styles.legalHeading}>カドスケ！ 利用規約</Text>
            <Text style={styles.legalDate}>最終更新日: 2026年3月3日</Text>
            <Text style={styles.legalText}>
              第1条（適用）{"\n"}
              本規約は、カドスケ！（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。{"\n\n"}
              第2条（アカウント）{"\n"}
              ユーザーは正確な情報を登録し、アカウントの管理責任を負うものとします。アカウントの不正使用について、当社は責任を負いません。{"\n\n"}
              第3条（禁止事項）{"\n"}
              以下の行為を禁止します。{"\n"}
              ・法令に違反する行為{"\n"}
              ・他のユーザーへの迷惑行為{"\n"}
              ・虚偽の情報の登録{"\n"}
              ・本サービスの運営を妨害する行為{"\n"}
              ・不正な手段によるポイントの取得{"\n\n"}
              第4条（大会主催者）{"\n"}
              主催者として承認されたユーザーは、正確な大会情報を投稿する義務を負います。虚偽の大会情報を投稿した場合、主催者権限を取り消すことがあります。{"\n\n"}
              第5条（ポイント・課金）{"\n"}
              本サービス内のポイントは現金への交換はできません。プレミアムプランの料金・条件はアプリ内に表示されるとおりとします。{"\n\n"}
              第6条（免責事項）{"\n"}
              本サービスの利用により生じた損害について、当社は故意または重大な過失がある場合を除き、責任を負いません。{"\n\n"}
              第7条（規約の変更）{"\n"}
              当社は必要に応じて本規約を変更できるものとします。変更後の規約はアプリ内にて通知します。
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* === プライバシーポリシーモーダル === */}
      <Modal visible={showPrivacy} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.legalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.legalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacy(false)}>
              <Text style={styles.legalClose}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.legalTitle}>プライバシーポリシー</Text>
            <View style={{ minWidth: 60 }} />
          </View>
          <ScrollView style={styles.legalBody}>
            <Text style={styles.legalHeading}>カドスケ！ プライバシーポリシー</Text>
            <Text style={styles.legalDate}>最終更新日: 2026年3月3日</Text>
            <Text style={styles.legalText}>
              1. 収集する情報{"\n"}
              本サービスでは以下の情報を収集します。{"\n"}
              ・メールアドレス（アカウント登録時）{"\n"}
              ・プロフィール情報（表示名、プロフィール画像）{"\n"}
              ・大会参加履歴および戦績{"\n"}
              ・アプリ利用状況（広告視聴履歴、ポイント履歴）{"\n\n"}
              2. 情報の利用目的{"\n"}
              収集した情報は以下の目的で利用します。{"\n"}
              ・本サービスの提供・運営{"\n"}
              ・ユーザーサポート{"\n"}
              ・サービスの改善・新機能の開発{"\n"}
              ・プッシュ通知の送信（ユーザーが許可した場合）{"\n\n"}
              3. 第三者への提供{"\n"}
              法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。{"\n\n"}
              4. 広告について{"\n"}
              本サービスではGoogle AdMobを利用した広告を表示しています。広告配信のために端末識別子等が利用される場合があります。{"\n\n"}
              5. データの保管{"\n"}
              ユーザーデータはSupabase（クラウドサービス）上に安全に保管されます。{"\n\n"}
              6. お問い合わせ{"\n"}
              プライバシーに関するお問い合わせは、アプリ内のお問い合わせフォームよりご連絡ください。
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* === 登録情報の照会・変更モーダル === */}
      <Modal visible={showAccountSettings} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAccountSettings(false)} style={styles.modalHeaderBtn}>
              <Text style={styles.modalHeaderClose}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>登録情報</Text>
            <View style={styles.modalHeaderBtn} />
          </View>
          <ScrollView style={{ padding: 16 }}>
            <Text style={styles.notifSectionLabel}>基本情報</Text>
            <View style={styles.notifSection}>
              <TouchableOpacity style={styles.settingsMenuItem} onPress={() => { setNewName(displayName); setEditingName(true); }}>
                <Ionicons name="person-outline" size={20} color={C.text} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.settingsMenuLabel}>名前</Text>
                  <Text style={styles.settingsMenuValue}>{displayName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </TouchableOpacity>
              <View style={styles.notifDivider} />
              <TouchableOpacity style={styles.settingsMenuItem} onPress={() => { setNewEmail(""); setEditingEmail(true); }}>
                <Ionicons name="mail-outline" size={20} color={C.text} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.settingsMenuLabel}>メールアドレス</Text>
                  <Text style={styles.settingsMenuValue}>{user?.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </TouchableOpacity>
              <View style={styles.notifDivider} />
              <TouchableOpacity style={styles.settingsMenuItem} onPress={handlePasswordReset}>
                <Ionicons name="key-outline" size={20} color={C.text} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.settingsMenuLabel}>パスワード変更</Text>
                  <Text style={styles.settingsMenuValue}>メールでリセット</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={styles.notifSectionLabel}>配送先住所</Text>
            <View style={styles.notifSection}>
              <TouchableOpacity style={styles.settingsMenuItem} onPress={handleOpenAddressEdit}>
                <Ionicons name="home-outline" size={20} color={C.text} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.settingsMenuLabel}>配送先住所</Text>
                  <Text style={styles.settingsMenuValue}>
                    {profile?.shipping_name ? `${profile.shipping_prefecture} ${profile.shipping_city}` : "未設定"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textSub} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* === 配送先住所編集モーダル === */}
      <Modal visible={showAddressEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top || 16 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddressEdit(false); setTimeout(() => setShowAccountSettings(true), 350); }} style={styles.modalHeaderBtn}>
              <Text style={styles.modalHeaderClose}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>配送先住所</Text>
            <TouchableOpacity onPress={handleSaveAddress} style={styles.modalHeaderBtn}>
              <Text style={styles.modalHeaderClose}>保存</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.addressLabel}>氏名 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_name || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_name: v}))} placeholder="山田 太郎" placeholderTextColor={C.textSub} />

            <Text style={styles.addressLabel}>郵便番号 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_zip || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_zip: v}))} placeholder="123-4567" placeholderTextColor={C.textSub} keyboardType="number-pad" />

            <Text style={styles.addressLabel}>都道府県 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_prefecture || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_prefecture: v}))} placeholder="東京都" placeholderTextColor={C.textSub} />

            <Text style={styles.addressLabel}>市区町村 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_city || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_city: v}))} placeholder="渋谷区" placeholderTextColor={C.textSub} />

            <Text style={styles.addressLabel}>番地 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_address || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_address: v}))} placeholder="1-2-3" placeholderTextColor={C.textSub} />

            <Text style={styles.addressLabel}>建物名・部屋番号</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_building || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_building: v}))} placeholder="マンション101" placeholderTextColor={C.textSub} />

            <Text style={styles.addressLabel}>電話番号 *</Text>
            <TextInput style={styles.editInput} value={addressForm.shipping_phone || ""} onChangeText={(v) => setAddressForm(f => ({...f, shipping_phone: v}))} placeholder="090-1234-5678" placeholderTextColor={C.textSub} keyboardType="phone-pad" />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* === 表示名切り替えモーダル === */}
      <DisplayNameSwitcher
        visible={showDisplayNames}
        onClose={() => setShowDisplayNames(false)}
        profile={profile}
        onSave={handleSaveDisplayNames}
      />

      {/* === 主催者申請モーダル === */}
      <OrganizerApplyModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onApply={applyOrganizer}
      />

      {/* === 大会投稿モーダル === */}
      <CreateTournamentModal visible={showCreateTournament} onClose={() => setShowCreateTournament(false)} />

      {/* === 管理画面モーダル === */}
      <AdminScreen visible={showAdmin} onClose={() => setShowAdmin(false)} />

      {/* === プレミアムモーダル === */}
      <PremiumModal
        visible={showPremium}
        onClose={() => setShowPremium(false)}
        isPremium={isPremium}
        premiumType={premiumType}
        onPurchase={purchasePremium}
        onCancel={cancelPremium}
      />

      {/* === 主催者ツール: 分析 === */}
      <OrganizerAnalyticsModal visible={showAnalytics} onClose={() => setShowAnalytics(false)} />

      {/* === 主催者ツール: リーグ === */}
      <LeagueManageModal visible={showLeague} onClose={() => setShowLeague(false)} />

      {/* === 主催者ツール: スポンサー === */}
      <SponsorRequestModal
        visible={showSponsorReq}
        onClose={() => setShowSponsorReq(false)}
        myTournaments={myTournaments}
      />

      {/* === CSV結果インポート === */}
      <CSVImportModal
        visible={showCSVImport}
        onClose={() => { setShowCSVImport(false); setCsvTargetTournament(null); }}
        onImport={handleCSVImportData}
        title={csvTargetTournament ? `${csvTargetTournament.name} 結果登録` : "結果をインポート"}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  // プロフィールカード
  profileCard: { backgroundColor: C.card, borderRadius: 14, marginBottom: 10, elevation: 2, overflow: "hidden" },
  profileTop: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12 },
  avatarLoading: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  profileInfo: { marginLeft: 14, flex: 1 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileName: { fontSize: 18, fontWeight: "bold", color: C.text },
  profileEmail: { fontSize: 13, color: C.textSub, marginTop: 2 },
  accountSettingsItem: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 14 },
  accountSettingsLabel: { fontSize: 14, color: C.primary, fontWeight: "600" },
  // レベル
  levelSection: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 12 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  levelBadge: { backgroundColor: "#FFF8E1", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "#FFD700" },
  levelBadgeText: { fontSize: 13, fontWeight: "bold", color: "#B8860B" },
  levelTitle: { fontSize: 14, fontWeight: "bold", color: "#B8860B" },
  settingsMenuItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  settingsMenuLabel: { fontSize: 15, color: C.text },
  settingsMenuValue: { fontSize: 13, color: C.textSub, marginTop: 2 },
  addressLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 6, marginTop: 16 },
  // 主催者
  organizerBadge: { backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  organizerBadgeText: { fontSize: 12, fontWeight: "bold", color: C.warning },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  addBtn: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  emptyBox: { backgroundColor: C.card, borderRadius: 12, padding: 24, alignItems: "center", marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.textSub, marginBottom: 12 },
  createBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  // 主催者ツールバー
  toolbarRow: {
    flexDirection: "row", backgroundColor: C.card, borderRadius: 12,
    padding: 12, marginBottom: 12, elevation: 2, justifyContent: "space-around",
  },
  toolbarItem: { alignItems: "center", gap: 6 },
  toolbarIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toolbarLabel: { fontSize: 11, fontWeight: "600", color: C.text },
  tournamentItem: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 2 },
  gameTag: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  tournamentName: { fontSize: 15, fontWeight: "bold", color: C.text },
  tournamentDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  csvImportBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primary + "15", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 4,
  },
  csvImportBtnText: { fontSize: 11, fontWeight: "bold", color: C.primary },
  deleteBtn: { padding: 8 },
  applyCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2 },
  pendingCard: { backgroundColor: "#FFFBEB", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#FDE68A" },
  rejectedCard: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#FECACA" },
  applyTitle: { fontSize: 15, fontWeight: "bold", color: C.text },
  applySub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  // 交換履歴
  exchangeHistoryItem: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, elevation: 2 },
  exchangeHistoryIcon: { fontSize: 28 },
  exchangeHistoryName: { fontSize: 14, fontWeight: "bold", color: C.text },
  exchangeHistoryDate: { fontSize: 12, color: C.textSub, marginTop: 2 },
  exchangeStatusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  exchangeStatusText: { fontSize: 11, fontWeight: "bold" },
  // プレミアム
  premiumCard: { backgroundColor: "#FFFBEB", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4, elevation: 2, borderWidth: 1, borderColor: "#FDE68A" },
  premiumCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  premiumIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  premiumCardTitle: { fontSize: 15, fontWeight: "bold", color: "#92400E" },
  premiumCardSub: { fontSize: 12, color: "#B45309", marginTop: 2 },
  // メニュー
  menuItem: { backgroundColor: C.card, flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 2, gap: 12 },
  menuLabel: { fontSize: 15, color: C.text },
  // フッター
  legalFooter: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 8 },
  legalLink: { fontSize: 12, color: C.textSub, textDecorationLine: "underline" },
  legalSep: { fontSize: 12, color: C.textSub },
  // 編集モーダル
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  editSheet: { backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%" },
  editTitle: { fontSize: 16, fontWeight: "bold", color: C.text, marginBottom: 8 },
  editDesc: { fontSize: 13, color: C.textSub, marginBottom: 12 },
  editInput: { backgroundColor: C.bg, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  editCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  editCancelText: { fontSize: 14, color: C.textSub },
  editSaveBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  editSaveText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  // 通知設定モーダル
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  modalHeaderTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  modalHeaderBtn: { minWidth: 60, alignItems: "center" },
  modalHeaderClose: { fontSize: 15, color: C.primary, fontWeight: "bold" },
  notifSectionLabel: { fontSize: 13, fontWeight: "bold", color: C.textSub, marginBottom: 8, marginTop: 8 },
  notifSection: { backgroundColor: C.card, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  notifToggleItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  notifDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  notifLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifLabel: { fontSize: 15, color: C.text },
  notifDesc: { fontSize: 12, color: C.textSub, marginTop: 2, marginLeft: 24 },
  // 法的
  legalContainer: { flex: 1, backgroundColor: C.bg },
  legalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  legalTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  legalClose: { fontSize: 15, color: C.primary, fontWeight: "bold" },
  legalBody: { flex: 1, padding: 16 },
  legalHeading: { fontSize: 18, fontWeight: "bold", color: C.text, marginBottom: 4 },
  legalDate: { fontSize: 12, color: C.textSub, marginBottom: 20 },
  legalText: { fontSize: 14, color: C.text, lineHeight: 24 },
});
