import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, ROLES, ROLE_LABELS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function RolesScreen() {
  const { currentOrg, user } = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const fetchOrg = useCallback(async () => {
    if (!currentOrg) return;
    try { setOrg(await api.get(`/organizations/${currentOrg.id}`)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [currentOrg]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);
  const onRefresh = () => { setRefreshing(true); fetchOrg(); };

  const handleRoleChange = async () => {
    if (!editMember || !selectedRole) return;
    try {
      await api.put(`/organizations/${currentOrg.id}/members/${editMember.user_id}/role`, { role: selectedRole });
      setEditMember(null);
      fetchOrg();
      Alert.alert('Success', 'Role updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const isLeader = org?.members?.some((m: any) => m.user_id === user?.id && m.role === 'leader');

  const renderMember = ({ item }: { item: any }) => {
    const roleLabel = ROLE_LABELS[item.role] || item.role;
    const isCurrentUser = item.user_id === user?.id;

    return (
      <View testID={`member-${item.user_id}`} style={styles.memberCard}>
        <View style={styles.memberAvatar}>
          <Text style={styles.avatarText}>{item.username?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName}>{item.username}</Text>
            {isCurrentUser && <Text style={styles.youBadge}>You</Text>}
          </View>
          <Text style={styles.memberRole}>{roleLabel}</Text>
          <Text style={styles.memberDate}>Joined {new Date(item.joined_at).toLocaleDateString()}</Text>
        </View>
        {isLeader && !isCurrentUser && (
          <TouchableOpacity testID={`edit-role-${item.user_id}`} style={styles.editBtn} onPress={() => { setEditMember(item); setSelectedRole(item.role); }}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Roles & Members</Text>
        <View style={{ width: 32 }} />
      </View>

      {!isLeader && (
        <View style={styles.infoBar}>
          <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Only leaders can change member roles</Text>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={org?.members || []}
          keyExtractor={item => item.user_id}
          renderItem={renderMember}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
        />
      )}

      <Modal visible={!!editMember} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role for {editMember?.username}</Text>
              <TouchableOpacity testID="close-role-modal" onPress={() => setEditMember(null)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              {ROLES.map(role => (
                <TouchableOpacity key={role} testID={`role-option-${role}`} style={[styles.roleOption, selectedRole === role && styles.roleOptionActive]} onPress={() => setSelectedRole(role)}>
                  <View style={[styles.radioOuter, selectedRole === role && styles.radioOuterActive]}>
                    {selectedRole === role && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text style={[styles.roleLabel, selectedRole === role && styles.roleLabelActive]}>{ROLE_LABELS[role]}</Text>
                    <Text style={styles.roleKey}>{role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity testID="submit-role-btn" style={styles.submitBtn} onPress={handleRoleChange}>
              <Text style={styles.submitText}>Update Role</Text>
            </TouchableOpacity>
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
  infoBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoText: { fontSize: 12, color: COLORS.textSecondary },
  list: { padding: 20, paddingTop: 8 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 8 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.primaryForeground },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  youBadge: { fontSize: 10, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primary + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 2 },
  memberRole: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  memberDate: { fontSize: 11, color: COLORS.mutedForeground, marginTop: 2 },
  editBtn: { padding: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  roleOptionActive: { backgroundColor: COLORS.primary + '10' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  roleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  roleLabelActive: { color: COLORS.primary },
  roleKey: { fontSize: 11, color: COLORS.mutedForeground, marginTop: 1 },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 16, marginBottom: 20 },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryForeground },
});
