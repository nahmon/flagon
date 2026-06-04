import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants';
import { fetchMyActiveFlags, type MyActiveFlag } from '../services/myFlags';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import type { Lang } from '../i18n/strings';

const THRESHOLD_MS = 48 * 3600 * 1000;
const URGENT_MS = 6 * 3600 * 1000;
const WARN_MS = 24 * 3600 * 1000;

function msToHMS(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function localName(flag: MyActiveFlag, lang: Lang): string {
  if (lang === 'en' && flag.summit_name_en) return flag.summit_name_en;
  if (lang === 'ja' && flag.summit_name_ja) return flag.summit_name_ja;
  return flag.summit_name_ko;
}

interface ExpiryItem { flag: MyActiveFlag; msLeft: number }

export default function FlagExpiryCard() {
  const { lang } = useLang();
  const s = t(lang);
  const [baseItems, setBaseItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const flags = await fetchMyActiveFlags();
      const ts = Date.now();
      setBaseItems(
        flags
          .map((f) => ({ flag: f, msLeft: new Date(f.expires_at).getTime() - ts }))
          .filter((i) => i.msLeft > 0 && i.msLeft < THRESHOLD_MS)
          .sort((a, b) => a.msLeft - b.msLeft),
      );
    } catch (e) {
      console.error('[FlagExpiryCard]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const liveItems: ExpiryItem[] = baseItems
    .map((i: ExpiryItem) => ({ flag: i.flag, msLeft: new Date(i.flag.expires_at).getTime() - now }))
    .filter((i: ExpiryItem) => i.msLeft > 0);

  if (loading || liveItems.length === 0) return null;

  const urgentCount = liveItems.filter((i: ExpiryItem) => i.msLeft < URGENT_MS).length;
  const warnCount = liveItems.filter((i: ExpiryItem) => i.msLeft >= URGENT_MS && i.msLeft < WARN_MS).length;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed((c: boolean) => !c)} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.title}>{s.expiryCardTitle}</Text>
            <View style={styles.badgeRow}>
              {urgentCount > 0 && <Text style={styles.urgentBadge}>{s.expiryUrgent(urgentCount)}</Text>}
              {warnCount > 0 && <Text style={styles.warnBadge}>{s.expiryWarn(warnCount)}</Text>}
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.list}>
          {liveItems.map((item) => {
            const urgency = item.msLeft < URGENT_MS ? 'urgent' : item.msLeft < WARN_MS ? 'warn' : 'ok';
            const timeColor = urgency === 'urgent' ? Colors.orange : urgency === 'warn' ? '#C8902A' : Colors.green;
            const barColor = urgency === 'urgent' ? Colors.orange : urgency === 'warn' ? '#E6B84A' : Colors.greenLight;
            const barPct = Math.min(100, Math.max(0, (item.msLeft / THRESHOLD_MS) * 100));
            return (
              <View key={item.flag.id} style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{localName(item.flag, lang)}</Text>
                  <Text style={styles.rowElev}>{item.flag.elevation_m.toLocaleString()}m</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.countdown, { color: timeColor }]}>{msToHMS(item.msLeft)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${barPct}%` as `${number}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D4',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1F2421' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  urgentBadge: { fontSize: 12, color: Colors.orange, fontWeight: '600' },
  warnBadge: { fontSize: 12, color: '#C8902A', fontWeight: '600' },
  chevron: { fontSize: 16, color: Colors.zinc500, marginLeft: 8 },
  list: { borderTopWidth: 1, borderTopColor: Colors.zinc100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc100,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1F2421' },
  rowElev: { fontSize: 12, color: Colors.zinc500, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  countdown: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  barTrack: { width: 72, height: 4, backgroundColor: Colors.zinc100, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});
