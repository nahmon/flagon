import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchUserConquests } from '../services/conquests';
import {
  computePassportStamps,
  stampDisplayName,
  PASSPORT_STAMP_DEFS,
  type PassportStamp,
} from '../services/summitPassport';
import { supabase } from '../services/supabase';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

const TOTAL = PASSPORT_STAMP_DEFS.length;
const STAMP_SIZE = 72;

function StampBadge({ stamp, lang }: { stamp: PassportStamp; lang: string }) {
  return (
    <View style={styles.stampWrap}>
      <View style={[styles.stampCircle, stamp.earned ? styles.stampEarned : styles.stampLocked]}>
        <Text style={[styles.stampEmoji, !stamp.earned && styles.stampEmojiLocked]}>
          {stamp.emoji}
        </Text>
        {stamp.earned && <View style={styles.earnedDot} />}
      </View>
      <Text
        style={[styles.stampLabel, stamp.earned ? styles.stampLabelEarned : styles.stampLabelLocked]}
        numberOfLines={1}
      >
        {stampDisplayName(stamp, lang as 'ko' | 'en' | 'ja')}
      </Text>
    </View>
  );
}

export default function SummitPassportCard() {
  const { lang } = useLang();
  const s = t(lang);
  const [stamps, setStamps] = useState<PassportStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const conquests = await fetchUserConquests(user.id);
        setStamps(computePassportStamps(conquests));
      } catch {
        setStamps(computePassportStamps([]));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const earnedCount = stamps.filter((s) => s.earned).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((prev) => !prev)}
        activeOpacity={0.75}
      >
        <View>
          <Text style={styles.title}>{s.passportTitle}</Text>
          {!loading && (
            <Text style={styles.subtitle}>
              {s.passportProgress(earnedCount, TOTAL)}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{collapsed ? '›' : '‹'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : (
          <View style={styles.body}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round((earnedCount / TOTAL) * 100)}%` as unknown as number },
                ]}
              />
            </View>
            <View style={styles.grid}>
              {stamps.map((stamp) => (
                <StampBadge key={stamp.group} stamp={stamp} lang={lang} />
              ))}
            </View>
            {earnedCount === TOTAL && (
              <View style={styles.completeBanner}>
                <Text style={styles.completeTxt}>{s.passportComplete}</Text>
              </View>
            )}
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
  title: { fontSize: 15, fontWeight: '700', color: Colors.zinc950 },
  subtitle: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.zinc500, transform: [{ rotate: '90deg' }] },
  loader: { marginVertical: 20 },
  body: { paddingHorizontal: 12, paddingBottom: 16 },
  progressBar: {
    height: 4,
    backgroundColor: Colors.zinc100,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.green,
    borderRadius: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  stampWrap: {
    width: STAMP_SIZE,
    alignItems: 'center',
    gap: 4,
  },
  stampCircle: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    borderRadius: STAMP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  stampEarned: {
    backgroundColor: '#F0FAF4',
    borderColor: Colors.green,
  },
  stampLocked: {
    backgroundColor: Colors.zinc100,
    borderColor: Colors.zinc200,
    borderStyle: 'dashed',
  },
  stampEmoji: { fontSize: 28 },
  stampEmojiLocked: { opacity: 0.35 },
  earnedDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  stampLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600' },
  stampLabelEarned: { color: Colors.zinc800 },
  stampLabelLocked: { color: Colors.zinc500 },
  completeBanner: {
    marginTop: 12,
    backgroundColor: '#F0FAF4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.green,
  },
  completeTxt: { fontSize: 14, fontWeight: '700', color: Colors.green },
});
