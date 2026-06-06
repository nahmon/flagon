import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants';
import {
  fetchUpcomingEvents, fetchEventsForSummit, createEvent,
  rsvpEvent, cancelRsvp, deleteEvent, getMyUserId,
  type GroupHikeEvent, type CreateEventInput,
} from '../services/groupHikeEvents';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

interface Summit {
  id: string;
  name_ko: string;
  name_en: string | null;
  name_ja: string | null;
  elevation_m: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  summit?: Summit;
}

const DATE_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDateChips(): { label: string; iso: string }[] {
  const chips = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${DATE_LABELS[d.getDay()]} ${d.getDate()}`;
    chips.push({ label: dayLabel, iso });
  }
  return chips;
}

function formatDate(iso: string, lang: string): string {
  const [y, m, d] = iso.split('-');
  if (lang === 'ko') return `${m}월 ${d}일`;
  if (lang === 'ja') return `${m}月${d}日`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${d}`;
}

export default function GroupHikeEventsModal({ visible, onClose, summit }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [tab, setTab] = useState<'summit' | 'all'>('summit');
  const [events, setEvents] = useState<GroupHikeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(buildDateChips()[0].iso);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const chips = buildDateChips();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [id, list] = await Promise.all([
        getMyUserId(),
        tab === 'summit' && summit ? fetchEventsForSummit(summit.id) : fetchUpcomingEvents(),
      ]);
      setMyId(id);
      setEvents(list);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [tab, summit]);

  useEffect(() => {
    if (visible) { load(); setCreating(false); setDescription(''); }
  }, [visible, load]);

  async function handleCreate() {
    if (!summit) return;
    setSaving(true);
    try {
      const input: CreateEventInput = {
        summitId: summit.id,
        summitNameKo: summit.name_ko,
        summitNameEn: summit.name_en ?? summit.name_ko,
        summitNameJa: summit.name_ja ?? summit.name_ko,
        elevationM: summit.elevation_m,
        eventDate: selectedDate,
        description: description.trim(),
      };
      await createEvent(input);
      setCreating(false);
      setDescription('');
      await load();
    } catch {
      Alert.alert(s.groupHikeCreateError);
    } finally {
      setSaving(false);
    }
  }

  async function handleRsvp(event: GroupHikeEvent) {
    const joined = event.attendees.some((a) => a.userId === myId);
    if (joined) {
      await cancelRsvp(event.id);
    } else {
      await rsvpEvent(event.id);
    }
    await load();
  }

  async function handleDelete(eventId: string) {
    Alert.alert(s.groupHikeDeleteTitle, s.groupHikeDeleteMsg, [
      { text: s.cancel, style: 'cancel' },
      { text: s.delete, style: 'destructive', onPress: async () => { await deleteEvent(eventId); await load(); } },
    ]);
  }

  function renderItem({ item }: { item: GroupHikeEvent }) {
    const joined = item.attendees.some((a) => a.userId === myId);
    const isOwner = item.creatorId === myId;
    const sName = summitName({ name_ko: item.summitNameKo, name_en: item.summitNameEn, name_ja: item.summitNameJa }, lang);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardSummit}>{sName}</Text>
            <Text style={styles.cardElev}>{item.elevationM.toLocaleString()}m</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardDate}>{formatDate(item.eventDate, lang)}</Text>
            {isOwner && (
              <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
        <View style={styles.cardFooter}>
          <Text style={styles.cardHost}>{s.groupHikeBy(item.creatorName)}</Text>
          <Text style={styles.cardAttendees}>{s.groupHikeAttendees(item.attendees.length)}</Text>
          <TouchableOpacity
            style={[styles.rsvpBtn, joined && styles.rsvpBtnJoined]}
            onPress={() => handleRsvp(item)}
          >
            <Text style={[styles.rsvpBtnTxt, joined && styles.rsvpBtnTxtJoined]}>
              {joined ? s.groupHikeLeave : s.groupHikeJoin}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.groupHikeTitle}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {summit && (
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, tab === 'summit' && styles.tabActive]} onPress={() => setTab('summit')}>
              <Text style={[styles.tabTxt, tab === 'summit' && styles.tabTxtActive]}>{s.groupHikeTabSummit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'all' && styles.tabActive]} onPress={() => setTab('all')}>
              <Text style={[styles.tabTxt, tab === 'all' && styles.tabTxtActive]}>{s.groupHikeTabAll}</Text>
            </TouchableOpacity>
          </View>
        )}

        {creating ? (
          <ScrollView style={styles.createForm} keyboardShouldPersistTaps="handled">
            <Text style={styles.createLabel}>{s.groupHikeDateLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {chips.map((c) => (
                <TouchableOpacity
                  key={c.iso}
                  style={[styles.dateChip, c.iso === selectedDate && styles.dateChipSel]}
                  onPress={() => setSelectedDate(c.iso)}
                >
                  <Text style={[styles.dateChipTxt, c.iso === selectedDate && styles.dateChipTxtSel]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.createLabel}>{s.groupHikeDescLabel}</Text>
            <TextInput
              style={styles.descInput}
              value={description}
              onChangeText={(v: string) => setDescription(v.slice(0, 120))}
              placeholder={s.groupHikeDescPlaceholder}
              placeholderTextColor={Colors.zinc500}
              multiline
              maxLength={120}
            />
            <View style={styles.createActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreating(false)}>
                <Text style={styles.cancelBtnTxt}>{s.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleCreate} disabled={saving}>
                <Text style={styles.saveBtnTxt}>{saving ? '...' : s.groupHikeSave}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={Colors.green} />
            ) : (
              <FlatList
                data={events}
                keyExtractor={(e: GroupHikeEvent) => e.id}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={styles.empty}>{s.groupHikeEmpty}</Text>}
                contentContainerStyle={styles.list}
              />
            )}
            {summit && tab === 'summit' && (
              <TouchableOpacity style={styles.createBtn} onPress={() => setCreating(true)}>
                <Text style={styles.createBtnTxt}>{s.groupHikeCreate}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.zinc200 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.zinc800 },
  closeBtn: { fontSize: 18, color: Colors.zinc500, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.zinc200 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.green },
  tabTxt: { fontSize: 14, color: Colors.zinc500 },
  tabTxtActive: { color: Colors.green, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 60, fontSize: 15 },
  card: { backgroundColor: Colors.zinc100, borderRadius: 12, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardSummit: { fontSize: 15, fontWeight: '700', color: Colors.zinc800 },
  cardElev: { fontSize: 12, color: Colors.green },
  cardDate: { fontSize: 13, fontWeight: '600', color: Colors.zinc800 },
  deleteBtn: { fontSize: 14, color: Colors.zinc500 },
  cardDesc: { fontSize: 13, color: Colors.zinc500, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardHost: { flex: 1, fontSize: 12, color: Colors.zinc500 },
  cardAttendees: { fontSize: 12, color: Colors.zinc500, marginRight: 10 },
  rsvpBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.green },
  rsvpBtnJoined: { backgroundColor: Colors.zinc100, borderWidth: 1, borderColor: Colors.zinc200 },
  rsvpBtnTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rsvpBtnTxtJoined: { color: Colors.zinc500 },
  createBtn: { margin: 16, paddingVertical: 14, backgroundColor: Colors.green, borderRadius: 12, alignItems: 'center' },
  createBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  createForm: { padding: 20 },
  createLabel: { fontSize: 14, fontWeight: '600', color: Colors.zinc800, marginBottom: 8, marginTop: 12 },
  dateRow: { marginBottom: 4 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.zinc100, marginRight: 8, borderWidth: 1, borderColor: Colors.zinc200 },
  dateChipSel: { backgroundColor: Colors.green, borderColor: Colors.green },
  dateChipTxt: { fontSize: 13, color: Colors.zinc500 },
  dateChipTxtSel: { color: '#fff', fontWeight: '600' },
  descInput: { backgroundColor: Colors.zinc100, borderRadius: 10, padding: 12, color: Colors.zinc800, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.zinc200 },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.zinc200, alignItems: 'center' },
  cancelBtnTxt: { fontSize: 15, color: Colors.zinc500 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.green, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
