import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
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
      if (!credential.identityToken) throw new Error('No identity token');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[Apple Sign-In]', e);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.flagIcon}>🚩</Text>
        <Text style={styles.wordmark}>FlagOn</Text>
        <Text style={styles.tagline}>Plant your flag. Own the summit.</Text>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.welcome}>Get started</Text>
        <Text style={styles.subtitle}>Sign in to claim summits with your crew</Text>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={styles.appleBtn}
            onPress={signInWithApple}
          />
        )}

        <TouchableOpacity
          style={[styles.googleBtn, loading === 'google' && { opacity: 0.6 }]}
          onPress={signInWithGoogle}
          disabled={loading !== null}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#1F2421" />
          ) : (
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.green,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  flagIcon: {
    fontSize: 52,
    marginBottom: 4,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.4,
    lineHeight: 48,
  },
  tagline: {
    fontSize: 15,
    color: Colors.white,
    opacity: 0.72,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E0D5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2421',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.zinc500,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  appleBtn: {
    height: 52,
    borderRadius: 14,
  },
  googleBtn: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: '#1F2421',
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  legal: {
    fontSize: 11.5,
    color: Colors.zinc500,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
});
