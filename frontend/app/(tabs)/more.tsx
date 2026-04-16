import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function MoreScreen() {
  const { user, currentOrg, logout, clearOrg } = useAuth();
  const router = useRouter();

  const menuItems = [
    { icon: 'star', label: 'Premium', desc: 'Upgrade for analytics, exports & more', route: '/premium', color: '#FFD700' },
    { icon: 'analytics', label: 'Analytics', desc: 'Charts, trends & insights (Premium)', route: '/analytics', color: '#6B8E23' },
    { icon: 'home', label: 'Assets Registry', desc: 'Wagons, horses, buildings & more', route: '/assets-list', color: '#8B7355' },
    { icon: 'checkbox', label: 'Task Board', desc: 'Duties, assignments & chores', route: '/tasks', color: COLORS.secondary },
    { icon: 'document-text', label: 'Audit Log', desc: 'Full history of every change', route: '/audit', color: COLORS.primary },
    { icon: 'shield', label: 'Roles & Permissions', desc: 'Manage member access levels', route: '/roles', color: '#6B5B95' },
  ];

  const handleSwitchOrg = () => {
    Alert.alert('Switch Organization', 'Go back to organization selector?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch', onPress: async () => { await clearOrg(); router.replace('/org-select'); } },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.username}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          {user?.discord_username ? (
            <View style={styles.discordBadge}>
              <Ionicons name="logo-discord" size={14} color="#7289DA" />
              <Text style={styles.discordText}>Connected</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.orgCard}>
          <View style={styles.orgInfo}>
            <Text style={styles.orgLabel}>CURRENT ORGANIZATION</Text>
            <Text style={styles.orgName}>{currentOrg?.name}</Text>
            {currentOrg?.invite_code && (
              <View style={styles.inviteRow}>
                <Text style={styles.inviteLabel}>Invite Code:</Text>
                <Text style={styles.inviteCode}>{currentOrg.invite_code}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} testID={`menu-${item.route}`} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity testID="discord-settings-btn" style={styles.actionItem}>
            <Ionicons name="logo-discord" size={20} color="#7289DA" />
            <Text style={styles.actionText}>Discord Settings</Text>
            <View style={styles.mockBadge}><Text style={styles.mockText}>MOCK</Text></View>
          </TouchableOpacity>

          <TouchableOpacity testID="switch-org-btn" style={styles.actionItem} onPress={handleSwitchOrg}>
            <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Switch Organization</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="logout-btn" style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={COLORS.accent} />
            <Text style={[styles.actionText, { color: COLORS.accent }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Frontier Ledger v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 16, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.primaryForeground },
  userName: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  discordBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7289DA20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discordText: { fontSize: 11, fontWeight: '600', color: '#7289DA' },
  orgCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 16, marginBottom: 16 },
  orgInfo: {},
  orgLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  orgName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  inviteLabel: { fontSize: 12, color: COLORS.textSecondary },
  inviteCode: { fontSize: 14, fontWeight: '700', color: COLORS.primary, letterSpacing: 2 },
  menuSection: { marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 16, marginBottom: 8 },
  menuIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  menuDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionsSection: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, marginBottom: 16 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  mockBadge: { backgroundColor: COLORS.warning + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  mockText: { fontSize: 10, fontWeight: '800', color: COLORS.warning, letterSpacing: 1 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.mutedForeground, marginTop: 8, marginBottom: 40 },
});
