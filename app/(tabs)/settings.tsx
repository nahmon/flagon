import { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../src/constants';
import { supabase } from '../../src/services/supabase';
import { useLang } from '../../src/contexts/LangContext';
import { t, type Lang } from '../../src/i18n/strings';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { lang, setLang } = useLang();
  const s = t(lang);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const checkNotifStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifEnabled(status === 'granted');
  }, []);

  useEffect(() => { checkNotifStatus(); }, [checkNotifStatus]);

  const handleNotifToggle = async (value: boolean) => {
    if (!value) {
      // Can't programmatically disable — guide user to system settings
      Alert.alert(s.notifications, s.notifDisable);
      return;
    }
    setNotifLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifEnabled(status === 'granted');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(s.logout, s.logoutConfirm, [
      { text: s.cancel, style: 'cancel' },
      { text: s.logout, style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{s.settings}</Text>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{s.language}</Text>
        <View style={styles.langRow}>
          {LANGS.map(({ code, label }) => (
            <TouchableOpacity
              key={code}
              style={[styles.langBtn, lang === code && styles.langBtnActive]}
              onPress={() => setLang(code)}
            >
              <Text style={[styles.langBtnText, lang === code && styles.langBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{s.notifications}</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>{s.notifications}</Text>
            <Text style={styles.rowSub}>{s.notifDesc}</Text>
          </View>
          <Switch
            value={notifEnabled}
            onValueChange={handleNotifToggle}
            disabled={notifLoading}
            trackColor={{ false: Colors.zinc200, true: Colors.green }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{s.account}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{s.logout}</Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{s.app}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{s.version}</Text>
          <Text style={styles.rowValue}>{APP_VERSION}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 48 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: Colors.zinc950, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 },
  section: { backgroundColor: Colors.white, marginBottom: 16, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.zinc500, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 14 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.zinc100, alignItems: 'center' },
  langBtnActive: { backgroundColor: Colors.green },
  langBtnText: { fontSize: 14, fontWeight: '600', color: Colors.zinc800 },
  langBtnTextActive: { color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  rowLeft: { flex: 1, marginRight: 16 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.zinc950 },
  rowSub: { fontSize: 12, color: Colors.zinc500, marginTop: 2 },
  rowValue: { fontSize: 15, color: Colors.zinc500 },
  logoutBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.zinc100, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.orange },
});
