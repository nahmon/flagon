import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';
import { supabase } from '../src/services/supabase';
import { registerForPushNotifications, deliverPendingNotifications } from '../src/services/notifications';
import { Colors } from '../src/constants';

// Apply Open Sans globally — all Text/TextInput inherit this without per-screen changes
(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.style = { fontFamily: 'OpenSans_400Regular' };
(TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
(TextInput as any).defaultProps.style = { fontFamily: 'OpenSans_400Regular' };

type AppState = 'loading' | 'onboarding' | 'auth' | 'app';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold,
  });

  const [appState, setAppState] = useState<AppState>('loading');
  const appStateRef = useRef<AppState>('loading');
  appStateRef.current = appState;

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (appStateRef.current === 'app') {
        router.push('/(tabs)');
      }
    });
    return () => sub.remove();
  }, []);

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

  useEffect(() => {
    const t = setTimeout(() => setAppState((p) => p === 'loading' ? 'auth' : p), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded || appState === 'loading') {
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
  splashWord: { fontSize: 36, fontFamily: 'OpenSans_800ExtraBold', color: Colors.white, letterSpacing: -1 },
});
