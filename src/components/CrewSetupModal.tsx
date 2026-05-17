import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Colors } from '../constants';
import { fetchCrews, joinCrew, createCrew } from '../services/crews';
import { Crew } from '../types';

const CREW_COLORS = ['#C0704A', '#4A7C59', '#5B7FA6', '#8B5CF6', '#DC2626', '#0891B2'];

interface Props {
  onComplete: () => void;
}

type Tab = 'list' | 'create';

export default function CrewSetupModal({ onComplete }: Props) {
  const [tab, setTab] = useState<Tab>('list');
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loadingCrews, setLoadingCrews] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [color, setColor] = useState(CREW_COLORS[0]);
  const [iconType, setIconType] = useState<'ME' | 'SA' | 'NK'>('ME');

  useEffect(() => {
    fetchCrews()
      .then(setCrews)
      .catch(console.error)
      .finally(() => setLoadingCrews(false));
  }, []);

  const handleJoin = async (crewId: string) => {
    setSubmitting(true);
    try {
      await joinCrew(crewId);
      onComplete();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '잠시 후 다시 시도하세요');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    const trimKo = nameKo.trim();
    const trimEn = nameEn.trim();
    if (!trimKo || !trimEn) {
      Alert.alert('입력 오류', '크루 이름(한글, 영문) 모두 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      await createCrew(trimEn, trimKo, color, iconType);
      onComplete();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '잠시 후 다시 시도하세요');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🚩</Text>
          <Text style={styles.title}>크루에 합류하세요</Text>
          <Text style={styles.subtitle}>
            함께 정상을 정복할 크루가 필요합니다.{'\n'}
            기존 크루에 합류하거나 새로 만드세요.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['list', 'create'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'list' ? '크루 목록' : '새 크루 만들기'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {tab === 'list' ? (
          loadingCrews ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.green} />
            </View>
          ) : (
            <FlatList
              data={crews}
              keyExtractor={c => c.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  아직 크루가 없어요.{'\n'}첫 번째 크루를 만들어보세요!
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.crewRow}
                  onPress={() => handleJoin(item.id)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View style={[styles.crewDot, { backgroundColor: item.color_hex }]} />
                  <View style={styles.crewText}>
                    <Text style={styles.crewNameKo}>{item.name_ko ?? item.name}</Text>
                    <Text style={styles.crewNameEn}>{item.name}</Text>
                  </View>
                  {submitting ? (
                    <ActivityIndicator size="small" color={Colors.green} />
                  ) : (
                    <Text style={styles.joinArrow}>합류 →</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>크루 이름 (한글)</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 북한산 원정대"
              placeholderTextColor={Colors.zinc500}
              value={nameKo}
              onChangeText={setNameKo}
              returnKeyType="next"
            />

            <Text style={styles.label}>크루 이름 (영문)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bukhansan Expedition"
              placeholderTextColor={Colors.zinc500}
              value={nameEn}
              onChangeText={setNameEn}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Text style={styles.label}>크루 색상</Text>
            <View style={styles.colorRow}>
              {CREW_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorChip,
                    { backgroundColor: c },
                    color === c && styles.colorChipSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, submitting && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.createBtnText}>크루 만들기</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.zinc950 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  emoji: { fontSize: 52, marginBottom: 12 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: Colors.zinc500, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.zinc800,
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.green },
  tabLabel: { color: Colors.zinc500, fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: Colors.white },

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { color: Colors.zinc500, textAlign: 'center', marginTop: 48, fontSize: 15, lineHeight: 26 },

  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.zinc800,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  crewDot: { width: 18, height: 18, borderRadius: 9, marginRight: 12 },
  crewText: { flex: 1 },
  crewNameKo: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  crewNameEn: { color: Colors.zinc500, fontSize: 13, marginTop: 2 },
  joinArrow: { color: Colors.green, fontWeight: '700', fontSize: 14 },

  form: { paddingHorizontal: 20 },
  label: { color: Colors.zinc200, fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: {
    backgroundColor: Colors.zinc800,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.white,
    fontSize: 15,
  },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorChip: { width: 36, height: 36, borderRadius: 18 },
  colorChipSelected: { borderWidth: 3, borderColor: Colors.white },

  createBtn: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.5 },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
