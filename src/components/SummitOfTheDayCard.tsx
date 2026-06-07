import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../constants';
import { fetchSummitOfDay, SummitOfDayData } from '../services/summitOfDay';
import { setPlannedHike } from '../services/plannedHike';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function SummitOfTheDayCard() {
  const { lang } = useLang();
  const s = t(lang);
  const [data, setData] = useState<SummitOfDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planned, setPlanned] = useState(false);

  useEffect(() => {
    fetchSummitOfDay()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handlePlan = async () => {
    if (!data) return;
    try {
      await setPlannedHike(data.summit.id, summitName(data.summit, lang), tomorrow());
      setPlanned(true);
      Alert.alert('🏔️', s.sotdPlanned);
    } catch {
      Alert.alert(s.sotdPlanError);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={Colors.green} />
      </View>
    );
  }
  if (!data) return null;

  const name = summitName(data.summit, lang);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.dayLabel}>{s.sotdLabel}</Text>
        <View style={styles.elevBadge}>
          <Text style={styles.elevText}>{data.summit.elevation_m.toLocaleString()}m</Text>
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      {data.summit.mountain_group != null && (
        <Text style={styles.group}>{data.summit.mountain_group}</Text>
      )}

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{data.summit.flag_count.toLocaleString()}</Text>
          <Text style={styles.statLabel}>{s.sotdTotalFlags}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{data.weeklyFlags}</Text>
          <Text style={styles.statLabel}>{s.sotdWeeklyFlags}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.planBtn, planned && styles.planBtnDone]}
        onPress={handlePlan}
        disabled={planned}
        activeOpacity={0.8}
      >
        <Text style={[styles.planBtnText, planned && styles.planBtnTextDone]}>
          {planned ? s.sotdPlannedBtn : s.sotdPlanBtn}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { height: 60, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.zinc950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    backgroundColor: Colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dayLabel: { fontSize: 12, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  elevBadge: {
    backgroundColor: Colors.greenDark,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  elevText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.zinc950,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  group: { fontSize: 13, color: Colors.zinc500, paddingHorizontal: 16, paddingBottom: 4 },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.zinc200 },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.green },
  statLabel: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  planBtn: {
    backgroundColor: Colors.green,
    margin: 16,
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  planBtnDone: { backgroundColor: Colors.zinc100 },
  planBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  planBtnTextDone: { color: Colors.zinc500 },
});
