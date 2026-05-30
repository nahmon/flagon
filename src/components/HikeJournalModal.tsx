import { useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  deleteJournal, HikeJournal, loadJournal, MOODS, Mood, saveJournal,
} from '../services/hikeJournal';

interface Props {
  visible: boolean;
  hikeId: string;
  summitName: string;
  onClose: () => void;
  onSaved: (journal: HikeJournal | null) => void;
}

function StarRow({ rating, onChange }: { rating: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.starBtn} activeOpacity={0.7}>
          <Text style={[styles.star, n <= rating && styles.starFilled]}>{n <= rating ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function HikeJournalModal({ visible, hikeId, summitName, onClose, onSaved }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [mood, setMood] = useState<Mood>('😊');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<HikeJournal | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    loadJournal(hikeId).then((j) => {
      if (j) {
        setMood(j.mood);
        setRating(j.rating);
        setNotes(j.notes);
        setExisting(j);
      } else {
        setMood('😊');
        setRating(3);
        setNotes('');
        setExisting(null);
      }
    }).catch(() => {});
  }, [visible, hikeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveJournal({ hikeId, mood, rating, notes: notes.trim() });
      const saved = await loadJournal(hikeId);
      onSaved(saved);
      onClose();
    } catch {
      Alert.alert(s.error, s.journalError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(s.journalDeleteTitle, s.journalDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.journalDelete, style: 'destructive',
        onPress: async () => {
          await deleteJournal(hikeId).catch(() => {});
          onSaved(null);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{s.cancel}</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {s.journalTitle} · {summitName}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtn}
            disabled={saving}
          >
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? s.journalSaving : s.journalSave}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{s.journalMoodLabel}</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMood(m)}
              style={[styles.moodBtn, m === mood && styles.moodBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{s.journalRatingLabel}</Text>
        <StarRow rating={rating} onChange={setRating} />

        <Text style={styles.label}>{s.journalNotesLabel}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={s.journalNotesPlaceholder}
          placeholderTextColor={Colors.zinc200}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{notes.length}/500</Text>

        {existing && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{s.journalDelete}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.zinc200,
    backgroundColor: Colors.white,
  },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: Colors.zinc500 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.zinc950, marginHorizontal: 8 },
  saveBtn: { padding: 4 },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.green },
  saveTextDisabled: { color: Colors.zinc200 },
  label: {
    fontSize: 11, fontWeight: '700', color: Colors.zinc500,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 20, marginBottom: 8,
  },
  moodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  moodBtn: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2, borderColor: Colors.zinc200,
  },
  moodBtnActive: { borderColor: Colors.green, backgroundColor: Colors.green + '1A' },
  moodEmoji: { fontSize: 24 },
  starRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4 },
  starBtn: { padding: 6 },
  star: { fontSize: 28, color: Colors.zinc200 },
  starFilled: { color: Colors.poleGold },
  input: {
    marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, fontSize: 15, color: Colors.zinc950, minHeight: 120,
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: Colors.zinc200, textAlign: 'right', marginRight: 20, marginTop: 6 },
  deleteBtn: {
    marginHorizontal: 16, marginTop: 24, padding: 14,
    borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center',
  },
  deleteText: { fontSize: 15, fontWeight: '600', color: '#D9534F' },
});
