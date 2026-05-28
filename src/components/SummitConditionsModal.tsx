import { useCallback, useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import {
  ConditionReport, ConditionType, CONDITION_META, CONDITION_TYPES,
  loadConditions, addCondition, deleteCondition, MAX_NOTE_CHARS,
} from '../services/conditions';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t, Strings } from '../i18n/strings';

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
  onCountChange: (n: number) => void;
}

function relTime(iso: string, s: Strings): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return s.justNow;
  if (h < 24) return s.hoursAgo(h);
  return s.daysAgo(Math.floor(h / 24));
}

function timeUntilExpiry(iso: string, s: Strings): string {
  const remaining = 48 - Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (remaining <= 0) return '';
  return s.condExpiresIn(remaining);
}

export default function SummitConditionsModal({
  visible, summitId, summitName, onClose, onCountChange,
}: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [reports, setReports] = useState<ConditionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ConditionType>('clear');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadConditions(summitId).catch(() => []);
    setReports(data);
    onCountChange(data.length);
    setLoading(false);
  }, [summitId, onCountChange]);

  useEffect(() => {
    if (!visible) return;
    refresh();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      setMyUserId(user?.id ?? null);
    })();
  }, [visible, refresh]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? 'local';
      const uname = (data.user?.user_metadata?.display_name as string | undefined) ?? s.anonymousUser;
      await addCondition(summitId, selectedType, note, uid, uname);
      setNote('');
      setShowForm(false);
      await refresh();
    } catch {
      Alert.alert(s.error, s.tryAgain);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (report: ConditionReport) => {
    Alert.alert(s.condDeleteTitle, s.condDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive',
        onPress: async () => {
          await deleteCondition(summitId, report.id).catch(() => {});
          await refresh();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={1}>{s.condTitle} · {summitName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setShowForm((f: boolean) => !f)}
          activeOpacity={0.7}
        >
          <Text style={styles.reportBtnTxt}>
            {showForm ? s.condCancelReport : s.condReport}
          </Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>{s.condSelectType}</Text>
            <View style={styles.typePills}>
              {CONDITION_TYPES.map(type => {
                const meta = CONDITION_META[type];
                const active = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pillIcon}>{meta.icon}</Text>
                    <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                      {(s as Record<string, unknown>)[meta.labelKey] as string}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={s.condNotePlaceholder}
              placeholderTextColor={Colors.zinc500}
              maxLength={MAX_NOTE_CHARS}
            />
            <View style={styles.formFooter}>
              <Text style={styles.charCount}>{note.length}/{MAX_NOTE_CHARS}</Text>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.7}
              >
                {submitting
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.submitTxt}>{s.condSubmit}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading
          ? <ActivityIndicator color={Colors.green} style={styles.loader} />
          : (
            <FlatList
              data={reports}
              keyExtractor={(item: ConditionReport) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }: { item: ConditionReport }) => (
                <View style={styles.row}>
                  <Text style={styles.rowIcon}>{CONDITION_META[item.type].icon}</Text>
                  <View style={styles.rowBody}>
                    <View style={styles.rowMeta}>
                      <Text style={styles.rowUser}>{item.userName}</Text>
                      <Text style={styles.rowTime}>{relTime(item.reportedAt, s)}</Text>
                    </View>
                    <Text style={styles.rowType}>
                      {(s as Record<string, unknown>)[CONDITION_META[item.type].labelKey] as string}
                    </Text>
                    {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                    <Text style={styles.rowExpiry}>{timeUntilExpiry(item.reportedAt, s)}</Text>
                  </View>
                  {item.userId === myUserId && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                      <Text style={styles.deleteTxt}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>⛅</Text>
                  <Text style={styles.emptyTxt}>{s.condEmpty}</Text>
                  <Text style={styles.emptyDesc}>{s.condEmptyDesc}</Text>
                </View>
              }
            />
          )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  topBar: {
    alignItems: 'center', paddingTop: 8, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.zinc200,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 48 },
  closeBtn: {
    position: 'absolute', right: 16, top: 20, width: 28, height: 28,
    borderRadius: 14, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 11, fontWeight: '700', color: Colors.zinc800 },
  reportBtn: {
    margin: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.green, alignItems: 'center',
  },
  reportBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
  form: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.white,
    borderRadius: 14, padding: 16,
  },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.6, marginBottom: 10 },
  typePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.zinc100, borderWidth: 1.5, borderColor: Colors.zinc100,
  },
  pillActive: { borderColor: Colors.green, backgroundColor: '#EDF7F1' },
  pillIcon: { fontSize: 16 },
  pillLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc800 },
  pillLabelActive: { color: Colors.green },
  noteInput: {
    backgroundColor: Colors.zinc100, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: Colors.zinc950, marginBottom: 8,
  },
  formFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  charCount: { fontSize: 12, color: Colors.zinc500 },
  submitBtn: {
    backgroundColor: Colors.green, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 9,
  },
  submitBtnDisabled: { backgroundColor: Colors.zinc200 },
  submitTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 48 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
  },
  rowIcon: { fontSize: 26, marginTop: 2 },
  rowBody: { flex: 1 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rowUser: { fontSize: 13, fontWeight: '600', color: Colors.zinc950 },
  rowTime: { fontSize: 12, color: Colors.zinc500 },
  rowType: { fontSize: 15, fontWeight: '700', color: Colors.zinc800, marginBottom: 2 },
  rowNote: { fontSize: 13, color: Colors.zinc500, lineHeight: 18, marginBottom: 2 },
  rowExpiry: { fontSize: 11, color: Colors.zinc500 },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontSize: 12, color: Colors.zinc500 },
  sep: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTxt: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 32 },
});
