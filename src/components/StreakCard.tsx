import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchStreak, StreakInfo } from '../services/streaks';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function WeekDot({ hiked, isCurrentWeek }: { hiked: boolean; isCurrentWeek: boolean; key?: string }) {
  return (
    <View style={[
      styles.dot,
      hiked ? styles.dotHiked : styles.dotEmpty,
      isCurrentWeek && styles.dotCurrent,
    ]} />
  );
}

export default function StreakCard({ userId }: { userId: string }) {
  const { lang } = useLang();
  const s = t(lang);
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchStreak(userId)
      .then((d) => { if (mounted) setInfo(d); })
      .catch(() => { if (mounted) setInfo(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{s.streakTitle}</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 16 }} />
      ) : !info ? (
        <Text style={styles.empty}>{s.streakNone}</Text>
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.flameRow}>
              <Text style={styles.flameIcon}>🔥</Text>
              <Text style={styles.streakNum}>{info.current}</Text>
            </View>
            <Text style={styles.streakLabel}>{s.streakWeeks(info.current)}</Text>
            {info.best > 0 && (
              <Text style={styles.bestLabel}>{s.streakBest(info.best)}</Text>
            )}
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.gridLabel}>{s.streakWeekGrid}</Text>
            <View style={styles.dotRow}>
              {info.last8Weeks.map((w: { key: string; hiked: boolean }, i: number) => (
                <WeekDot key={w.key} hiked={w.hiked} isCurrentWeek={i === 7} />
              ))}
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.dotHiked]} />
              <Text style={styles.legendText}>{s.streakThisWeek}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.white,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc500,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flameIcon: {
    fontSize: 36,
  },
  streakNum: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.orange,
    letterSpacing: -2,
    lineHeight: 60,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.zinc800,
    marginTop: 4,
  },
  bestLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.zinc500,
    marginTop: 4,
  },
  gridSection: {
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.zinc500,
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dotHiked: {
    backgroundColor: Colors.orange,
  },
  dotEmpty: {
    backgroundColor: Colors.zinc100,
    borderWidth: 1.5,
    borderColor: Colors.zinc200,
  },
  dotCurrent: {
    borderWidth: 2.5,
    borderColor: Colors.green,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.zinc500,
  },
  empty: {
    fontSize: 14,
    color: Colors.zinc500,
    textAlign: 'center',
    marginVertical: 16,
  },
});
