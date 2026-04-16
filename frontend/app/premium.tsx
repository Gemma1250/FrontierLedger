import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

export default function PremiumScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchSub = useCallback(async () => {
    try { setSub(await api.get('/premium/subscription')); }
    catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  // Poll payment status if returning from Stripe
  useEffect(() => {
    if (params.session_id) {
      pollPaymentStatus(params.session_id);
    }
  }, [params.session_id]);

  const pollPaymentStatus = async (sessionId: string, attempt = 0) => {
    if (attempt >= 5) { setChecking(false); Alert.alert('Info', 'Payment status check timed out. It may take a moment to process.'); return; }
    setChecking(true);
    try {
      const status = await api.get(`/premium/status/${sessionId}`);
      if (status.payment_status === 'paid') {
        setChecking(false);
        Alert.alert('Success!', 'Premium activated! You now have access to all premium features.');
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState({}, '', '/premium');
        fetchSub();
        return;
      } else if (status.status === 'expired') {
        setChecking(false);
        Alert.alert('Expired', 'Payment session expired. Please try again.');
        return;
      }
      setTimeout(() => pollPaymentStatus(sessionId, attempt + 1), 2000);
    } catch (e) {
      setChecking(false);
      Alert.alert('Error', 'Failed to check payment status.');
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const res = await api.post('/premium/checkout', { origin_url: origin });
      if (res.url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = res.url;
        } else {
          const Linking = require('expo-linking');
          await Linking.openURL(res.url);
        }
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setCheckoutLoading(false); }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={styles.title}>Premium</Text>
          <View style={{ width: 32 }} />
        </View>

        {checking && (
          <View style={styles.checkingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.checkingText}>Verifying payment...</Text>
          </View>
        )}

        {/* Current Plan Card */}
        <View style={[styles.planCard, sub?.is_premium && styles.planCardPremium]}>
          <View style={styles.planBadge}>
            <Ionicons name={sub?.is_premium ? 'star' : 'person'} size={20} color={sub?.is_premium ? '#FFD700' : COLORS.textSecondary} />
            <Text style={[styles.planBadgeText, sub?.is_premium && { color: '#FFD700' }]}>{sub?.is_premium ? 'PREMIUM' : 'FREE'}</Text>
          </View>
          <Text style={styles.planTitle}>{sub?.is_premium ? 'Premium Plan' : 'Free Plan'}</Text>
          <Text style={styles.planDetail}>Organizations: {sub?.owned_orgs || 0} / {sub?.org_limit || 2}</Text>
          {sub?.is_premium && sub?.premium_until && (
            <Text style={styles.planDetail}>Expires: {new Date(sub.premium_until).toLocaleDateString()}</Text>
          )}
        </View>

        {/* Features Comparison */}
        <Text style={styles.sectionTitle}>PLAN COMPARISON</Text>

        <View style={styles.compareCard}>
          <View style={styles.compareRow}>
            <Text style={styles.compareFeature}>Organizations</Text>
            <Text style={styles.compareFree}>2</Text>
            <Text style={styles.comparePremium}>20</Text>
          </View>
          <View style={styles.compareHeader}>
            <Text style={styles.compareFeature}></Text>
            <Text style={styles.compareHeaderText}>Free</Text>
            <Text style={[styles.compareHeaderText, { color: '#FFD700' }]}>Premium</Text>
          </View>
          {[
            { feature: 'Inventory Tracking', free: true, premium: true },
            { feature: 'Treasury Ledger', free: true, premium: true },
            { feature: 'Crop Management', free: true, premium: true },
            { feature: 'Task Board', free: true, premium: true },
            { feature: 'Advanced Analytics', free: false, premium: true },
            { feature: 'CSV Export', free: false, premium: true },
            { feature: 'Discord Bot Commands', free: false, premium: true },
            { feature: 'Priority Support', free: false, premium: true },
          ].map((row, i) => (
            <View key={i} style={styles.compareRow}>
              <Text style={styles.compareFeature}>{row.feature}</Text>
              <Ionicons name={row.free ? 'checkmark-circle' : 'close-circle'} size={18} color={row.free ? COLORS.secondary : COLORS.accent} style={styles.compareIcon} />
              <Ionicons name={row.premium ? 'checkmark-circle' : 'close-circle'} size={18} color={row.premium ? '#FFD700' : COLORS.accent} style={styles.compareIcon} />
            </View>
          ))}
        </View>

        {/* Upgrade Button */}
        {!sub?.is_premium && (
          <TouchableOpacity testID="upgrade-btn" style={styles.upgradeBtn} onPress={handleUpgrade} disabled={checkoutLoading}>
            {checkoutLoading ? <ActivityIndicator color={COLORS.primaryForeground} /> : (
              <>
                <Ionicons name="star" size={22} color={COLORS.primaryForeground} />
                <View>
                  <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
                  <Text style={styles.upgradeBtnPrice}>$5.00/month</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        )}

        {sub?.is_premium && (
          <View style={styles.activeCard}>
            <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
            <Text style={styles.activeText}>Premium is active! Enjoy all features.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  checkingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary + '20', padding: 12, borderRadius: 4, marginBottom: 12 },
  checkingText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  planCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 20, marginBottom: 20, alignItems: 'center' },
  planCardPremium: { borderColor: '#FFD700', borderWidth: 2 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  planBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  planTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  planDetail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 12 },
  compareCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 12, marginBottom: 20 },
  compareHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  compareHeaderText: { width: 60, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  compareFeature: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  compareFree: { width: 60, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  comparePremium: { width: 60, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#FFD700' },
  compareIcon: { width: 60, textAlign: 'center' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 4, marginBottom: 20 },
  upgradeBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.primaryForeground },
  upgradeBtnPrice: { fontSize: 13, color: COLORS.primaryForeground + 'CC', textAlign: 'center' },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFD70015', borderWidth: 1, borderColor: '#FFD70050', borderRadius: 4, padding: 16 },
  activeText: { fontSize: 15, fontWeight: '600', color: '#FFD700' },
});
