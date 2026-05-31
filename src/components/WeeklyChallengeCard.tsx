import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchWeeklyChallenge, type WeeklyChallenge, type WeeklyChallengeSummit } from '../services/weeklyChallenge';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function ProgressPips({ done, total }: { done: number; total: number }) {
  return (
    <View style={styles.pips}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.pip, i < done ? styles.pipDone : styles.pipEmpty]}
        />
      ))}
    </View>
  );
}

export default function WeeklyChallengeCard({ userId }: { userId: string }) {
  const { lang } = useLang();
  const s = t(lang);
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchWeeklyChallenge(userId)
      .then(setChallenge)
      .catch(() => setChallenge(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const collapseLabel = challenge
    ? s.weeklyProgress(challenge.completedCount, challenge.summits.length)
    : s.weeklyChallenge;

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.collapsed} onPress={() => setExpanded(true)} activeOpacity={0.8}>
        <Text style={styles.collapsedEmoji}>📅</Text>
        <Text style={styles.collapsedText}>{s.weeklyChallenge}</Text>
        <Text style={styles.collapsedProgress}>{collapseLabel}</Text>
      </TouchableOpacity>
    );
  }

  const allDone = challenge?.allDone ?? false;

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>📅</Text>
          <Text style={styles.cardTitle}>{s.weeklyChallenge}</Text>
        </View>
        <View style={styles.headerRight}>
          {challenge && (
            <View style={styles.daysBadge}>
              <Text style={styles.daysText}>{s.weeklyDaysLeft(challenge.daysLeft)}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} style={styles.collapseBtn}>
            <Text style={styles.collapseIcon}>▴</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.white} size="small" />
        </View>
      ) : challenge ? (
        <>
          <View style={styles.summitList}>
            {challenge.summits.map((ws: WeeklyChallengeSummit, idx: number) => (
              <View key={idx} style={styles.summitRow}>
                <Text style={styles.checkIcon}>{ws.completed ? '✅' : '⭕'}</Text>
                <View style={styles.summitInfo}>
                  <Text
                    style={[styles.summitName, ws.completed && styles.summitNameDone]}
                    numberOfLines={1}
                  >
                    {summitName(ws.summit, lang)}
                  </Text>
                  <Text style={styles.summitElev}>{ws.summit.elevation_m}m</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <ProgressPips done={challenge.completedCount} total={challenge.summits.length} />
            {allDone ? (
              <Text style={styles.allDoneText}>{s.weeklyAllDone}</Text>
            ) : (
              <Text style={styles.bonusText}>{s.weeklyBonus(challenge.bonusXp)}</Text>
            )}
          </View>

          <Text style={styles.hint}>{s.weeklyHint}</Text>
        </>
      ) : (
        <Text style={styles.unavailable}>{s.weeklyUnavailable}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#1A3D2B',
    borderRadius: 18,
    padding: 16,
    shadowColor: Colors.zinc950,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardDone: { backgroundColor: '#14532D' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 20 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  daysBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  collapseBtn: { padding: 4 },
  collapseIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  summitList: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    marginBottom: 12,
  },
  summitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  summitInfo: { flex: 1 },
  summitName: { fontSize: 15, fontWeight: '700', color: Colors.white },
  summitNameDone: { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' },
  summitElev: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pips: { flexDirection: 'row', gap: 6 },
  pip: { width: 24, height: 6, borderRadius: 3 },
  pipDone: { backgroundColor: '#4ADE80' },
  pipEmpty: { backgroundColor: 'rgba(255,255,255,0.2)' },
  bonusText: { fontSize: 13, fontWeight: '700', color: Colors.orange },
  allDoneText: { fontSize: 13, fontWeight: '700', color: '#4ADE80' },
  hint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loader: { paddingVertical: 20, alignItems: 'center' },
  unavailable: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    paddingVertical: 8,
  },
  collapsed: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#1A3D2B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsedEmoji: { fontSize: 16 },
  collapsedText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.white },
  collapsedProgress: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
});
