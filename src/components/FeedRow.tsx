import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants';
import { toggleKudos, getKudosCount, hasGivenKudos } from '../services/kudos';
import { useLang } from '../contexts/LangContext';
import { t, summitName, type Lang } from '../i18n/strings';

export interface FeedItem {
  id: string;
  planted_at: string;
  user_id: string;
  display_name: string | null;
  summit: { name_ko: string; name_en: string | null; name_ja: string | null; elevation_m: number } | null;
  crew: { name_ko: string | null; color_hex: string } | null;
}

export function timeAgo(isoString: string, lang: Lang): string {
  const s = t(lang);
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return s.justNow;
  if (mins < 60) return s.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return s.hoursAgo(hours);
  return s.daysAgo(Math.floor(hours / 24));
}

export function avatarColor(uid: string): string {
  const colors = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return colors[uid.charCodeAt(0) % colors.length];
}

function KudosButton({ itemId }: { itemId: string }) {
  const [count, setCount] = useState(0);
  const [given, setGiven] = useState(false);
  const scale = new Animated.Value(1);

  useEffect(() => {
    Promise.all([getKudosCount(itemId), hasGivenKudos(itemId)]).then(([c, g]) => {
      setCount(c);
      setGiven(g);
    });
  }, [itemId]);

  const onPress = async () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    const result = await toggleKudos(itemId);
    setCount(result.count);
    setGiven(result.given);
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.kudosBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.Text style={[styles.kudosEmoji, { transform: [{ scale }], opacity: given ? 1 : 0.35 }]}>🔥</Animated.Text>
      {count > 0 && <Text style={[styles.kudosCount, given && styles.kudosCountActive]}>{count}</Text>}
    </TouchableOpacity>
  );
}

export default function FeedRow({ item, onAvatarPress }: { item: FeedItem; onAvatarPress: (uid: string) => void }) {
  const { lang } = useLang();
  const s = t(lang);
  const avatarBg = avatarColor(item.user_id);
  const name = item.display_name ?? s.hikerLabel(item.user_id.slice(0, 6));
  const initial = item.display_name ? item.display_name.charAt(0).toUpperCase() : item.user_id.charAt(0).toUpperCase();
  const sName = item.summit ? summitName(item.summit, lang) : s.unknownSummit;

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => onAvatarPress(item.user_id)} activeOpacity={0.75}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.timeAgo}>{timeAgo(item.planted_at, lang)}</Text>
        </View>
        <Text style={styles.summitLine}>
          <Text style={styles.summitName}>{sName}</Text>
          {item.summit ? <Text style={styles.elevation}> {item.summit.elevation_m}m</Text> : null}
        </Text>
        {item.crew ? (
          <View style={[styles.crewBadge, { backgroundColor: item.crew.color_hex }]}>
            <Text style={styles.crewText}>{item.crew.name_ko ?? s.crew}</Text>
          </View>
        ) : (
          <View style={[styles.crewBadge, { backgroundColor: Colors.zinc200 }]}>
            <Text style={[styles.crewText, { color: Colors.zinc500 }]}>{s.solo}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        <KudosButton itemId={item.id} />
        <Text style={styles.flagEmoji}>🚩</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.white },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  timeAgo: { fontSize: 12, color: Colors.zinc500 },
  summitLine: { fontSize: 15 },
  summitName: { fontWeight: '700', color: Colors.zinc950 },
  elevation: { color: Colors.zinc500 },
  crewBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  crewText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  rowRight: { alignItems: 'center', gap: 6 },
  kudosBtn: { alignItems: 'center' },
  kudosEmoji: { fontSize: 20 },
  kudosCount: { fontSize: 11, fontWeight: '600', color: Colors.zinc500 },
  kudosCountActive: { color: Colors.orange ?? '#F97316' },
  flagEmoji: { fontSize: 20 },
});
