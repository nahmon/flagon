import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../constants';
import { CrewLeaderboardEntry, CrewMemberDetail } from '../types';
import { fetchCrewMemberDetails } from '../services/crews';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import CrewChallengeModal from './CrewChallengeModal';

interface Props {
  crew: CrewLeaderboardEntry | null;
  myCrew: CrewLeaderboardEntry | null;
  onClose: () => void;
}

function MemberRow({ member, rank }: { member: CrewMemberDetail; rank: number }) {
  return (
    <View style={styles.memberRow}>
      <Text style={styles.memberRank}>{rank}</Text>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.display_name}
          {member.role === 'leader' ? (
            <Text style={styles.leaderBadge}> 리더</Text>
          ) : null}
        </Text>
      </View>
      <View style={styles.memberFlags}>
        <Text style={styles.memberFlagCount}>{member.flag_count}</Text>
        <Text style={styles.memberFlagLabel}>깃발</Text>
      </View>
    </View>
  );
}

export default function CrewDetailModal({ crew, myCrew, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);

  const [members, setMembers] = useState<CrewMemberDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);

  useEffect(() => {
    if (!crew) return;
    setLoading(true);
    fetchCrewMemberDetails(crew.id)
      .then(setMembers)
      .catch((e) => console.error('[CrewDetailModal]', e))
      .finally(() => setLoading(false));
  }, [crew]);

  const canChallenge = myCrew !== null && crew !== null && myCrew.id !== crew.id;

  return (
    <>
      <Modal
        visible={crew !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.colorDot, { backgroundColor: crew?.color_hex ?? '#888' }]} />
              <View>
                <Text style={styles.crewName}>{crew?.name_ko ?? crew?.name ?? ''}</Text>
                <Text style={styles.crewSub}>
                  {crew?.flag_count ?? 0}개 깃발 · {members.length}명
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {canChallenge && (
                <TouchableOpacity
                  style={styles.challengeBtn}
                  onPress={() => setChallengeOpen(true)}
                  hitSlop={8}
                  activeOpacity={0.75}
                >
                  <Text style={styles.challengeBtnText}>{s.challengeBtn}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Text style={styles.closeBtnText}>{s.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>멤버 랭킹</Text>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.green} />
            </View>
          ) : (
            <FlatList<CrewMemberDetail>
              data={members}
              keyExtractor={(m: CrewMemberDetail) => m.user_id}
              renderItem={({ item, index }: { item: CrewMemberDetail; index: number }) => (
                <MemberRow member={item} rank={index + 1} />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>멤버가 없습니다</Text>
                </View>
              }
              contentContainerStyle={members.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {crew !== null && myCrew !== null && (
        <CrewChallengeModal
          visible={challengeOpen}
          opponentCrew={crew}
          myCrew={myCrew}
          onClose={() => setChallengeOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  crewName: { fontSize: 18, fontWeight: '700', color: Colors.zinc950 },
  crewSub: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  challengeBtn: {
    backgroundColor: Colors.orange + '18',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.orange + '40',
  },
  challengeBtnText: { fontSize: 13, fontWeight: '700', color: Colors.orange },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText: { fontSize: 15, color: Colors.green, fontWeight: '600' },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.zinc100,
  },
  listHeaderText: { fontSize: 13, fontWeight: '600', color: Colors.zinc500 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  memberRank: {
    width: 28,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.zinc500,
    textAlign: 'center',
  },
  memberInfo: { flex: 1, marginLeft: 8 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.zinc950 },
  leaderBadge: { fontSize: 12, color: Colors.green, fontWeight: '500' },
  memberFlags: { alignItems: 'flex-end' },
  memberFlagCount: { fontSize: 18, fontWeight: '700', color: Colors.green },
  memberFlagLabel: { fontSize: 11, color: Colors.zinc500 },
  separator: { height: 1, backgroundColor: Colors.zinc100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, color: Colors.zinc500 },
});
