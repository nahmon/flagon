import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchUpcomingEvents, rsvpEvent, cancelRsvp, getMyUserId, type GroupHikeEvent } from '../services/groupHikeEvents';
import GroupHikeEventsModal from './GroupHikeEventsModal';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${d}`;
}

export default function UpcomingGroupHikesSection() {
  const { lang } = useLang();
  const s = t(lang);
  const [events, setEvents] = useState<GroupHikeEvent[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [id, list] = await Promise.all([getMyUserId(), fetchUpcomingEvents()]);
      setMyId(id);
      setEvents(list.slice(0, 10));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRsvp(event: GroupHikeEvent) {
    const joined = event.attendees.some((a) => a.userId === myId);
    if (joined) await cancelRsvp(event.id);
    else await rsvpEvent(event.id);
    await load();
  }

  if (!loading && events.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{s.groupHikeFeedTitle}</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.viewAll}>{s.viewAll}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {events.map((ev: GroupHikeEvent) => {
            const joined = ev.attendees.some((a: { userId: string; userName: string }) => a.userId === myId);
            const sName = summitName({ name_ko: ev.summitNameKo, name_en: ev.summitNameEn, name_ja: ev.summitNameJa }, lang);
            return (
              <View key={ev.id} style={styles.card}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateTxt}>{formatDateShort(ev.eventDate)}</Text>
                </View>
                <Text style={styles.summitName} numberOfLines={1}>{sName}</Text>
                <Text style={styles.elev}>{ev.elevationM.toLocaleString()}m</Text>
                <Text style={styles.attendees}>{s.groupHikeAttendees(ev.attendees.length)}</Text>
                <TouchableOpacity
                  style={[styles.joinBtn, joined && styles.joinBtnActive]}
                  onPress={() => handleRsvp(ev)}
                >
                  <Text style={[styles.joinBtnTxt, joined && styles.joinBtnTxtActive]}>
                    {joined ? s.groupHikeLeave : s.groupHikeJoin}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.seeMoreCard} onPress={() => setModalVisible(true)}>
            <Text style={styles.seeMoreTxt}>+{'\n'}{s.viewAll}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <GroupHikeEventsModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Colors.white, marginBottom: 8, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.zinc800 },
  viewAll: { fontSize: 13, color: Colors.green, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, gap: 10 },
  card: { width: 130, backgroundColor: Colors.zinc100, borderRadius: 12, padding: 12, gap: 4 },
  dateBadge: { backgroundColor: Colors.green + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 2 },
  dateTxt: { fontSize: 11, fontWeight: '700', color: Colors.green },
  summitName: { fontSize: 13, fontWeight: '700', color: Colors.zinc800 },
  elev: { fontSize: 11, color: Colors.green },
  attendees: { fontSize: 11, color: Colors.zinc500 },
  joinBtn: { marginTop: 6, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.green, alignItems: 'center' },
  joinBtnActive: { backgroundColor: Colors.zinc100, borderWidth: 1, borderColor: Colors.zinc200 },
  joinBtnTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },
  joinBtnTxtActive: { color: Colors.zinc500 },
  seeMoreCard: { width: 70, backgroundColor: Colors.zinc100, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  seeMoreTxt: { fontSize: 13, color: Colors.green, fontWeight: '600', textAlign: 'center' },
});
