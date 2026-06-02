import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const WEEKS = 15;
const CELL = 14;
const GAP = 3;

function cellColor(count: number): string {
  if (count === 0) return Colors.zinc100;
  if (count === 1) return '#A8D5BA';
  return Colors.green;
}

function buildGrid(dates: string[]): { count: number; date: string }[][] {
  const dayCounts = new Map<string, number>();
  for (const d of dates) {
    const key = d.slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay(); // 0=Sun
  // align so last column ends on the last Sunday on/after today
  const daysToAdd = (7 - todayDay) % 7;
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysToAdd);

  const totalDays = WEEKS * 7;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - totalDays + 1);

  // cols = weeks, rows = days (0=Mon … 6=Sun)
  const cols: { count: number; date: string }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { count: number; date: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + w * 7 + d);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      col.push({ count: dayCounts.get(key) ?? 0, date: key });
    }
    cols.push(col);
  }
  return cols;
}

function monthLabels(grid: { count: number; date: string }[][]): string[] {
  return grid.map((col) => {
    const d = new Date(col[0].date);
    if (d.getDate() <= 7) {
      return String(d.getMonth() + 1);
    }
    return '';
  });
}

interface Props {
  dates: string[];
}

export default function SummitHeatmapCard({ dates }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [collapsed, setCollapsed] = useState(false);

  const grid = buildGrid(dates);
  const labels = monthLabels(grid);
  const activeDays = new Set(dates.map((d) => d.slice(0, 10))).size;

  if (dates.length === 0) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((v: boolean) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.title}>{s.heatmapTitle}</Text>
        <Text style={styles.chevron}>{collapsed ? '›' : '⌄'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.body}>
          <Text style={styles.sub}>
            {s.heatmapActiveDays(activeDays, WEEKS)}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Month labels */}
              <View style={styles.labelRow}>
                {labels.map((lbl, i) => (
                  <Text
                    key={i}
                    style={[styles.monthLabel, { width: CELL + GAP }]}
                  >
                    {lbl}
                  </Text>
                ))}
              </View>

              {/* Grid: 7 rows (Mon-Sun) × WEEKS cols */}
              {[0, 1, 2, 3, 4, 5, 6].map((rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {grid.map((col, colIdx) => (
                    <View
                      key={colIdx}
                      style={[
                        styles.cell,
                        { backgroundColor: cellColor(col[rowIdx].count) },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendText}>{s.heatmapLess}</Text>
            {[0, 1, 2].map((v) => (
              <View
                key={v}
                style={[styles.legendCell, { backgroundColor: cellColor(v) }]}
              />
            ))}
            <Text style={styles.legendText}>{s.heatmapMore}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.zinc100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  chevron: { fontSize: 18, color: Colors.zinc500 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  sub: { fontSize: 12, color: Colors.zinc500, marginBottom: 10 },
  labelRow: { flexDirection: 'row', marginBottom: 2 },
  monthLabel: { fontSize: 9, color: Colors.zinc500, textAlign: 'left' },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    marginRight: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 10, color: Colors.zinc500 },
});
