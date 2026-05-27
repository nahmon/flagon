import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants';
import { fetchPublicProfile, PublicProfile } from '../services/stats';
import { followUser, unfollowUser, isFollowing, fetchFollowCounts, FollowCounts } from '../services/follows';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

function avatarColor(uid: string): string {
  const palette = [Colors.green, Colors.crewMe, Colors.crewNK, Colors.orange, Colors.greenLight];
  return palette[uid.charCodeAt(0) % palette.length];
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return '오늘';
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

interface Props {
  userId: string | null;
  onClose: () => void;
}

export default function HikerProfileModal({ userId, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setProfile(null);
    setError(null);
    setFollowing(false);
    setFollowCounts({ followers: 0, following: 0 });

    Promise.all([
      fetchPublicProfile(userId),
      isFollowing(userId),
      fetchFollowCounts(userId),
    ])
      .then(([p, isF, counts]) => {
        setProfile(p);
        setFollowing(isF);
        setFollowCounts(counts);
      })
      .catch(() => setError(s.error))
      .finally(() => setLoading(false));
  }, [userId, s.error]);

  const handleFollowToggle = async () => {
    if (!userId || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setFollowCounts((c: FollowCounts) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followUser(userId);
        setFollowing(true);
        setFollowCounts((c: FollowCounts) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch {
      Alert.alert(s.error, s.followError);
    } finally {
      setFollowBusy(false);
    }
  };

  const visible = !!userId;
  const bg = userId ? avatarColor(userId) : Colors.green;
  const name = profile?.displayName ?? (userId ? `#${userId.slice(0, 6)}` : '');
  const initial = name.charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{name}</Text>
            {profile?.crewName ? (
              <View style={[styles.crewBadge, { backgroundColor: profile.crewColor ?? Colors.green }]}>
                <Text style={styles.crewText}>{profile.crewName}</Text>
              </View>
            ) : (
              <View style={[styles.crewBadge, { backgroundColor: Colors.zinc200 }]}>
                <Text style={[styles.crewText, { color: Colors.zinc500 }]}>{s.hikerSolo}</Text>
              </View>
            )}
            <View style={styles.followCountRow}>
              <Text style={styles.followCountText}>{s.followersCount(followCounts.followers)}</Text>
              <Text style={styles.followCountDot}>·</Text>
              <Text style={styles.followCountText}>{s.followingCount(followCounts.following)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!loading && !error && profile && (
          <View style={styles.followRow}>
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn, followBusy && { opacity: 0.6 }]}
              onPress={handleFollowToggle}
              disabled={followBusy}
            >
              <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                {following ? s.unfollow : s.follow}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.green} />
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {profile && !loading && (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <StatPill label={s.flags} value={String(profile.totalFlags)} />
              <StatPill label={s.uniqueSummits} value={String(profile.uniqueSummits)} />
              <StatPill label={s.highestPeak} value={profile.highestPeakM > 0 ? `${profile.highestPeakM}m` : '—'} />
              <StatPill label={s.badgesEarned(profile.badgeCount).replace(/\d+/, '')} value={String(profile.badgeCount)} />
            </View>

            <Text style={styles.sectionTitle}>{s.recentConquests}</Text>
            {profile.recentConquests.length === 0 ? (
              <Text style={styles.emptyText}>{s.noRecentConquests}</Text>
            ) : (
              profile.recentConquests.map((c: { summitName: string; elevation: number; plantedAt: string }, i: number) => (
                <View key={i} style={styles.conquestRow}>
                  <Text style={styles.conquestEmoji}>🏔</Text>
                  <View style={styles.conquestInfo}>
                    <Text style={styles.conquestName}>{c.summitName}</Text>
                    <Text style={styles.conquestElev}>{c.elevation}m · {timeAgo(c.plantedAt)}</Text>
                  </View>
                  <Text style={styles.flagIcon}>🚩</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.zinc200, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.white },
  headerInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  crewBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  crewText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  followCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  followCountText: { fontSize: 12, color: Colors.zinc500, fontWeight: '500' },
  followCountDot: { fontSize: 12, color: Colors.zinc500 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 16, color: Colors.zinc500 },
  followRow: { paddingHorizontal: 20, paddingBottom: 12 },
  followBtn: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 28,
    alignSelf: 'flex-start',
  },
  followingBtn: {
    backgroundColor: Colors.zinc100,
    borderWidth: 1,
    borderColor: Colors.zinc200,
  },
  followBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  followingBtnText: { color: Colors.zinc800 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  errorText: { fontSize: 15, color: Colors.zinc500 },
  body: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statPill: {
    flex: 1,
    backgroundColor: Colors.zinc100,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.zinc950 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.zinc500, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.zinc500, marginBottom: 20 },
  conquestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.zinc100, gap: 12 },
  conquestEmoji: { fontSize: 22 },
  conquestInfo: { flex: 1 },
  conquestName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  conquestElev: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  flagIcon: { fontSize: 18 },
});
