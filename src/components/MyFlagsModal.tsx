import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants';
import { fetchMyActiveFlags, MyActiveFlag } from '../services/myFlags';
import { scheduleAllFlagExpiryNotifications } from '../services/notifications';
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

function plantedDateLabel(plantedAt: string, s: ReturnType<typeof t>): string {
  const d = new Date(plantedAt);
  const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return s.plantedOn(formatted);
}

function FlagRow({ flag }: { flag: MyActiveFlag }) {
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
        <View style={styles.rowTop}>
          <Text style={styles.summitName} numberOfLines={1}>{name}</Text>
          {isAtRisk && (
            <View style={styles.riskBadge}>
              <Text style={styles.riskText}>{s.atRisk}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.expiry, { color }]}>{expiryLabel(flag.expires_at, s)}</Text>
          <Text style={styles.planted}>{plantedDateLabel(flag.planted_at, s)}</Text>
        </View>
      </View>
      <View style={[styles.urgencyBar, { backgroundColor: color }]} />
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MyFlagsModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [flags, setFlags] = useState<MyActiveFlag[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyActiveFlags();
      setFlags(data);
      scheduleAllFlagExpiryNotifications(data).catch(() => {});
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.title}>{s.myFlags}</Text>
          {flags.length > 0 && (
            <Text style={styles.subtitle}>{s.myFlagsTotal(flags.length)}</Text>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{s.close}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.green} />
        ) : flags.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚩</Text>
            <Text style={styles.emptyTitle}>{s.myFlagsEmpty}</Text>
            <Text style={styles.emptyDesc}>{s.myFlagsEmptyDesc}</Text>
          </View>
        ) : (
          <FlatList<MyActiveFlag>
            data={flags}
            keyExtractor={(item: MyActiveFlag) => item.id}
            renderItem={({ item }: { item: MyActiveFlag }) => <FlagRow flag={item} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.zinc200,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.zinc500,
    marginTop: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 28,
    padding: 4,
  },
  closeText: {
    fontSize: 15,
    color: Colors.green,
    fontWeight: '600',
  },
  loader: {
    marginTop: 48,
  },
  list: {
    padding: 16,
  },
  separator: {
    height: 10,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  elevBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  elevText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summitName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.zinc950,
    flex: 1,
  },
  riskBadge: {
    backgroundColor: Colors.orange + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.orange,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 3,
  },
  expiry: {
    fontSize: 12,
    fontWeight: '600',
  },
  planted: {
    fontSize: 12,
    color: Colors.zinc500,
  },
  urgencyBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.zinc950,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.zinc500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
