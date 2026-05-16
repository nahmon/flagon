import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/services/supabase';

type AppState = 'loading' | 'onboarding' | 'auth' | 'app';

export default function RootLayout() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    async function init() {
      const done = await AsyncStorage.getItem('onboarding_done');
      if (!done) {
        setAppState('onboarding');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setAppState(session ? 'app' : 'auth');
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setAppState((prev) => {
        if (prev === 'onboarding') return prev;
        return session ? 'app' : 'auth';
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  if (appState === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {appState === 'onboarding' && (
        <Stack.Screen name="onboarding" />
      )}
      {appState === 'app' && (
        <Stack.Screen name="(tabs)" />
      )}
      {appState === 'auth' && (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}
