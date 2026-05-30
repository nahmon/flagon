import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import { fetchUserRecentHikes, type HikeRecord } from '../services/hikes';
import { loadAllJournals, type HikeJournal } from '../services/hikeJournal';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import HikeRouteModal from './HikeRouteModal';
import HikeJournalModal from './HikeJournalModal';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface HikeRowProps {
  hike: HikeRecord;
  journal: HikeJournal | null;
  onPress: () => void;
  onJournal: () => void;
}

function HikeRow({ hike, journal, onPress, onJournal }: HikeRowProps) {
  const hasRoute = hike.gps_track.length >= 2;
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.iconBox, !hike.flag_planted && styles.iconBoxNoFlag]}>
          <Text style={styles.icon}>{hike.flag_planted ? '🚩' : '🏔️'}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.summitName} numberOfLines={1}>
            {hike.summit_name ?? '알 수 없는 정상'}
          </Text>
          <Text style={styles.rowSub}>
            {hike.elevation_m ? `${hike.elevation_m}m` : ''}
            {hike.elevation_m && (hike.flag_planted || hasRoute) ? '  ·  ' : ''}
            {hike.flag_planted ? '깃발 꽂음' : ''}
            {!hike.flag_planted && hasRoute ? '경로 기록' : ''}
          </Text>
          {journal && (
            <Text style={styles.journalPreview} numberOfLines={1}>
              {journal.mood} {'★'.repeat(journal.rating)}
              {journal.notes ? `  ${journal.notes}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.date}>{formatDate(hike.started_at ?? hike.created_at)}</Text>
          {hasRoute && <Text style={styles.routeTag}>경로 보기 ›</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onJournal} style={styles.journalBtn} activeOpacity={0.7}>
        <Text style={[styles.journalBtnText, !!journal && styles.journalBtnDone]}>
          {journal ? '📓' : '📝'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RecentHikesList({ userId }: { userId: string }) {
  const { lang } = useLang();
  const s = t(lang);
  const [hikes, setHikes] = useState<HikeRecord[]>([]);
  const [journals, setJournals] = useState<Record<string, HikeJournal>>({});
  const [loading, setLoading] = useState(true);
  const [routeSelected, setRouteSelected] = useState<HikeRecord | null>(null);
  const [journalSelected, setJournalSelected] = useState<HikeRecord | null>(null);

  useEffect(() => {
    fetchUserRecentHikes(userId)
      .then(async (rows) => {
        setHikes(rows);
        const map = await loadAllJournals(rows.map((r) => r.id));
        setJournals(map);
      })
      .catch((e) => console.error('[recentHikes]', e))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleJournalSaved = (journal: HikeJournal | null) => {
    if (!journalSelected) return;
    setJournals((prev: Record<string, HikeJournal>) => {
      const next = { ...prev };
      if (journal) {
        next[journalSelected.id] = journal;
      } else {
        delete next[journalSelected.id];
      }
      return next;
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>최근 등산 기록</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 16 }} />
      ) : hikes.length === 0 ? (
        <Text style={styles.empty}>등산 기록이 없습니다</Text>
      ) : (
        <FlatList
          data={hikes}
          keyExtractor={(h: HikeRecord) => h.id}
          renderItem={({ item }: { item: HikeRecord }) => (
            <HikeRow
              hike={item}
              journal={journals[item.id] ?? null}
              onPress={() => setRouteSelected(item)}
              onJournal={() => setJournalSelected(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          scrollEnabled={false}
        />
      )}
      <HikeRouteModal
        visible={routeSelected !== null}
        hike={routeSelected}
        onClose={() => setRouteSelected(null)}
      />
      {journalSelected && (
        <HikeJournalModal
          visible={journalSelected !== null}
          hikeId={journalSelected.id}
          summitName={journalSelected.summit_name ?? s.unknownSummit}
          onClose={() => setJournalSelected(null)}
          onSaved={handleJournalSaved}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.white,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc500,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.green + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxNoFlag: { backgroundColor: Colors.zinc100 },
  icon: { fontSize: 18 },
  rowBody: { flex: 1 },
  summitName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  journalPreview: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', marginRight: 8 },
  date: { fontSize: 12, color: Colors.zinc500 },
  routeTag: { fontSize: 11, color: Colors.green, fontWeight: '600', marginTop: 3 },
  journalBtn: { padding: 8 },
  journalBtnText: { fontSize: 20 },
  journalBtnDone: {},
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { fontSize: 14, color: Colors.zinc500, paddingVertical: 12 },
});
