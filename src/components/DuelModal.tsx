import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { fetchFollowingList, type FollowEntry } from '../services/follows';
import {
  fetchMyDuels, sendDuelChallenge, respondToDuel, searchSummitsForDuel,
  type Duel, type SummitOption,
} from '../services/duel';
import { supabase } from '../services/supabase';

type Tab = 'challenge' | 'duels';
type ChallengeStep = 'pick_opponent' | 'pick_summit';

interface Props { visible: boolean; onClose: () => void }

function hoursLeft(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

export default function DuelModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [tab, setTab] = useState<Tab>('challenge');
  const [step, setStep] = useState<ChallengeStep>('pick_opponent');
  const [myId, setMyId] = useState<string | null>(null);
  const [following, setFollowing] = useState<FollowEntry[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<FollowEntry | null>(null);
  const [summitQuery, setSummitQuery] = useState('');
  const [summitResults, setSummitResults] = useState<SummitOption[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);
        const [fl, dl] = await Promise.all([fetchFollowingList(user.id), fetchMyDuels()]);
        setFollowing(fl);
        setDuels(dl);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (visible) { setTab('challenge'); setStep('pick_opponent'); setOpponent(null); setSummitQuery(''); setSummitResults([]); load(); } }, [visible, load]);

  useEffect(() => {
    if (step !== 'pick_summit') return;
    if (!summitQuery.trim()) { setSummitResults([]); return; }
    const tid = setTimeout(async () => {
      setSearching(true);
      try { setSummitResults(await searchSummitsForDuel(summitQuery)); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(tid);
  }, [summitQuery, step]);

  const handleSendChallenge = async (summit: SummitOption) => {
    if (!opponent || busy) return;
    setBusy(summit.id);
    try {
      await sendDuelChallenge(opponent.userId, summit.id, summit.name_ko, summit.name_en, summit.elevation_m);
      Alert.alert('⚔️', s.duelSentOk);
      setStep('pick_opponent');
      setOpponent(null);
      setSummitQuery('');
      setSummitResults([]);
    } catch {
      Alert.alert(s.error, s.duelSendError);
    } finally {
      setBusy(null);
    }
  };

  const handleRespond = async (duelId: string, accept: boolean) => {
    if (busy) return;
    setBusy(duelId);
    try { await respondToDuel(duelId, accept); await load(); } catch { Alert.alert(s.error, s.duelSendError); } finally { setBusy(null); }
  };

  const statusLabel = (d: Duel): string => {
    if (d.status === 'pending') return s.duelStatusPending;
    if (d.status === 'active') return s.duelStatusActive;
    if (d.status === 'challenger_won') return myId === d.challenger_id ? s.duelWon : s.duelLost;
    if (d.status === 'challenged_won') return myId === d.challenged_id ? s.duelWon : s.duelLost;
    return d.status;
  };

  const statusColor = (d: Duel): string => {
    if (d.status === 'pending') return Colors.orange;
    if (d.status === 'active') return Colors.green;
    if ((d.status === 'challenger_won' && myId === d.challenger_id) || (d.status === 'challenged_won' && myId === d.challenged_id)) return Colors.green;
    return Colors.zinc500;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.duelTitle}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
        </View>
        <View style={styles.tabs}>
          {(['challenge', 'duels'] as Tab[]).map((tb) => (
            <TouchableOpacity key={tb} style={[styles.tab, tab === tb && styles.tabActive]} onPress={() => setTab(tb)}>
              <Text style={[styles.tabTxt, tab === tb && styles.tabTxtActive]}>{tb === 'challenge' ? s.duelChallenge : s.duelActiveDuels}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={Colors.green} style={styles.loader} /> : tab === 'challenge' ? (
          step === 'pick_opponent' ? (
            following.length === 0
              ? <View style={styles.empty}><Text style={styles.emptyIcon}>⚔️</Text><Text style={styles.emptyTitle}>{s.duelNoFollowing}</Text></View>
              : <FlatList data={following} keyExtractor={(i: FollowEntry) => i.userId} contentContainerStyle={styles.list}
                  renderItem={({ item }: { item: FollowEntry }) => (
                    <TouchableOpacity style={styles.row} onPress={() => { setOpponent(item); setStep('pick_summit'); }}>
                      <View style={[styles.avatar, { backgroundColor: item.crewColor ?? Colors.green }]}><Text style={styles.avatarLetter}>{(item.displayName?.[0] ?? '?').toUpperCase()}</Text></View>
                      <View style={styles.nameCol}><Text style={styles.name}>{item.displayName ?? '?'}</Text>{item.crewName ? <Text style={styles.crew}>{item.crewName}</Text> : null}</View>
                      <Text style={styles.arrow}>→</Text>
                    </TouchableOpacity>
                  )} />
          ) : (
            <View style={styles.flex}>
              <TouchableOpacity onPress={() => setStep('pick_opponent')} style={styles.backRow}><Text style={styles.backTxt}>← {opponent?.displayName}</Text></TouchableOpacity>
              <TextInput style={styles.searchInput} value={summitQuery} onChangeText={setSummitQuery} placeholder={s.duelSearchSummit} placeholderTextColor={Colors.zinc500} autoFocus />
              {searching ? <ActivityIndicator color={Colors.green} style={styles.loader} /> : (
                <FlatList data={summitResults} keyExtractor={(i: SummitOption) => i.id} contentContainerStyle={styles.list}
                  ListEmptyComponent={summitQuery.trim() ? <Text style={styles.emptyTitle}>{s.duelNoSummits}</Text> : null}
                  renderItem={({ item }: { item: SummitOption }) => (
                    <TouchableOpacity style={styles.row} onPress={() => handleSendChallenge(item)} disabled={busy === item.id}>
                      <View style={styles.summitIcon}><Text style={styles.summitIconTxt}>⛰</Text></View>
                      <View style={styles.nameCol}><Text style={styles.name}>{item.name_ko}</Text>{item.name_en ? <Text style={styles.crew}>{item.name_en}</Text> : null}</View>
                      {busy === item.id ? <ActivityIndicator size="small" color={Colors.green} /> : <Text style={styles.elevTxt}>{item.elevation_m}m</Text>}
                    </TouchableOpacity>
                  )} />
              )}
            </View>
          )
        ) : (
          duels.length === 0
            ? <View style={styles.empty}><Text style={styles.emptyIcon}>⚔️</Text><Text style={styles.emptyTitle}>{s.duelEmpty}</Text></View>
            : <FlatList data={duels} keyExtractor={(d: Duel) => d.id} contentContainerStyle={styles.list}
                renderItem={({ item: d }: { item: Duel }) => {
                  const isChallenger = myId === d.challenger_id;
                  const them = isChallenger ? d.challenged_name : d.challenger_name;
                  const summitLabel = lang === 'en' && d.summit_name_en ? d.summit_name_en : d.summit_name_ko;
                  const isPendingForMe = d.status === 'pending' && !isChallenger;
                  return (
                    <View style={styles.duelCard}>
                      <View style={styles.duelHeader}>
                        <Text style={styles.duelSummit}>{summitLabel} · {d.elevation_m}m</Text>
                        <Text style={[styles.duelStatus, { color: statusColor(d) }]}>{statusLabel(d)}</Text>
                      </View>
                      <Text style={styles.duelVs}>⚔️ {isChallenger ? s.duelVsYou : d.challenger_name} vs {isChallenger ? them : s.duelVsYou}</Text>
                      <Text style={styles.duelExpiry}>{s.duelExpiry}: {hoursLeft(d.expires_at)}h</Text>
                      {isPendingForMe && (
                        <View style={styles.duelActions}>
                          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(d.id, true)} disabled={!!busy}><Text style={styles.acceptTxt}>{s.duelAccept}</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.declineBtn} onPress={() => handleRespond(d.id, false)} disabled={!!busy}><Text style={styles.declineTxt}>{s.duelDecline}</Text></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  flex: { flex: 1 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950, letterSpacing: -0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 12, color: Colors.zinc800, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.zinc100, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white },
  tabTxt: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  tabTxtActive: { color: Colors.zinc950 },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.zinc500, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.zinc100 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: Colors.white },
  summitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.green + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  summitIconTxt: { fontSize: 18 },
  nameCol: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  crew: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  arrow: { fontSize: 16, color: Colors.zinc500 },
  elevTxt: { fontSize: 13, fontWeight: '600', color: Colors.green },
  backRow: { paddingHorizontal: 20, paddingVertical: 12 },
  backTxt: { fontSize: 14, color: Colors.green, fontWeight: '600' },
  searchInput: { marginHorizontal: 20, marginBottom: 8, backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.zinc950, borderWidth: 1, borderColor: Colors.zinc200 },
  duelCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.zinc200 },
  duelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  duelSummit: { fontSize: 14, fontWeight: '700', color: Colors.zinc950, flex: 1 },
  duelStatus: { fontSize: 12, fontWeight: '700' },
  duelVs: { fontSize: 13, color: Colors.zinc500, marginBottom: 4 },
  duelExpiry: { fontSize: 11, color: Colors.zinc500 },
  duelActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: Colors.green, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  acceptTxt: { fontSize: 13, fontWeight: '700', color: Colors.white },
  declineBtn: { flex: 1, backgroundColor: Colors.zinc100, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  declineTxt: { fontSize: 13, fontWeight: '700', color: Colors.zinc500 },
});
