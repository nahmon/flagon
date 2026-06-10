import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  addMoodEntry, deleteMoodEntry, getMoodEntries, getMoodStats,
  MOOD_EMOJI, type MoodEntry, type MoodLevel, type MoodStats,
} from '../services/hikeMood';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function HikeMoodModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang as 'ko' | 'en' | 'ja');

  const [tab, setTab] = useState<'log' | 'history'>('log');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState<MoodStats | null>(null);

  const [summitInput, setSummitInput] = useState('');
  const [before, setBefore] = useState<MoodLevel>(3);
  const [after, setAfter] = useState<MoodLevel>(3);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [e, st] = await Promise.all([getMoodEntries(), getMoodStats()]);
    setEntries(e);
    setStats(st);
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const handleSave = async () => {
    if (!summitInput.trim()) {
      Alert.alert(s.moodSummitRequired);
      return;
    }
    setBusy(true);
    try {
      await addMoodEntry({
        summitName: summitInput.trim(),
        date: new Date().toISOString(),
        before,
        after,
        note: note.trim(),
      });
      setSummitInput('');
      setBefore(3);
      setAfter(3);
      setNote('');
      await reload();
      setTab('history');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(s.moodDeleteTitle, s.moodDeleteConfirm, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive', onPress: async () => {
          await deleteMoodEntry(id);
          await reload();
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const MoodPicker = ({ value, onChange }: { value: MoodLevel; onChange: (v: MoodLevel) => void }) => (
    <View style={styles.moodRow}>
      {MOOD_EMOJI.map((emoji, idx) => {
        const level = (idx + 1) as MoodLevel;
        return (
          <TouchableOpacity
            key={level}
            style={[styles.moodBtn, value === level && styles.moodBtnActive]}
            onPress={() => onChange(level)}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>{s.moodTitle}</Text>

        {/* Stats banner */}
        {stats && stats.totalEntries > 0 && (
          <View style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>{s.moodStatTotal}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.avgLift >= 0 ? `+${stats.avgLift}` : `${stats.avgLift}`}
              </Text>
              <Text style={styles.statLabel}>{s.moodStatLift}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { fontSize: 13 }]} numberOfLines={1}>
                {stats.bestSummit ? stats.bestSummit.name : '—'}
              </Text>
              <Text style={styles.statLabel}>{s.moodStatBest}</Text>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['log', 'history'] as const).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {key === 'log' ? s.moodTabLog : s.moodTabHistory}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'log' ? (
          <ScrollView style={styles.logScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{s.moodSummitLabel}</Text>
            <TextInput
              style={styles.input}
              value={summitInput}
              onChangeText={setSummitInput}
              placeholder={s.moodSummitHint}
              placeholderTextColor={Colors.zinc500}
            />

            <Text style={styles.fieldLabel}>{s.moodBeforeLabel}</Text>
            <MoodPicker value={before} onChange={setBefore} />

            <Text style={styles.fieldLabel}>{s.moodAfterLabel}</Text>
            <MoodPicker value={after} onChange={setAfter} />

            <Text style={styles.fieldLabel}>{s.moodNoteLabel}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder={s.moodNoteHint}
              placeholderTextColor={Colors.zinc500}
              multiline
              maxLength={140}
            />

            <TouchableOpacity
              style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={busy}
            >
              <Text style={styles.saveBtnText}>{s.moodSave}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item: MoodEntry) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.empty}>{s.moodEmpty}</Text>
            }
            renderItem={({ item }: { item: MoodEntry }) => {
              const lift = item.after - item.before;
              return (
                <TouchableOpacity
                  style={styles.entryRow}
                  onLongPress={() => handleDelete(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.emojiPair}>
                    <Text style={styles.emojiLg}>{MOOD_EMOJI[item.before - 1]}</Text>
                    <Text style={styles.arrow}>→</Text>
                    <Text style={styles.emojiLg}>{MOOD_EMOJI[item.after - 1]}</Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entrySummit} numberOfLines={1}>{item.summitName}</Text>
                    {item.note ? <Text style={styles.entryNote} numberOfLines={1}>{item.note}</Text> : null}
                    <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={[styles.liftBadge, lift > 0 ? styles.liftPos : lift < 0 ? styles.liftNeg : styles.liftNeu]}>
                    <Text style={styles.liftText}>
                      {lift > 0 ? `+${lift}` : `${lift}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
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
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 20, marginBottom: 12 },
  statsBanner: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 12, padding: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.green },
  statLabel: { fontSize: 11, color: Colors.zinc500, marginTop: 2, textAlign: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.zinc100, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 14, color: Colors.zinc500, fontWeight: '500' },
  tabTextActive: { color: Colors.zinc950, fontWeight: '700' },
  logScroll: { flex: 1, paddingHorizontal: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.zinc950, borderWidth: 1, borderColor: Colors.zinc200 },
  noteInput: { height: 80, textAlignVertical: 'top' },
  moodRow: { flexDirection: 'row', gap: 10 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.zinc200 },
  moodBtnActive: { borderColor: Colors.green, backgroundColor: '#EAF4EE' },
  moodEmoji: { fontSize: 22 },
  saveBtn: { marginTop: 24, marginBottom: 16, backgroundColor: Colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, marginBottom: 1, gap: 12 },
  emojiPair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emojiLg: { fontSize: 22 },
  arrow: { fontSize: 14, color: Colors.zinc500 },
  entryInfo: { flex: 1 },
  entrySummit: { fontSize: 14, fontWeight: '700', color: Colors.zinc950 },
  entryNote: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  entryDate: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  liftBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liftPos: { backgroundColor: '#EAF4EE' },
  liftNeg: { backgroundColor: '#FEE2E2' },
  liftNeu: { backgroundColor: Colors.zinc100 },
  liftText: { fontSize: 13, fontWeight: '700', color: Colors.zinc950 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500, paddingHorizontal: 20 },
  closeBtn: { marginHorizontal: 20, marginTop: 4, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
