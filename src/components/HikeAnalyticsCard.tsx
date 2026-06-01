import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import { type AnalyticsSummary } from '../services/analytics';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  summary: AnalyticsSummary;
}

function BarChart({ monthly }: { monthly: AnalyticsSummary['monthly'] }) {
  const max = Math.max(...monthly.map((b) => b.count), 1);
  return (
    <View style={chart.root}>
      {monthly.map((bar) => (
        <View key={`${bar.year}-${bar.month}`} style={chart.col}>
          <View style={chart.barWrap}>
            <View
              style={[chart.bar, { height: `${Math.round((bar.count / max) * 100)}%` }]}
            />
          </View>
          <Text style={chart.barLabel}>{bar.label}</Text>
          {bar.count > 0 && <Text style={chart.barCount}>{bar.count}</Text>}
        </View>
      ))}
    </View>
  );
}

function DayRow({ counts, dayNames }: { counts: number[]; dayNames: readonly string[] }) {
  const max = Math.max(...counts, 1);
  return (
    <View style={day.root}>
      {counts.map((c, i) => (
        <View key={i} style={day.col}>
          <View style={[day.dot, { opacity: 0.2 + (c / max) * 0.8, backgroundColor: Colors.green }]} />
          <Text style={day.label}>{dayNames[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function BandRow({ elevBands }: { elevBands: AnalyticsSummary['elevBands'] }) {
  const total = elevBands.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <View style={band.root}>
      <View style={band.barRow}>
        {elevBands.map((b) =>
          b.count > 0 ? (
            <View
              key={b.label}
              style={[band.seg, { flex: b.count / total, backgroundColor: b.color }]}
            />
          ) : null,
        )}
      </View>
      <View style={band.legend}>
        {elevBands.map((b) =>
          b.count > 0 ? (
            <View key={b.label} style={band.legendItem}>
              <View style={[band.dot, { backgroundColor: b.color }]} />
              <Text style={band.legendText}>{b.label} ({b.count})</Text>
            </View>
          ) : null,
        )}
      </View>
    </View>
  );
}

export default function HikeAnalyticsCard({ summary }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [collapsed, setCollapsed] = useState(false);

  if (summary.totalFlags === 0) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed((v: boolean) => !v)} activeOpacity={0.75}>
        <Text style={styles.title}>{s.analyticsTitle}</Text>
        <Text style={styles.chevron}>{collapsed ? '›' : '⌄'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.body}>
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{summary.bestMonth?.count ?? 0}{lang === 'en' ? '' : ''}</Text>
              <Text style={styles.summaryLbl}>{s.analyticsBestMonth}</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryBorder]}>
              <Text style={styles.summaryVal}>{summary.avgElevation}m</Text>
              <Text style={styles.summaryLbl}>{s.analyticsAvgElev}</Text>
            </View>
            <View style={[styles.summaryItem, styles.summaryBorder]}>
              <Text style={styles.summaryVal}>{summary.totalFlags}</Text>
              <Text style={styles.summaryLbl}>{lang === 'en' ? 'Total Flags' : lang === 'ja' ? '合計' : '총 등정'}</Text>
            </View>
          </View>

          {/* Monthly bar chart */}
          <Text style={styles.sectionLabel}>{s.analyticsMonthly}</Text>
          <BarChart monthly={summary.monthly} />

          {/* Day of week */}
          <Text style={styles.sectionLabel}>{s.analyticsDayActivity}</Text>
          <DayRow counts={summary.dayOfWeekCounts} dayNames={s.analyticsDays} />

          {/* Elevation bands */}
          <Text style={styles.sectionLabel}>{s.analyticsElevBands}</Text>
          <BandRow elevBands={summary.elevBands} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.zinc100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  chevron: { fontSize: 18, color: Colors.zinc500 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  summaryRow: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.zinc100, borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryBorder: { borderLeftWidth: 1, borderColor: Colors.zinc100 },
  summaryVal: { fontSize: 17, fontWeight: '700', color: Colors.zinc950 },
  summaryLbl: { fontSize: 10, color: Colors.zinc500, marginTop: 2, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.zinc500, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
});

const chart = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, marginBottom: 16 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: Colors.green, borderRadius: 3, minHeight: 2 },
  barLabel: { fontSize: 9, color: Colors.zinc500, marginTop: 3, textAlign: 'center' },
  barCount: { fontSize: 9, fontWeight: '700', color: Colors.green, marginTop: 1 },
});

const day = StyleSheet.create({
  root: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 22, height: 22, borderRadius: 11 },
  label: { fontSize: 9, color: Colors.zinc500 },
});

const band = StyleSheet.create({
  root: { marginBottom: 4 },
  barRow: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  seg: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.zinc500 },
});
