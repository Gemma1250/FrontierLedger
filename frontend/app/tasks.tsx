import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, PRIORITY_COLORS, STATUS_COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function TasksScreen() {
  const { currentOrg } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium' });

  const fetchTasks = useCallback(async () => {
    if (!currentOrg) return;
    try { setTasks(await api.get(`/organizations/${currentOrg.id}/tasks`)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  const onRefresh = () => { setRefreshing(true); fetchTasks(); };

  const handleAdd = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Enter task title'); return; }
    try {
      await api.post(`/organizations/${currentOrg.id}/tasks`, form);
      setShowAdd(false);
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium' });
      fetchTasks();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleComplete = async (task: any) => {
    try { await api.put(`/organizations/${currentOrg.id}/tasks/${task.id}`, { status: 'completed' }); fetchTasks(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (task: any) => {
    Alert.alert('Delete Task', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.del(`/organizations/${currentOrg.id}/tasks/${task.id}`); fetchTasks(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const filters = ['all', 'pending', 'in_progress', 'completed'];

  const renderTask = ({ item }: { item: any }) => {
    const priColor = PRIORITY_COLORS[item.priority] || COLORS.textSecondary;
    const isDone = item.status === 'completed';

    return (
      <View testID={`task-${item.id}`} style={[styles.card, isDone && styles.cardDone]}>
        <View style={styles.cardRow}>
          <TouchableOpacity testID={`complete-task-${item.id}`} style={[styles.checkbox, isDone && styles.checkboxDone]} onPress={() => !isDone && handleComplete(item)}>
            {isDone && <Ionicons name="checkmark" size={16} color={COLORS.primaryForeground} />}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{item.title}</Text>
            {item.description ? <Text style={styles.taskDesc}>{item.description}</Text> : null}
            <View style={styles.taskMeta}>
              <View style={[styles.priBadge, { backgroundColor: priColor + '30' }]}>
                <Text style={[styles.priText, { color: priColor }]}>{item.priority}</Text>
              </View>
              {item.assigned_to ? <Text style={styles.metaText}>{item.assigned_to}</Text> : null}
              <Text style={styles.metaText}>{item.created_by}</Text>
            </View>
          </View>
          <TouchableOpacity testID={`delete-task-${item.id}`} onPress={() => handleDelete(item)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Task Board</Text>
        <TouchableOpacity testID="add-task-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}><Ionicons name="add" size={22} color={COLORS.primaryForeground} /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f} testID={`filter-${f}`} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderTask}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>} />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity testID="close-task-modal" onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>TITLE</Text>
            <TextInput testID="task-title-input" style={styles.input} placeholder="e.g. Water the crops" placeholderTextColor={COLORS.mutedForeground} value={form.title} onChangeText={v => setForm({ ...form, title: v })} />
            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput testID="task-desc-input" style={[styles.input, { height: 60 }]} placeholder="Details..." placeholderTextColor={COLORS.mutedForeground} value={form.description} onChangeText={v => setForm({ ...form, description: v })} multiline />
            <Text style={styles.formLabel}>ASSIGNED TO</Text>
            <TextInput testID="task-assigned-input" style={styles.input} placeholder="Member name" placeholderTextColor={COLORS.mutedForeground} value={form.assigned_to} onChangeText={v => setForm({ ...form, assigned_to: v })} />
            <Text style={styles.formLabel}>PRIORITY</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['low', 'medium', 'high'].map(p => (
                <TouchableOpacity key={p} style={[styles.filterChip, form.priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]} onPress={() => setForm({ ...form, priority: p })}>
                  <Text style={[styles.filterText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="submit-task-btn" style={styles.submitBtn} onPress={handleAdd}><Text style={styles.submitText}>Create Task</Text></TouchableOpacity>
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
  filterScroll: { maxHeight: 40, marginBottom: 4 },
  filterRow: { paddingHorizontal: 20, gap: 6 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.primaryForeground },
  list: { padding: 20, paddingTop: 8 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 10 },
  cardDone: { opacity: 0.6 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  taskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  taskMeta: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2 },
  priText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  metaText: { fontSize: 12, color: COLORS.mutedForeground },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  formLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, fontSize: 15, color: COLORS.textPrimary },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 20, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryForeground },
});
