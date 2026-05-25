import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, ActivityIndicator,
  SectionList, TouchableOpacity,
} from 'react-native';
import { Colors } from '../constants';
import {
  fetchUserConquests,
  groupByMonth,
  monthLabel,
  conquestSummitName,
  ConquestEntry,
  MonthGroup,
} from '../services/conquests';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function dayStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function EntryRow({ entry }: { entry: ConquestEntry }) {
  const { lang } = useLang();
  const name = conquestSummitName(entry, lang);
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        <View style={styles.stem} />
      </View>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.summitName} numberOfLines={1}>{name}</Text>
          <Text style={styles.date}>{dayStr(entry.planted_at)}</Text>
        </View>
        <View style={styles.tags}>
          <View style={styles.elevTag}>
            <Text style={styles.elevText}>{entry.elevation_m}m</Text>
          </View>
          {entry.crew_name ? (
            <View style={[styles.crewTag, { backgroundColor: entry.crew_color ?? Colors.green }]}>
              <Text style={styles.crewText}>{entry.crew_name}</Text>
            </View>
          ) : null}
          {entry.mountain_group ? (
            <Text style={styles.groupText} numberOfLines={1}>{entry.mountain_group}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type Section = { title: string; count: number; data: ConquestEntry[] };

export default function ConquestTimeline({ visible, userId, onClose }: {
  visible: boolean;
  userId: string;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const s = t(lang);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await fetchUserConquests(userId);
      setTotal(entries.length);
      const groups: MonthGroup[] = groupByMonth(entries);
      setSections(
        groups.map((g) => ({
          title: monthLabel(g.year, g.month, lang),
          count: g.count,
          data: g.entries,
        }))
      );
    } catch (e) {
      console.error('[conquests]', e);
    } finally {
      setLoading(false);
    }
  }, [userId, lang]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.conquestTimeline}</Text>
          {total > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalText}>{s.conquestCount(total)}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={Colors.green} />
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏔️</Text>
            <Text style={styles.emptyText}>{s.conquestTimelineEmpty}</Text>
          </View>
        ) : (
          <SectionList<ConquestEntry, Section>
            sections={sections}
            keyExtractor={(item: ConquestEntry) => item.id}
            renderItem={({ item }: { item: ConquestEntry }) => <EntryRow entry={item} />}
            renderSectionHeader={({ section }: { section: Section }) => (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{s.conquestCount(section.count)}</Text>
              </View>
            )}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{s.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, gap: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.5 },
  totalBadge: { backgroundColor: Colors.green, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  totalText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  loader: { marginTop: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cream,
    paddingHorizontal: 4, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.zinc100,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount: { fontSize: 13, fontWeight: '600', color: Colors.green },
  row: { flexDirection: 'row', paddingVertical: 4 },
  timeline: { width: 24, alignItems: 'center', paddingTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green, zIndex: 1 },
  stem: { flex: 1, width: 2, backgroundColor: Colors.zinc200, marginTop: 2 },
  card: {
    flex: 1, marginLeft: 10, marginBottom: 2,
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  summitName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  date: { fontSize: 12, color: Colors.zinc500, fontWeight: '500' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  elevTag: { backgroundColor: Colors.zinc100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  elevText: { fontSize: 12, fontWeight: '600', color: Colors.zinc800 },
  crewTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  crewText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  groupText: { fontSize: 11, color: Colors.zinc500, fontStyle: 'italic' },
  closeBtn: { marginHorizontal: 20, marginBottom: 40, marginTop: 12, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
