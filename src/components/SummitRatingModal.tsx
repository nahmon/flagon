import { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid,
} from 'react-native';
import { Colors } from '../constants';
import { SummitRating } from '../types';
import { submitRating } from '../services/ratings';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

type TrailCondition = 'good' | 'fair' | 'poor';

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  existing: SummitRating | null;
  onClose: () => void;
  onSaved: () => void;
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
            <Text style={[styles.star, n <= value && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SummitRatingModal({
  visible, summitId, summitName, existing, onClose, onSaved,
}: Props) {
  const { lang } = useLang();
  const s = t(lang);

  const [difficulty, setDifficulty] = useState<number>(existing?.difficulty ?? 3);
  const [views, setViews] = useState<number>(existing?.views ?? 3);
  const [trail, setTrail] = useState<TrailCondition>(existing?.trail_condition ?? 'good');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await submitRating(summitId, difficulty, views, trail);
      if (Platform.OS === 'android') {
        ToastAndroid.show(s.ratingSubmitted, ToastAndroid.SHORT);
      } else {
        Alert.alert('', s.ratingSubmitted);
      }
      onSaved();
      onClose();
    } catch {
      Alert.alert(s.error, s.tryAgain);
    } finally {
      setSubmitting(false);
    }
  }, [summitId, difficulty, views, trail, onSaved, onClose, s]);

  const trailOptions: { key: TrailCondition; label: string }[] = [
    { key: 'good', label: s.trailGood },
    { key: 'fair', label: s.trailFair },
    { key: 'poor', label: s.trailPoor },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{s.rateThis}</Text>
            <Text style={styles.subtitle}>{summitName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <StarRow label={s.difficulty} value={difficulty} onChange={setDifficulty} />
          <View style={styles.divider} />
          <StarRow label={s.views} value={views} onChange={setViews} />
          <View style={styles.divider} />
          <View style={styles.trailRow}>
            <Text style={styles.starLabel}>{s.trail}</Text>
            <View style={styles.trailPills}>
              {trailOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.pill, trail === opt.key && styles.pillActive]}
                  onPress={() => setTrail(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillTxt, trail === opt.key && styles.pillTxtActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitTxt}>{existing ? s.editRating : s.submitRating}</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950 },
  subtitle: { fontSize: 14, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginTop: 16 },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  starLabel: { fontSize: 15, fontWeight: '600', color: Colors.zinc800 },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 28, color: Colors.zinc200 },
  starFilled: { color: '#F59E0B' },
  divider: { height: 1, backgroundColor: Colors.zinc100 },
  trailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  trailPills: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.zinc100 },
  pillActive: { backgroundColor: Colors.green },
  pillTxt: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  pillTxtActive: { color: Colors.white },
  submitBtn: {
    backgroundColor: Colors.green, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
