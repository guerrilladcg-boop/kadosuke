import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useTournaments } from "../hooks/useTournaments";
import TournamentDetailModal from "../components/TournamentDetailModal";
import FilterModal from "../components/FilterModal";
import SortModal, { SORT_OPTIONS } from "../components/SortModal";
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
function CalendarView({ tournaments, onSelect }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
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
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  return (
    <View style={cal.container}>
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={cal.monthText}>{year}年 {month + 1}月</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </TouchableOpacity>
      </View>
      <View style={cal.dayRow}>
        {DAYS.map((d, i) => (
          <Text key={i} style={[cal.dayLabel, i === 0 && { color: "#EF4444" }, i === 6 && { color: "#3B82F6" }]}>{d}</Text>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((day, i) => {
          const hasTournament = day && tournamentDates[day];
          const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          return (
            <TouchableOpacity
              key={i}
              style={[cal.cell, isToday && cal.todayCell]}
              onPress={() => hasTournament && onSelect(tournamentDates[day][0])}
              activeOpacity={hasTournament ? 0.7 : 1}
            >
              {day ? (
                <>
                  <Text style={[cal.cellText, isToday && cal.todayText, !day && { opacity: 0 }]}>{day}</Text>
                  {hasTournament && (
                    <View style={[cal.dot, { backgroundColor: tournamentDates[day][0].game_color || C.primary }]} />
                  )}
                </>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView style={cal.eventList}>
        {Object.entries(tournamentDates).sort((a, b) => a[0] - b[0]).map(([day, ts]) =>
          ts.map((t) => (
            <TouchableOpacity key={t.id} style={cal.eventItem} onPress={() => onSelect(t)}>
              <View style={[cal.eventDot, { backgroundColor: t.game_color }]} />
              <View style={{ flex: 1 }}>
                <Text style={cal.eventDate}>{month + 1}/{day}</Text>
                <Text style={cal.eventName}>{t.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textSub} />
            </TouchableOpacity>
          ))
        )}
        {Object.keys(tournamentDates).length === 0 && (
          <Text style={cal.noEvent}>この月の大会はありません</Text>
        )}
      </ScrollView>
    </View>
  );
}
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filterGames, setFilterGames] = useState([]);
  const [filterLocation, setFilterLocation] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date_asc");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const { tournaments, loading, search, toggleFavorite, toggleEntry } = useTournaments();

  const currentFilters = { games: filterGames, dateFrom, dateTo, location: filterLocation };

  const doSearch = (overrides = {}) => {
    search({
      query: overrides.query !== undefined ? overrides.query : query,
      games: overrides.games !== undefined ? overrides.games : filterGames,
      dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : dateFrom,
      dateTo: overrides.dateTo !== undefined ? overrides.dateTo : dateTo,
      location: overrides.location !== undefined ? overrides.location : filterLocation,
      sortBy: overrides.sortBy !== undefined ? overrides.sortBy : sortBy,
    });
  };

  const handleSearch = (text) => {
    setQuery(text);
    doSearch({ query: text });
  };

  const handleApplyFilter = (f) => {
    setFilterGames(f.games);
    setDateFrom(f.dateFrom);
    setDateTo(f.dateTo);
    setFilterLocation(f.location);
    doSearch({ games: f.games, dateFrom: f.dateFrom, dateTo: f.dateTo, location: f.location });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    doSearch({ sortBy: newSort });
  };

  const handleToggleFavorite = async (t) => {
    await toggleFavorite(t);
    if (selectedTournament?.id === t.id) {
      setSelectedTournament({ ...t, isFavorite: !t.isFavorite });
    }
  };
  const handleToggleEntry = async (t) => {
    await toggleEntry(t);
    if (selectedTournament?.id === t.id) {
      setSelectedTournament({ ...t, isEntered: !t.isEntered });
    }
  };

  const activeFilterCount = filterGames.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (filterLocation ? 1 : 0);
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "並び替え";

  return (
    <View style={styles.container}>
      {/* 検索バー */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={C.textSub} />
        <TextInput
          style={styles.searchInput}
          placeholder="大会名・ゲーム・主催者で検索..."
          placeholderTextColor={C.textSub}
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textSub} />
          </TouchableOpacity>
        )}
      </View>
      {/* コントロールバー */}
      <View style={styles.controlBar}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons name="list" size={16} color={viewMode === "list" ? "#fff" : C.textSub} />
            <Text style={[styles.toggleText, viewMode === "list" && { color: "#fff" }]}>リスト</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "calendar" && styles.toggleBtnActive]}
            onPress={() => setViewMode("calendar")}
          >
            <Ionicons name="calendar" size={16} color={viewMode === "calendar" ? "#fff" : C.textSub} />
            <Text style={[styles.toggleText, viewMode === "calendar" && { color: "#fff" }]}>カレンダー</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {/* ソートボタン */}
          <TouchableOpacity
            style={[styles.sortBtn, sortBy !== "date_asc" && styles.sortBtnActive]}
            onPress={() => setShowSort(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={sortBy !== "date_asc" ? "#fff" : C.text} />
          </TouchableOpacity>
          {/* フィルターボタン */}
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? "#fff" : C.text} />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: "#fff" }]}>
              {activeFilterCount > 0 ? `フィルター(${activeFilterCount})` : "フィルター"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* フィルターモーダル */}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filters={currentFilters}
        onApply={handleApplyFilter}
      />
      {/* ソートモーダル */}
      <SortModal
        visible={showSort}
        onClose={() => setShowSort(false)}
        sortBy={sortBy}
        onSelect={handleSortChange}
      />
      {/* メインコンテンツ */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : viewMode === "list" ? (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {tournaments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>大会が見つかりません</Text>
            </View>
          ) : (
            tournaments.map((t) => (
              <TouchableOpacity key={t.id} style={styles.card} onPress={() => setSelectedTournament(t)} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <View style={styles.resultMeta}>
                    <Text style={[styles.gameTag, { color: t.game_color }]}>{t.game}</Text>
                    <Text style={styles.dateText}>
                      {new Date(t.date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleToggleFavorite(t)}>
                    <Ionicons name={t.isFavorite ? "heart" : "heart-outline"} size={20} color={t.isFavorite ? "#EF4444" : C.textSub} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tournamentName}>{t.name}</Text>
                <Text style={styles.organizerText}>{t.organizer}</Text>
                {t.location ? <Text style={styles.locationText}>{t.location}</Text> : null}
                <View style={styles.cardBottom}>
                  <View style={styles.tagRow}>
                    {(t.tags || []).map((tag, j) => (
                      <View key={j} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                  {t.isEntered && (
                    <View style={styles.enteredBadge}>
                      <Text style={styles.enteredBadgeText}>エントリー済</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : (
        <CalendarView tournaments={tournaments} onSelect={setSelectedTournament} />
      )}
      <TournamentDetailModal
        tournament={selectedTournament}
        visible={!!selectedTournament}
        onClose={() => setSelectedTournament(null)}
        onToggleFavorite={handleToggleFavorite}
        onToggleEntry={handleToggleEntry}
      />
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
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  tag: { backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: C.textSub },
  enteredBadge: { backgroundColor: "#DCFCE7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  enteredBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "bold" },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: C.textSub },
});
const cal = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  navBtn: { padding: 8 },
  monthText: { fontSize: 16, fontWeight: "bold", color: C.text },
  dayRow: { flexDirection: "row", paddingHorizontal: 8 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 12, color: C.textSub, paddingVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  todayCell: { backgroundColor: C.primary, borderRadius: 999 },
  cellText: { fontSize: 13, color: C.text },
  todayText: { color: "#fff", fontWeight: "bold" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  eventList: { flex: 1, paddingHorizontal: 16, marginTop: 8 },
  eventItem: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventDate: { fontSize: 11, color: C.textSub },
  eventName: { fontSize: 14, fontWeight: "bold", color: C.text },
  noEvent: { textAlign: "center", color: C.textSub, marginTop: 40 },
});
