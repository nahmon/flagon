import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../constants';
import { fetchComments, addComment, deleteComment, FeedComment } from '../services/feedComments';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

interface Props {
  visible: boolean;
  flagId: string | null;
  onClose: () => void;
}

export default function FeedCommentModal({ visible, flagId, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList<FeedComment>>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!visible || !flagId) return;
    setLoading(true);
    fetchComments(flagId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, flagId]);

  const submit = async () => {
    if (!flagId || !body.trim()) return;
    setSubmitting(true);
    try {
      await addComment(flagId, body);
      const updated = await fetchComments(flagId);
      setComments(updated);
      setBody('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert(s.commentError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(s.commentDeleteTitle, s.commentDeleteBody, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive', onPress: async () => {
          try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch { /* noop */ }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.commentsTitle}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.green} />
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{s.commentsEmpty}</Text>}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>{item.display_name ?? item.user_id.slice(0, 6)}</Text>
                  <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <View style={styles.commentBodyRow}>
                  <Text style={styles.commentBody}>{item.body}</Text>
                  {item.user_id === myUserId && (
                    <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder={s.commentPlaceholder}
            placeholderTextColor={Colors.zinc500}
            maxLength={140}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!body.trim() || submitting) && styles.sendBtnDisabled]}
            onPress={submit}
            disabled={!body.trim() || submitting}
          >
            <Text style={styles.sendLabel}>{submitting ? '…' : s.commentSend}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderColor: Colors.zinc200,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  closeBtn: { fontSize: 18, color: Colors.zinc500 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 40, fontSize: 14 },
  commentRow: {
    backgroundColor: Colors.white, borderRadius: 12,
    padding: 12, gap: 4,
  },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: Colors.zinc800 },
  commentTime: { fontSize: 11, color: Colors.zinc500 },
  commentBodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentBody: { flex: 1, fontSize: 14, color: Colors.zinc950, lineHeight: 20 },
  deleteIcon: { fontSize: 14, opacity: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderColor: Colors.zinc200,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderColor: Colors.zinc200,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: Colors.zinc950, backgroundColor: Colors.cream,
  },
  sendBtn: {
    backgroundColor: Colors.green, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendLabel: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
