import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchAchievementStats, computeBadges, Badge } from '../services/achievements';

function BadgeCell({ badge }: { badge: Badge }) {
  return (
    <View style={[styles.cell, !badge.earned && styles.cellLocked]}>
      <Text style={[styles.icon, !badge.earned && styles.iconLocked]}>{badge.icon}</Text>
      <Text style={[styles.label, !badge.earned && styles.labelLocked]} numberOfLines={1}>
        {badge.label}
      </Text>
      <Text style={[styles.desc, !badge.earned && styles.descLocked]} numberOfLines={2}>
        {badge.desc}
      </Text>
      {!badge.earned && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>🔒</Text></View>}
    </View>
  );
}

export default function AchievementGrid({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAchievementStats(userId)
      .then((stats) => { if (mounted) setBadges(computeBadges(stats)); })
      .catch(() => { if (mounted) setBadges([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  const earned = badges?.filter((b: Badge) => b.earned).length ?? 0;
  const total = badges?.length ?? 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>업적</Text>
        {!loading && (
          <Text style={styles.count}>{earned}/{total}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.grid}>
          {(badges ?? []).map((badge: Badge) => (
            <BadgeCell key={badge.id} badge={badge} />
          ))}
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
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '30%',
    backgroundColor: Colors.cream,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    minHeight: 100,
    overflow: 'hidden',
  },
  cellLocked: {
    backgroundColor: Colors.zinc100,
  },
  icon: {
    fontSize: 28,
  },
  iconLocked: {
    opacity: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.zinc950,
    textAlign: 'center',
  },
  labelLocked: {
    color: Colors.zinc500,
  },
  desc: {
    fontSize: 10,
    color: Colors.zinc500,
    textAlign: 'center',
    lineHeight: 13,
  },
  descLocked: {
    color: Colors.zinc200,
  },
  lockOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  lockIcon: {
    fontSize: 10,
  },
});
