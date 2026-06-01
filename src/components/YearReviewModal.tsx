import { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { Colors, Fonts } from '../constants';
import { fetchYearReview, type YearReviewData } from '../services/yearReview';
import { useLang } from '../contexts/LangContext';
import { t, type Lang, summitName } from '../i18n/strings';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

const MONTH_NAMES: Record<Lang, string[]> = {
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function YearReviewModal({ visible, userId, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [data, setData] = useState<YearReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchYearReview(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visible, userId]);

  function elevLabel(m: number): string {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${m.toLocaleString()} m`;
  }

  async function handleShare() {
    if (!data) return;
    const monthNames = MONTH_NAMES[lang];
    const peakName = data.highestPeak
      ? summitName(data.highestPeak, lang) + ` (${data.highestPeak.elevation_m.toLocaleString()}m)`
      : '–';
    const bestMonthStr = data.bestMonth
      ? `${monthNames[data.bestMonth.month - 1]} (${data.bestMonth.count}${s.yearFlags})`
      : '–';
    const lines = [
      s.yearShareHeader(data.year),
      '',
      `🚩 ${s.yearTotalFlags}: ${data.totalFlags}`,
      `🏔️ ${s.yearUniqueSummits}: ${data.uniqueSummits}`,
      `⬆️ ${s.yearElevation}: ${elevLabel(data.totalElevationM)}`,
      `🌟 ${s.yearHighestPeak}: ${peakName}`,
      `📅 ${s.yearBestMonth}: ${bestMonthStr}`,
      '',
      '#FlagOn #HikingWrapped',
    ];
    await Share.share({ message: lines.join('\n') });
  }

  const monthNames = MONTH_NAMES[lang];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{s.yearReviewTitle}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={Colors.green} style={{ marginTop: 60 }} />
          ) : !data || data.totalFlags === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏔️</Text>
              <Text style={styles.emptyText}>{s.yearEmpty}</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.heroYear}>{data.year}</Text>
                <Text style={styles.heroSub}>{s.yearHeroSub}</Text>
              </View>

              <View style={styles.grid}>
                <StatCard icon="🚩" label={s.yearTotalFlags} value={String(data.totalFlags)} />
                <StatCard icon="🏔️" label={s.yearUniqueSummits} value={String(data.uniqueSummits)} />
                <StatCard icon="⬆️" label={s.yearElevation} value={elevLabel(data.totalElevationM)} />
                <StatCard icon="🥾" label={s.yearHikes} value={String(data.totalHikes)} />
              </View>

              {data.highestPeak && (
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightIcon}>🌟</Text>
                  <View style={styles.highlightBody}>
                    <Text style={styles.highlightLabel}>{s.yearHighestPeak}</Text>
                    <Text style={styles.highlightValue}>
                      {summitName(data.highestPeak, lang)}
                    </Text>
                    <Text style={styles.highlightSub}>
                      {data.highestPeak.elevation_m.toLocaleString()} m
                    </Text>
                  </View>
                </View>
              )}

              {data.bestMonth && (
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightIcon}>📅</Text>
                  <View style={styles.highlightBody}>
                    <Text style={styles.highlightLabel}>{s.yearBestMonth}</Text>
                    <Text style={styles.highlightValue}>
                      {monthNames[data.bestMonth.month - 1]}
                    </Text>
                    <Text style={styles.highlightSub}>
                      {data.bestMonth.count} {s.yearFlags}
                    </Text>
                  </View>
                </View>
              )}

              {data.topCrewNameKo && (
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightIcon}>👥</Text>
                  <View style={styles.highlightBody}>
                    <Text style={styles.highlightLabel}>{s.yearTopCrew}</Text>
                    <Text style={styles.highlightValue}>
                      {lang === 'ko' ? data.topCrewNameKo : data.topCrewName ?? data.topCrewNameKo}
                    </Text>
                  </View>
                </View>
              )}

              {data.firstFlagSummitKo && data.firstFlagDate && (
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightIcon}>🎉</Text>
                  <View style={styles.highlightBody}>
                    <Text style={styles.highlightLabel}>{s.yearFirstFlag}</Text>
                    <Text style={styles.highlightValue}>{data.firstFlagSummitKo}</Text>
                    <Text style={styles.highlightSub}>
                      {new Date(data.firstFlagDate).toLocaleDateString(
                        lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric' },
                      )}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Text style={styles.shareBtnText}>↑ {s.yearShare}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    backgroundColor: Colors.white,
  },
  closeBtn: { fontSize: 18, color: Colors.zinc500, width: 32, textAlign: 'center' },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.zinc800 },
  scroll: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center', fontFamily: Fonts.regular },
  heroCard: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroYear: { fontSize: 72, fontFamily: Fonts.extraBold, color: Colors.white, lineHeight: 80 },
  heroSub: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.white, opacity: 0.85, marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontFamily: Fonts.extraBold, color: Colors.green },
  statLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.zinc500, marginTop: 4, textAlign: 'center' },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  highlightIcon: { fontSize: 32, marginRight: 16 },
  highlightBody: { flex: 1 },
  highlightLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.zinc500, marginBottom: 2 },
  highlightValue: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.zinc800 },
  highlightSub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.zinc500, marginTop: 2 },
  shareBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  shareBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.white },
});
