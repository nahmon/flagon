import { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag } from '../types';
import { DayForecast, fetchSummitForecast, conditionLabel } from '../services/weather';
import { useLang } from '../contexts/LangContext';
import { t, summitName } from '../i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
  summit: SummitWithFlag;
}

function dayLabel(index: number, s: ReturnType<typeof t>): string {
  if (index === 0) return s.forecastToday;
  if (index === 1) return s.forecastTomorrow;
  return s.forecastDayAfter;
}

function precipColor(pct: number): string {
  if (pct >= 60) return Colors.crewNK;
  if (pct >= 30) return Colors.orange;
  return Colors.zinc500;
}

export default function WeatherForecastModal({ visible, onClose, summit }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [days, setDays] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setFailed(false);
    setDays([]);
    const [lng, lat] = summit.location.coordinates;
    fetchSummitForecast(lat, lng)
      .then(setDays)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [visible, summit.id]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{s.forecastTitle}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{summitName(summit, lang)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.green} size="large" />
          </View>
        ) : failed || days.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{s.forecastUnavailable}</Text>
          </View>
        ) : (
          <View style={styles.cards}>
            {days.map((day: DayForecast, i: number) => (
              <View key={day.date} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{dayLabel(i, s)}</Text>
                  <Text style={styles.conditionText}>{conditionLabel(day.weathercode, lang)}</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{s.forecastHigh}</Text>
                    <Text style={styles.statValueHot}>{Math.round(day.tempMax)}°</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{s.forecastLow}</Text>
                    <Text style={styles.statValueCold}>{Math.round(day.tempMin)}°</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{s.forecastPrecip}</Text>
                    <Text style={[styles.statValue, { color: precipColor(day.precipProbability) }]}>
                      {day.precipProbability}%
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{s.forecastWind}</Text>
                    <Text style={styles.statValue}>{Math.round(day.windspeedMax)}</Text>
                    <Text style={styles.statUnit}>km/h</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
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
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.zinc200,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.zinc200,
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
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: Colors.zinc500,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.zinc500,
  },
  cards: {
    padding: 16,
    gap: 12,
  },
  dayCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.zinc950,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  conditionText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.zinc800,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.zinc500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.zinc800,
  },
  statValueHot: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.orange,
  },
  statValueCold: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.crewNK,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.zinc500,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: Colors.zinc200,
  },
});
