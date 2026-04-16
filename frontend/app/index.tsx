import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { token, currentOrg, loading: authLoading } = useAuth();
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'discord' | 'email'>('discord');
  const [isRegister, setIsRegister] = useState(false);
  const [discordName, setDiscordName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
                <Text style={styles.formLabel}>DISCORD DISPLAY NAME</Text>
                <TextInput testID="discord-name-input" style={styles.input} placeholder="e.g. Sadie Adler" placeholderTextColor={COLORS.mutedForeground} value={discordName} onChangeText={setDiscordName} autoCapitalize="none" />
                <Text style={styles.hint}>Mock login - enter any name to continue</Text>
                <TouchableOpacity testID="discord-login-btn" style={styles.primaryBtn} onPress={handleDiscordLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.primaryForeground} /> : (
                    <><Ionicons name="logo-discord" size={20} color={COLORS.primaryForeground} /><Text style={styles.primaryBtnText}>Continue with Discord</Text></>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 40 },
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
  footer: { textAlign: 'center', color: COLORS.mutedForeground, fontSize: 12, marginTop: 32, lineHeight: 18 },
});
