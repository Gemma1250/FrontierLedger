import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

function BarChart({ data, maxVal }: { data: { label: string; value: number; color?: string }[]; maxVal: number }) {
  return (
    <View style={bcStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={bcStyles.row}>
          <Text style={bcStyles.label} numberOfLines={1}>{d.label}</Text>
          <View style={bcStyles.barBg}>
            <View style={[bcStyles.bar, { width: `${Math.max(2, (d.value / (maxVal || 1)) * 100)}%`, backgroundColor: d.color || COLORS.primary }]} />
          </View>
          <Text style={bcStyles.value}>{typeof d.value === 'number' && d.value % 1 !== 0 ? `$${d.value.toFixed(0)}` : d.value}</Text>
        </View>
      ))}
    </View>
  );
}
const bcStyles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 80, fontSize: 12, color: COLORS.textSecondary },
  barBg: { flex: 1, height: 20, backgroundColor: COLORS.background, borderRadius: 2, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 2 },
  value: { width: 50, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
});

export default function AnalyticsScreen() {
  const { currentOrg } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'inventory' | 'treasury' | 'crops'>('inventory');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    try { setData(await api.get(`/organizations/${currentOrg.id}/analytics/${tab}`)); }
    catch (e: any) {
      if (e.message?.includes('Premium')) Alert.alert('Premium Required', 'Analytics is a premium feature. Upgrade to access.');
      else Alert.alert('Error', e.message);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg, tab]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const tabs = ['inventory', 'treasury', 'crops'] as const;

  const renderInventory = () => {
    if (!data) return null;
    const catData = Object.entries(data.by_category || {}).map(([k, v]) => ({ label: k, value: v as number, color: COLORS.primary }));
    const maxCat = Math.max(...catData.map(d => d.value), 1);
    return (
      <View>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{data.total_items}</Text><Text style={styles.statLabel}>Items</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{data.total_quantity}</Text><Text style={styles.statLabel}>Total Qty</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, { color: COLORS.accent }]}>{data.low_stock?.length || 0}</Text><Text style={styles.statLabel}>Low Stock</Text></View>
        </View>
        <Text style={styles.chartTitle}>By Category</Text>
        <View style={styles.chartCard}><BarChart data={catData} maxVal={maxCat} /></View>
        {data.top_items?.length > 0 && (
          <>
            <Text style={styles.chartTitle}>Top Items</Text>
            <View style={styles.chartCard}>
              <BarChart data={data.top_items.map((i: any) => ({ label: i.name, value: i.quantity, color: '#6B8E23' }))} maxVal={data.top_items[0]?.quantity || 1} />
            </View>
          </>
        )}
        {data.low_stock?.length > 0 && (
          <>
            <Text style={styles.chartTitle}>Low Stock Alerts</Text>
            {data.low_stock.map((i: any, idx: number) => (
              <View key={idx} style={styles.alertRow}>
                <Ionicons name="warning" size={16} color={COLORS.accent} />
                <Text style={styles.alertText}>{i.name}: {i.quantity} remaining</Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderTreasury = () => {
    if (!data) return null;
    const catData = Object.entries(data.by_category || {}).map(([k, v]) => ({ label: k, value: Math.abs(v as number), color: (v as number) >= 0 ? COLORS.secondary : COLORS.accent }));
    const maxCat = Math.max(...catData.map(d => d.value), 1);
    const dailyData = Object.entries(data.daily_breakdown || {}).slice(-7).map(([k, v]: any) => ({ label: k.slice(5), value: v.deposits - v.withdrawals, color: (v.deposits - v.withdrawals) >= 0 ? '#6B8E23' : COLORS.accent }));
    const maxDaily = Math.max(...dailyData.map(d => Math.abs(d.value)), 1);
    return (
      <View>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={[styles.statValue, { color: '#6B8E23' }]}>${data.total_income?.toFixed(0)}</Text><Text style={styles.statLabel}>Income</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, { color: COLORS.accent }]}>${data.total_expenses?.toFixed(0)}</Text><Text style={styles.statLabel}>Expenses</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>${data.balance?.toFixed(0)}</Text><Text style={styles.statLabel}>Balance</Text></View>
        </View>
        <Text style={styles.chartTitle}>By Category</Text>
        <View style={styles.chartCard}><BarChart data={catData} maxVal={maxCat} /></View>
        {dailyData.length > 0 && (
          <><Text style={styles.chartTitle}>Daily Net (Last 7 Days)</Text>
          <View style={styles.chartCard}><BarChart data={dailyData} maxVal={maxDaily} /></View></>
        )}
        <View style={styles.infoRow}><Ionicons name="document-text" size={14} color={COLORS.textSecondary} /><Text style={styles.infoText}>{data.transaction_count} total transactions</Text></View>
      </View>
    );
  };

  const renderCrops = () => {
    if (!data) return null;
    const statusData = Object.entries(data.by_status || {}).map(([k, v]) => ({ label: k, value: v as number, color: k === 'harvested' ? '#6B8E23' : k === 'planted' ? COLORS.primary : k === 'spoiled' ? COLORS.accent : COLORS.secondary }));
    const maxStatus = Math.max(...statusData.map(d => d.value), 1);
    const cropData = Object.entries(data.by_crop_type || {}).map(([k, v]: any) => ({ label: k, value: v.planted, color: COLORS.primary }));
    const maxCrop = Math.max(...cropData.map(d => d.value), 1);
    return (
      <View>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{data.total_crops}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, { color: COLORS.secondary }]}>{data.active_count}</Text><Text style={styles.statLabel}>Active</Text></View>
          <View style={styles.statBox}><Text style={[styles.statValue, { color: '#6B8E23' }]}>{data.harvested_count}</Text><Text style={styles.statLabel}>Harvested</Text></View>
        </View>
        <Text style={styles.chartTitle}>By Status</Text>
        <View style={styles.chartCard}><BarChart data={statusData} maxVal={maxStatus} /></View>
        {cropData.length > 0 && (
          <><Text style={styles.chartTitle}>By Crop Type</Text>
          <View style={styles.chartCard}><BarChart data={cropData} maxVal={maxCrop} /></View></>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.premiumBadge}><Ionicons name="star" size={14} color="#FFD700" /><Text style={styles.premiumText}>PRO</Text></View>
      </View>
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t} testID={`analytics-tab-${t}`} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
          tab === 'inventory' ? renderInventory() : tab === 'treasury' ? renderTreasury() : renderCrops()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  premiumText: { fontSize: 11, fontWeight: '800', color: '#FFD700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  tabTextActive: { color: COLORS.primaryForeground },
  content: { padding: 16, paddingBottom: 40 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, letterSpacing: 0.5 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  chartCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent + '15', padding: 10, borderRadius: 4, marginBottom: 4 },
  alertText: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
});
