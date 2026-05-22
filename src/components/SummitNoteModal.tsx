import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Colors } from '../constants';
import { saveNote, loadNote, deleteNote, SummitNote } from '../services/summitNotes';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
  onSaved: (note: SummitNote | null) => void;
}

export default function SummitNoteModal({ visible, summitId, summitName, onClose, onSaved }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    loadNote(summitId).then((note) => {
      setText(note?.text ?? '');
    }).catch(() => setText(''));
  }, [visible, summitId]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await saveNote(summitId, text);
      const saved = await loadNote(summitId);
      onSaved(saved);
      onClose();
    } catch {
      Alert.alert(s.error, s.tryAgain);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(s.noteDeleteConfirmTitle, s.noteDeleteConfirmBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.noteDelete, style: 'destructive',
        onPress: async () => {
          await deleteNote(summitId).catch(() => {});
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
          <Text style={styles.title} numberOfLines={1}>{summitName}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, (!text.trim() || saving) && styles.saveBtnDisabled]}
            disabled={!text.trim() || saving}
          >
            <Text style={[styles.saveText, (!text.trim() || saving) && styles.saveTextDisabled]}>
              {saving ? s.saving : s.save}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{s.myNote}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={s.notePlaceholder}
          placeholderTextColor={Colors.zinc200}
          multiline
          maxLength={500}
          autoFocus
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{text.length}/500</Text>

        {text.trim().length > 0 && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{s.noteDelete}</Text>
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
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.zinc950, marginHorizontal: 8 },
  saveBtn: { padding: 4 },
  saveBtnDisabled: {},
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.green },
  saveTextDisabled: { color: Colors.zinc200 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  input: {
    marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, fontSize: 15, color: Colors.zinc950, minHeight: 140,
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: Colors.zinc200, textAlign: 'right', marginRight: 20, marginTop: 6 },
  deleteBtn: { marginHorizontal: 16, marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center' },
  deleteText: { fontSize: 15, fontWeight: '600', color: '#D9534F' },
});
