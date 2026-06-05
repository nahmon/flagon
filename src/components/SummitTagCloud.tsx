import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors } from '../constants';
import {
  TAG_OPTIONS, loadTagCounts, loadMyVotes, toggleTagVote,
  type SummitTagState, type TagOption,
} from '../services/summitTags';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface Props {
  summitId: string;
}

function tagLabel(tag: TagOption, lang: string): string {
  if (lang === 'en') return tag.labelEn;
  if (lang === 'ja') return tag.labelJa;
  return tag.labelKo;
}

export default function SummitTagCloud({ summitId }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [counts, setCounts] = useState<SummitTagState>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, v] = await Promise.all([loadTagCounts(summitId), loadMyVotes(summitId)]);
    setCounts(c);
    setMyVotes(v);
    setLoading(false);
  }, [summitId]);

  useEffect(() => { void load(); }, [load]);

  const handleToggle = async (tagId: string) => {
    const result = await toggleTagVote(summitId, tagId);
    setCounts(result.counts);
    setMyVotes(result.voted);
  };

  const sorted = [...TAG_OPTIONS].sort(
    (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{s.tagCloudTitle}</Text>
      <Text style={styles.sub}>{s.tagCloudSub}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.green} style={styles.loader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {sorted.map((tag) => {
            const voted = myVotes.has(tag.id);
            const count = counts[tag.id] ?? 0;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.chip, voted && styles.chipActive]}
                onPress={() => handleToggle(tag.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipIcon}>{tag.icon}</Text>
                <Text style={[styles.chipLabel, voted && styles.chipLabelActive]}>
                  {tagLabel(tag, lang)}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, voted && styles.countBadgeActive]}>
                    <Text style={[styles.countText, voted && styles.countTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  header: { fontSize: 13, fontWeight: '700', color: Colors.zinc800, marginBottom: 2 },
  sub: { fontSize: 11, color: Colors.zinc500, marginBottom: 10 },
  loader: { marginVertical: 8 },
  scroll: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.zinc100,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.zinc200,
  },
  chipActive: {
    backgroundColor: Colors.greenDark,
    borderColor: Colors.green,
  },
  chipIcon: { fontSize: 13 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: Colors.zinc800 },
  chipLabelActive: { color: Colors.white },
  countBadge: {
    backgroundColor: Colors.zinc200,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: { backgroundColor: Colors.greenLight },
  countText: { fontSize: 10, fontWeight: '700', color: Colors.zinc500 },
  countTextActive: { color: Colors.white },
});
