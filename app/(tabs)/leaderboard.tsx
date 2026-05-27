import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors } from '../../src/constants';
import { fetchLeaderboardByPeriod, fetchUserProfile, type LeaderboardPeriod } from '../../src/services/crews';
import { fetchHotSummits, type HotSummit } from '../../src/services/summits';
import { fetchTopHikers } from '../../src/services/stats';
import { supabase } from '../../src/services/supabase';
import { CrewLeaderboardEntry, HikerLeaderboardEntry } from '../../src/types';
import CrewDetailModal from '../../src/components/CrewDetailModal';
import HikerProfileModal from '../../src/components/HikerProfileModal';
import { useLang } from '../../src/contexts/LangContext';
import { t, summitName, type Lang } from '../../src/i18n/strings';

const RANK_COLORS = ['#D4B060', '#A0A8B0', '#C07840'];
const PERIODS: LeaderboardPeriod[] = ['week', 'month', 'alltime'];
type ViewMode = 'crews' | 'summits' | 'hikers';

function RankNum({ rank }: { rank: number }) {
  const color = rank <= 3 ? RANK_COLORS[rank - 1] : Colors.zinc500;
  return <Text style={[styles.rankNum, { color }]}>{rank}</Text>;
}

function ViewToggle({ mode, lang, onChange }: { mode: ViewMode; lang: Lang; onChange: (m: ViewMode) => void }) {
  const s = t(lang);
  const labels: Record<ViewMode, string> = { crews: s.tabCrews, summits: s.tabSummits, hikers: s.tabHikers };
  return (
    <View style={styles.viewToggleRow}>
      {(['crews', 'summits', 'hikers'] as ViewMode[]).map((m) => (
        <TouchableOpacity key={m} style={[styles.viewBtn, mode === m && styles.viewBtnActive]} onPress={() => onChange(m)} activeOpacity={0.75}>
          <Text style={[styles.viewLabel, mode === m && styles.viewLabelActive]}>{labels[m]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function avatarColor(uid: string): string {
  const palette = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return palette[uid.charCodeAt(0) % palette.length];
}

function HikerRow({ entry, rank, lang, onPress }: { entry: HikerLeaderboardEntry; rank: number; lang: Lang; onPress: (uid: string) => void }) {
  const s = t(lang);
  const name = entry.display_name ?? `#${entry.user_id.slice(0, 6)}`;
  const initial = name.charAt(0).toUpperCase();
  const bg = entry.crew_color ?? avatarColor(entry.user_id);
  const ago = entry.last_flag_at ? Math.floor((Date.now() - new Date(entry.last_flag_at).getTime()) / 3_600_000) : null;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(entry.user_id)} activeOpacity={0.75}>
      <View style={styles.rankCell}><RankNum rank={rank} /></View>
      <View style={[styles.crewCircle, { backgroundColor: bg }]}>
        <Text style={styles.crewInitial}>{initial}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowSub}>{entry.crew_name ?? s.hikerSolo}{ago !== null ? ` · ${ago < 1 ? s.justNow : s.hoursAgo(ago)}` : ''}</Text>
      </View>
      <View style={styles.flagCell}>
        <Text style={styles.flagCount}>{entry.total_flags}</Text>
        <Text style={styles.flagLabel}>{s.flags}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TopHikerHero({ top, lang }: { top: HikerLeaderboardEntry; lang: Lang }) {
  const s = t(lang);
  const name = top.display_name ?? `#${top.user_id.slice(0, 6)}`;
  return (
    <View style={[styles.heroCard, styles.heroCardHiker]}>
      <View style={styles.heroLeft}>
        <Text style={styles.heroLabel}>{s.topHiker}</Text>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroSub}>{top.crew_name ?? s.hikerSolo}</Text>
      </View>
      <View style={styles.heroRight}>
        <Text style={styles.heroCount}>{top.total_flags}</Text>
        <Text style={styles.heroFlagLabel}>{s.flags}</Text>
      </View>
    </View>
  );
}

function PeriodToggle({ period, lang, onChange }: { period: LeaderboardPeriod; lang: Lang; onChange: (p: LeaderboardPeriod) => void }) {
  const s = t(lang);
  const labels: Record<LeaderboardPeriod, string> = { week: s.periodWeek, month: s.periodMonth, alltime: s.periodAlltime };
  return (
    <View style={styles.periodRow}>
      {PERIODS.map((p) => (
        <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => onChange(p)} activeOpacity={0.75}>
          <Text style={[styles.periodLabel, period === p && styles.periodLabelActive]}>{labels[p]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CrewRow({ entry, rank, lang, onPress }: { entry: CrewLeaderboardEntry; rank: number; lang: Lang; onPress: () => void }) {
  const s = t(lang);
  const crewName = entry.name ?? entry.name_ko ?? '—';
  const ago = entry.last_flag_at ? Math.floor((Date.now() - new Date(entry.last_flag_at).getTime()) / 3_600_000) : null;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rankCell}><RankNum rank={rank} /></View>
      <View style={[styles.crewCircle, { backgroundColor: entry.color_hex }]}>
        <Text style={styles.crewInitial}>{(crewName).charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{crewName}</Text>
        <Text style={styles.rowSub}>{ago === null ? s.noFlags : ago < 1 ? s.justNow : s.hoursAgo(ago)}</Text>
      </View>
      <View style={styles.flagCell}>
        <Text style={styles.flagCount}>{entry.flag_count}</Text>
        <Text style={styles.flagLabel}>{s.flags}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SummitRow({ summit, rank, lang }: { summit: HotSummit; rank: number; lang: Lang }) {
  const s = t(lang);
  const name = summitName(summit, lang);
  const elevBand = summit.elevation_m >= 1500 ? '⛰️' : summit.elevation_m >= 800 ? '🏔️' : '🗻';
  return (
    <View style={styles.row}>
      <View style={styles.rankCell}><RankNum rank={rank} /></View>
      <View style={styles.summitIcon}><Text style={styles.summitIconText}>{elevBand}</Text></View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowSub}>{summit.elevation_m.toLocaleString()}m{summit.mountain_group ? ` · ${summit.mountain_group}` : ''}</Text>
      </View>
      <View style={styles.flagCell}>
        <Text style={styles.flagCount}>{summit.flag_count}</Text>
        <Text style={styles.flagLabel}>{s.flags}</Text>
      </View>
    </View>
  );
}

function HeroCard({ top, lang }: { top: CrewLeaderboardEntry; lang: Lang }) {
  const s = t(lang);
  const name = top.name ?? top.name_ko ?? '—';
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroLeft}>
        <Text style={styles.heroLabel}>{s.topCrew}</Text>
        <Text style={styles.heroName}>{name}</Text>
      </View>
      <View style={styles.heroRight}>
        <Text style={styles.heroCount}>{top.flag_count}</Text>
        <Text style={styles.heroFlagLabel}>{s.flags}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

function HotSummitHero({ top, lang }: { top: HotSummit; lang: Lang }) {
  const s = t(lang);
  return (
    <View style={[styles.heroCard, styles.heroCardSummit]}>
      <View style={styles.heroLeft}>
        <Text style={styles.heroLabel}>{s.hotSummitsTitle}</Text>
        <Text style={styles.heroName}>{summitName(top, lang)}</Text>
        <Text style={styles.heroSub}>{top.elevation_m.toLocaleString()}m</Text>
      </View>
      <View style={styles.heroRight}>
        <Text style={styles.heroCount}>{top.flag_count}</Text>
        <Text style={styles.heroFlagLabel}>{s.flags}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { lang } = useLang();
  const s = t(lang);
  const [viewMode, setViewMode] = useState<ViewMode>('crews');
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const [hikerPeriod, setHikerPeriod] = useState<LeaderboardPeriod>('alltime');
  const [entries, setEntries] = useState<CrewLeaderboardEntry[]>([]);
  const [hotSummits, setHotSummits] = useState<HotSummit[]>([]);
  const [topHikers, setTopHikers] = useState<HikerLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<CrewLeaderboardEntry | null>(null);
  const [selectedHiker, setSelectedHiker] = useState<string | null>(null);
  const [myCrew, setMyCrew] = useState<CrewLeaderboardEntry | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const user = res.data.user;
      if (!user) return;
      fetchUserProfile(user.id).then((profile) => {
        if (!profile?.crew_id) return;
        setMyCrew({
          id: profile.crew_id,
          name: profile.crew_name ?? '',
          name_ko: profile.crew_name_ko,
          color_hex: profile.crew_color_hex ?? Colors.green,
          icon_type: 'ME',
          flag_count: 0,
          last_flag_at: null,
        });
      }).catch(() => null);
    });
  }, []);

  const loadCrews = useCallback(async (isRefresh = false, p?: LeaderboardPeriod) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchLeaderboardByPeriod(p ?? period);
      setEntries(data);
    } catch (e) {
      console.error('[leaderboard:crews]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const loadSummits = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchHotSummits(20);
      setHotSummits(data);
    } catch (e) {
      console.error('[leaderboard:summits]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHikers = useCallback(async (isRefresh = false, p?: LeaderboardPeriod) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchTopHikers(20, p ?? hikerPeriod);
      setTopHikers(data);
    } catch (e) {
      console.error('[leaderboard:hikers]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hikerPeriod]);

  useEffect(() => {
    if (viewMode === 'crews') loadCrews();
    else if (viewMode === 'summits') loadSummits();
    else loadHikers();
  }, [viewMode, loadCrews, loadSummits, loadHikers]);

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-flags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flags' }, () => {
        if (viewMode === 'crews') loadCrews();
        else if (viewMode === 'summits') loadSummits();
        else loadHikers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewMode, loadCrews, loadSummits, loadHikers]);

  const handlePeriod = (p: LeaderboardPeriod) => { setPeriod(p); loadCrews(false, p); };
  const handleHikerPeriod = (p: LeaderboardPeriod) => { setHikerPeriod(p); loadHikers(false, p); };
  const handleRefresh = () => {
    if (viewMode === 'crews') return loadCrews(true);
    if (viewMode === 'summits') return loadSummits(true);
    return loadHikers(true);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.leaderboard}</Text>
        </View>
        <ViewToggle mode={viewMode} lang={lang} onChange={setViewMode} />
        {viewMode === 'crews' && <PeriodToggle period={period} lang={lang} onChange={handlePeriod} />}
        {viewMode === 'hikers' && <PeriodToggle period={hikerPeriod} lang={lang} onChange={handleHikerPeriod} />}
        {viewMode === 'crews' && !loading && entries.length > 0 && <HeroCard top={entries[0]} lang={lang} />}
        {viewMode === 'summits' && !loading && hotSummits.length > 0 && <HotSummitHero top={hotSummits[0]} lang={lang} />}
        {viewMode === 'hikers' && !loading && topHikers.length > 0 && <TopHikerHero top={topHikers[0]} lang={lang} />}
      </SafeAreaView>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.green} /></View>
      ) : viewMode === 'crews' ? (
        <FlatList
          data={entries}
          keyExtractor={(e: CrewLeaderboardEntry) => e.id}
          renderItem={({ item, index }: { item: CrewLeaderboardEntry; index: number }) => (
            <CrewRow entry={item} rank={index + 1} lang={lang} onPress={() => setSelectedCrew(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.green} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>{s.noLeaderboard}</Text></View>}
          contentContainerStyle={entries.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        />
      ) : viewMode === 'summits' ? (
        <FlatList
          data={hotSummits}
          keyExtractor={(e: HotSummit) => e.id}
          renderItem={({ item, index }: { item: HotSummit; index: number }) => <SummitRow summit={item} rank={index + 1} lang={lang} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.green} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>{s.noHotSummits}</Text></View>}
          contentContainerStyle={hotSummits.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        />
      ) : (
        <FlatList
          data={topHikers}
          keyExtractor={(e: HikerLeaderboardEntry) => e.user_id}
          renderItem={({ item, index }: { item: HikerLeaderboardEntry; index: number }) => (
            <HikerRow entry={item} rank={index + 1} lang={lang} onPress={setSelectedHiker} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.green} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>{s.noHikers}</Text></View>}
          contentContainerStyle={topHikers.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        />
      )}
      <CrewDetailModal crew={selectedCrew} myCrew={myCrew} onClose={() => setSelectedCrew(null)} />
      <HikerProfileModal userId={selectedHiker} onClose={() => setSelectedHiker(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeHeader: { backgroundColor: Colors.white },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#1F2421', letterSpacing: -0.6 },
  viewToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: Colors.zinc100,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  viewBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  viewBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  viewLabel: { fontSize: 14, fontWeight: '600', color: Colors.zinc500 },
  viewLabelActive: { color: Colors.zinc950 },
  periodRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, marginTop: 6, gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center', backgroundColor: Colors.zinc100 },
  periodBtnActive: { backgroundColor: Colors.green },
  periodLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  periodLabelActive: { color: Colors.white },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.green,
    marginHorizontal: 16, marginBottom: 16, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  heroCardSummit: { backgroundColor: Colors.greenDark },
  heroCardHiker: { backgroundColor: Colors.crewMe },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.4, marginTop: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroRight: { alignItems: 'flex-end' },
  heroCount: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  heroFlagLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, gap: 12 },
  rankCell: { width: 28, alignItems: 'center' },
  rankNum: { fontSize: 16, fontWeight: '700' },
  crewCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  crewInitial: { fontSize: 17, fontWeight: '700', color: Colors.white },
  summitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  summitIconText: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#1F2421' },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  flagCell: { alignItems: 'flex-end' },
  flagCount: { fontSize: 20, fontWeight: '800', color: Colors.green, letterSpacing: -0.5 },
  flagLabel: { fontSize: 11, color: Colors.zinc500 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { fontSize: 15, color: Colors.zinc500 },
  chevron: { fontSize: 20, color: Colors.zinc200, marginLeft: 8 },
});
