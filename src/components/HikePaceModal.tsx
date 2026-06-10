import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  calcPace, deletePace, getSavedPaces, savePace,
  FITNESS_LEVELS, FITNESS_META,
  type FitnessLevel, type PaceResult, type SavedPace,
} from '../services/hikePace';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function HikePaceModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang as 'ko' | 'en' | 'ja');

  const [tab, setTab] = useState<'calc' | 'history'>('calc');
  const [distInput, setDistInput] = useState('');
  const [elevInput, setElevInput] = useState('');
  const [fitness, setFitness] = useState<FitnessLevel>('intermediate');
  const [result, setResult] = useState<PaceResult | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SavedPace[]>([]);

  const loadHistory = useCallback(async () => {
    const entries = await getSavedPaces();
    setHistory(entries);
  }, []);

  useEffect(() => {
    if (visible) {
      loadHistory();
      setResult(null);
      setSaved(false);
    }
  }, [visible, loadHistory]);

  const handleCalc = () => {
    const dist = parseFloat(distInput.replace(',', '.'));
    const elev = parseFloat(elevInput.replace(',', '.'));
    if (isNaN(dist) || dist <= 0 || isNaN(elev) || elev < 0) {
      Alert.alert(s.paceDistLabel, s.paceDistHint);
      return;
    }
    const res = calcPace(dist, elev, fitness);
    setResult(res);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!result) return;
    const dist = parseFloat(distInput.replace(',', '.'));
    const elev = parseFloat(elevInput.replace(',', '.'));
    await savePace({
      label: labelInput.trim() || `${dist}km +${elev}m`,
      distanceKm: dist,
      elevationM: elev,
      fitness,
      totalMinutes: result.totalMinutes,
    });
    setSaved(true);
    setLabelInput('');
    await loadHistory();
  };

  const handleDelete = (id: string) => {
    Alert.alert(s.paceDeleteTitle, s.paceDeleteConfirm, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive', onPress: async () => {
          await deletePace(id);
          await loadHistory();
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>{s.paceTitle}</Text>

        <View style={styles.tabs}>
          {(['calc', 'history'] as const).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {key === 'calc' ? s.paceTabCalc : s.paceTabHistory}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'calc' ? (
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{s.paceDistLabel}</Text>
            <TextInput
              style={styles.input}
              value={distInput}
              onChangeText={setDistInput}
              placeholder={s.paceDistHint}
              placeholderTextColor={Colors.zinc500}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>{s.paceElevLabel}</Text>
            <TextInput
              style={styles.input}
              value={elevInput}
              onChangeText={setElevInput}
              placeholder={s.paceElevHint}
              placeholderTextColor={Colors.zinc500}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>{s.paceFitLabel}</Text>
            <View style={styles.fitRow}>
              {FITNESS_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.fitBtn, fitness === level && styles.fitBtnActive]}
                  onPress={() => { setFitness(level); setResult(null); setSaved(false); }}
                >
                  <Text style={[styles.fitText, fitness === level && styles.fitTextActive]}>
                    {s[FITNESS_META[level].labelKey as keyof typeof s] as string}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.calcBtn} onPress={handleCalc}>
              <Text style={styles.calcBtnText}>{s.paceCalcBtn}</Text>
            </TouchableOpacity>

            {result && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>{s.paceResultTitle}</Text>
                <Text style={styles.resultTime}>
                  {s.paceResultTime(result.hours, result.minutes)}
                </Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownText}>{s.paceDistMin(result.distanceMinutes)}</Text>
                  <Text style={styles.breakdownSep}>·</Text>
                  <Text style={styles.breakdownText}>{s.paceElevMin(result.elevationMinutes)}</Text>
                </View>
                {result.splitEvery100m > 0 && (
                  <Text style={styles.splitText}>{s.paceSplit(result.splitEvery100m)}</Text>
                )}

                {!saved ? (
                  <>
                    <Text style={styles.fieldLabel}>{s.paceSaveLabel}</Text>
                    <TextInput
                      style={styles.input}
                      value={labelInput}
                      onChangeText={setLabelInput}
                      placeholder={s.paceSaveHint}
                      placeholderTextColor={Colors.zinc500}
                      maxLength={40}
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                      <Text style={styles.saveBtnText}>{s.paceSaveBtn}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.savedText}>{s.paceSaved}</Text>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item: SavedPace) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.empty}>{s.paceEmpty}</Text>}
            renderItem={({ item }: { item: SavedPace }) => {
              const h = Math.floor(item.totalMinutes / 60);
              const m = item.totalMinutes % 60;
              return (
                <TouchableOpacity
                  style={styles.historyRow}
                  onLongPress={() => handleDelete(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.historySub}>
                      {s.paceDistSummary(item.distanceKm)}  {s.paceElevSummary(item.elevationM)}  ·  {s[FITNESS_META[item.fitness].labelKey as keyof typeof s] as string}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(item.savedAt)}</Text>
                  </View>
                  <Text style={styles.historyTime}>{s.paceResultTime(h, m)}</Text>
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
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.zinc100, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 14, color: Colors.zinc500, fontWeight: '500' },
  tabTextActive: { color: Colors.zinc950, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.zinc950, borderWidth: 1, borderColor: Colors.zinc200 },
  fitRow: { flexDirection: 'row', gap: 8 },
  fitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.zinc200 },
  fitBtnActive: { borderColor: Colors.green, backgroundColor: '#EAF4EE' },
  fitText: { fontSize: 13, color: Colors.zinc500, fontWeight: '600' },
  fitTextActive: { color: Colors.green },
  calcBtn: { marginTop: 24, backgroundColor: Colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  calcBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  resultCard: { marginTop: 20, backgroundColor: Colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.zinc200 },
  resultTitle: { fontSize: 12, fontWeight: '700', color: Colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  resultTime: { fontSize: 40, fontWeight: '900', color: Colors.green, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  breakdownText: { fontSize: 13, color: Colors.zinc500 },
  breakdownSep: { fontSize: 13, color: Colors.zinc200 },
  splitText: { fontSize: 13, color: Colors.zinc800, fontWeight: '600', marginBottom: 16 },
  saveBtn: { marginTop: 12, backgroundColor: Colors.green, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  savedText: { marginTop: 12, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.green },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, marginBottom: 1, gap: 12 },
  historyLeft: { flex: 1 },
  historyLabel: { fontSize: 14, fontWeight: '700', color: Colors.zinc950 },
  historySub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  historyDate: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  historyTime: { fontSize: 18, fontWeight: '800', color: Colors.green },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, color: Colors.zinc500, paddingHorizontal: 20 },
  closeBtn: { marginHorizontal: 20, marginTop: 4, marginBottom: 40, paddingVertical: 14, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, color: Colors.zinc500 },
});
