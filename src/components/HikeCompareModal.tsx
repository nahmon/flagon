import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import { fetchFollowingList, type FollowEntry } from '../services/follows';
import { fetchCompareStats, type CompareStats } from '../services/hikeCompare';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function avatarColor(uid: string): string {
  const p = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return p[uid.charCodeAt(0) % p.length];
}

function initials(name: string | null, uid: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return uid.charAt(0).toUpperCase();
}

interface StatRowProps {
  label: string;
  meVal: number;
  themVal: number;
  format?: (n: number) => string;
}

function StatRow({ label, meVal, themVal, format }: StatRowProps) {
  const fmt = format ?? ((n: number) => n.toLocaleString());
  const meWins = meVal > themVal;
  const themWins = themVal > meVal;
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statVal, meWins && styles.statWin]}>{fmt(meVal)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, styles.statValRight, themWins && styles.statWin]}>{fmt(themVal)}</Text>
    </View>
  );
}

export default function HikeCompareModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [step, setStep] = useState<'pick' | 'compare'>('pick');
  const [contacts, setContacts] = useState<FollowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [me, setMe] = useState<CompareStats | null>(null);
  const [them, setThem] = useState<CompareStats | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setContacts([]); return; }
      const list = await fetchFollowingList(user.id);
      setContacts(list);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) { setStep('pick'); setMe(null); setThem(null); loadContacts(); }
  }, [visible, loadContacts]);

  const handlePick = async (entry: FollowEntry) => {
    setComparing(true);
    try {
      const result = await fetchCompareStats(entry.userId);
      setMe(result.me);
      setThem(result.them);
      setStep('compare');
    } catch {
      // keep on pick screen
    } finally {
      setComparing(false);
    }
  };

  const handleClose = () => { setStep('pick'); onClose(); };

  const renderPickItem = ({ item }: { item: FollowEntry }) => (
    <TouchableOpacity style={styles.contactRow} onPress={() => handlePick(item)} activeOpacity={0.75} disabled={comparing}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.userId) }]}>
        <Text style={styles.avatarText}>{initials(item.displayName, item.userId)}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName ?? item.userId.slice(0, 8)}</Text>
        {item.crewName && (
          <View style={[styles.crewBadge, { backgroundColor: item.crewColor ?? Colors.zinc200 }]}>
            <Text style={styles.crewText}>{item.crewName}</Text>
          </View>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        {step === 'pick' ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{s.compareTitle}</Text>
              <Text style={styles.subtitle}>{s.comparePick}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading || comparing ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={Colors.green} /></View>
            ) : contacts.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyText}>{s.compareNoFollowing}</Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item: FollowEntry) => item.userId}
                renderItem={renderPickItem}
                contentContainerStyle={styles.list}
              />
            )}
          </>
        ) : me && them ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep('pick')} style={styles.backBtn}>
                <Text style={styles.backTxt}>‹ {s.compareBack}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.vsRow}>
              <View style={styles.vsHiker}>
                <View style={[styles.vsAvatar, { backgroundColor: avatarColor(me.userId) }]}>
                  <Text style={styles.vsAvatarTxt}>{initials(me.displayName, me.userId)}</Text>
                </View>
                <Text style={styles.vsName} numberOfLines={1}>{me.displayName ?? s.compareMe}</Text>
              </View>
              <Text style={styles.vsLabel}>VS</Text>
              <View style={styles.vsHiker}>
                <View style={[styles.vsAvatar, { backgroundColor: avatarColor(them.userId) }]}>
                  <Text style={styles.vsAvatarTxt}>{initials(them.displayName, them.userId)}</Text>
                </View>
                <Text style={styles.vsName} numberOfLines={1}>{them.displayName ?? them.userId.slice(0, 8)}</Text>
              </View>
            </View>

            <View style={styles.statsCard}>
              <StatRow label={s.compareStatFlags} meVal={me.totalFlags} themVal={them.totalFlags} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatSummits} meVal={me.uniqueSummits} themVal={them.uniqueSummits} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatHighest} meVal={me.highestPeakM} themVal={them.highestPeakM} format={(n) => `${n.toLocaleString()}m`} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatElevation} meVal={me.totalElevationM} themVal={them.totalElevationM} format={(n) => `${Math.round(n / 1000).toLocaleString()}km`} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatStreak} meVal={me.currentStreak} themVal={them.currentStreak} format={(n) => `${n}wk`} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatBestStreak} meVal={me.bestStreak} themVal={them.bestStreak} format={(n) => `${n}wk`} />
              <View style={styles.divider} />
              <StatRow label={s.compareStatWeek} meVal={me.flagsThisWeek} themVal={them.flagsThisWeek} />
            </View>

            <Text style={styles.winnerHint}>{s.compareWinnerHint}</Text>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.zinc200, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950, flex: 1 },
  subtitle: { fontSize: 13, color: Colors.zinc500, flex: 1, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 },
  backBtn: { flex: 1, paddingVertical: 4 },
  backTxt: { fontSize: 15, color: Colors.green, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center', paddingHorizontal: 40 },
  list: { paddingVertical: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 14, gap: 12, marginBottom: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  contactInfo: { flex: 1, gap: 4 },
  contactName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  crewBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  crewText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  chevron: { fontSize: 22, color: Colors.zinc200 },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 24, paddingVertical: 20 },
  vsHiker: { alignItems: 'center', gap: 8, flex: 1 },
  vsAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  vsAvatarTxt: { fontSize: 24, fontWeight: '800', color: Colors.white },
  vsName: { fontSize: 14, fontWeight: '700', color: Colors.zinc950, textAlign: 'center', maxWidth: 100 },
  vsLabel: { fontSize: 22, fontWeight: '900', color: Colors.orange, marginHorizontal: 8 },
  statsCard: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  statVal: { width: 72, fontSize: 16, fontWeight: '700', color: Colors.zinc500, textAlign: 'center' },
  statValRight: { textAlign: 'center' },
  statWin: { color: Colors.green, fontSize: 17 },
  statLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.zinc500, textAlign: 'center' },
  divider: { height: 1, backgroundColor: Colors.zinc100, marginHorizontal: 16 },
  winnerHint: { fontSize: 12, color: Colors.zinc500, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});
