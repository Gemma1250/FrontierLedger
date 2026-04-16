import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';

export default function TreasuryScreen() {
  const { currentOrg } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState({ balance: 0, total_deposits: 0, total_withdrawals: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [txnType, setTxnType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [form, setForm] = useState({ amount: '', category: 'general', description: '' });

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const [txns, bal] = await Promise.all([
        api.get(`/organizations/${currentOrg.id}/treasury`),
        api.get(`/organizations/${currentOrg.id}/treasury/balance`),
      ]);
      setTransactions(txns);
      setBalance(bal);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAdd = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    try {
      await api.post(`/organizations/${currentOrg.id}/treasury`, { type: txnType, amount: amt, category: form.category, description: form.description });
      setShowAdd(false);
      setForm({ amount: '', category: 'general', description: '' });
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const renderTxn = ({ item }: { item: any }) => (
    <View testID={`txn-${item.id}`} style={styles.txnCard}>
      <View style={[styles.txnIcon, { backgroundColor: item.type === 'deposit' ? COLORS.secondary + '30' : COLORS.accent + '30' }]}>
        <Ionicons name={item.type === 'deposit' ? 'arrow-down' : 'arrow-up'} size={18} color={item.type === 'deposit' ? COLORS.secondary : COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txnDesc}>{item.description || item.category}</Text>
        <Text style={styles.txnMeta}>{item.created_by} · {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.txnAmount, { color: item.type === 'deposit' ? '#6B8E23' : COLORS.accent }]}>
        {item.type === 'deposit' ? '+' : '-'}${item.amount.toFixed(2)}
      </Text>
    </View>
  );

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Treasury</Text>
        <TouchableOpacity testID="add-transaction-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceValue}>${balance.balance.toFixed(2)}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceStat}>
            <Ionicons name="arrow-down" size={14} color="#6B8E23" />
            <Text style={[styles.balanceStatText, { color: '#6B8E23' }]}>+${balance.total_deposits.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceStat}>
            <Ionicons name="arrow-up" size={14} color={COLORS.accent} />
            <Text style={[styles.balanceStatText, { color: COLORS.accent }]}>-${balance.total_withdrawals.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTxn}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Transaction</Text>
              <TouchableOpacity testID="close-txn-modal" onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.typeRow}>
              <TouchableOpacity testID="type-deposit-btn" style={[styles.typeBtn, txnType === 'deposit' && styles.typeBtnActiveGreen]} onPress={() => setTxnType('deposit')}>
                <Ionicons name="arrow-down" size={18} color={txnType === 'deposit' ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.typeBtnText, txnType === 'deposit' && { color: '#fff' }]}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="type-withdrawal-btn" style={[styles.typeBtn, txnType === 'withdrawal' && styles.typeBtnActiveRed]} onPress={() => setTxnType('withdrawal')}>
                <Ionicons name="arrow-up" size={18} color={txnType === 'withdrawal' ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.typeBtnText, txnType === 'withdrawal' && { color: '#fff' }]}>Withdrawal</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>AMOUNT ($)</Text>
            <TextInput testID="txn-amount-input" style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.mutedForeground} value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
            <Text style={styles.formLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CATEGORIES.treasury.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catChip, form.category === cat && styles.catChipActive]} onPress={() => setForm({ ...form, category: cat })}>
                    <Text style={[styles.catChipText, form.category === cat && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput testID="txn-desc-input" style={styles.input} placeholder="e.g. Sold hides at market" placeholderTextColor={COLORS.mutedForeground} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
            <TouchableOpacity testID="submit-txn-btn" style={[styles.submitBtn, txnType === 'withdrawal' && { backgroundColor: COLORS.accent }]} onPress={handleAdd}>
              <Text style={styles.submitText}>{txnType === 'deposit' ? 'Record Deposit' : 'Record Withdrawal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { marginHorizontal: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 20, alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  balanceRow: { flexDirection: 'row', gap: 24, marginTop: 12 },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 8 },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  txnMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  typeBtnActiveGreen: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  typeBtnActiveRed: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  catChipTextActive: { color: COLORS.primaryForeground },
  submitBtn: { backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
