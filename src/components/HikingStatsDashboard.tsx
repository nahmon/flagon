import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { fetchHikingStats, HikingStatsDashboard as Stats } from '../services/hikingStats';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  lang: 'ko' | 'en' | 'ja';
}

const T = {
  title: { ko: '하이킹 통계', en: 'Hiking Stats', ja: 'ハイキング統計' },
  totalFlags: { ko: '총 깃발', en: 'Total Flags', ja: '合計フラグ' },
  uniqueSummits: { ko: '고유 정상', en: 'Unique Summits', ja: 'ユニーク山頂' },
  totalElev: { ko: '누적 고도', en: 'Total Elevation', ja: '累計標高' },
  avgWeek: { ko: '주 평균', en: 'Per Week Avg', ja: '週平均' },
  bestDay: { ko: '최고의 하루', en: 'Best Day', ja: '最高の日' },
  flags: { ko: '개', en: ' flags', ja: '個' },
  dowTitle: { ko: '요일별 활동', en: 'Activity by Day', ja: '曜日別活動' },
  monthTitle: { ko: '월별 활동', en: 'Activity by Month', ja: '月別活動' },
  elevTitle: { ko: '고도 구간', en: 'Elevation Tiers', ja: '高度帯' },
  season: { ko: '가장 활발한 계절', en: 'Most Active Season', ja: '最も活発な季節' },
  noData: { ko: '아직 데이터가 없습니다', en: 'No data yet', ja: 'まだデータがありません' },
};

function t(key: keyof typeof T, lang: 'ko' | 'en' | 'ja'): string {
  return T[key][lang];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function BarChart({ items, maxCount }: { items: { label: string; count: number; color?: string }[]; maxCount: number }) {
  return (
    <View style={s.barChart}>
      {items.map((item) => (
        <View key={item.label} style={s.barItem}>
          <View style={s.barTrack}>
            <View style={[s.barFill, { height: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '0%' as any, backgroundColor: item.color ?? Colors.green }]} />
          </View>
          <Text style={s.barLabel}>{item.label}</Text>
          {item.count > 0 && <Text style={s.barCount}>{item.count}</Text>}
        </View>
      ))}
    </View>
  );
}

export default function HikingStatsDashboardModal({ visible, onClose, userId, lang }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    fetchHikingStats(userId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const maxDow = stats ? Math.max(...stats.dayOfWeekStats.map(d => d.count), 1) : 1;
  const maxMonth = stats ? Math.max(...stats.monthStats.map(m => m.count), 1) : 1;
  const maxTier = stats ? Math.max(...stats.elevTierStats.map(e => e.count), 1) : 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <Text style={s.title}>{t('title', lang)}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={Colors.green} style={{ marginTop: 40 }} />}

        {!loading && stats && (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {stats.totalFlags === 0 ? (
              <Text style={s.empty}>{t('noData', lang)}</Text>
            ) : (
              <>
                <View style={s.cardRow}>
                  <StatCard label={t('totalFlags', lang)} value={String(stats.totalFlags)} />
                  <StatCard label={t('uniqueSummits', lang)} value={String(stats.uniqueSummits)} />
                </View>
                <View style={s.cardRow}>
                  <StatCard label={t('totalElev', lang)} value={`${stats.totalElevationM.toLocaleString()}m`} />
                  <StatCard label={t('avgWeek', lang)} value={String(stats.avgFlagsPerWeek)} />
                </View>

                {stats.bestDayDate && (
                  <View style={s.bestDay}>
                    <Text style={s.bestDayLabel}>{t('bestDay', lang)}</Text>
                    <Text style={s.bestDayValue}>{stats.bestDayDate} · {stats.bestDayCount}{t('flags', lang)}</Text>
                  </View>
                )}

                {stats.mostActiveSeason && (
                  <View style={s.seasonRow}>
                    <Text style={s.seasonLabel}>{t('season', lang)}</Text>
                    <Text style={s.seasonValue}>{stats.mostActiveSeason}</Text>
                  </View>
                )}

                <Text style={s.sectionTitle}>{t('elevTitle', lang)}</Text>
                <BarChart
                  items={stats.elevTierStats.map(e => ({ label: e.label, count: e.count, color: e.color }))}
                  maxCount={maxTier}
                />

                <Text style={s.sectionTitle}>{t('dowTitle', lang)}</Text>
                <BarChart
                  items={stats.dayOfWeekStats.map(d => ({ label: d.day, count: d.count }))}
                  maxCount={maxDow}
                />

                <Text style={s.sectionTitle}>{t('monthTitle', lang)}</Text>
                <BarChart
                  items={stats.monthStats.map(m => ({ label: m.month, count: m.count }))}
                  maxCount={maxMonth}
                />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.zinc200 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.zinc950 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc200, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: Colors.zinc800 },
  scroll: { padding: 20, paddingBottom: 60 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, color: Colors.zinc500 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.green },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.zinc500, marginTop: 4, textAlign: 'center' },
  bestDay: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.orange },
  bestDayLabel: { fontSize: 11, fontWeight: '700', color: Colors.orange, textTransform: 'uppercase', letterSpacing: 0.6 },
  bestDayValue: { fontSize: 16, fontWeight: '700', color: Colors.zinc950, marginTop: 4 },
  seasonRow: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seasonLabel: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  seasonValue: { fontSize: 15, fontWeight: '700', color: Colors.green },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.zinc800, marginBottom: 12, marginTop: 8 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, marginBottom: 24, backgroundColor: Colors.white, borderRadius: 14, padding: 12 },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '100%', height: 56, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.zinc100 },
  barFill: { width: '100%', borderRadius: 4, minHeight: 3 },
  barLabel: { fontSize: 8, color: Colors.zinc500, marginTop: 4, textAlign: 'center' },
  barCount: { fontSize: 8, color: Colors.zinc800, fontWeight: '600' },
});
