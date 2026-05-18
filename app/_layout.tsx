import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';
import { registerForPushNotifications, deliverPendingNotifications } from '../src/services/notifications';
import { Colors } from '../src/constants';

type AppState = 'loading' | 'onboarding' | 'auth' | 'app';

export default function RootLayout() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    if (appState === 'app') {
      registerForPushNotifications().catch((e) =>
        console.warn('[pushToken]', e)
      );
    }
  }, [appState]);

  useEffect(() => {
    async function init() {
      const done = await AsyncStorage.getItem('onboarding_done');
      if (!done) {
        setAppState('onboarding');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      setAppState(session ? 'app' : 'auth');
      if (session) deliverPendingNotifications().catch(console.error);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setAppState((prev) => {
        if (prev === 'onboarding') return prev;
        return session ? 'app' : 'auth';
      });
      if (session) deliverPendingNotifications().catch(console.error);
    });

    return () => subscription.unsubscribe();
  }, []);

  // safety timeout — unblock loading if getSession hangs
  useEffect(() => {
    const t = setTimeout(() => setAppState((p) => p === 'loading' ? 'auth' : p), 5000);
    return () => clearTimeout(t);
  }, []);

  if (appState === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>🚩</Text>
        <Text style={styles.splashWord}>FlagOn</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {appState === 'onboarding' && <Stack.Screen name="onboarding" />}
      {appState === 'app' && <Stack.Screen name="(tabs)" />}
      {appState === 'auth' && <Stack.Screen name="(auth)" />}
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashIcon: { fontSize: 52 },
  splashWord: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
});
