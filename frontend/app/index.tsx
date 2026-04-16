import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { token, currentOrg, loading: authLoading } = useAuth();
  const { login } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ discord_token?: string; discord_error?: string }>();
  const [mode, setMode] = useState<'discord' | 'email'>('discord');
  const [isRegister, setIsRegister] = useState(false);
  const [discordName, setDiscordName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  // Handle Discord OAuth callback token from URL
  useEffect(() => {
    if (params.discord_token) {
      handleDiscordCallback(params.discord_token);
    } else if (params.discord_error) {
      Alert.alert('Discord Login Failed', `Error: ${params.discord_error}. Try again or use email login.`);
    }
  }, [params.discord_token, params.discord_error]);

  const handleDiscordCallback = async (callbackToken: string) => {
    setDiscordLoading(true);
    try {
      api.setToken(callbackToken);
      const user = await api.get('/auth/me');
      await login(callbackToken, user);
      // Clean up URL params
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
      router.replace('/org-select');
    } catch (e: any) {
      Alert.alert('Error', 'Discord authentication failed. Please try again.');
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleRealDiscordLogin = async () => {
    setLoading(true);
    try {
      const { url } = await api.get('/auth/discord/url');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  if (authLoading || discordLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {discordLoading && <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Authenticating with Discord...</Text>}
      </View>
    );
  }

  if (token && currentOrg) return <Redirect href="/(tabs)/dashboard" />;
  if (token) return <Redirect href="/org-select" />;

  const handleDiscordLogin = async () => {
    if (!discordName.trim()) { Alert.alert('Error', 'Enter a display name'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/mock-discord', { discord_username: discordName.trim() });
      await login(res.token, res.user);
      router.replace('/org-select');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert('Error', 'Fill in all fields'); return; }
    if (isRegister && !username.trim()) { Alert.alert('Error', 'Enter a username'); return; }
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { username: username.trim(), email: email.trim(), password } : { email: email.trim(), password };
      const res = await api.post(endpoint, body);
      await login(res.token, res.user);
      router.replace('/org-select');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <Ionicons name="book" size={48} color={COLORS.primary} />
            <Text style={styles.title}>FRONTIER</Text>
            <Text style={styles.titleAccent}>LEDGER</Text>
            <Text style={styles.subtitle}>Your digital camp book for RP groups</Text>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity testID="discord-tab-btn" style={[styles.tab, mode === 'discord' && styles.tabActive]} onPress={() => setMode('discord')}>
              <Ionicons name="logo-discord" size={18} color={mode === 'discord' ? COLORS.primaryForeground : COLORS.textSecondary} />
              <Text style={[styles.tabText, mode === 'discord' && styles.tabTextActive]}>Discord</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="email-tab-btn" style={[styles.tab, mode === 'email' && styles.tabActive]} onPress={() => setMode('email')}>
              <Ionicons name="mail" size={18} color={mode === 'email' ? COLORS.primaryForeground : COLORS.textSecondary} />
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            {mode === 'discord' ? (
              <>
                <TouchableOpacity testID="real-discord-login-btn" style={[styles.primaryBtn, { backgroundColor: '#5865F2' }]} onPress={handleRealDiscordLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="logo-discord" size={20} color="#fff" /><Text style={[styles.primaryBtnText, { color: '#fff' }]}>Login with Discord</Text></>
                  )}
                </TouchableOpacity>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or demo mode</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Text style={styles.formLabel}>QUICK DEMO LOGIN</Text>
                <TextInput testID="discord-name-input" style={styles.input} placeholder="Enter any display name" placeholderTextColor={COLORS.mutedForeground} value={discordName} onChangeText={setDiscordName} autoCapitalize="none" />
                <TouchableOpacity testID="discord-login-btn" style={[styles.primaryBtn, { backgroundColor: COLORS.surfaceHover }]} onPress={handleDiscordLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                    <Text style={[styles.primaryBtnText, { color: COLORS.primary }]}>Continue as Demo User</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {isRegister && (
                  <>
                    <Text style={styles.formLabel}>USERNAME</Text>
                    <TextInput testID="username-input" style={styles.input} placeholder="Your display name" placeholderTextColor={COLORS.mutedForeground} value={username} onChangeText={setUsername} />
                  </>
                )}
                <Text style={styles.formLabel}>EMAIL</Text>
                <TextInput testID="email-input" style={styles.input} placeholder="name@example.com" placeholderTextColor={COLORS.mutedForeground} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Text style={styles.formLabel}>PASSWORD</Text>
                <TextInput testID="password-input" style={styles.input} placeholder="Your password" placeholderTextColor={COLORS.mutedForeground} value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity testID="email-auth-btn" style={styles.primaryBtn} onPress={handleEmailAuth} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.primaryForeground} /> : <Text style={styles.primaryBtnText}>{isRegister ? 'Create Account' : 'Sign In'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity testID="toggle-auth-mode-btn" onPress={() => setIsRegister(!isRegister)} style={styles.toggleBtn}>
                  <Text style={styles.toggleText}>{isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footer}>Manage inventory, crops, finances & assets{'\n'}with Discord integration for your RP group</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 40, maxWidth: 480, alignSelf: 'center', width: '100%' },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.primary, letterSpacing: 6, marginTop: 16 },
  titleAccent: { fontSize: 28, fontWeight: '300', color: COLORS.textPrimary, letterSpacing: 12, marginTop: -4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primaryForeground },
  formCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 20 },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, fontSize: 16, color: COLORS.textPrimary },
  hint: { fontSize: 12, color: COLORS.mutedForeground, marginTop: 6, fontStyle: 'italic' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 4, marginTop: 20 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryForeground },
  toggleBtn: { marginTop: 16, alignItems: 'center' },
  toggleText: { color: COLORS.primary, fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: COLORS.mutedForeground },
  footer: { textAlign: 'center', color: COLORS.mutedForeground, fontSize: 12, marginTop: 32, lineHeight: 18 },
});
