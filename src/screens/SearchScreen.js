import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useTournaments } from "../hooks/useTournaments";
import { useOrganizer } from "../hooks/useOrganizer";
import TournamentDetailModal from "../components/TournamentDetailModal";
import FilterModal from "../components/FilterModal";
import SortModal, { SORT_OPTIONS } from "../components/SortModal";
import OrganizerApplyModal from "../components/OrganizerApplyModal";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function CalendarView({ tournaments, onSelect }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tournamentDates = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate();
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tournaments, year, month]);

  const selectedDayTournaments = selectedDay ? (tournamentDates[selectedDay] || []) : [];
  const totalThisMonth = Object.values(tournamentDates).reduce((sum, arr) => sum + arr.length, 0);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };
  const handleDayPress = (day) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.container}>
      {/* ヘッダー */}
      <View style={cal.headerBar}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={cal.monthBtn}>
          <Text style={cal.monthText}>{year}年 {month + 1}月</Text>
          {!isCurrentMonth && (
            <View style={cal.todayBtnSmall}>
              <Text style={cal.todayBtnSmallText}>今日</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* サマリー */}
      <View style={cal.summaryBar}>
        <Ionicons name="calendar-outline" size={14} color={C.textSub} />
        <Text style={cal.summaryText}>
          {totalThisMonth > 0 ? `今月 ${totalThisMonth}件の大会` : "今月の大会はありません"}
        </Text>
      </View>

      {/* 曜日ラベル */}
      <View style={cal.dayRow}>
        {DAYS.map((d, i) => (
          <View key={i} style={cal.dayLabelWrap}>
            <Text style={[cal.dayLabel, i === 0 && { color: "#EF4444" }, i === 6 && { color: "#3B82F6" }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* カレンダーグリッド */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          const hasTournament = day && tournamentDates[day];
          const tCount = hasTournament ? tournamentDates[day].length : 0;
          const isToday = day && isCurrentMonth && day === today.getDate();
          const isSelected = day && day === selectedDay;
          const dayOfWeek = i % 7;
          const isPast = day && isCurrentMonth && day < today.getDate();

          return (
            <TouchableOpacity
              key={i}
              style={cal.cell}
              onPress={() => day && handleDayPress(day)}
              activeOpacity={day ? 0.6 : 1}
            >
              {day ? (
                <View style={[cal.cellInner, isSelected && cal.selectedCellInner]}>
                  {isToday && <View style={cal.todayCircle} />}
                  <Text style={[
                    cal.cellText,
                    isToday && cal.todayText,
                    isSelected && !isToday && cal.selectedText,
                    dayOfWeek === 0 && !isToday && !isSelected && { color: "#EF4444" },
                    dayOfWeek === 6 && !isToday && !isSelected && { color: "#3B82F6" },
                    isPast && !isToday && !isSelected && { opacity: 0.4 },
                  ]}>
                    {day}
                  </Text>
                  {hasTournament && (
                    <View style={cal.dotRow}>
                      {tournamentDates[day].slice(0, 3).map((t, j) => (
                        <View key={j} style={[cal.dot, { backgroundColor: t.game_color || C.primary }]} />
                      ))}
                    </View>
                  )}
                  {tCount > 3 && <Text style={cal.countBadge}>+{tCount - 3}</Text>}
                </View>
              ) : (
                <View style={cal.cellInner} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* イベントセクション */}
      <View style={cal.eventSection}>
        <View style={cal.eventSectionHeader}>
          <Text style={cal.eventSectionTitle}>
            {selectedDay ? `${month + 1}月${selectedDay}日の大会` : "今月の大会一覧"}
          </Text>
          {selectedDay && (
            <TouchableOpacity onPress={() => setSelectedDay(null)}>
              <Text style={cal.clearText}>全て表示</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={cal.eventList} showsVerticalScrollIndicator={false}>
          {selectedDay ? (
            selectedDayTournaments.length > 0 ? (
              selectedDayTournaments.map((t) => renderEventCard(t, onSelect, month))
            ) : (
              <View style={cal.noEventWrap}>
                <Ionicons name="calendar-outline" size={28} color={C.border} />
                <Text style={cal.noEvent}>この日の大会はありません</Text>
              </View>
            )
          ) : (
            Object.keys(tournamentDates).length > 0 ? (
              Object.entries(tournamentDates)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([day, ts]) => (
                  <View key={day}>
                    <View style={cal.dayHeader}>
                      <Text style={cal.dayHeaderText}>{month + 1}/{day}（{DAYS[new Date(year, month, Number(day)).getDay()]}）</Text>
                      <Text style={cal.dayHeaderCount}>{ts.length}件</Text>
                    </View>
                    {ts.map((t) => renderEventCard(t, onSelect, month))}
                  </View>
                ))
            ) : (
              <View style={cal.noEventWrap}>
                <Ionicons name="calendar-outline" size={36} color={C.border} />
                <Text style={cal.noEvent}>この月の大会はありません</Text>
              </View>
            )
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// イベントカード共通レンダリング
function renderEventCard(t, onSelect) {
  return (
    <TouchableOpacity key={t.id} style={cal.eventCard} onPress={() => onSelect(t)}>
      <View style={[cal.eventColorBar, { backgroundColor: t.game_color || C.primary }]} />
      <View style={cal.eventCardBody}>
        <View style={cal.eventCardTop}>
          <Text style={[cal.eventGameTag, { color: t.game_color || C.primary }]}>{t.game}</Text>
          <Text style={cal.eventTime}>
            {new Date(t.date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <Text style={cal.eventName} numberOfLines={1}>{t.name}</Text>
        <View style={cal.eventMeta}>
          <View style={cal.eventMetaItem}>
            <Ionicons name="person-outline" size={12} color={C.textSub} />
            <Text style={cal.eventMetaText}>{t.organizer}</Text>
          </View>
          {t.location ? (
            <View style={cal.eventMetaItem}>
              <Ionicons name="location-outline" size={12} color={C.textSub} />
              <Text style={cal.eventMetaText}>{t.location}</Text>
            </View>
          ) : null}
        </View>
        {t.isEntered && (
          <View style={cal.calEnteredBadge}>
            <Text style={cal.calEnteredBadgeText}>エントリー済</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textSub} style={{ marginRight: 8 }} />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const { organizerStatus, applyOrganizer } = useOrganizer();
  const showOrganizerCta = organizerStatus !== "approved" && organizerStatus !== "pending";
  const [filterGames, setFilterGames] = useState([]);
  const [filterLocation, setFilterLocation] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterEntryFeeType, setFilterEntryFeeType] = useState("");
  const [filterLocationType, setFilterLocationType] = useState("");
  const [filterPrefecture, setFilterPrefecture] = useState("");
  const [filterSelectedTags, setFilterSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("date_asc");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const { tournaments, loading, search, toggleFavorite, toggleEntry } = useTournaments();

  const currentFilters = {
    games: filterGames, dateFrom, dateTo, location: filterLocation,
    entryFeeType: filterEntryFeeType, locationType: filterLocationType,
    prefecture: filterPrefecture, selectedTags: filterSelectedTags,
  };

  const doSearch = (overrides = {}) => {
    search({
      query: overrides.query !== undefined ? overrides.query : query,
      games: overrides.games !== undefined ? overrides.games : filterGames,
      dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom,
      dateTo: overrides.dateTo !== undefined ? overrides.dateTo : dateTo,
      location: overrides.location !== undefined ? overrides.location : filterLocation,
      entryFeeType: overrides.entryFeeType !== undefined ? overrides.entryFeeType : filterEntryFeeType,
      locationType: overrides.locationType !== undefined ? overrides.locationType : filterLocationType,
      prefecture: overrides.prefecture !== undefined ? overrides.prefecture : filterPrefecture,
      selectedTags: overrides.selectedTags !== undefined ? overrides.selectedTags : filterSelectedTags,
      sortBy: overrides.sortBy !== undefined ? overrides.sortBy : sortBy,
    });
  };

  const handleSearch = (text) => { setQuery(text); doSearch({ query: text }); };
  const handleApplyFilter = (f) => {
    setFilterGames(f.games); setDateFrom(f.dateFrom); setDateTo(f.dateTo); setFilterLocation(f.location);
    setFilterEntryFeeType(f.entryFeeType); setFilterLocationType(f.locationType);
    setFilterPrefecture(f.prefecture); setFilterSelectedTags(f.selectedTags);
    doSearch({
      games: f.games, dateFrom: f.dateFrom, dateTo: f.dateTo, location: f.location,
      entryFeeType: f.entryFeeType, locationType: f.locationType,
      prefecture: f.prefecture, selectedTags: f.selectedTags,
    });
  };
  const handleSortChange = (newSort) => { setSortBy(newSort); doSearch({ sortBy: newSort }); };
  const handleToggleFavorite = async (t) => {
    await toggleFavorite(t);
    if (selectedTournament?.id === t.id) setSelectedTournament({ ...t, isFavorite: !t.isFavorite });
  };
  const handleToggleEntry = async (t) => {
    await toggleEntry(t);
    if (selectedTournament?.id === t.id) setSelectedTournament({ ...t, isEntered: !t.isEntered });
  };

  const activeFilterCount =
    filterGames.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (filterLocation ? 1 : 0) +
    (filterEntryFeeType ? 1 : 0) + (filterLocationType ? 1 : 0) + (filterPrefecture ? 1 : 0) +
    filterSelectedTags.length;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={C.textSub} />
        <TextInput style={styles.searchInput} placeholder="大会名・ゲーム・主催者で検索..." placeholderTextColor={C.textSub} value={query} onChangeText={handleSearch} />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textSub} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.controlBar}>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]} onPress={() => setViewMode("list")}>
            <Ionicons name="list" size={16} color={viewMode === "list" ? "#fff" : C.textSub} />
            <Text style={[styles.toggleText, viewMode === "list" && { color: "#fff" }]}>リスト</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === "calendar" && styles.toggleBtnActive]} onPress={() => setViewMode("calendar")}>
            <Ionicons name="calendar" size={16} color={viewMode === "calendar" ? "#fff" : C.textSub} />
            <Text style={[styles.toggleText, viewMode === "calendar" && { color: "#fff" }]}>カレンダー</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity style={[styles.sortBtn, sortBy !== "date_asc" && styles.sortBtnActive]} onPress={() => setShowSort(true)}>
            <Ionicons name="swap-vertical" size={16} color={sortBy !== "date_asc" ? "#fff" : C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? "#fff" : C.text} />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: "#fff" }]}>
              {activeFilterCount > 0 ? `フィルター(${activeFilterCount})` : "フィルター"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {showOrganizerCta && (
        <TouchableOpacity style={styles.organizerCta} onPress={() => setShowApplyModal(true)}>
          <Ionicons name="ribbon-outline" size={20} color={C.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.organizerCtaTitle}>主催者になりませんか？</Text>
            <Text style={styles.organizerCtaSub}>大会を投稿・管理できるようになります</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textSub} />
        </TouchableOpacity>
      )}
      <FilterModal visible={showFilter} onClose={() => setShowFilter(false)} filters={currentFilters} onApply={handleApplyFilter} />
      <SortModal visible={showSort} onClose={() => setShowSort(false)} sortBy={sortBy} onSelect={handleSortChange} />
      <OrganizerApplyModal visible={showApplyModal} onClose={() => setShowApplyModal(false)} onApply={applyOrganizer} />
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : viewMode === "list" ? (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {tournaments.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>大会が見つかりません</Text></View>
          ) : (
            tournaments.map((t) => (
              <TouchableOpacity key={t.id} style={styles.card} onPress={() => setSelectedTournament(t)} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <View style={styles.resultMeta}>
                    <Text style={[styles.gameTag, { color: t.game_color }]}>{t.game}</Text>
                    <Text style={styles.dateText}>{new Date(t.date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleToggleFavorite(t)}>
                    <Ionicons name={t.isFavorite ? "heart" : "heart-outline"} size={20} color={t.isFavorite ? "#EF4444" : C.textSub} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tournamentName}>{t.name}</Text>
                <Text style={styles.organizerText}>{t.organizer}</Text>
                {t.location ? <Text style={styles.locationText}>{t.location}</Text> : null}
                <View style={styles.badgeRow}>
                  {t.entry_fee_type === "paid" ? (
                    <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>有料{t.entry_fee_amount ? ` ¥${t.entry_fee_amount}` : ""}</Text></View>
                  ) : (
                    <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>無料</Text></View>
                  )}
                  {t.location_type === "online" ? (
                    <View style={styles.onlineBadge}><Text style={styles.onlineBadgeText}>オンライン</Text></View>
                  ) : t.prefecture ? (
                    <View style={styles.offlineBadge}><Text style={styles.offlineBadgeText}>{t.prefecture}</Text></View>
                  ) : null}
                </View>
                <View style={styles.cardBottom}>
                  <View style={styles.tagRow}>
                    {(t.tags || []).map((tag, j) => (<View key={j} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>))}
                  </View>
                  {t.isEntered && (<View style={styles.enteredBadge}><Text style={styles.enteredBadgeText}>エントリー済</Text></View>)}
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : (
        <CalendarView tournaments={tournaments} onSelect={setSelectedTournament} />
      )}
      <TournamentDetailModal tournament={selectedTournament} visible={!!selectedTournament} onClose={() => setSelectedTournament(null)} onToggleFavorite={handleToggleFavorite} onToggleEntry={handleToggleEntry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, marginHorizontal: 16, marginTop: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  controlBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  toggleRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 8, padding: 3, gap: 2 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 13, fontWeight: "600", color: C.textSub },
  sortBtn: { alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  sortBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterBtnText: { fontSize: 13, color: C.text },
  list: { flex: 1, paddingHorizontal: 16 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  gameTag: { fontSize: 12, fontWeight: "bold" },
  dateText: { fontSize: 12, color: C.textSub },
  tournamentName: { fontSize: 15, fontWeight: "bold", color: C.text },
  organizerText: { fontSize: 13, color: C.textSub, marginTop: 4 },
  locationText: { fontSize: 12, color: C.textSub, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  freeBadge: { backgroundColor: "#DCFCE7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  freeBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "bold" },
  paidBadge: { backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  paidBadgeText: { fontSize: 11, color: "#D97706", fontWeight: "bold" },
  onlineBadge: { backgroundColor: "#DBEAFE", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  onlineBadgeText: { fontSize: 11, color: "#3B82F6", fontWeight: "bold" },
  offlineBadge: { backgroundColor: "#FEE2E2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  offlineBadgeText: { fontSize: 11, color: "#EF4444", fontWeight: "bold" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  tag: { backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: C.textSub },
  enteredBadge: { backgroundColor: "#DCFCE7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  enteredBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "bold" },
  organizerCta: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF3ED", marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FFDFCC" },
  organizerCtaTitle: { fontSize: 13, fontWeight: "bold", color: C.text },
  organizerCtaSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: C.textSub },
});

const cal = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, backgroundColor: C.card, marginHorizontal: 16, marginTop: 4, borderRadius: 12 },
  navBtn: { padding: 10 },
  monthBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthText: { fontSize: 17, fontWeight: "bold", color: C.text },
  todayBtnSmall: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  todayBtnSmallText: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  summaryBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 6 },
  summaryText: { fontSize: 12, color: C.textSub },
  dayRow: { flexDirection: "row", paddingHorizontal: 12, marginTop: 4 },
  dayLabelWrap: { flex: 1, alignItems: "center", paddingVertical: 6 },
  dayLabel: { fontSize: 12, fontWeight: "600", color: C.textSub },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  cell: { width: "14.28%", paddingVertical: 2, alignItems: "center" },
  cellInner: { width: 38, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  selectedCellInner: { backgroundColor: "#FFF3ED" },
  todayCircle: { position: "absolute", top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary },
  cellText: { fontSize: 14, color: C.text, zIndex: 1 },
  todayText: { color: "#fff", fontWeight: "bold" },
  selectedText: { color: C.primary, fontWeight: "bold" },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  countBadge: { fontSize: 8, color: C.textSub, fontWeight: "bold" },
  eventSection: { flex: 1, marginTop: 8 },
  eventSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card },
  eventSectionTitle: { fontSize: 14, fontWeight: "bold", color: C.text },
  clearText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  eventList: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4, marginTop: 4 },
  dayHeaderText: { fontSize: 13, fontWeight: "bold", color: C.text },
  dayHeaderCount: { fontSize: 11, color: C.textSub, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  eventCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, marginBottom: 8, elevation: 1, overflow: "hidden" },
  eventColorBar: { width: 4, alignSelf: "stretch" },
  eventCardBody: { flex: 1, padding: 12, paddingLeft: 10 },
  eventCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eventGameTag: { fontSize: 12, fontWeight: "bold" },
  eventTime: { fontSize: 11, color: C.textSub },
  eventName: { fontSize: 14, fontWeight: "bold", color: C.text, marginTop: 3 },
  eventMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  eventMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  eventMetaText: { fontSize: 11, color: C.textSub },
  calEnteredBadge: { backgroundColor: "#DCFCE7", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 },
  calEnteredBadgeText: { fontSize: 10, color: "#16A34A", fontWeight: "bold" },
  noEventWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  noEvent: { fontSize: 14, color: C.textSub },
});
