import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import { SummitWithFlag } from '../types';
import { WeatherData, fetchSummitWeather, conditionLabel } from '../services/weather';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import WeatherForecastModal from './WeatherForecastModal';

interface Props {
  summit: SummitWithFlag;
}

export default function WeatherCard({ summit }: Props) {
  const { lang } = useLang();
  const s = t(lang);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    setWeather(null);
    setFailed(false);
    setLoading(true);
    const [lng, lat] = summit.location.coordinates;
    fetchSummitWeather(lat, lng)
      .then(setWeather)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [summit.id]);

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => !loading && !failed && setShowForecast(true)}
        activeOpacity={0.8}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>{s.weather}</Text>
          {!loading && !failed && weather && (
            <Text style={styles.tapHint}>{s.forecastTap}</Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator color={Colors.green} size="small" />
        ) : failed || !weather ? (
          <Text style={styles.errorText}>{s.weatherUnavailable}</Text>
        ) : (
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.round(weather.temperature)}°C</Text>
              <Text style={styles.statMeta}>🌡️</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.round(weather.windspeed)}</Text>
              <Text style={styles.statMeta}>💨 km/h</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.stat, styles.condStat]}>
              <Text style={styles.condText} numberOfLines={1}>
                {conditionLabel(weather.weathercode, lang)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <WeatherForecastModal
        visible={showForecast}
        onClose={() => setShowForecast(false)}
        summit={summit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.zinc500,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  tapHint: {
    fontSize: 11,
    color: Colors.green,
    fontWeight: '600',
  },
  errorText: { fontSize: 13, color: Colors.zinc500 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center', flex: 1 },
  condStat: { flex: 2, alignItems: 'flex-start', paddingLeft: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.zinc950 },
  statMeta: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  condText: { fontSize: 15, fontWeight: '600', color: Colors.zinc800 },
  divider: { width: 1, height: 40, backgroundColor: Colors.zinc200, marginHorizontal: 4 },
});
