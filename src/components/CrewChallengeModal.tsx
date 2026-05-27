import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../constants';
import { CrewChallenge, CrewLeaderboardEntry } from '../types';
import { fetchCrewChallenges, createChallenge, fetchChallengeProgress } from '../services/crewChallenge';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const DURATIONS = [24, 48, 72] as const;
type Duration = (typeof DURATIONS)[number];

interface ChallengeProgress {
  challenger: number;
  challenged: number;
}

interface ActiveCardProps {
  challenge: CrewChallenge;
  myCrew: CrewLeaderboardEntry;
  lang: ReturnType<typeof t>;
}

function ActiveChallengeCard({ challenge, myCrew, lang }: ActiveCardProps) {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);

  useEffect(() => {
    fetchChallengeProgress(
      challenge.challenger_crew_id,
      challenge.challenged_crew_id,
      challenge.starts_at,
      challenge.ends_at,
    )
      .then(setProgress)
      .catch(() => null);
  }, [challenge]);

  const isChallenger = challenge.challenger_crew_id === myCrew.id;
  const myScore = isChallenger ? (progress?.challenger ?? 0) : (progress?.challenged ?? 0);
  const theirScore = isChallenger ? (progress?.challenged ?? 0) : (progress?.challenger ?? 0);
  const opponentCrew = isChallenger ? challenge.challenged_crew : challenge.challenger_crew;

  const hoursLeft = Math.max(
    0,
    Math.floor((new Date(challenge.ends_at).getTime() - Date.now()) / 3_600_000),
  );

  const total = myScore + theirScore;
  const myPct = total === 0 ? 0.5 : myScore / total;

  let statusLabel: string = lang.challengeTie;
  let statusColor: string = Colors.zinc500;
  if (myScore > theirScore) { statusLabel = lang.challengeWin; statusColor = Colors.green; }
  else if (myScore < theirScore) { statusLabel = lang.challengeLose; statusColor = Colors.orange; }

  return (
    <View style={styles.challengeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.crewPill}>
          <View style={[styles.colorDot, { backgroundColor: myCrew.color_hex }]} />
          <Text style={styles.crewPillName}>{myCrew.name_ko ?? myCrew.name}</Text>
        </View>
        <Text style={styles.vsText}>{lang.challengeVs}</Text>
        <View style={styles.crewPill}>
          <View style={[styles.colorDot, { backgroundColor: opponentCrew?.color_hex ?? '#888' }]} />
          <Text style={styles.crewPillName}>{opponentCrew?.name_ko ?? opponentCrew?.name ?? '?'}</Text>
        </View>
      </View>

      {progress ? (
        <>
          <View style={styles.scoreRow}>
            <Text style={[styles.myScore, { color: statusColor }]}>{myScore}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, { flex: myPct, backgroundColor: myCrew.color_hex }]} />
              <View style={[styles.barFill, { flex: 1 - myPct, backgroundColor: opponentCrew?.color_hex ?? '#888' }]} />
            </View>
            <Text style={styles.theirScore}>{theirScore}</Text>
          </View>
          <Text style={styles.statusLine}>
            <Text style={{ color: statusColor }}>{statusLabel}</Text>
            {' · '}
            {lang.challengeEndsIn(hoursLeft)}
          </Text>
        </>
      ) : (
        <ActivityIndicator size="small" color={Colors.green} style={{ marginTop: 8 }} />
      )}
    </View>
  );
}

interface Props {
  visible: boolean;
  opponentCrew: CrewLeaderboardEntry;
  myCrew: CrewLeaderboardEntry | null;
  onClose: () => void;
}

