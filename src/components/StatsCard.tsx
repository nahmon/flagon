import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchUserStats, UserStats } from '../services/stats';

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function StatsCard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchUserStats(userId)
      .then((s) => { if (mounted) setStats(s); })
      .catch(() => { if (mounted) setStats(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>나의 통계</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.grid}>
          <StatItem value={String(stats?.totalFlags ?? 0)} label="총 깃발" />
          <StatItem value={String(stats?.uniqueSummits ?? 0)} label="정복 정상" />
          <StatItem
            value={stats?.highestPeakM ? `${stats.highestPeakM}m` : '-'}
            label="최고 봉우리"
          />
          <StatItem value={String(stats?.activeFlags ?? 0)} label="활성 깃발" />
        </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.cream,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.green,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.zinc500,
    marginTop: 4,
  },
});
