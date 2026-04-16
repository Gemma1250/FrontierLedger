import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STATUS_COLORS } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';

export default function CropsScreen() {
  const { currentOrg } = useAuth();
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', location: '', notes: '', estimated_harvest_days: '7' });

  const fetchCrops = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await api.get(`/organizations/${currentOrg.id}/crops`);
      setCrops(data);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchCrops(); }, [fetchCrops]);
  const onRefresh = () => { setRefreshing(true); fetchCrops(); };

  const handlePlant = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Enter crop name'); return; }
    try {
      await api.post(`/organizations/${currentOrg.id}/crops`, { ...form, estimated_harvest_days: parseInt(form.estimated_harvest_days) || 7 });
      setShowAdd(false);
      setForm({ name: '', location: '', notes: '', estimated_harvest_days: '7' });
      fetchCrops();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleHarvest = async (crop: any) => {
    Alert.alert('Harvest Crop', `Mark ${crop.name} as harvested?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Harvest', onPress: async () => {
        try { await api.post(`/organizations/${currentOrg.id}/crops/${crop.id}/harvest`, {}); fetchCrops(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleDelete = (crop: any) => {
    Alert.alert('Delete Crop', `Remove ${crop.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.del(`/organizations/${currentOrg.id}/crops/${crop.id}`); fetchCrops(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = filter === 'all' ? crops : crops.filter(c => c.status === filter);
  const filters = ['all', 'planted', 'growing', 'ready', 'harvested', 'spoiled'];

  const renderCrop = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || COLORS.textSecondary;
    const daysLeft = item.estimated_harvest ? Math.max(0, Math.ceil((new Date(item.estimated_harvest).getTime() - Date.now()) / 86400000)) : 0;

    return (
      <View testID={`crop-${item.id}`} style={styles.cropCard}>
        <View style={styles.cropHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropName}>{item.name}</Text>
            <View style={styles.cropMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
              {item.location ? <Text style={styles.metaText}>{item.location}</Text> : null}
            </View>
          </View>
          <TouchableOpacity testID={`delete-crop-${item.id}`} onPress={() => handleDelete(item)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
        <View style={styles.cropDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="person" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{item.planted_by}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{new Date(item.planted_at).toLocaleDateString()}</Text>
          </View>
          {item.status !== 'harvested' && item.status !== 'spoiled' && (
            <View style={styles.detailItem}>
              <Ionicons name="time" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{daysLeft}d left</Text>
            </View>
          )}
        </View>
        {(item.status === 'planted' || item.status === 'growing' || item.status === 'ready') && (
          <TouchableOpacity testID={`harvest-btn-${item.id}`} style={[styles.harvestBtn, item.status === 'ready' && styles.harvestBtnReady]} onPress={() => handleHarvest(item)}>
            <Ionicons name="leaf" size={16} color={item.status === 'ready' ? COLORS.primaryForeground : COLORS.secondary} />
            <Text style={[styles.harvestBtnText, item.status === 'ready' && { color: COLORS.primaryForeground }]}>
              {item.status === 'ready' ? 'Harvest Now!' : 'Mark Harvested'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crops</Text>
        <TouchableOpacity testID="add-crop-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.primaryForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f} testID={`filter-${f}`} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCrop}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No crops found. Plant something!</Text>}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plant New Crop</Text>
              <TouchableOpacity testID="close-crop-modal" onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>CROP NAME</Text>
            <TextInput testID="crop-name-input" style={styles.input} placeholder="e.g. Corn" placeholderTextColor={COLORS.mutedForeground} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
            <Text style={styles.formLabel}>LOCATION</Text>
            <TextInput testID="crop-location-input" style={styles.input} placeholder="e.g. North Field Plot #3" placeholderTextColor={COLORS.mutedForeground} value={form.location} onChangeText={v => setForm({ ...form, location: v })} />
            <Text style={styles.formLabel}>ESTIMATED HARVEST (DAYS)</Text>
            <TextInput testID="crop-days-input" style={styles.input} placeholder="7" placeholderTextColor={COLORS.mutedForeground} value={form.estimated_harvest_days} onChangeText={v => setForm({ ...form, estimated_harvest_days: v })} keyboardType="numeric" />
            <Text style={styles.formLabel}>NOTES</Text>
            <TextInput testID="crop-notes-input" style={[styles.input, { height: 60 }]} placeholder="Optional notes..." placeholderTextColor={COLORS.mutedForeground} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline />
            <TouchableOpacity testID="submit-crop-btn" style={styles.submitBtn} onPress={handlePlant}><Text style={styles.submitText}>Plant Crop</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  filterScroll: { maxHeight: 40, marginBottom: 4 },
  filterRow: { paddingHorizontal: 20, gap: 6 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.primaryForeground },
  list: { padding: 20, paddingTop: 8 },
  cropCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 10 },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cropName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cropMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  metaText: { fontSize: 12, color: COLORS.mutedForeground },
  cropDetails: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: COLORS.textSecondary },
  harvestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.secondary },
  harvestBtnReady: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  harvestBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  submitBtn: { backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
