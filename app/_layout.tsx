import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../src/services/supabase';
import { deliverPendingNotifications } from '../src/services/notifications';
import { Colors } from '../src/constants';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) deliverPendingNotifications().catch(console.error);
    }).catch((e) => {
      console.error('[getSession]', e);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) deliverPendingNotifications().catch(console.error);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // safety timeout — if getSession hangs, unblock after 5s
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>🚩</Text>
        <Text style={styles.splashWord}>FlagOn</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
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
  splashWord: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
});
