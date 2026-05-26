import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { SummitTip, loadTips, addTip, deleteTip, MAX_CHARS } from '../services/summitTips';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
  onCountChange: (n: number) => void;
}

function relTime(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return '방금';
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

export default function SummitTipsModal({ visible, summitId, summitName, onClose, onCountChange }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [tips, setTips] = useState<SummitTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadTips(summitId).catch(() => []);
    setTips(data);
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
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? 'local';
      const uname = (data.user?.user_metadata?.display_name as string | undefined) ?? s.anonymousUser;
      await addTip(summitId, trimmed, uid, uname);
      setText('');
      await refresh();
    } catch {
      Alert.alert(s.error, s.tryAgain);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (tip: SummitTip) => {
    Alert.alert(s.tipDeleteTitle, s.tipDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive',
        onPress: async () => {
          await deleteTip(summitId, tip.id).catch(() => {});
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
          <Text style={styles.title} numberOfLines={1}>{s.tipsTitle} · {summitName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={s.tipPlaceholder}
            placeholderTextColor={Colors.zinc500}
            maxLength={MAX_CHARS}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || submitting) && styles.sendBtnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.sendTxt}>{s.tipSend}</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.charCount}>{text.length}/{MAX_CHARS}</Text>

        {loading
          ? <ActivityIndicator color={Colors.green} style={styles.loader} />
          : (
            <FlatList
              data={tips}
              keyExtractor={(item: SummitTip) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }: { item: SummitTip }) => (
                <View style={styles.tipRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{item.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.tipBody}>
                    <View style={styles.tipMeta}>
                      <Text style={styles.tipUser}>{item.userName}</Text>
                      <Text style={styles.tipTime}>{relTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.tipText}>{item.text}</Text>
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
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTxt}>{s.tipsEmpty}</Text>
                  <Text style={styles.emptyDesc}>{s.tipsEmptyDesc}</Text>
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
  topBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.zinc200 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, paddingHorizontal: 48 },
  closeBtn: { position: 'absolute', right: 16, top: 20, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 11, fontWeight: '700', color: Colors.zinc800 },
  inputRow: { flexDirection: 'row', alignItems: 'center', margin: 16, gap: 10 },
  input: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.zinc950,
    borderWidth: 1, borderColor: Colors.zinc200,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.zinc200 },
  sendTxt: { fontSize: 18, color: Colors.white },
  charCount: { fontSize: 11, color: Colors.zinc500, textAlign: 'right', marginRight: 20, marginTop: -8, marginBottom: 8 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 48 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.white, borderRadius: 14, padding: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
  tipBody: { flex: 1 },
  tipMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tipUser: { fontSize: 13, fontWeight: '600', color: Colors.zinc950 },
  tipTime: { fontSize: 12, color: Colors.zinc500 },
  tipText: { fontSize: 14, color: Colors.zinc800, lineHeight: 20 },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontSize: 12, color: Colors.zinc500 },
  sep: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTxt: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 32 },
});
