import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

const ACTION_ICONS: Record<string, string> = {
  created: 'add-circle',
  updated: 'create',
  deleted: 'trash',
  quick_update: 'flash',
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  planted: 'leaf',
  harvested: 'checkmark-circle',
  role_change: 'shield',
};

const ACTION_COLORS: Record<string, string> = {
  created: COLORS.secondary,
  updated: COLORS.primary,
  deleted: COLORS.accent,
  quick_update: '#6B8E23',
  deposit: COLORS.secondary,
  withdrawal: COLORS.accent,
  planted: COLORS.secondary,
  harvested: '#6B8E23',
  role_change: '#6B5B95',
};

export default function AuditScreen() {
  const { currentOrg } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;
    try { setLogs(await api.get(`/organizations/${currentOrg.id}/audit-log`)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  const renderLog = ({ item }: { item: any }) => {
    const iconName = ACTION_ICONS[item.action] || 'ellipse';
    const iconColor = ACTION_COLORS[item.action] || COLORS.textSecondary;
    const date = new Date(item.created_at);

    return (
      <View testID={`audit-${item.id}`} style={styles.logItem}>
        <View style={[styles.logIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName as any} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.logDetails}>{item.details}</Text>
          <View style={styles.logMeta}>
            <Text style={styles.logUser}>{item.username}</Text>
            <View style={styles.logBadge}><Text style={styles.logBadgeText}>{item.entity_type}</Text></View>
            <Text style={styles.logTime}>{date.toLocaleDateString()} {date.toLocaleTimeString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Audit Log</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderLog}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No activity recorded yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  list: { padding: 20, paddingTop: 8 },
  logItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logDetails: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  logUser: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  logBadge: { backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2 },
  logBadgeText: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  logTime: { fontSize: 11, color: COLORS.mutedForeground },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
});
