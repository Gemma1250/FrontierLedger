import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function OrgSelectScreen() {
  const { token, currentOrg, selectOrg, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchOrgs(); }, []);

  if (authLoading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!token) return <Redirect href="/" />;
  if (currentOrg) return <Redirect href="/(tabs)/dashboard" />;

  const fetchOrgs = async () => {
    try { const data = await api.get('/organizations'); setOrgs(data); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!orgName.trim()) { Alert.alert('Error', 'Enter a name'); return; }
    setSubmitting(true);
    try {
      const org = await api.post('/organizations', { name: orgName.trim(), description: orgDesc.trim() });
      await selectOrg(org);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { Alert.alert('Error', 'Enter an invite code'); return; }
    setSubmitting(true);
    try {
      const org = await api.post('/organizations/join', { invite_code: inviteCode.trim() });
      await selectOrg(org);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  const handleSelectOrg = async (org: any) => {
    await selectOrg(org);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Choose Your Camp</Text>
            <Text style={styles.headerSub}>Select or create an organization</Text>
          </View>
          <TouchableOpacity testID="logout-btn" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={orgs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No organizations yet. Create one or join with an invite code.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`org-item-${item.id}`} style={styles.orgCard} onPress={() => handleSelectOrg(item)}>
                <View style={styles.orgIcon}><Text style={styles.orgIconText}>{item.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgName}>{item.name}</Text>
                  <Text style={styles.orgMeta}>{item.members?.length || 0} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <View style={styles.actions}>
                {!showCreate && !showJoin && (
                  <>
                    <TouchableOpacity testID="create-org-btn" style={styles.actionBtn} onPress={() => { setShowCreate(true); setShowJoin(false); }}>
                      <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                      <Text style={styles.actionText}>Create New Organization</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="join-org-btn" style={styles.actionBtn} onPress={() => { setShowJoin(true); setShowCreate(false); }}>
                      <Ionicons name="enter" size={22} color={COLORS.primary} />
                      <Text style={styles.actionText}>Join with Invite Code</Text>
                    </TouchableOpacity>
                  </>
                )}
                {showCreate && (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Create Organization</Text>
                    <Text style={styles.formLabel}>NAME</Text>
                    <TextInput testID="org-name-input" style={styles.input} placeholder="e.g. Moonrest Ranch" placeholderTextColor={COLORS.mutedForeground} value={orgName} onChangeText={setOrgName} />
                    <Text style={styles.formLabel}>DESCRIPTION</Text>
                    <TextInput testID="org-desc-input" style={styles.input} placeholder="Optional description..." placeholderTextColor={COLORS.mutedForeground} value={orgDesc} onChangeText={setOrgDesc} multiline />
                    <View style={styles.formRow}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity testID="create-org-submit" style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
                        {submitting ? <ActivityIndicator color={COLORS.primaryForeground} size="small" /> : <Text style={styles.submitText}>Create</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {showJoin && (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Join Organization</Text>
                    <Text style={styles.formLabel}>INVITE CODE</Text>
                    <TextInput testID="invite-code-input" style={styles.input} placeholder="e.g. AB12CD34" placeholderTextColor={COLORS.mutedForeground} value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
                    <View style={styles.formRow}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoin(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity testID="join-org-submit" style={styles.submitBtn} onPress={handleJoin} disabled={submitting}>
                        {submitting ? <ActivityIndicator color={COLORS.primaryForeground} size="small" /> : <Text style={styles.submitText}>Join</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  list: { padding: 20, paddingTop: 8 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, fontSize: 14 },
  orgCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 16, marginBottom: 10 },
  orgIcon: { width: 48, height: 48, borderRadius: 4, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  orgIconText: { fontSize: 22, fontWeight: '800', color: COLORS.primaryForeground },
  orgName: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  orgMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  actions: { marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 4, padding: 16, marginBottom: 10 },
  actionText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  formCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 20, marginBottom: 10 },
  formTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  formRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 4, backgroundColor: COLORS.primary },
  submitText: { color: COLORS.primaryForeground, fontWeight: '700' },
});
