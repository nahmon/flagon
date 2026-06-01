import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchFriendsOnSummit, type FriendFlagEntry } from '../services/summitSocial';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const AVATAR_COLORS = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];

function avatarColor(uid: string): string {
  return AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1d ago';
  if (diff < 30) return `${diff}d ago`;
  const months = Math.floor(diff / 30);
  return `${months}mo ago`;
}

interface Props {
  summitId: string;
  onPressHiker: (userId: string) => void;
}

export default function SummitFriendsRow({ summitId, onPressHiker }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [entries, setEntries] = useState<FriendFlagEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFriendsOnSummit(summitId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [summitId]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.green} />
      </View>
    );
  }

  if (entries.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{s.friendsFlagged(entries.length)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {entries.map((entry: FriendFlagEntry) => {
          const name = entry.displayName ?? `#${entry.userId.slice(0, 5)}`;
          const initial = name.charAt(0).toUpperCase();
          const bg = entry.crewColor ?? avatarColor(entry.userId);
          return (
            <TouchableOpacity
              key={entry.userId}
              style={styles.avatarCol}
              onPress={() => onPressHiker(entry.userId)}
              activeOpacity={0.75}
            >
              <View style={[styles.circle, { backgroundColor: bg }]}>
                <Text style={styles.initial}>{initial}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <Text style={styles.date}>{daysAgo(entry.plantedAt)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: { height: 32, alignItems: 'center', justifyContent: 'center' },
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.zinc100,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.zinc500,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  scroll: { paddingRight: 8, gap: 12 },
  avatarCol: { alignItems: 'center', width: 60 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  initial: { fontSize: 20, fontWeight: '700', color: Colors.white },
  name: { fontSize: 11, fontWeight: '600', color: '#1F2421', textAlign: 'center', maxWidth: 58 },
  date: { fontSize: 10, color: Colors.zinc500, marginTop: 1 },
});
