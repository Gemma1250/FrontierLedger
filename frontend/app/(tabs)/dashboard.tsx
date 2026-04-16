import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';

export default function DashboardScreen() {
  const { currentOrg, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await api.get(`/organizations/${currentOrg.id}/stats`);
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const statCards = stats ? [
    { icon: 'cube', label: 'Inventory Items', value: stats.inventory_count, color: COLORS.primary },
    { icon: 'cash', label: 'Treasury Balance', value: `$${stats.treasury_balance.toFixed(2)}`, color: '#6B8E23' },
    { icon: 'leaf', label: 'Active Crops', value: stats.active_crops, color: COLORS.secondary },
    { icon: 'alert-circle', label: 'Ready to Harvest', value: stats.ready_crops, color: COLORS.warning },
    { icon: 'home', label: 'Total Assets', value: stats.asset_count, color: '#8B7355' },
    { icon: 'checkbox', label: 'Pending Tasks', value: stats.pending_tasks, color: COLORS.accent },
  ] : [];

  const renderActivityItem = ({ item }: { item: any }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.activityText}>{item.details}</Text>
        <Text style={styles.activityMeta}>{item.username} · {new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stats?.recent_activity || []}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Welcome back, {user?.username}</Text>
                <Text style={styles.orgName}>{currentOrg?.name}</Text>
              </View>
              <View style={styles.memberBadge}>
                <Ionicons name="people" size={14} color={COLORS.primary} />
                <Text style={styles.memberCount}>{stats?.member_count || 0}</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              {statCards.map((card, i) => (
                <View key={i} testID={`stat-card-${i}`} style={styles.statCard}>
                  <Ionicons name={card.icon as any} size={24} color={card.color} />
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
        }
        renderItem={renderActivityItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No recent activity. Start adding items!</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  orgName: { fontSize: 22, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  memberCount: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  statCard: { width: '31%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, letterSpacing: 1 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  activityText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  activityMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20, fontSize: 14 },
});
