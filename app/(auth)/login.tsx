import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../src/services/supabase';
import { Colors } from '../../src/constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const signInWithGoogle = async () => {
    setLoading('google');
    try {
      const redirectTo = makeRedirectUri({ scheme: 'flagon', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        if (code) await supabase.auth.exchangeCodeForSession(code);
      }
    } catch (e) {
      console.error('[Google OAuth]', e);
    } finally {
      setLoading(null);
    }
  };

  const signInWithApple = async () => {
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[Apple Sign In]', e);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>FlagOn</Text>
        <Text style={styles.tagline}>Plant your flag. Own the summit.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.welcome}>시작하기</Text>
        <Text style={styles.subtitle}>로그인하고 정상 경쟁을 시작하세요</Text>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appleBtn}
            onPress={signInWithApple}
            disabled={loading !== null}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.appleBtnText}> Apple로 계속하기</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={signInWithGoogle}
          disabled={loading !== null}
        >
          {loading === 'google' ? (
            <ActivityIndicator color={Colors.zinc950} />
          ) : (
            <Text style={styles.googleBtnText}>Google로 계속하기</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          계속하면 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.greenDark,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 24,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.zinc200,
    marginTop: 8,
    opacity: 0.8,
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.zinc950,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.zinc500,
    marginBottom: 8,
  },
  appleBtn: {
    height: 52,
    backgroundColor: Colors.zinc950,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  googleBtn: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.zinc200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: Colors.zinc950,
    fontSize: 16,
    fontWeight: '600',
  },
  legal: {
    fontSize: 11,
    color: Colors.zinc500,
    textAlign: 'center',
    marginTop: 4,
  },
});
