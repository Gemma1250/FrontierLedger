import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, CATEGORIES } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function AssetsScreen() {
  const { currentOrg } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'wagons', assigned_to: '', condition: 'good', value: '', location: '', notes: '' });

  const fetchAssets = useCallback(async () => {
    if (!currentOrg) return;
    try { setAssets(await api.get(`/organizations/${currentOrg.id}/assets`)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  const onRefresh = () => { setRefreshing(true); fetchAssets(); };

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Enter asset name'); return; }
    try {
      await api.post(`/organizations/${currentOrg.id}/assets`, { ...form, value: parseFloat(form.value) || 0 });
      setShowAdd(false);
      setForm({ name: '', category: 'wagons', assigned_to: '', condition: 'good', value: '', location: '', notes: '' });
      fetchAssets();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (asset: any) => {
    Alert.alert('Delete Asset', `Remove ${asset.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.del(`/organizations/${currentOrg.id}/assets/${asset.id}`); fetchAssets(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const conditions = ['excellent', 'good', 'fair', 'poor', 'damaged'];
  const conditionColor: Record<string, string> = { excellent: '#6B8E23', good: COLORS.secondary, fair: COLORS.warning, poor: COLORS.accent, damaged: '#8B0000' };

  const renderAsset = ({ item }: { item: any }) => (
    <View testID={`asset-${item.id}`} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
            <View style={[styles.conditionBadge, { backgroundColor: (conditionColor[item.condition] || COLORS.textSecondary) + '30' }]}>
              <Text style={[styles.conditionText, { color: conditionColor[item.condition] || COLORS.textSecondary }]}>{item.condition}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity testID={`delete-asset-${item.id}`} onPress={() => handleDelete(item)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardDetails}>
        {item.value > 0 && <View style={styles.detailItem}><Ionicons name="cash" size={14} color={COLORS.primary} /><Text style={styles.detailText}>${item.value}</Text></View>}
        {item.assigned_to ? <View style={styles.detailItem}><Ionicons name="person" size={14} color={COLORS.textSecondary} /><Text style={styles.detailText}>{item.assigned_to}</Text></View> : null}
        {item.location ? <View style={styles.detailItem}><Ionicons name="location" size={14} color={COLORS.textSecondary} /><Text style={styles.detailText}>{item.location}</Text></View> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Assets Registry</Text>
        <TouchableOpacity testID="add-asset-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}><Ionicons name="add" size={22} color={COLORS.primaryForeground} /></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={assets} keyExtractor={item => item.id} renderItem={renderAsset}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.emptyText}>No assets registered.</Text>} />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Asset</Text>
              <TouchableOpacity testID="close-asset-modal" onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.formLabel}>NAME</Text>
              <TextInput testID="asset-name-input" style={styles.input} placeholder="e.g. Covered Wagon" placeholderTextColor={COLORS.mutedForeground} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
              <Text style={styles.formLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 6 }}>
                {CATEGORIES.assets.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => setForm({ ...form, category: c })}>
                    <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View></ScrollView>
              <Text style={styles.formLabel}>CONDITION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 6 }}>
                {conditions.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, form.condition === c && styles.chipActive]} onPress={() => setForm({ ...form, condition: c })}>
                    <Text style={[styles.chipText, form.condition === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View></ScrollView>
              <Text style={styles.formLabel}>VALUE ($)</Text>
              <TextInput testID="asset-value-input" style={styles.input} placeholder="0" placeholderTextColor={COLORS.mutedForeground} value={form.value} onChangeText={v => setForm({ ...form, value: v })} keyboardType="decimal-pad" />
              <Text style={styles.formLabel}>ASSIGNED TO</Text>
              <TextInput testID="asset-assigned-input" style={styles.input} placeholder="Member name" placeholderTextColor={COLORS.mutedForeground} value={form.assigned_to} onChangeText={v => setForm({ ...form, assigned_to: v })} />
              <Text style={styles.formLabel}>LOCATION</Text>
              <TextInput testID="asset-location-input" style={styles.input} placeholder="e.g. Main Camp" placeholderTextColor={COLORS.mutedForeground} value={form.location} onChangeText={v => setForm({ ...form, location: v })} />
              <TouchableOpacity testID="submit-asset-btn" style={styles.submitBtn} onPress={handleAdd}><Text style={styles.submitText}>Register Asset</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingTop: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: { backgroundColor: COLORS.background, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  conditionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  conditionText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardDetails: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: COLORS.textSecondary },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: COLORS.primaryForeground },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryForeground },
});
