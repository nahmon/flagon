import { useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { fetchSummitSpeedRecords, fetchMySpeedRecord, type SpeedRecord } from '../services/speedRecords';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import { supabase } from '../services/supabase';

const RANK_COLORS = ['#D4B060', '#A0A8B0', '#C07840'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function dateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface RecordRowProps {
  item: SpeedRecord;
  rank: number;
  myUserId: string | null;
}

function RecordRow({ item, rank, myUserId }: RecordRowProps) {
  const isMe = myUserId === item.userId;
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : Colors.zinc500;
  const crewDotColor = item.crewColor ?? Colors.zinc200;
  return (
    <View style={[styles.row, isMe && styles.rowHighlight]}>
      <View style={styles.rankCell}>
        {rank <= 3
          ? <Text style={styles.rankIcon}>{RANK_ICONS[rank - 1]}</Text>
          : <Text style={[styles.rankNum, { color: rankColor }]}>{rank}</Text>
        }
      </View>
      <View style={[styles.crewDot, { backgroundColor: crewDotColor }]} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
          {item.displayName}{isMe ? ' ★' : ''}
        </Text>
        <Text style={styles.rowSub}>{item.crewName ?? '—'} · {dateShort(item.achievedAt)}</Text>
      </View>
      <View style={styles.durationCell}>
        <Text style={[styles.duration, isMe && styles.durationMe]}>{formatDuration(item.durationMinutes)}</Text>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  summitId: string;
  summitName: string;
  onClose: () => void;
}

export default function SummitSpeedRecordsModal({ visible, summitId, summitName, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [records, setRecords] = useState<SpeedRecord[]>([]);
  const [myRecord, setMyRecord] = useState<SpeedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) =>
      setMyUserId(data.user?.id ?? null),
    );
  }, []);

  useEffect(() => {
    if (!visible || !summitId) return;
    setLoading(true);
    Promise.all([
      fetchSummitSpeedRecords(summitId),
      fetchMySpeedRecord(summitId),
    ])
      .then(([recs, mine]) => {
        setRecords(recs);
        setMyRecord(mine);
      })
      .catch(() => {
        setRecords([]);
        setMyRecord(null);
      })
      .finally(() => setLoading(false));
  }, [visible, summitId]);

  const myRank = myRecord
    ? records.findIndex((r: SpeedRecord) => r.userId === myRecord.userId) + 1
    : null;
  const myOnBoard = myRank != null && myRank > 0;
  const showMyCard = myRecord != null && !myOnBoard;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>⚡ {s.speedRecordsTitle}</Text>
          <Text style={styles.subtitle}>{summitName}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ marginTop: 48 }} />
        ) : (
          <>
            {myRecord && (
              <View style={styles.myBestCard}>
                <Text style={styles.myBestLabel}>{s.speedMyBest}</Text>
                <Text style={styles.myBestTime}>{formatDuration(myRecord.durationMinutes)}</Text>
                {myOnBoard && myRank != null && (
                  <Text style={styles.myBestRank}>
                    {myRank <= 3 ? RANK_ICONS[myRank - 1] : `#${myRank}`} {s.speedRankOf(myRank, records.length)}
                  </Text>
                )}
              </View>
            )}

            {records.length === 0 ? (
              <Text style={styles.empty}>{s.speedEmpty}</Text>
            ) : (
              <FlatList<SpeedRecord>
                data={records}
                keyExtractor={(item: SpeedRecord) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item, index }: { item: SpeedRecord; index: number }) => (
                  <RecordRow item={item} rank={index + 1} myUserId={myUserId} />
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                ListFooterComponent={
                  showMyCard && myRecord ? (
                    <View style={styles.myOutOfBoard}>
                      <Text style={styles.myOutLabel}>{s.speedMyBest}</Text>
                      <Text style={styles.myOutTime}>{formatDuration(myRecord.durationMinutes)}</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.zinc100,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.zinc800 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { position: 'absolute', top: 20, right: 20, padding: 4 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 },
  myBestCard: {
    margin: 16,
    backgroundColor: Colors.greenDark,
    borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 4,
  },
  myBestLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, textTransform: 'uppercase' },
  myBestTime: { fontSize: 32, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  myBestRank: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  list: { padding: 16, gap: 6 },
  empty: { textAlign: 'center', color: Colors.zinc500, marginTop: 48, fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  rowHighlight: { borderWidth: 1.5, borderColor: Colors.green },
  rankCell: { width: 28, alignItems: 'center' },
  rankIcon: { fontSize: 18 },
  rankNum: { fontSize: 15, fontWeight: '700' },
  crewDot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: Colors.zinc800 },
  rowNameMe: { color: Colors.green },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  durationCell: { alignItems: 'flex-end' },
  duration: { fontSize: 16, fontWeight: '800', color: Colors.zinc800 },
  durationMe: { color: Colors.green },
  sep: { height: 6 },
  myOutOfBoard: {
    marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: Colors.zinc200,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4,
  },
  myOutLabel: { fontSize: 13, color: Colors.zinc500, fontWeight: '600' },
  myOutTime: { fontSize: 15, fontWeight: '800', color: Colors.green },
});
