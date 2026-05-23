import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { Colors } from '../../src/constants';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: unknown }) => {
        if (error) console.error('[callback] exchange failed', error);
        // Root layout's onAuthStateChange will handle redirect to (tabs)
      });
    } else {
      router.replace('/(auth)/login');
    }
  }, [code]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.greenDark }}>
      <ActivityIndicator color={Colors.white} size="large" />
    </View>
  );
}
