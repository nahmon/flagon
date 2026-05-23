import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchDailyChallenge, DailyChallenge } from '../services/dailyChallenge';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function msToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DailyChallengeCard() {
  const { lang } = useLang();
  const s = t(lang);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(msToMidnight());
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchDailyChallenge()
      .then(setChallenge)
      .catch(() => setChallenge(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      const ms = msToMidnight();
      setCountdown(ms);
      if (ms <= 0) {
        load();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [load]);

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.collapsed} onPress={() => setExpanded(true)} activeOpacity={0.8}>
        <Text style={styles.collapsedEmoji}>🏆</Text>
        <Text style={styles.collapsedText}>{s.dailyChallenge}</Text>
        <Text style={styles.collapsedCountdown}>{formatCountdown(countdown)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={styles.cardTitle}>{s.dailyChallenge}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownLabel}>{s.resets}</Text>
            <Text style={styles.countdownValue}>{formatCountdown(countdown)}</Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} style={styles.collapseBtn}>
            <Text style={styles.collapseIcon}>▴</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.green} size="small" />
        </View>
      ) : challenge ? (
        <View style={styles.summitSection}>
          <View style={styles.summitInfo}>
            <Text style={styles.summitName} numberOfLines={1}>
              {summitName(challenge.summit, lang)}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.elevBadge}>
                <Text style={styles.elevText}>{challenge.summit.elevation_m}m</Text>
              </View>
              {challenge.summit.mountain_group ? (
                <Text style={styles.groupText}>{challenge.summit.mountain_group}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.conquerorBox}>
            <Text style={styles.conquerorCount}>{challenge.conquerors_today}</Text>
            <Text style={styles.conquerorLabel}>{s.conqueredToday}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.unavailableText}>{s.challengeUnavailable}</Text>
      )}

      <Text style={styles.hint}>{s.challengeHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.greenDark,
    borderRadius: 18,
    padding: 16,
    shadowColor: Colors.zinc950,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trophyEmoji: { fontSize: 20 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.white, letterSpacing: 0.8, textTransform: 'uppercase' },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  countdownLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase' },
  countdownValue: { fontSize: 13, fontWeight: '700', color: Colors.white, fontVariant: ['tabular-nums'] },
  collapseBtn: { padding: 4 },
  collapseIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  summitSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  summitInfo: { flex: 1, marginRight: 12 },
  summitName: { fontSize: 18, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  elevBadge: {
    backgroundColor: Colors.orange,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  elevText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  groupText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  conquerorBox: { alignItems: 'center', minWidth: 52 },
  conquerorCount: { fontSize: 28, fontWeight: '800', color: Colors.white, lineHeight: 30 },
  conquerorLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
  loader: { paddingVertical: 20, alignItems: 'center' },
  unavailableText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', paddingVertical: 8 },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: 0.3 },
  collapsed: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.greenDark,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsedEmoji: { fontSize: 16 },
  collapsedText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.white },
  collapsedCountdown: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },
});
