import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Colors, Fonts } from '../constants';
import { useLang } from '../contexts/LangContext';
import { t } from '../i18n/strings';
import {
  getActiveTimer, startTimer, checkIn, cancelTimer,
  isExpired, minutesRemaining, type SafetyTimer,
} from '../services/safetyTimer';

const DURATIONS = [30, 60, 90, 120, 180, 240, 360];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SafetyTimerModal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const s = t(lang as 'ko' | 'en' | 'ja');

  const [timer, setTimer] = useState<SafetyTimer | null>(null);
  const [summitInput, setSummitInput] = useState('');
  const [duration, setDuration] = useState(120);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTimer = useCallback(async () => {
    const active = await getActiveTimer();
    setTimer(active);
    if (active && !active.checkedIn) {
      setRemaining(minutesRemaining(active));
    }
  }, []);

  useEffect(() => {
    if (visible) loadTimer();
  }, [visible, loadTimer]);

  useEffect(() => {
    if (timer && !timer.checkedIn) {
      tickRef.current = setInterval(() => {
        setRemaining(minutesRemaining(timer));
      }, 30_000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [timer]);

  const handleStart = async () => {
    if (!summitInput.trim()) {
      Alert.alert(s.safetyTimerSummitLabel, s.safetyTimerSummitHint);
      return;
    }
    setBusy(true);
    try {
      await startTimer(summitInput.trim(), duration);
      await loadTimer();
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      await checkIn();
      await loadTimer();
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(s.safetyTimerCancel, s.safetyTimerSub, [
      { text: s.safetyTimerDone, style: 'cancel' },
      {
        text: s.safetyTimerCancel, style: 'destructive',
        onPress: async () => { await cancelTimer(); await loadTimer(); },
      },
    ]);
  };

  const handleClose = () => { setSummitInput(''); onClose(); };

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const expired = timer ? isExpired(timer) : false;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{s.safetyTimerTitle}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!timer ? (
            <>
              <Text style={styles.sub}>{s.safetyTimerSub}</Text>

              <Text style={styles.label}>{s.safetyTimerSummitLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={s.safetyTimerSummitHint}
                placeholderTextColor={Colors.zinc500}
                value={summitInput}
                onChangeText={setSummitInput}
                maxLength={60}
              />

              <Text style={styles.label}>{s.safetyTimerDurationLabel}</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationChip, duration === d && styles.durationActive]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.durationTxt, duration === d && styles.durationActiveTxt]}>
                      {d >= 60 ? `${d / 60}h` : `${d}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.disabled]}
                onPress={handleStart}
                disabled={busy}
              >
                <Text style={styles.primaryBtnTxt}>{s.safetyTimerStart}</Text>
              </TouchableOpacity>
            </>
          ) : timer.checkedIn ? (
            <View style={styles.successBox}>
              <Text style={styles.successTxt}>{s.safetyTimerCheckedIn}</Text>
              <Text style={styles.successSub}>{s.safetyTimerFor(timer.summitName)}</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => { await cancelTimer(); await loadTimer(); }}
              >
                <Text style={styles.primaryBtnTxt}>{s.safetyTimerDone}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeBox}>
              <Text style={styles.activeLabel}>{s.safetyTimerActive}</Text>
              <Text style={styles.summitName}>{timer.summitName}</Text>
              <Text style={styles.startedTxt}>{s.safetyTimerStarted(formatTime(timer.startedAt))}</Text>

              {expired ? (
                <View style={styles.alertBanner}>
                  <Text style={styles.alertTxt}>{s.safetyTimerExpired}</Text>
                </View>
              ) : (
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNum}>{remaining}</Text>
                  <Text style={styles.countdownUnit}>
                    {lang === 'ja' ? '分' : lang === 'ko' ? '분' : 'min'}
                  </Text>
                </View>
              )}

              {!expired && <Text style={styles.remainingTxt}>{s.safetyTimerRemaining(remaining)}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.disabled]}
                onPress={handleCheckIn}
                disabled={busy}
              >
                <Text style={styles.primaryBtnTxt}>{s.safetyTimerCheckIn}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
                <Text style={styles.cancelTxt}>{s.safetyTimerCancel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.zinc200,
  },
  title: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.zinc950 },
  closeBtn: { padding: 6 },
  closeTxt: { fontSize: 18, color: Colors.zinc500 },
  body: { padding: 20, paddingBottom: 40 },
  sub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.zinc500, marginBottom: 24, lineHeight: 20 },
  label: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.zinc800, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: Colors.zinc200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.zinc950, backgroundColor: Colors.white,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.zinc200, backgroundColor: Colors.white,
  },
  durationActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  durationTxt: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.zinc800 },
  durationActiveTxt: { color: Colors.white },
  primaryBtn: {
    backgroundColor: Colors.green, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  primaryBtnTxt: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.white },
  disabled: { opacity: 0.5 },
  activeBox: { alignItems: 'center', paddingTop: 16 },
  activeLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.zinc500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  summitName: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.zinc950, marginBottom: 4 },
  startedTxt: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.zinc500, marginBottom: 20 },
  countdownBox: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  countdownNum: { fontFamily: Fonts.extraBold, fontSize: 64, color: Colors.green },
  countdownUnit: { fontFamily: Fonts.semiBold, fontSize: 22, color: Colors.green, marginLeft: 4 },
  remainingTxt: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.zinc500, marginBottom: 24 },
  alertBanner: {
    backgroundColor: '#FFF3CD', borderRadius: 10, padding: 16,
    marginBottom: 24, width: '100%', alignItems: 'center',
  },
  alertTxt: { fontFamily: Fonts.bold, fontSize: 15, color: '#856404' },
  cancelLink: { marginTop: 16, padding: 8 },
  cancelTxt: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.zinc500 },
  successBox: { alignItems: 'center', paddingTop: 32 },
  successTxt: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.green, marginBottom: 8 },
  successSub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.zinc500, marginBottom: 32 },
});