export default function CrewChallengeModal({ visible, opponentCrew, myCrew, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);

  const [tab, setTab] = useState<'active' | 'create'>('active');
  const [challenges, setChallenges] = useState<CrewChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<Duration>(24);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    if (!myCrew) return;
    setLoading(true);
    fetchCrewChallenges(myCrew.id)
      .then(setChallenges)
      .catch(() => setChallenges([]))
      .finally(() => setLoading(false));
  }, [myCrew]);

  useEffect(() => {
    if (visible && myCrew) load();
  }, [visible, myCrew, load]);

  const handleCreate = async () => {
    if (!myCrew) return;
    setSending(true);
    try {
      await createChallenge(myCrew.id, opponentCrew.id, duration);
      Alert.alert(s.crewChallenge, s.challengeSuccess);
      load();
      setTab('active');
    } catch {
      Alert.alert(s.crewChallenge, s.challengeError);
    } finally {
      setSending(false);
    }
  };

  const activeChallenges = challenges.filter(
    (c: CrewChallenge) =>
      c.status === 'active' &&
      (c.challenger_crew_id === opponentCrew.id || c.challenged_crew_id === opponentCrew.id),
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.crewChallenge}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtnText}>{s.cancel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['active', 'create'] as const).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
              onPress={() => setTab(tabKey)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabLabel, tab === tabKey && styles.tabLabelActive]}>
                {tabKey === 'active' ? s.challengeActive : s.challengeSend}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'active' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {!myCrew ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{s.challengeNoCrew}</Text>
              </View>
            ) : loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.green} />
              </View>
            ) : activeChallenges.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>⚔️</Text>
                <Text style={styles.emptyText}>{s.challengeNoActive}</Text>
              </View>
            ) : (
              activeChallenges.map((c: CrewChallenge) => (
                <React.Fragment key={c.id}>
                  <ActiveChallengeCard challenge={c} myCrew={myCrew!} lang={s} />
                </React.Fragment>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {!myCrew ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{s.challengeNoCrew}</Text>
              </View>
            ) : (
              <>
                <View style={styles.matchupBanner}>
                  <View style={styles.crewPill}>
                    <View style={[styles.colorDot, { backgroundColor: myCrew.color_hex }]} />
                    <Text style={styles.crewPillName}>{myCrew.name_ko ?? myCrew.name}</Text>
                  </View>
                  <Text style={styles.vsLarge}>{s.challengeVs}</Text>
                  <View style={styles.crewPill}>
                    <View style={[styles.colorDot, { backgroundColor: opponentCrew.color_hex }]} />
                    <Text style={styles.crewPillName}>{opponentCrew.name_ko ?? opponentCrew.name}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>{s.challengeDuration}</Text>
                <View style={styles.durationRow}>
                  {DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durationChip, duration === d && styles.durationChipActive]}
                      onPress={() => setDuration(d)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.durationLabel, duration === d && styles.durationLabelActive]}>
                        {s.challengeHours(d)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                  onPress={handleCreate}
                  disabled={sending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sendBtnText}>
                    {sending ? s.challengeCreating : s.challengeCreate}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.zinc950 },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText: { fontSize: 15, color: Colors.green, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.green },
  tabLabel: { fontSize: 14, fontWeight: '600', color: Colors.zinc500 },
  tabLabelActive: { color: Colors.green },
  scrollContent: { padding: 20, gap: 16 },
  center: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center' },

  // Active challenge card
  challengeCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  crewPillName: { fontSize: 13, fontWeight: '600', color: Colors.zinc950, flexShrink: 1 },
  vsText: { fontSize: 13, fontWeight: '700', color: Colors.zinc500, marginHorizontal: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  myScore: { fontSize: 28, fontWeight: '800', minWidth: 32, textAlign: 'center' },
  theirScore: { fontSize: 28, fontWeight: '800', color: Colors.zinc500, minWidth: 32, textAlign: 'center' },
  barContainer: { flex: 1, flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8 },
  statusLine: { fontSize: 13, color: Colors.zinc500 },

  // Create form
  matchupBanner: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  vsLarge: { fontSize: 20, fontWeight: '800', color: Colors.zinc500 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.5 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.zinc200,
  },
  durationChipActive: { borderColor: Colors.green, backgroundColor: Colors.green + '18' },
  durationLabel: { fontSize: 15, fontWeight: '600', color: Colors.zinc500 },
  durationLabelActive: { color: Colors.green },
  sendBtn: {
    backgroundColor: Colors.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
