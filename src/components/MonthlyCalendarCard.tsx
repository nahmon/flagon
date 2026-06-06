import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants';
import { ConquestEntry } from '../services/conquests';
import { buildCalendarDays, monthFlagTotal, CalendarDay } from '../services/monthlyCalendar';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  conquests: ConquestEntry[];
}

function cellBg(day: CalendarDay): string {
  if (!day.inMonth) return 'transparent';
  if (day.count === 0) return Colors.zinc100;
  if (day.count === 1) return '#B7E4C7';
  if (day.count === 2) return '#52B788';
  return Colors.green;
}

function cellTextColor(day: CalendarDay): string {
  if (!day.inMonth) return 'transparent';
  if (day.count >= 2) return Colors.white;
  if (day.count === 1) return Colors.greenDark;
  if (day.isToday) return Colors.orange;
  return Colors.zinc500;
}

export default function MonthlyCalendarCard({ conquests }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = buildCalendarDays(conquests, year, month);
  const flagCount = monthFlagTotal(conquests, year, month);
  const atLatest = year === now.getFullYear() && month === now.getMonth();

  const goPrev = () => {
    if (month === 0) { setYear((y: number) => y - 1); setMonth(11); }
    else setMonth((m: number) => m - 1);
  };

  const goNext = () => {
    if (atLatest) return;
    if (month === 11) { setYear((y: number) => y + 1); setMonth(0); }
    else setMonth((m: number) => m + 1);
  };

  const headerLabel = () => {
    if (lang === 'en') return `${MONTHS_EN[month]} ${year}`;
    if (lang === 'ja') return `${year}年${month + 1}月`;
    return `${year}년 ${month + 1}월`;
  };

  const handleDayPress = (day: CalendarDay) => {
    if (!day.inMonth || day.count === 0) return;
    const summitList = day.summits.join('\n• ');
    Alert.alert(`🏔️ ${day.date}`, `• ${summitList}`);
  };

  const dowLabels = lang === 'en' ? DOW_EN : lang === 'ja' ? DOW_JA : DOW_KO;

  const paddedDays = [...days];
  while (paddedDays.length % 7 !== 0) {
    paddedDays.push({ date: '', count: 0, summits: [], isToday: false, inMonth: false });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>📅 {s.calendarTitle}</Text>

      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn} activeOpacity={0.7}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthLabel}>{headerLabel()}</Text>
          {flagCount > 0 && (
            <Text style={styles.flagCount}>🚩 {s.calendarFlags(flagCount)}</Text>
          )}
          {flagCount === 0 && (
            <Text style={styles.noFlags}>{s.calendarNoFlags}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={goNext}
          style={[styles.navBtn, atLatest && styles.navBtnDisabled]}
          activeOpacity={0.7}
          disabled={atLatest}
        >
          <Text style={[styles.navArrow, atLatest && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dowRow}>
        {dowLabels.map((d, i) => (
          <View key={i} style={styles.dowCell}>
            <Text style={[styles.dowLabel, (i === 0 || i === 6) && styles.dowLabelWeekend]}>{d}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => (
            <TouchableOpacity
              key={di}
              style={[
                styles.dayCell,
                { backgroundColor: cellBg(day) },
                day.isToday && styles.todayCell,
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={day.count > 0 ? 0.75 : 1}
              disabled={!day.inMonth || day.count === 0}
            >
              {day.inMonth && (
                <Text style={[styles.dayText, { color: cellTextColor(day) }]}>
                  {parseInt(day.date.slice(8), 10)}
                </Text>
              )}
              {day.count >= 2 && (
                <View style={styles.countDot}>
                  <Text style={styles.countDotText}>{day.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
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
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.zinc800, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerCenter: { flex: 1, alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: Colors.zinc800 },
  flagCount: { fontSize: 12, color: Colors.green, fontWeight: '600', marginTop: 2 },
  noFlags: { fontSize: 11, color: Colors.zinc500, marginTop: 2 },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 24, fontWeight: '700', color: Colors.zinc800, lineHeight: 28 },
  navArrowDisabled: { color: Colors.zinc500 },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dowLabel: { fontSize: 11, fontWeight: '700', color: Colors.zinc500 },
  dowLabelWeekend: { color: Colors.orange },
  weekRow: { flexDirection: 'row', marginBottom: 3 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  todayCell: { borderWidth: 2, borderColor: Colors.orange },
  dayText: { fontSize: 12, fontWeight: '600' },
  countDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.poleGold,
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  countDotText: { fontSize: 8, fontWeight: '700', color: Colors.zinc950 },
});
