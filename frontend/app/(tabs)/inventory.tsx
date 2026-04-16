import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';

export default function InventoryScreen() {
  const { currentOrg } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [form, setForm] = useState({ name: '', category: 'general', quantity: '', storage_location: '', notes: '' });

  const fetchItems = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await api.get(`/organizations/${currentOrg.id}/inventory`);
      setItems(data);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onRefresh = () => { setRefreshing(true); fetchItems(); };

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Enter item name'); return; }
    try {
      await api.post(`/organizations/${currentOrg.id}/inventory`, { ...form, quantity: parseInt(form.quantity) || 0 });
      setShowAdd(false);
      setForm({ name: '', category: 'general', quantity: '', storage_location: '', notes: '' });
      fetchItems();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleQuickUpdate = async (item: any, amount: number) => {
    try {
      await api.post(`/organizations/${currentOrg.id}/inventory/${item.id}/quick-update`, { amount });
      fetchItems();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete Item', `Remove ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.del(`/organizations/${currentOrg.id}/inventory/${item.id}`); fetchItems(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'all' || i.category === selectedCat;
    return matchSearch && matchCat;
  });

  const renderItem = ({ item }: { item: any }) => (
    <View testID={`inventory-item-${item.id}`} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
            {item.storage_location ? <Text style={styles.metaText}>{item.storage_location}</Text> : null}
          </View>
        </View>
        <TouchableOpacity testID={`delete-item-${item.id}`} onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
      <View style={styles.itemFooter}>
        <TouchableOpacity testID={`minus-btn-${item.id}`} style={styles.qtyBtn} onPress={() => handleQuickUpdate(item, -1)}>
          <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity testID={`minus5-btn-${item.id}`} style={styles.qtyBtn} onPress={() => handleQuickUpdate(item, -5)}>
          <Text style={styles.qtyBtnText}>-5</Text>
        </TouchableOpacity>
        <View style={styles.qtyDisplay}>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
        </View>
        <TouchableOpacity testID={`plus5-btn-${item.id}`} style={styles.qtyBtn} onPress={() => handleQuickUpdate(item, 5)}>
          <Text style={styles.qtyBtnText}>+5</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`plus-btn-${item.id}`} style={styles.qtyBtn} onPress={() => handleQuickUpdate(item, 1)}>
          <Ionicons name="add" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      {item.last_updated_by && <Text style={styles.updatedBy}>Last updated by {item.last_updated_by}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={isDesktop ? [] : ['top']}>
      <View style={isDesktop ? { maxWidth: 1100, alignSelf: 'center', width: '100%', paddingHorizontal: 32, flex: 1, paddingTop: 16 } : { flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity testID="add-inventory-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.mutedForeground} />
          <TextInput testID="inventory-search" style={styles.searchInput} placeholder="Search items..." placeholderTextColor={COLORS.mutedForeground} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
        {['all', ...CATEGORIES.inventory].map(cat => (
          <TouchableOpacity key={cat} testID={`cat-${cat}`} style={[styles.catChip, selectedCat === cat && styles.catChipActive]} onPress={() => setSelectedCat(cat)}>
            <Text style={[styles.catChipText, selectedCat === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No items found. Add your first item!</Text>}
        />
      )}
      </View>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity testID="close-add-modal" onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.formLabel}>NAME</Text>
              <TextInput testID="item-name-input" style={styles.input} placeholder="e.g. Corn" placeholderTextColor={COLORS.mutedForeground} value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
              <Text style={styles.formLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.inventory.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.catChip, form.category === cat && styles.catChipActive]} onPress={() => setForm({ ...form, category: cat })}>
                      <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.formLabel}>QUANTITY</Text>
              <TextInput testID="item-qty-input" style={styles.input} placeholder="0" placeholderTextColor={COLORS.mutedForeground} value={form.quantity} onChangeText={v => setForm({ ...form, quantity: v })} keyboardType="numeric" />
              <Text style={styles.formLabel}>STORAGE LOCATION</Text>
              <TextInput testID="item-location-input" style={styles.input} placeholder="e.g. Main Barn" placeholderTextColor={COLORS.mutedForeground} value={form.storage_location} onChangeText={v => setForm({ ...form, storage_location: v })} />
              <Text style={styles.formLabel}>NOTES</Text>
              <TextInput testID="item-notes-input" style={[styles.input, { height: 60 }]} placeholder="Optional notes..." placeholderTextColor={COLORS.mutedForeground} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline />
              <TouchableOpacity testID="submit-add-item" style={styles.submitBtn} onPress={handleAdd}><Text style={styles.submitText}>Add Item</Text></TouchableOpacity>
            </ScrollView>
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
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  catScroll: { maxHeight: 40, marginBottom: 4 },
  catRow: { paddingHorizontal: 20, gap: 6 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  catChipTextActive: { color: COLORS.primaryForeground },
  list: { padding: 20, paddingTop: 8 },
  itemCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { backgroundColor: COLORS.background, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  metaText: { fontSize: 12, color: COLORS.mutedForeground },
  deleteBtn: { padding: 4 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  qtyBtn: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  qtyBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  qtyDisplay: { paddingHorizontal: 20, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  qtyValue: { fontSize: 20, fontWeight: '800', color: COLORS.primaryForeground },
  updatedBy: { fontSize: 11, color: COLORS.mutedForeground, marginTop: 8, textAlign: 'right' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%', width: '100%', maxWidth: 600 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryForeground },
});
