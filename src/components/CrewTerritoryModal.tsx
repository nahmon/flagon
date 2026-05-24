import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { fetchCrewActiveFlags, CrewActiveFlag } from '../services/flags';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

function urgencyColor(expiresAt: string): string {
  const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < 24) return Colors.orange;
  if (hoursLeft < 72) return '#F59E0B';
  return Colors.green;
}

function expiryLabel(expiresAt: string, s: ReturnType<typeof t>): string {
  const hoursLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  if (hoursLeft < 24) return s.expiresHours(hoursLeft);
  const daysLeft = Math.ceil(hoursLeft / 24);
  if (daysLeft === 1) return s.expiresTomorrow;
  return s.expiresInDays(daysLeft);
}

function FlagRow({ flag }: { flag: CrewActiveFlag }) {
  const { lang } = useLang();
  const s = t(lang);
  const color = urgencyColor(flag.expires_at);
  const isAtRisk = (new Date(flag.expires_at).getTime() - Date.now()) / 3_600_000 < 24;
  const name = summitName(
    { name_ko: flag.summit_name_ko, name_en: flag.summit_name_en, name_ja: flag.summit_name_ja },
    lang,
  );
  return (
    <View style={styles.row}>
      <View style={[styles.elevBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.elevText, { color }]}>{flag.elevation_m}m</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text style={styles.summitName} numberOfLines={1}>{name}</Text>
          {isAtRisk && (
            <View style={styles.atRiskBadge}>
              <Text style={styles.atRiskText}>{s.atRisk}</Text>
            </View>
          )}
        </View>
        {flag.planted_by && (
          <Text style={styles.plantedBy}>{s.plantedBy(flag.planted_by)}</Text>
        )}
      </View>
      <View style={[styles.expiryBadge, { borderColor: color }]}>
        <Text style={[styles.expiryText, { color }]}>{expiryLabel(flag.expires_at, s)}</Text>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  crewId: string;
  crewName: string;
  onClose: () => void;
}

export default function CrewTerritoryModal({ visible, crewId, crewName, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [flags, setFlags] = useState<CrewActiveFlag[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCrewActiveFlags(crewId);
      setFlags(data);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [crewId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{s.territory}</Text>
            <Text style={styles.subtitle}>{crewName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!loading && flags.length > 0 && (
          <View style={styles.totalBar}>
            <Text style={styles.totalText}>{s.territoryTotal(flags.length)}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.green} style={styles.loader} />
        ) : flags.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏔</Text>
            <Text style={styles.emptyText}>{s.territoryEmpty}</Text>
          </View>
        ) : (
          <FlatList<CrewActiveFlag>
            data={flags}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => <FlagRow flag={item} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.zinc200, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.zinc950 },
  subtitle: { fontSize: 13, color: Colors.zinc500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, color: Colors.zinc500 },
  totalBar: { marginHorizontal: 20, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.green + '18', borderRadius: 10 },
  totalText: { fontSize: 14, fontWeight: '700', color: Colors.green },
  loader: { marginTop: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  sep: { height: 1, backgroundColor: Colors.zinc200, marginVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  elevBadge: { width: 56, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  elevText: { fontSize: 12, fontWeight: '700' },
  rowBody: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summitName: { fontSize: 15, fontWeight: '700', color: Colors.zinc950, flexShrink: 1 },
  atRiskBadge: { backgroundColor: Colors.orange + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  atRiskText: { fontSize: 10, fontWeight: '700', color: Colors.orange },
  plantedBy: { fontSize: 12, color: Colors.zinc500 },
  expiryBadge: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center' },
  expiryText: { fontSize: 11, fontWeight: '700' },
});
