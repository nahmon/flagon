import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { fetchLiveFollowing, type LiveBroadcast } from '../services/liveHike';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w: string) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

interface Props {
  onAvatarPress: (userId: string) => void;
}

export default function LiveHikeSection({ onAvatarPress }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [lives, setLives] = useState<LiveBroadcast[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchLiveFollowing();
      setLives(data);
    } catch {
      setLives([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!loaded || lives.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.dotWrap}>
          <View style={styles.dot} />
        </View>
        <Text style={styles.headerText}>{s.liveNow(lives.length)}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {lives.map((live: LiveBroadcast) => {
          const peakName = live.summit_name_ko
            ? summitName({ name_ko: live.summit_name_ko, name_en: live.summit_name_en ?? null }, lang)
            : null;
          const distDisplay = live.dist_km < 1
            ? `${Math.round(live.dist_km * 1000)}m`
            : `${live.dist_km.toFixed(1)}km`;

          return (
            <TouchableOpacity
              key={live.id}
              style={styles.card}
              onPress={() => onAvatarPress(live.user_id)}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(live.display_name)}</Text>
              </View>
              <Text style={styles.hikerName} numberOfLines={1}>
                {live.display_name ?? '—'}
              </Text>
              {peakName ? (
                <Text style={styles.summitLabel} numberOfLines={1}>{peakName}</Text>
              ) : null}
              <View style={styles.statsRow}>
                <Text style={styles.stat}>{distDisplay}</Text>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.stat}>{formatElapsed(live.elapsed_ms)}</Text>
              </View>
              {live.elev_gain_m > 0 ? (
                <Text style={styles.elevStat}>+{Math.round(live.elev_gain_m)}m</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    marginBottom: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  dotWrap: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#E53E3E' },
  headerText: { fontSize: 13, fontWeight: '700', color: Colors.zinc800 },
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  card: {
    width: 118,
    backgroundColor: Colors.zinc100,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  hikerName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.zinc950,
    textAlign: 'center',
  },
  summitLabel: {
    fontSize: 10,
    color: Colors.zinc500,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stat: { fontSize: 11, fontWeight: '600', color: Colors.green },
  statDot: { fontSize: 10, color: Colors.zinc500, marginHorizontal: 2 },
  elevStat: { fontSize: 10, fontWeight: '600', color: Colors.orange },
});
