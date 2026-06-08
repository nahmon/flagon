import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { type ConquestEntry, conquestSummitName } from '../services/conquests';
import { loadAllJournals, type HikeJournal } from '../services/hikeJournal';
import HikeJournalModal from './HikeJournalModal';

interface Props {
  visible: boolean;
  conquests: ConquestEntry[];
  onClose: () => void;
}

export default function HikeJournalListModal({ visible, conquests, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [journals, setJournals] = useState<Record<string, HikeJournal>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ConquestEntry | null>(null);

  useEffect(() => {
    if (!visible || conquests.length === 0) return;
    setLoading(true);
    loadAllJournals(conquests.map((c) => c.id))
      .then(setJournals)
      .finally(() => setLoading(false));
  }, [visible, conquests]);

  const handleJournalSaved = (entry: ConquestEntry, journal: HikeJournal | null) => {
    setJournals((prev: Record<string, HikeJournal>) => {
      const next = { ...prev };
      if (journal) next[entry.id] = journal;
      else delete next[entry.id];
      return next;
    });
    setSelected(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>{s.hikeJournalBtn}</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.green} />
        ) : conquests.length === 0 ? (
          <Text style={styles.empty}>{s.hikeJournalEmpty}</Text>
        ) : (
          <FlatList
            data={conquests}
            keyExtractor={(item: ConquestEntry) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            renderItem={({ item }: { item: ConquestEntry }) => {
              const journal = journals[item.id];
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.75}
                  onPress={() => setSelected(item)}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.mood}>{journal ? journal.mood : '📝'}</Text>
                    <View style={styles.rowInfo}>
                      <Text style={styles.summitName}>{conquestSummitName(item, lang)}</Text>
                      <Text style={styles.date}>
                        {item.elevation_m > 0 ? `${item.elevation_m.toLocaleString()}m · ` : ''}
                        {formatDate(item.planted_at)}
                      </Text>
                      {journal && (
                        <Text style={styles.excerpt} numberOfLines={1}>
                          {'★'.repeat(journal.rating)}{'☆'.repeat(5 - journal.rating)}
                          {journal.notes ? `  ${journal.notes}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.arrow}>{journal ? '✏️' : '+'}</Text>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{s.close}</Text>
        </TouchableOpacity>
      </View>

      {selected && (
        <HikeJournalModal
          visible
          hikeId={selected.id}
          summitName={conquestSummitName(selected, lang)}
          onClose={() => setSelected(null)}
          onSaved={(j) => handleJournalSaved(selected, j)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 20, marginBottom: 16 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, color: Colors.zinc500, paddingHorizontal: 40, lineHeight: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mood: { fontSize: 28, width: 36, textAlign: 'center' },
  rowInfo: { flex: 1 },
  summitName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950, marginBottom: 2 },
  date: { fontSize: 12, color: Colors.zinc500 },
  excerpt: { fontSize: 12, color: Colors.zinc500, marginTop: 3 },
  arrow: { fontSize: 16, color: Colors.zinc500, marginLeft: 8 },
  sep: { height: 8 },
  closeBtn: {
    marginHorizontal: 20, marginBottom: 40, paddingVertical: 14,
    backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
