import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput, Modal, Linking, ActivityIndicator, Image, RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { useAdRewards } from "../hooks/useAdRewards";
import { useSponsorItems } from "../hooks/useSponsorItems";
import { useProfile } from "../hooks/useProfile";
import { showError } from "../utils/errorHelper";
import RewardedAdButton from "../components/RewardedAdButton";
import ShippingAddressModal from "../components/ShippingAddressModal";
import RouletteModal from "../components/RouletteModal";
import { POINTS_PER_AD } from "../constants/adConfig";

export default function SponsorScreen() {
  const { user } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [showSponsorInfo, setShowSponsorInfo] = useState(false);
  const { canWatchAd, remainingViews, adLoading, showRewardedAd } = useAdRewards();
  const {
    exchangeItems, instantLotteryItems, applicationLotteryItems,
    instantPrizes, myEntries,
    loading: itemsLoading, exchangeItem, enterLottery, playInstantLottery, refetch,
  } = useSponsorItems();
  const { updateShippingAddress, getShippingAddress } = useProfile();

  const [ticketCounts, setTicketCounts] = useState({});
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [pendingExchangeItem, setPendingExchangeItem] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 即時抽選用
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteItem, setRouletteItem] = useState(null);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);

  // 確率情報モーダル
  const [probModalItem, setProbModalItem] = useState(null);

  // 配送先住所（即時抽選当選時）
  const [showWinAddressModal, setShowWinAddressModal] = useState(false);
  const [pendingWinResult, setPendingWinResult] = useState(null);

  React.useEffect(() => { fetchPoints(); }, [user]);

  const fetchPoints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    if (data) setPoints(data.points || 0);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPoints(), refetch()]);
    setRefreshing(false);
  }, [user, refetch]);

  const handleWatchAd = async () => {
    const result = await showRewardedAd();
    if (!result.error) {
      await fetchPoints();
      Alert.alert("ポイント獲得!", `${POINTS_PER_AD}ptを獲得しました!`);
    } else if (typeof result.error === "string") {
      Alert.alert("お知らせ", result.error);
    } else {
      showError(result.error, "ポイントの付与に失敗しました");
    }
  };

  const handleExchange = (item) => {
    if (points < item.point_cost) {
      Alert.alert("ポイント不足", `${item.point_cost}pt必要です（現在${points}pt）`);
      return;
    }
    if (item.stock !== null && item.stock <= 0) {
      Alert.alert("在庫切れ", "この商品は現在在庫切れです");
      return;
    }

    if (item.delivery_type === "physical") {
      setPendingExchangeItem(item);
      setShowAddressModal(true);
    } else {
      Alert.alert("交換確認", `${item.name}と交換しますか？\n${item.point_cost}ptを消費します`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "交換する", onPress: async () => {
            const { error } = await exchangeItem(item, points);
            if (!error) {
              setPoints(points - item.point_cost);
              Alert.alert("交換申請完了!", `${item.name}の交換を受け付けました。\n運営から個別にご連絡します。`);
            } else {
              showError(error, "交換に失敗しました");
            }
          }
        },
      ]);
    }
  };

  const handleAddressSubmit = async (addressData) => {
    if (!pendingExchangeItem) return;
    setAddressLoading(true);
    await updateShippingAddress(addressData);
    const { error } = await exchangeItem(pendingExchangeItem, points, addressData);
    setAddressLoading(false);

    if (!error) {
      setPoints(points - pendingExchangeItem.point_cost);
      setShowAddressModal(false);
      setPendingExchangeItem(null);
      Alert.alert("交換申請完了!", `${pendingExchangeItem.name}の交換を受け付けました。\n配送先に発送いたします。`);
    } else {
      showError(error, "交換に失敗しました");
    }
  };

  const getTicketCount = (itemId) => ticketCounts[itemId] || 1;
  const setTicketCount = (itemId, count) => {
    setTicketCounts((prev) => ({ ...prev, [itemId]: Math.max(1, count) }));
  };

  const handleEnterLottery = (item) => {
    const count = getTicketCount(item.id);
    const totalCost = item.point_cost * count;
    if (points < totalCost) {
      Alert.alert("ポイント不足", `${totalCost}pt必要です（現在${points}pt）`);
      return;
    }
    Alert.alert(
      "抽選に投票",
      `${count}口 × ${item.point_cost}pt = ${totalCost}ptを消費して投票しますか？\n\n投票口数が多いほど当選確率がUPします！`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "投票する", onPress: async () => {
            const { error } = await enterLottery(item, count, points);
            if (!error) {
              setPoints(points - totalCost);
              setTicketCounts((prev) => ({ ...prev, [item.id]: 1 }));
              Alert.alert("投票完了!", `${count}口を投票しました`);
            } else {
              showError(error, "投票に失敗しました");
            }
          }
        },
      ]
    );
  };

  const handleInstantLottery = (item) => {
    if (points < item.point_cost) {
      Alert.alert("ポイント不足", `${item.point_cost}pt必要です（現在${points}pt）`);
      return;
    }

    const prizes = instantPrizes[item.id] || [];
    const availablePrizes = prizes.filter((p) => p.stock === null || p.stock > 0);
    if (availablePrizes.length === 0) {
      Alert.alert("終了", "この抽選の景品は全て終了しています");
      return;
    }

    Alert.alert(
      "🎰 チャレンジ確認",
      `${item.point_cost}ptを消費してチャレンジしますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "チャレンジ！",
          onPress: async () => {
            setChallengeLoading(true);
            const result = await playInstantLottery(item, points);
            setChallengeLoading(false);
            if (result.error) {
              showError(result.error, "抽選に失敗しました");
            } else {
              setPoints(points - item.point_cost + (result.pointsRefunded || 0));
              setRouletteItem(item);
              setRouletteResult(result);
              setShowRoulette(true);
            }
          },
        },
      ]
    );
  };

  const getMyProbability = (item) => {
    const myTotal = myEntries[item.id] || 0;
    if (myTotal === 0 || !item.total_points_invested) return null;
    return ((myTotal / item.total_points_invested) * 100).toFixed(1);
  };

  // 残り時間テキスト生成
  const getRemainingTimeText = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end - now;
    if (diffMs <= 0) return null;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `あと${diffDays}日`;
    if (diffHours > 0) return `あと${diffHours}時間`;
    return `あと${diffMinutes}分`;
  };

  const hasAnyItems = exchangeItems.length > 0 || instantLotteryItems.length > 0 || applicationLotteryItems.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
    >
      {/* ポイントカード */}
      <View style={styles.pointCard}>
        <Text style={styles.pointLabel}>現在の保有ポイント</Text>
        <Text style={styles.pointValue}>{points.toLocaleString()} pt</Text>
        <Text style={styles.pointBonus}>大会参加・動画視聴でポイントが貯まります</Text>
      </View>

      {/* 広告視聴ボタン */}
      <RewardedAdButton
        canWatchAd={canWatchAd}
        remainingViews={remainingViews}
        adLoading={adLoading}
        onPress={handleWatchAd}
      />

      {/* スポンサー募集CTA */}
      <TouchableOpacity style={styles.sponsorCta} onPress={() => setShowSponsorInfo(true)}>
        <View style={styles.sponsorCtaLeft}>
          <View style={styles.sponsorCtaIcon}>
            <Ionicons name="megaphone-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sponsorCtaTitle}>スポンサーになりませんか？</Text>
            <Text style={styles.sponsorCtaSub}>協賛品を提供してアプリ内で宣伝できます</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textSub} />
      </TouchableOpacity>

      {itemsLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
      ) : !hasAnyItems ? (
        <View style={styles.empty}>
          <Ionicons name="gift-outline" size={48} color={C.border} />
          <Text style={styles.emptyText}>協賛商品はまだありません</Text>
          <Text style={styles.emptySubText}>動画視聴でポイントを貯めて{"\n"}商品が追加されるのをお待ちください</Text>
        </View>
      ) : (
        <>
          {/* ========== ポイント交換所 ========== */}
          {exchangeItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="swap-horizontal-outline" size={18} color={C.text} />
                <Text style={styles.sectionTitle}>ポイント交換所</Text>
              </View>
              <View style={styles.exchangeGrid}>
                {exchangeItems.map((item) => (
                  <View key={item.id} style={styles.exchangeCard}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.exchangeThumb} />
                    ) : (
                      <Text style={styles.exchangeIcon}>{item.icon}</Text>
                    )}
                    <Text style={styles.exchangeName}>{item.name}</Text>
                    {item.sponsor_name && (
                      <Text style={styles.exchangeSponsor}>提供: {item.sponsor_name}</Text>
                    )}
                    <Text style={styles.exchangePt}>{item.point_cost} pt</Text>
                    {item.stock !== null && (
                      <Text style={styles.stockText}>
                        {item.stock > 0 ? `残り ${item.stock}個` : "在庫切れ"}
                      </Text>
                    )}
                    {item.delivery_type === "physical" && (
                      <View style={styles.deliveryBadge}>
                        <Ionicons name="cube-outline" size={11} color={C.textSub} />
                        <Text style={styles.deliveryBadgeText}>配送</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.exchangeBtn, (item.stock !== null && item.stock <= 0) && styles.exchangeBtnDisabled]}
                      onPress={() => handleExchange(item)}
                      disabled={item.stock !== null && item.stock <= 0}
                    >
                      <Text style={[styles.exchangeBtnText, (item.stock !== null && item.stock <= 0) && { color: C.textSub }]}>
                        {item.stock !== null && item.stock <= 0 ? "在庫切れ" : "交換する"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ========== 即時抽選 ========== */}
          {instantLotteryItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18 }}>🎰</Text>
                <Text style={styles.sectionTitle}>即時抽選</Text>
              </View>
              <View style={styles.instantHint}>
                <Ionicons name="flash-outline" size={16} color={C.primary} />
                <Text style={styles.instantHintText}>ポイントを消費してその場で結果がわかります！</Text>
              </View>

              {instantLotteryItems.map((item) => {
                const prizes = instantPrizes[item.id] || [];
                const hasAvailablePrizes = prizes.some((p) => (p.stock === null || p.stock > 0) && p.is_winning);
                const allPrizesGone = prizes.filter((p) => p.is_winning).every((p) => p.stock !== null && p.stock <= 0);

                return (
                  <View key={item.id} style={styles.instantCard}>
                    <View style={styles.lotteryHeader}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.lotteryThumb} />
                      ) : (
                        <Text style={styles.lotteryIcon}>{item.icon}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lotteryName}>{item.name}</Text>
                        {item.sponsor_name && (
                          <Text style={styles.lotterySponsor}>提供: {item.sponsor_name}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.infoBtn}
                        onPress={() => setProbModalItem(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="information-circle-outline" size={22} color={C.primary} />
                      </TouchableOpacity>
                      {allPrizesGone ? (
                        <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>終了</Text></View>
                      ) : (
                        <View style={styles.instantBadge}><Text style={styles.instantBadgeText}>挑戦可</Text></View>
                      )}
                    </View>

                    {/* 残り時間表示 */}
                    {item.lottery_end_at && getRemainingTimeText(item.lottery_end_at) && (
                      <View style={styles.countdownBadge}>
                        <Ionicons name="time-outline" size={13} color="#D97706" />
                        <Text style={styles.countdownText}>{getRemainingTimeText(item.lottery_end_at)}</Text>
                      </View>
                    )}

                    {item.description && (
                      <Text style={styles.lotteryDesc}>{item.description}</Text>
                    )}

                    <View style={styles.instantCostRow}>
                      <Ionicons name="ticket-outline" size={16} color={C.primary} />
                      <Text style={styles.instantCostText}>1回 = {item.point_cost}pt</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.challengeBtn, (allPrizesGone || challengeLoading) && styles.challengeBtnDisabled]}
                      onPress={() => handleInstantLottery(item)}
                      disabled={allPrizesGone || challengeLoading}
                    >
                      {challengeLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 20 }}>🎰</Text>
                          <Text style={styles.challengeBtnText}>
                            {allPrizesGone ? "景品終了" : "チャレンジ！"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {/* ========== 応募抽選 ========== */}
          {applicationLotteryItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18 }}>📮</Text>
                <Text style={styles.sectionTitle}>応募抽選</Text>
              </View>
              <View style={styles.lotteryHint}>
                <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
                <Text style={styles.lotteryHintText}>投票口数が多いほど当選確率がUPします！</Text>
              </View>

              {applicationLotteryItems.map((item) => {
                const myTotal = myEntries[item.id] || 0;
                const probability = getMyProbability(item);
                const ticketCount = getTicketCount(item.id);
                const totalCost = item.point_cost * ticketCount;
                const isDrawn = item.lottery_status === "drawn";
                const isClosed = item.lottery_status === "closed";

                return (
                  <View key={item.id} style={styles.lotteryCard}>
                    <View style={styles.lotteryHeader}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.lotteryThumb} />
                      ) : (
                        <Text style={styles.lotteryIcon}>{item.icon}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lotteryName}>{item.name}</Text>
                        {item.sponsor_name && (
                          <Text style={styles.lotterySponsor}>提供: {item.sponsor_name}</Text>
                        )}
                      </View>
                      {isDrawn ? (
                        <View style={styles.drawnBadge}><Text style={styles.drawnBadgeText}>抽選済</Text></View>
                      ) : isClosed ? (
                        <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>締切</Text></View>
                      ) : (
                        <View style={styles.openBadge}><Text style={styles.openBadgeText}>受付中</Text></View>
                      )}
                    </View>

                    {/* 残り時間表示 */}
                    {item.lottery_end_at && getRemainingTimeText(item.lottery_end_at) && !isDrawn && !isClosed && (
                      <View style={styles.countdownBadge}>
                        <Ionicons name="time-outline" size={13} color="#D97706" />
                        <Text style={styles.countdownText}>{getRemainingTimeText(item.lottery_end_at)}</Text>
                      </View>
                    )}

                    {item.description && (
                      <Text style={styles.lotteryDesc}>{item.description}</Text>
                    )}

                    <View style={styles.lotteryStats}>
                      <View style={styles.lotteryStat}>
                        <Text style={styles.lotteryStatLabel}>参加者</Text>
                        <Text style={styles.lotteryStatValue}>{item.total_entries || 0}人</Text>
                      </View>
                      <View style={styles.lotteryStatDivider} />
                      <View style={styles.lotteryStat}>
                        <Text style={styles.lotteryStatLabel}>合計投票</Text>
                        <Text style={styles.lotteryStatValue}>{item.total_points_invested || 0}pt</Text>
                      </View>
                      <View style={styles.lotteryStatDivider} />
                      <View style={styles.lotteryStat}>
                        <Text style={styles.lotteryStatLabel}>1口</Text>
                        <Text style={styles.lotteryStatValue}>{item.point_cost}pt</Text>
                      </View>
                    </View>

                    {myTotal > 0 && (
                      <View style={styles.myEntryBar}>
                        <Ionicons name="person" size={14} color={C.primary} />
                        <Text style={styles.myEntryText}>
                          あなたの投票: {myTotal}pt
                          {probability && ` （当選確率: ~${probability}%）`}
                        </Text>
                      </View>
                    )}

                    {!isDrawn && !isClosed && (
                      <View style={styles.lotteryAction}>
                        <View style={styles.ticketStepper}>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => setTicketCount(item.id, ticketCount - 1)}>
                            <Ionicons name="remove" size={18} color={C.text} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.ticketInput}
                            value={String(ticketCount)}
                            onChangeText={(t) => setTicketCount(item.id, parseInt(t) || 1)}
                            keyboardType="number-pad"
                            textAlign="center"
                          />
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => setTicketCount(item.id, ticketCount + 1)}>
                            <Ionicons name="add" size={18} color={C.text} />
                          </TouchableOpacity>
                          <Text style={styles.ticketUnit}>口</Text>
                        </View>
                        <Text style={styles.ticketCost}>{totalCost}pt 消費</Text>
                        <TouchableOpacity style={styles.voteBtn} onPress={() => handleEnterLottery(item)}>
                          <Ionicons name="ticket" size={16} color="#fff" />
                          <Text style={styles.voteBtnText}>投票する</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isDrawn && (
                      <View style={styles.drawnResult}>
                        <Ionicons name="trophy" size={20} color="#D97706" />
                        <Text style={styles.drawnResultText}>抽選は終了しました</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}

      <View style={{ height: 20 }} />

      {/* 配送先住所モーダル */}
      <ShippingAddressModal
        visible={showAddressModal}
        onClose={() => { setShowAddressModal(false); setPendingExchangeItem(null); }}
        onSubmit={handleAddressSubmit}
        initialAddress={getShippingAddress()}
        loading={addressLoading}
      />

      {/* ルーレットモーダル */}
      <RouletteModal
        visible={showRoulette}
        prizes={rouletteItem ? (instantPrizes[rouletteItem.id] || []) : []}
        result={rouletteResult}
        pointCost={rouletteItem?.point_cost || 0}
        onClose={() => {
          setShowRoulette(false);
          const winResult = rouletteResult;
          const winItem = rouletteItem;
          setRouletteItem(null);
          setRouletteResult(null);
          fetchPoints();
          refetch();

          // 郵送景品の当選 → 配送先入力
          if (winResult?.isWin && winResult?.prize?.delivery_type === "physical") {
            setPendingWinResult({ ...winResult, item: winItem });
            setShowWinAddressModal(true);
          }
        }}
      />

      {/* 即時抽選当選時の配送先住所モーダル */}
      <ShippingAddressModal
        visible={showWinAddressModal}
        onClose={() => { setShowWinAddressModal(false); setPendingWinResult(null); }}
        onSubmit={async (addressData) => {
          setAddressLoading(true);
          await updateShippingAddress(addressData);
          // 配送情報をpoint_exchangesに記録
          if (pendingWinResult) {
            await supabase.from("point_exchanges")
              .update({
                delivery_type: "physical",
                shipping_name: addressData.shipping_name,
                shipping_zip: addressData.shipping_zip,
                shipping_prefecture: addressData.shipping_prefecture,
                shipping_city: addressData.shipping_city,
                shipping_address: addressData.shipping_address,
                shipping_building: addressData.shipping_building || null,
                shipping_phone: addressData.shipping_phone,
              })
              .eq("user_id", user.id)
              .eq("item_id", pendingWinResult.item?.id)
              .eq("type", "instant_lottery_win")
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(1);
          }
          setAddressLoading(false);
          setShowWinAddressModal(false);
          setPendingWinResult(null);
          Alert.alert("配送先を登録しました", "当選おめでとうございます！\n運営から配送手続きを行います。");
        }}
        initialAddress={getShippingAddress()}
        loading={addressLoading}
      />

      {/* 確率情報モーダル */}
      <Modal visible={!!probModalItem} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.infoSheet}>
            <Text style={styles.infoTitle}>🎰 当選確率</Text>
            {probModalItem && (() => {
              const prizes = instantPrizes[probModalItem.id] || [];
              const totalWeight = prizes.reduce((sum, p) => sum + p.probability_weight, 0);
              return (
                <>
                  {prizes.filter(p => p.is_winning).length > 0 && (
                    <View style={styles.probSection}>
                      <Text style={styles.probSectionLabel}>当たり</Text>
                      {prizes.filter(p => p.is_winning).map((p) => (
                        <View key={p.id} style={styles.probRow}>
                          <Text style={styles.probIcon}>{p.icon}</Text>
                          <Text style={styles.probName}>{p.name}</Text>
                          <Text style={styles.probPercent}>
                            {totalWeight > 0 ? ((p.probability_weight / totalWeight) * 100).toFixed(1) : 0}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {prizes.filter(p => !p.is_winning).length > 0 && (
                    <View style={styles.probSection}>
                      <Text style={[styles.probSectionLabel, { color: C.textSub }]}>はずれ</Text>
                      {prizes.filter(p => !p.is_winning).map((p) => (
                        <View key={p.id} style={styles.probRow}>
                          <Text style={styles.probIcon}>{p.icon}</Text>
                          <Text style={styles.probName}>{p.name}</Text>
                          <Text style={[styles.probPercent, { color: C.textSub }]}>
                            {totalWeight > 0 ? ((p.probability_weight / totalWeight) * 100).toFixed(1) : 0}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={{ fontSize: 11, color: C.textSub, textAlign: "center", marginTop: 8 }}>
                    1回 = {probModalItem.point_cost}pt
                  </Text>
                </>
              );
            })()}
            <TouchableOpacity onPress={() => setProbModalItem(null)} style={styles.closeInfoBtn}>
              <Text style={styles.closeInfoText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* スポンサー情報モーダル */}
      <Modal visible={showSponsorInfo} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.infoSheet}>
            <Text style={styles.infoTitle}>スポンサーのお問い合わせ</Text>
            <Text style={styles.infoDesc}>
              カドスケ！で協賛品を提供いただけるスポンサー様を募集しています。{"\n\n"}
              ・アプリ内での商品掲載{"\n"}
              ・抽選イベントでの景品提供{"\n"}
              ・大会への協賛{"\n\n"}
              ご興味のある方は下記までお問い合わせください。
            </Text>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL("mailto:guerrilla.dcg@gmail.com?subject=カドスケ！スポンサーのお問い合わせ")}
            >
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>メールで問い合わせ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSponsorInfo(false)} style={styles.closeInfoBtn}>
              <Text style={styles.closeInfoText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12 },
  pointCard: { backgroundColor: C.dark, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16 },
  pointLabel: { color: "#aaa", fontSize: 13, marginBottom: 4 },
  pointValue: { color: "#fff", fontSize: 40, fontWeight: "bold", marginBottom: 6 },
  pointBonus: { color: "#4CAF50", fontSize: 12 },
  sponsorCta: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0F9FF", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#BAE6FD" },
  sponsorCtaLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  sponsorCtaIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  sponsorCtaTitle: { fontSize: 14, fontWeight: "bold", color: C.text },
  sponsorCtaSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: C.text },
  empty: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "bold", color: C.textSub },
  emptySubText: { fontSize: 13, color: C.textSub, marginTop: 4, textAlign: "center", lineHeight: 20 },

  // 交換
  exchangeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  exchangeCard: { width: "48%", backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: "center", elevation: 2 },
  exchangeIcon: { fontSize: 36, marginBottom: 8 },
  exchangeThumb: { width: 72, height: 72, borderRadius: 10, marginBottom: 8, backgroundColor: "#F3F4F6" },
  exchangeName: { fontSize: 13, fontWeight: "bold", color: C.text, textAlign: "center", marginBottom: 2 },
  exchangeSponsor: { fontSize: 10, color: C.textSub, marginBottom: 4 },
  exchangePt: { fontSize: 15, color: C.primary, fontWeight: "bold", marginBottom: 4 },
  stockText: { fontSize: 11, color: C.textSub, marginBottom: 6 },
  deliveryBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 },
  deliveryBadgeText: { fontSize: 10, color: C.textSub },
  exchangeBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center", width: "100%" },
  exchangeBtnDisabled: { backgroundColor: C.bg, borderColor: C.bg },
  exchangeBtnText: { fontSize: 13, color: C.text, fontWeight: "bold" },

  // 即時抽選
  instantHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF5F0", borderRadius: 8, padding: 10, marginBottom: 10 },
  instantHintText: { fontSize: 12, color: C.primary, fontWeight: "600" },
  instantCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, elevation: 2, marginBottom: 12, borderWidth: 1, borderColor: "#FFE0CC" },
  instantBadge: { backgroundColor: "#FFF0E6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  instantBadgeText: { fontSize: 11, color: C.primary, fontWeight: "bold" },
  instantCostRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 10 },
  instantCostText: { fontSize: 14, color: C.primary, fontWeight: "bold" },
  challengeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, width: "100%",
  },
  challengeBtnDisabled: { opacity: 0.5 },
  challengeBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  countdownBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, alignSelf: "flex-start" },
  countdownText: { fontSize: 12, color: "#D97706", fontWeight: "bold" },

  // 応募抽選
  lotteryHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", borderRadius: 8, padding: 10, marginBottom: 10 },
  lotteryHintText: { fontSize: 12, color: "#3B82F6", fontWeight: "600" },
  lotteryCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, elevation: 2, marginBottom: 12 },
  lotteryHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  lotteryIcon: { fontSize: 36 },
  lotteryThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#F3F4F6" },
  lotteryName: { fontSize: 16, fontWeight: "bold", color: C.text },
  lotterySponsor: { fontSize: 11, color: C.textSub, marginTop: 2 },
  lotteryDesc: { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 10 },
  openBadge: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  openBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "bold" },
  closedBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  closedBadgeText: { fontSize: 11, color: "#D97706", fontWeight: "bold" },
  drawnBadge: { backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  drawnBadgeText: { fontSize: 11, color: C.textSub, fontWeight: "bold" },
  lotteryStats: { flexDirection: "row", backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 10 },
  lotteryStat: { flex: 1, alignItems: "center" },
  lotteryStatLabel: { fontSize: 10, color: C.textSub, marginBottom: 2 },
  lotteryStatValue: { fontSize: 14, fontWeight: "bold", color: C.text },
  lotteryStatDivider: { width: 1, backgroundColor: C.border, marginVertical: 2 },
  myEntryBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF3ED", borderRadius: 8, padding: 10, marginBottom: 10 },
  myEntryText: { fontSize: 12, color: C.primary, fontWeight: "600" },
  lotteryAction: { alignItems: "center", paddingTop: 4 },
  ticketStepper: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  ticketInput: { width: 50, height: 36, backgroundColor: C.bg, borderRadius: 8, fontSize: 16, fontWeight: "bold", color: C.text, borderWidth: 1, borderColor: C.border },
  ticketUnit: { fontSize: 14, color: C.textSub, fontWeight: "600" },
  ticketCost: { fontSize: 13, color: C.textSub, marginBottom: 8 },
  voteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, width: "100%" },
  voteBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  drawnResult: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, backgroundColor: "#FEF3C7", borderRadius: 10 },
  drawnResultText: { fontSize: 14, color: "#92400E", fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  infoSheet: { backgroundColor: C.card, borderRadius: 16, padding: 24, width: "100%" },
  infoTitle: { fontSize: 18, fontWeight: "bold", color: C.text, marginBottom: 12 },
  infoDesc: { fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 16 },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 14 },
  contactBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  closeInfoBtn: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  closeInfoText: { fontSize: 14, color: C.textSub },
  infoBtn: { marginRight: 6 },
  probSection: { marginBottom: 12 },
  probSectionLabel: { fontSize: 13, fontWeight: "bold", color: C.primary, marginBottom: 6 },
  probRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.bg },
  probIcon: { fontSize: 22 },
  probName: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },
  probPercent: { fontSize: 15, fontWeight: "bold", color: C.primary },
});
