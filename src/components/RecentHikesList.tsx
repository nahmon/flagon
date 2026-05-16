import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchUserRecentFlags } from '../services/flags';
import { RecentFlag } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function HikeRow({ flag }: { flag: RecentFlag }) {
  const isExpired = !flag.is_active || new Date(flag.expires_at) < new Date();
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, isExpired && styles.iconBoxExpired]}>
        <Text style={styles.icon}>{isExpired ? '🏔️' : '🚩'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.summitName}>{flag.summit?.name_ko ?? '알 수 없음'}</Text>
        <Text style={styles.rowSub}>
          {flag.summit ? `${flag.summit.elevation_m}m` : ''}{' '}
          {isExpired ? '· 만료됨' : '· 활성'}
        </Text>
      </View>
      <Text style={styles.date}>{formatDate(flag.planted_at)}</Text>
    </View>
  );
}

export default function RecentHikesList({ userId }: { userId: string }) {
  const [flags, setFlags] = useState<RecentFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRecentFlags(userId)
      .then(setFlags)
      .catch((e) => console.error('[recentFlags]', e))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>최근 등정 기록</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={{ marginVertical: 16 }} />
      ) : flags.length === 0 ? (
        <Text style={styles.empty}>아직 등정 기록이 없습니다</Text>
      ) : (
        <FlatList
          data={flags}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => <HikeRow flag={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          scrollEnabled={false}
        />
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
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc500,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.green + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxExpired: { backgroundColor: Colors.zinc100 },
  icon: { fontSize: 18 },
  rowBody: { flex: 1 },
  summitName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  date: { fontSize: 12, color: Colors.zinc500 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  empty: { fontSize: 14, color: Colors.zinc500, paddingVertical: 12 },
});
