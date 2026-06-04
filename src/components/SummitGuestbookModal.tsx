import { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Colors } from '../constants';
import { fetchGuestbook, postGuestbookEntry, deleteGuestbookEntry, type GuestbookEntry } from '../services/summitGuestbook';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { supabase } from '../services/supabase';

const MAX_CHARS = 200;

function timeAgo(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (diffH < 1) return '< 1h';
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  return `${Math.floor(diffD / 30)}mo`;
}

interface EntryRowProps {
  item: GuestbookEntry;
  myUserId: string | null;
  onDelete: (id: string) => void;
}

function EntryRow({ item, myUserId, onDelete }: EntryRowProps) {
  const isOwn = myUserId === item.userId;
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryName} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.entryTime}>{timeAgo(item.createdAt)}</Text>
        {isOwn && (
          <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.entryMessage}>{item.message}</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
}

export default function SummitGuestbookModal({ visible, summitId, summitName, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) =>
      setMyUserId(data.user?.id ?? null),
    );
  }, []);

  useEffect(() => {
    if (!visible || !summitId) return;
    setLoading(true);
    fetchGuestbook(summitId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [visible, summitId]);

  async function handlePost() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return;
    setPosting(true);
    try {
      await postGuestbookEntry(summitId, trimmed);
      setDraft('');
      const fresh = await fetchGuestbook(summitId);
      setEntries(fresh);
    } catch {
      Alert.alert(s.guestbookPostError);
    } finally {
      setPosting(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert(s.guestbookDeleteTitle, s.guestbookDeleteMsg, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGuestbookEntry(id);
            setEntries((prev: GuestbookEntry[]) => prev.filter((e: GuestbookEntry) => e.id !== id));
          } catch {
            Alert.alert(s.guestbookPostError);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>📖 {s.guestbookTitle}</Text>
          <Text style={styles.subtitle}>{summitName}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ marginTop: 48 }} />
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>{s.guestbookEmpty}</Text>
        ) : (
          <FlatList<GuestbookEntry>
            data={entries}
            keyExtractor={(item: GuestbookEntry) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: GuestbookEntry }) => (
              <EntryRow item={item} myUserId={myUserId} onDelete={handleDelete} />
            )}
          />
        )}

        <View style={styles.compose}>
          <TextInput
            style={styles.input}
            placeholder={s.guestbookPlaceholder}
            placeholderTextColor={Colors.zinc500}
            value={draft}
            onChangeText={setDraft}
            maxLength={MAX_CHARS}
            multiline
          />
          <View style={styles.composeFooter}>
            <Text style={[styles.charCount, draft.length > MAX_CHARS - 20 && styles.charCountWarn]}>
              {draft.length}/{MAX_CHARS}
            </Text>
            <TouchableOpacity
              style={[styles.postBtn, (!draft.trim() || posting) && styles.postBtnDisabled]}
              onPress={handlePost}
              disabled={!draft.trim() || posting}
            >
              {posting
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.postBtnTxt}>{s.guestbookPost}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc100,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.zinc800 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { position: 'absolute', top: 20, right: 20, padding: 4 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 48, fontSize: 15 },
  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  entryName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.green },
  entryTime: { fontSize: 12, color: Colors.zinc500 },
  deleteBtn: { fontSize: 14, color: Colors.zinc500, paddingLeft: 4 },
  entryMessage: { fontSize: 14, color: Colors.zinc800, lineHeight: 20 },
  compose: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.zinc200,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  input: {
    backgroundColor: Colors.zinc100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.zinc800,
    minHeight: 48,
    maxHeight: 100,
  },
  composeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  charCount: { fontSize: 12, color: Colors.zinc500 },
  charCountWarn: { color: Colors.orange },
  postBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: 'center',
  },
  postBtnDisabled: { backgroundColor: Colors.zinc200 },
  postBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
