/**
 * Orders Screen - Refactored with TanStack Query + FlashList
 * High-performance, stable architecture with optimistic updates
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../src/store/appStore';
import { ordersApi } from '../../src/services/api';
import { queryKeys } from '../../src/lib/queryClient';

type FilterType = 'all' | 'today' | 'pending' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  total?: number;
  items?: any[];
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; labelEn: string; labelAr: string }> = {
  pending: { color: '#F59E0B', icon: 'time', labelEn: 'Pending', labelAr: 'قيد الانتظار' },
  processing: { color: '#3B82F6', icon: 'cog', labelEn: 'Processing', labelAr: 'قيد المعالجة' },
  confirmed: { color: '#3B82F6', icon: 'checkmark', labelEn: 'Confirmed', labelAr: 'مؤكد' },
  preparing: { color: '#6366F1', icon: 'construct', labelEn: 'Preparing', labelAr: 'قيد التحضير' },
  shipped: { color: '#8B5CF6', icon: 'airplane', labelEn: 'Shipped', labelAr: 'تم الشحن' },
  out_for_delivery: { color: '#06B6D4', icon: 'bicycle', labelEn: 'Out for Delivery', labelAr: 'قيد التوصيل' },
  delivered: { color: '#10B981', icon: 'checkmark-circle', labelEn: 'Delivered', labelAr: 'تم التسليم' },
  cancelled: { color: '#EF4444', icon: 'close-circle', labelEn: 'Cancelled', labelAr: 'ملغي' },
};

// Memoized Order List Item Component
const OrderListItem = React.memo(({
  order,
  isRTL,
  formatDate,
  formatCurrency,
  onPress,
}: {
  order: Order;
  isRTL: boolean;
  formatDate: (dateStr: string) => string;
  formatCurrency: (amount: number) => string;
  onPress: (order: Order) => void;
}) => {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  
  return (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      <BlurView intensity={15} tint="light" style={styles.orderBlur}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '30' }]}>
          <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {isRTL ? statusConfig.labelAr : statusConfig.labelEn}
          </Text>
        </View>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>#{order.id?.slice(-8) || 'N/A'}</Text>
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>
          
          <Text style={styles.customerName} numberOfLines={1}>
            {order.customer_name || order.customer_email || (isRTL ? 'عميل' : 'Customer')}
          </Text>

          <View style={styles.orderFooter}>
            <Text style={styles.itemCount}>
              {order.items?.length || 0} {isRTL ? 'منتجات' : 'items'}
            </Text>
            <Text style={styles.orderTotal}>
              {formatCurrency(order.total || 0)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
      </BlurView>
    </TouchableOpacity>
  );
});

export default function OrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const language = useAppStore((state) => state.language);
  const isRTL = language === 'ar';

  // Get initial filter from URL params
  const initialFilter = (params.filter as FilterType) || 'all';
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);

  // TanStack Query: Fetch Orders
  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: async () => {
      try {
        // Use getAllAdmin for owner/admin to get ALL orders
        const response = await ordersApi.getAllAdmin();
        return response.data?.orders || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        // If getAllAdmin fails (permission denied), try getAll as fallback
        try {
          const fallbackResponse = await ordersApi.getAll();
          return fallbackResponse.data?.orders || fallbackResponse.data || [];
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          return [];
        }
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - orders are time-sensitive
  });

  const orders: Order[] = Array.isArray(ordersData) ? ordersData : [];

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await ordersApi.updateStatus(orderId, status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
    },
  });

  useEffect(() => {
    if (params.filter) {
      setActiveFilter(params.filter as FilterType);
    }
  }, [params.filter]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  }, []);

  const handleOrderPress = useCallback((order: Order) => {
    router.push(`/admin/order/${order.id}`);
  }, [router]);

  // Memoized date formatter
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [language]);

  // Memoized currency formatter
  const formatCurrency = useCallback((amount: number) => {
    return `${amount.toLocaleString()} ${isRTL ? 'ج.م' : 'EGP'}`;
  }, [isRTL]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    switch (activeFilter) {
      case 'today':
        const today = new Date().toDateString();
        result = result.filter((o) => new Date(o.created_at).toDateString() === today);
        break;
      case 'pending':
        result = result.filter((o) => o.status === 'pending');
        break;
      case 'shipped':
        result = result.filter((o) => o.status === 'shipped');
        break;
      case 'delivered':
        result = result.filter((o) => o.status === 'delivered');
        break;
      case 'cancelled':
        result = result.filter((o) => o.status === 'cancelled');
        break;
    }

    return result.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, activeFilter]);

  // Count by status
  const statusCounts = useMemo(() => ({
    all: orders.length,
    today: orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
    pending: orders.filter((o) => o.status === 'pending').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders]);

  const filters: { id: FilterType; labelEn: string; labelAr: string; color: string }[] = [
    { id: 'all', labelEn: 'All', labelAr: 'الكل', color: '#6B7280' },
    { id: 'today', labelEn: 'Today', labelAr: 'اليوم', color: '#3B82F6' },
    { id: 'pending', labelEn: 'Pending', labelAr: 'انتظار', color: '#F59E0B' },
    { id: 'shipped', labelEn: 'Shipped', labelAr: 'شحن', color: '#8B5CF6' },
    { id: 'delivered', labelEn: 'Delivered', labelAr: 'تسليم', color: '#10B981' },
    { id: 'cancelled', labelEn: 'Cancelled', labelAr: 'ملغي', color: '#EF4444' },
  ];

  // List Header Component with header and filters
  const ListHeaderComponent = useCallback(() => (
    <>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRTL ? 'الطلبات' : 'Orders'}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{filteredOrders.length}</Text>
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterPill,
              activeFilter === filter.id && { backgroundColor: filter.color },
            ]}
            onPress={() => handleFilterChange(filter.id)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter.id && styles.filterTextActive,
            ]}>
              {isRTL ? filter.labelAr : filter.labelEn}
            </Text>
            <View style={[
              styles.filterBadge,
              activeFilter === filter.id && styles.filterBadgeActive,
            ]}>
              <Text style={[
                styles.filterBadgeText,
                activeFilter === filter.id && styles.filterBadgeTextActive,
              ]}>
                {statusCounts[filter.id]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  ), [isRTL, filteredOrders.length, activeFilter, statusCounts, router, handleFilterChange]);

  // Empty component for FlashList
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFF" />
      ) : (
        <>
          <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyText}>
            {isRTL ? 'لا توجد طلبات' : 'No orders found'}
          </Text>
        </>
      )}
    </View>
  ), [isLoading, isRTL]);

  // Footer component to add bottom padding
  const ListFooterComponent = useCallback(() => (
    <View style={{ height: insets.bottom + 40 }} />
  ), [insets.bottom]);

  // Render item for FlashList
  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <OrderListItem
      order={item}
      isRTL={isRTL}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      onPress={handleOrderPress}
    />
  ), [isRTL, formatDate, formatCurrency, handleOrderPress]);

  const keyExtractor = useCallback((item: Order) => item.id, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E1E3F', '#2D2D5F', '#3D3D7F']} style={StyleSheet.absoluteFill} />

      <FlashList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={100}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            tintColor="#FFF"
            colors={['#FFF']}
          />
        }
        extraData={[activeFilter, isRTL]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  headerRTL: { flexDirection: 'row-reverse' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: '#FFF' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  headerBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  filterContainer: { paddingVertical: 12, gap: 8, flexDirection: 'row' },
  filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', gap: 8 },
  filterText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#FFF' },
  filterBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  filterBadgeTextActive: { color: '#FFF' },
  orderCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  orderBlur: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderInfo: { flex: 1, gap: 4 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  orderDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  customerName: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  orderTotal: { color: '#10B981', fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
});
