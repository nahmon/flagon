import { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { Colors } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t, summitName as getSummitName } from '../i18n/strings';
import {
  loadRouletteState, spinRoulette, acceptChallenge,
  RouletteChallenge, RouletteState,
} from '../services/summitRoulette';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SPINS_PER_WEEK = 3;

export default function SummitRouletteModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang);

  const [state, setState] = useState<RouletteState | null>(null);
  const [challenge, setChallenge] = useState<RouletteChallenge | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const spin = useState(() => new Animated.Value(0))[0];

  const load = useCallback(async () => {
    const rs = await loadRouletteState();
    setState(rs);
    if (rs.accepted) setChallenge(rs.accepted);
  }, []);

  useEffect(() => {
    if (visible) { setAccepted(false); setChallenge(null); load(); }
  }, [visible, load]);

  const handleSpin = async () => {
    if (spinning || (state && state.spinsLeft <= 0)) return;
    setSpinning(true);
    setChallenge(null);
    setAccepted(false);

    Animated.sequence([
      Animated.timing(spin, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    try {
      const result = await spinRoulette();
      if (!result) {
        Alert.alert(s.rouletteNoSpins, s.rouletteNoSpinsMsg);
        return;
      }
      setTimeout(() => {
        setChallenge(result.challenge);
        setState(result.state);
        setSpinning(false);
      }, 700);
    } catch {
      setSpinning(false);
      Alert.alert(s.error, s.rouletteSpinError);
    }
  };

  const handleAccept = async () => {
    if (!challenge) return;
    try {
      await acceptChallenge(challenge);
      setAccepted(true);
    } catch {
      Alert.alert(s.error, s.rouletteAcceptError);
    }
  };

  const spinsLeft = state?.spinsLeft ?? SPINS_PER_WEEK;
  const noSpins = spinsLeft <= 0 && !challenge;

  const cardScale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.85, 1] });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{s.rouletteTitle}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>{s.rouletteSub}</Text>

        <View style={styles.spinCounter}>
          {[...Array(SPINS_PER_WEEK)].map((_, i) => (
            <View key={i} style={[styles.spinDot, i < spinsLeft && styles.spinDotActive]} />
          ))}
          <Text style={styles.spinCountText}>{s.rouletteSpinsLeft(spinsLeft)}</Text>
        </View>

        <Animated.View style={[styles.cardArea, { transform: [{ scale: cardScale }] }]}>
          {spinning ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator color={Colors.green} size="large" />
              <Text style={styles.spinningText}>{s.rouletteSpinning}</Text>
            </View>
          ) : challenge ? (
            <View style={styles.summitCard}>
              <Text style={styles.cardElevation}>▲ {challenge.elevation_m.toLocaleString()}m</Text>
              <Text style={styles.cardName}>{getSummitName(challenge, lang)}</Text>
              {challenge.mountain_group ? (
                <Text style={styles.cardGroup}>{challenge.mountain_group}</Text>
              ) : null}
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>🚩 {s.rouletteCommunityFlags(challenge.community_flags)}</Text>
              </View>
              <Text style={styles.cardCountry}>{challenge.country.toUpperCase()}</Text>
            </View>
          ) : (
            <View style={styles.cardEmpty}>
              <Text style={styles.cardEmptyIcon}>🎯</Text>
              <Text style={styles.cardEmptyText}>{noSpins ? s.rouletteWeeklyReset : s.rouletteTapSpin}</Text>
            </View>
          )}
        </Animated.View>

        {challenge && !accepted && (
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.8}>
            <Text style={styles.acceptBtnText}>{s.rouletteAccept}</Text>
          </TouchableOpacity>
        )}

        {accepted && (
          <View style={styles.acceptedBanner}>
            <Text style={styles.acceptedText}>{s.rouletteAccepted}</Text>
          </View>
        )}

        {!spinning && spinsLeft > 0 && (
          <TouchableOpacity
            style={[styles.spinBtn, noSpins && styles.spinBtnDisabled]}
            onPress={handleSpin}
            activeOpacity={0.8}
            disabled={noSpins}
          >
            <Text style={styles.spinBtnText}>{challenge ? s.rouletteSpinAgain : s.rouletteSpin}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.closeRow} onPress={onClose}>
          <Text style={styles.closeRowText}>{s.close}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: Colors.zinc200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.zinc950 },
  closeBtn: { fontSize: 16, color: Colors.zinc500, fontWeight: '700' },
  subtitle: { fontSize: 14, color: Colors.zinc500, paddingHorizontal: 20, marginBottom: 24 },
  spinCounter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 28, gap: 8 },
  spinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.zinc200 },
  spinDotActive: { backgroundColor: Colors.orange },
  spinCountText: { fontSize: 13, color: Colors.zinc500, marginLeft: 4 },
  cardArea: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: 'hidden', minHeight: 200 },
  cardLoading: { backgroundColor: Colors.white, borderRadius: 20, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  spinningText: { fontSize: 15, color: Colors.zinc500 },
  summitCard: {
    backgroundColor: Colors.green, borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 8, minHeight: 200, justifyContent: 'center',
    shadowColor: Colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  cardElevation: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  cardName: { fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center', lineHeight: 34 },
  cardGroup: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  cardBadge: { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  cardBadgeText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  cardCountry: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 1.2 },
  cardEmpty: { backgroundColor: Colors.white, borderRadius: 20, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 2, borderColor: Colors.zinc100, borderStyle: 'dashed' },
  cardEmptyIcon: { fontSize: 48 },
  cardEmptyText: { fontSize: 15, color: Colors.zinc500, textAlign: 'center' },
  acceptBtn: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.orange, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  acceptedBanner: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.greenLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  acceptedText: { fontSize: 15, fontWeight: '700', color: Colors.green },
  spinBtn: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.zinc950, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  spinBtnDisabled: { opacity: 0.4 },
  spinBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  closeRow: { marginHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  closeRowText: { fontSize: 15, color: Colors.zinc500 },
});
