import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';

const SIDEBAR_W = 250;

const TAB_ITEMS = [
  { key: 'dashboard', icon: 'grid', label: 'Dashboard' },
  { key: 'inventory', icon: 'cube', label: 'Inventory' },
  { key: 'treasury', icon: 'cash', label: 'Treasury' },
  { key: 'crops', icon: 'leaf', label: 'Crops' },
  { key: 'more', icon: 'ellipsis-horizontal', label: 'More' },
];

const EXTRA_NAV = [
  { icon: 'home', label: 'Assets', route: '/assets-list' },
  { icon: 'checkbox', label: 'Tasks', route: '/tasks' },
  { icon: 'document-text', label: 'Audit Log', route: '/audit' },
  { icon: 'shield', label: 'Roles', route: '/roles' },
];

const PREMIUM_NAV = [
  { icon: 'star', label: 'Premium', route: '/premium', color: '#FFD700' },
  { icon: 'analytics', label: 'Analytics', route: '/analytics', color: '#6B8E23' },
];

function DesktopSidebar({ state, navigation }: any) {
  const router = useRouter();
  const { user, currentOrg, logout, clearOrg } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[sb.root, { paddingTop: insets.top }]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={sb.logo}>
          <Ionicons name="book" size={28} color={COLORS.primary} />
          <View>
            <Text style={sb.logoTitle}>FRONTIER</Text>
            <Text style={sb.logoSub}>LEDGER</Text>
          </View>
        </View>
        {currentOrg && <Text style={sb.orgName}>{currentOrg.name}</Text>}

        <View style={sb.section}>
          {TAB_ITEMS.slice(0, 4).map((item, idx) => {
            const active = state.index === idx;
            return (
              <TouchableOpacity testID={`sidebar-${item.key}`} key={item.key} onPress={() => navigation.navigate(item.key)}
                style={[sb.navItem, active && sb.navItemActive]}>
                <Ionicons name={item.icon as any} size={20} color={active ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[sb.navLabel, active && sb.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={sb.divider} />
        <Text style={sb.sectionLabel}>MANAGE</Text>
        {EXTRA_NAV.map(item => (
          <TouchableOpacity testID={`sidebar-${item.route}`} key={item.route} onPress={() => router.push(item.route as any)} style={sb.navItem}>
            <Ionicons name={item.icon as any} size={18} color={COLORS.textSecondary} />
            <Text style={sb.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={sb.divider} />
        <Text style={sb.sectionLabel}>PREMIUM</Text>
        {PREMIUM_NAV.map(item => (
          <TouchableOpacity testID={`sidebar-${item.route}`} key={item.route} onPress={() => router.push(item.route as any)} style={sb.navItem}>
            <Ionicons name={item.icon as any} size={18} color={item.color} />
            <Text style={sb.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={sb.footer}>
        <View style={sb.userRow}>
          <View style={sb.avatar}><Text style={sb.avatarText}>{user?.username?.charAt(0)?.toUpperCase()}</Text></View>
          <Text style={sb.userName} numberOfLines={1}>{user?.username}</Text>
        </View>
        <TouchableOpacity testID="sidebar-switch-org" onPress={() => Alert.alert('Switch Organization', 'Go back to organization selector?', [{ text: 'Cancel' }, { text: 'Switch', onPress: async () => { await clearOrg(); router.replace('/org-select'); } }])} style={sb.footerBtn}>
          <Ionicons name="swap-horizontal" size={15} color={COLORS.textSecondary} />
          <Text style={sb.footerBtnText}>Switch Org</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="sidebar-logout" onPress={() => Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }])} style={sb.footerBtn}>
          <Ionicons name="log-out" size={15} color={COLORS.accent} />
          <Text style={[sb.footerBtnText, { color: COLORS.accent }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MobileTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[mb.bar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route: any, idx: number) => {
        const tab = TAB_ITEMS[idx];
        if (!tab) return null;
        const active = state.index === idx;
        return (
          <TouchableOpacity testID={`tab-${tab.key}`} key={route.key} onPress={() => navigation.navigate(route.name)} style={mb.tab}>
            <Ionicons name={tab.icon as any} size={22} color={active ? COLORS.primary : COLORS.mutedForeground} />
            <Text style={[mb.label, active && mb.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <Tabs
      tabBar={(props) => isDesktop ? <DesktopSidebar {...props} /> : <MobileTabBar {...props} />}
      sceneContainerStyle={isDesktop ? { marginLeft: SIDEBAR_W, backgroundColor: COLORS.background } : { backgroundColor: COLORS.background }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="treasury" />
      <Tabs.Screen name="crops" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

const sb = StyleSheet.create({
  root: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_W, backgroundColor: COLORS.surface, borderRightWidth: 1, borderRightColor: COLORS.border, zIndex: 10 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  logoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, letterSpacing: 3 },
  logoSub: { fontSize: 11, fontWeight: '300', color: COLORS.textPrimary, letterSpacing: 5, marginTop: -2 },
  orgName: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  section: { paddingVertical: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.mutedForeground, paddingHorizontal: 20, paddingVertical: 6, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginVertical: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
  navItemActive: { backgroundColor: COLORS.primary + '15', borderRightWidth: 3, borderRightColor: COLORS.primary },
  navLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  navLabelActive: { fontWeight: '700', color: COLORS.primary },
  footer: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: COLORS.primaryForeground },
  userName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  footerBtnText: { fontSize: 12, color: COLORS.textSecondary },
});

const mb = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 10, fontWeight: '600', color: COLORS.mutedForeground, marginTop: 2, letterSpacing: 0.5 },
  labelActive: { color: COLORS.primary },
});
