import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import { fetchMountainGroupProgress, type MountainGroupEntry } from '../services/mountainGroups';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  userId: string;
  onGroupPress?: (group: string) => void;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function MountainGroupProgress({ userId, onGroupPress }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [groups, setGroups] = useState<MountainGroupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMountainGroupProgress(userId)
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{s.mountainGroups}</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={styles.loader} />
      ) : groups.length === 0 ? (
        <Text style={styles.empty}>{s.mountainGroupsEmpty}</Text>
      ) : (
        groups.map((g: MountainGroupEntry) => {
          const pct = g.total > 0 ? (g.flagged / g.total) * 100 : 0;
          const isComplete = g.flagged === g.total && g.total > 0;
          const barColor = isComplete ? Colors.orange : Colors.green;
          return (
            <TouchableOpacity
              key={g.group}
              style={styles.row}
              onPress={() => onGroupPress?.(g.group)}
              activeOpacity={onGroupPress ? 0.7 : 1}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.groupName} numberOfLines={1}>{g.group}</Text>
                <Text style={[styles.count, isComplete && styles.countComplete]}>
                  {s.mountainGroupProgress(g.flagged, g.total)}
                </Text>
              </View>
              <ProgressBar pct={pct} color={barColor} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc500,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loader: { marginVertical: 12 },
  empty: { fontSize: 14, color: Colors.zinc500, paddingVertical: 8 },
  row: { marginBottom: 14 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.zinc950,
    flex: 1,
    marginRight: 8,
  },
  count: { fontSize: 12, fontWeight: '600', color: Colors.zinc500 },
  countComplete: { color: Colors.orange },
});

const bar = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.zinc100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
