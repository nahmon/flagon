import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';
import { fetchPersonalRecords, prSummitName, formatPrDate, type PersonalRecords } from '../services/personalRecords';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';

interface RecordRowProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}

function RecordRow({ icon, label, value, sub }: RecordRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

interface Props {
  userId: string;
}

export default function PersonalRecordsCard({ userId }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPersonalRecords(userId)
      .then(setRecords)
      .catch(() => setRecords(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{s.prSection}</Text>
      {loading ? (
        <ActivityIndicator color={Colors.green} style={styles.loader} />
      ) : !records || records.totalConquests === 0 ? (
        <Text style={styles.empty}>{s.prNoData}</Text>
      ) : (
        <>
          <RecordRow
            icon="🏔️"
            label={s.prHighestSummit}
            value={records.highestSummit ? `${records.highestSummit.elevation_m}m` : '—'}
            sub={records.highestSummit ? prSummitName(records.highestSummit, lang) : undefined}
          />
          <View style={styles.divider} />
          <RecordRow
            icon="⬆️"
            label={s.prTotalElevation}
            value={s.prElevationM(records.totalElevationM)}
          />
          <View style={styles.divider} />
          <RecordRow
            icon="🗓️"
            label={s.prBestDay}
            value={s.prBestDayCount(records.bestDayCount)}
            sub={records.bestDayDate ? formatPrDate(records.bestDayDate, lang) : undefined}
          />
          <View style={styles.divider} />
          <RecordRow
            icon="🥇"
            label={s.prFirstSummit}
            value={records.firstSummit ? prSummitName(records.firstSummit, lang) : '—'}
            sub={records.firstSummit ? formatPrDate(records.firstSummit.planted_at, lang) : undefined}
          />
          <View style={styles.divider} />
          <RecordRow
            icon="🔢"
            label={s.prTotalConquests}
            value={String(records.totalConquests)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: Colors.zinc800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontFamily: 'OpenSans_700Bold',
    fontSize: 15,
    color: Colors.zinc800,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 12,
  },
  empty: {
    fontFamily: 'OpenSans_400Regular',
    fontSize: 13,
    color: Colors.zinc500,
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowIcon: {
    fontSize: 20,
    width: 32,
  },
  rowBody: {
    flex: 1,
    marginLeft: 8,
  },
  rowLabel: {
    fontFamily: 'OpenSans_600SemiBold',
    fontSize: 13,
    color: Colors.zinc800,
  },
  rowSub: {
    fontFamily: 'OpenSans_400Regular',
    fontSize: 11,
    color: Colors.zinc500,
    marginTop: 1,
  },
  rowValue: {
    fontFamily: 'OpenSans_700Bold',
    fontSize: 14,
    color: Colors.green,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.zinc100,
  },
});
