import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { fetchMessages, sendMessage, deleteMessage, ChatMessage } from '../services/crewChat';
import { supabase } from '../services/supabase';

interface Props {
  visible: boolean;
  crewId: string;
  crewName: string;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CrewChatModal({ visible, crewId, crewName, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await fetchMessages(crewId);
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  }, [crewId]);

  useEffect(() => {
    if (!visible) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from('users').select('display_name').eq('id', user.id).single()
        .then(({ data }) => setDisplayName((data as { display_name?: string } | null)?.display_name ?? 'Hiker'));
    });
    load();
  }, [visible, load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    setSending(true);
    try {
      const msg = await sendMessage(crewId, userId, displayName || 'Hiker', text);
      setMessages((prev) => [...prev, msg]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (msg: ChatMessage) => {
    Alert.alert(s.crewChatDeleteConfirm, '', [
      { text: s.cancel, style: 'cancel' },
      {
        text: 'OK', style: 'destructive', onPress: async () => {
          await deleteMessage(crewId, msg.id);
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.user_id === userId;
    return (
      <TouchableOpacity
        onLongPress={isOwn ? () => handleDelete(item) : undefined}
        activeOpacity={isOwn ? 0.7 : 1}
        style={[styles.msgRow, isOwn && styles.msgRowOwn]}
      >
        <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
          {!isOwn && <Text style={styles.senderName}>{item.sender_name}</Text>}
          <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{item.text}</Text>
          <Text style={[styles.msgTime, isOwn && styles.msgTimeOwn]}>{timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{crewName} — {s.crewChatTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.green} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{s.crewChatEmpty}</Text>}
          />
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.compose}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(v) => setText(v.slice(0, 200))}
              placeholder={s.crewChatPlaceholder}
              placeholderTextColor={Colors.zinc500}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              <Text style={styles.sendText}>{s.crewChatSend}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.zinc200,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, flex: 1, marginRight: 8 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: Colors.zinc500 },
  loader: { flex: 1 },
  list: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 60, fontSize: 14, paddingHorizontal: 24 },
  msgRow: { marginBottom: 8, alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  bubble: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 10, maxWidth: '80%',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  bubbleOwn: { backgroundColor: Colors.green },
  senderName: { fontSize: 11, fontWeight: '700', color: Colors.greenLight, marginBottom: 3 },
  msgText: { fontSize: 14, color: Colors.zinc950, lineHeight: 20 },
  msgTextOwn: { color: Colors.white },
  msgTime: { fontSize: 10, color: Colors.zinc500, marginTop: 4, textAlign: 'right' },
  msgTimeOwn: { color: 'rgba(255,255,255,0.65)' },
  compose: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    borderTopWidth: 1, borderTopColor: Colors.zinc200, backgroundColor: Colors.white,
  },
  input: {
    flex: 1, backgroundColor: Colors.zinc100, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.zinc950, maxHeight: 100,
  },
  sendBtn: { marginLeft: 8, backgroundColor: Colors.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
