import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchUserConquests, conquestSummitName, type ConquestEntry } from '../services/conquests';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t, type Lang } from '../i18n/strings';

const MEDALS = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
const MEDAL_COLORS = ['#D4B060', '#A0A8B0', '#C07840', Colors.zinc500, Colors.zinc500];

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (lang === 'ja') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function renderTrophyRow(
  entry: ConquestEntry,
  rank: number,
  lang: Lang,
  conquered: string,
  elevLabel: (m: number) => string,
) {
  const medal = MEDALS[rank] ?? '🎖️';
  const medalColor = MEDAL_COLORS[rank] ?? Colors.zinc500;
  const isTop3 = rank < 3;
  return (
    <View style={[styles.card, isTop3 && styles.cardHighlight, { borderLeftColor: medalColor }]}>
      <Text style={[styles.medal, { color: medalColor }]}>{medal}</Text>
      <View style={styles.cardBody}>
        <Text style={styles.summitName} numberOfLines={1}>
          {conquestSummitName(entry, lang)}
        </Text>
        <Text style={styles.cardSub}>
          {elevLabel(entry.elevation_m)}
          {entry.mountain_group ? `  ·  ${entry.mountain_group}` : ''}
        </Text>
        <Text style={styles.cardDate}>
          {conquered} {formatDate(entry.planted_at, lang)}
        </Text>
      </View>
      {entry.crew_name ? (
        <View style={[styles.crewBadge, { backgroundColor: entry.crew_color ?? Colors.green }]}>
          <Text style={styles.crewText} numberOfLines={1}>{entry.crew_name}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TrophyRoomCard() {
  const { lang } = useLang();
  const s = t(lang);
  const [top5, setTop5] = useState<ConquestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const all = await fetchUserConquests(user.id);
        const deduped = Array.from(
          new Map(all.map((c: ConquestEntry) => [c.summit_name_ko, c])).values(),
        );
        const sorted = (deduped as ConquestEntry[])
          .sort((a: ConquestEntry, b: ConquestEntry) => b.elevation_m - a.elevation_m)
          .slice(0, 5);
        setTop5(sorted);
      } catch {
        setTop5([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((prev: boolean) => !prev)}
        activeOpacity={0.75}
      >
        <Text style={styles.title}>{s.trophyRoomTitle}</Text>
        <Text style={styles.chevron}>{collapsed ? '›' : '‹'}</Text>
      </TouchableOpacity>
      {!collapsed && (
        loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : top5.length === 0 ? (
          <Text style={styles.empty}>{s.trophyRoomEmpty}</Text>
        ) : (
          <View style={styles.list}>
            {top5.map((entry: ConquestEntry, i: number) => (
              <View key={entry.id}>
                {renderTrophyRow(entry, i, lang, s.trophyRoomConquered, s.trophyRoomElevation)}
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.zinc100,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  chevron: {
    fontSize: 20,
    color: Colors.zinc500,
    transform: [{ rotate: '90deg' }],
  },
  loader: {
    marginVertical: 20,
  },
  empty: {
    fontSize: 13,
    color: Colors.zinc500,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.zinc100,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.zinc200,
    gap: 10,
  },
  cardHighlight: {
    backgroundColor: '#FFFBF0',
  },
  medal: {
    fontSize: 24,
    width: 30,
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  summitName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.zinc500,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 11,
    color: Colors.zinc500,
  },
  crewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 80,
  },
  crewText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
});
