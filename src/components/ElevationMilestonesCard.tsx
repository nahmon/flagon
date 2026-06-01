import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, Fonts } from '../constants';
import { fetchPersonalRecords } from '../services/personalRecords';
import {
  computeElevationMilestones,
  ELEVATION_MILESTONES,
  type ElevationMilestone,
  type ElevationMilestoneStatus,
} from '../services/elevationMilestones';
import { useLang } from '../contexts/LangContext';
import { t, type Lang } from '../i18n/strings';

interface Props {
  userId: string;
}

function mlabel(obj: { ko: string; en: string; ja: string }, l: Lang): string {
  return obj[l];
}

export default function ElevationMilestonesCard({ userId }: Props) {
  const { lang } = useLang();
  const typedLang = lang as Lang;
  const s = t(typedLang);
  const [status, setStatus] = useState<ElevationMilestoneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPersonalRecords(userId)
      .then((r) => setStatus(computeElevationMilestones(r.totalElevationM)))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const earnedCount = status?.earned.length ?? 0;
  const pct = status ? Math.round(status.progressFraction * 100) : 0;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v: boolean) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.title}>{s.elevMilestonesTitle}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={Colors.green} style={styles.loader} />
      ) : !status ? (
        <Text style={styles.empty}>{s.elevMilestonesEmpty}</Text>
      ) : (
        <>
          {/* Badge row */}
          <View style={styles.badgeRow}>
            {ELEVATION_MILESTONES.map((m) => {
              const earned = status.earned.some((e: ElevationMilestone) => e.id === m.id);
              return (
                <View key={m.id} style={styles.badgeWrap}>
                  <Text style={[styles.badgeIcon, !earned && styles.badgeIconDim]}>{m.icon}</Text>
                  <Text style={[styles.badgeLabel, !earned && styles.badgeLabelDim]}>
                    {mlabel(m.label, typedLang)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Progress toward next milestone */}
          {status.next && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressText}>
                  {s.elevMilestonesProgress(
                    status.totalElevationM.toLocaleString(),
                    status.next.thresholdM.toLocaleString(),
                    mlabel(status.next.label, typedLang),
                  )}
                </Text>
                <Text style={styles.progressXp}>{s.elevMilestonesBonus(status.next.bonusXp)}</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          )}

          {status.next === null && earnedCount === ELEVATION_MILESTONES.length && (
            <Text style={styles.allDone}>{s.elevMilestonesAllDone}</Text>
          )}

          {/* Expanded: full milestone list */}
          {expanded && (
            <View style={styles.listSection}>
              {ELEVATION_MILESTONES.map((m) => {
                const earned = status.earned.some((e: ElevationMilestone) => e.id === m.id);
                return (
                  <View key={m.id} style={styles.listRow}>
                    <Text style={[styles.listIcon, !earned && styles.listIconDim]}>{m.icon}</Text>
                    <View style={styles.listBody}>
                      <Text style={[styles.listName, !earned && styles.listNameDim]}>
                        {mlabel(m.label, typedLang)}
                      </Text>
                      <Text style={styles.listDesc}>{mlabel(m.desc, typedLang)}</Text>
                    </View>
                    <Text style={earned ? styles.listXpEarned : styles.listXpPending}>
                      {earned ? `+${m.bonusXp} XP ✓` : `+${m.bonusXp} XP`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: Colors.zinc800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.zinc800,
  },
  chevron: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.zinc500,
  },
  loader: { marginVertical: 12 },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.zinc500,
    textAlign: 'center',
    paddingVertical: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeWrap: {
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    fontSize: 22,
  },
  badgeIconDim: {
    opacity: 0.25,
  },
  badgeLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: Colors.green,
    textAlign: 'center',
    marginTop: 2,
  },
  badgeLabelDim: {
    color: Colors.zinc500,
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.zinc500,
    flex: 1,
    flexWrap: 'wrap',
  },
  progressXp: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.green,
    marginLeft: 8,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.zinc100,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  pctText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.zinc500,
    textAlign: 'right',
    marginTop: 4,
  },
  allDone: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.green,
    textAlign: 'center',
    paddingVertical: 8,
  },
  listSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.zinc100,
    paddingTop: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  listIcon: {
    fontSize: 20,
    width: 30,
  },
  listIconDim: {
    opacity: 0.25,
  },
  listBody: {
    flex: 1,
    marginLeft: 8,
  },
  listName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.zinc800,
  },
  listNameDim: {
    color: Colors.zinc500,
  },
  listDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.zinc500,
    marginTop: 1,
  },
  listXpEarned: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.green,
  },
  listXpPending: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.zinc500,
  },
});
