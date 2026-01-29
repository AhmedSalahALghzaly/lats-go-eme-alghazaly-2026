/**
 * OrdersTab - Order history and status management tab
 * FIXED: FlashList now handles scrolling as primary scroll container
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState } from '../ui/EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { NEON_NIGHT_THEME } from '../../store/appStore';

interface OrdersTabProps {
  orders: any[];
  isRTL: boolean;
  canEditOrderStatus: boolean;
  updatingOrderId: string | null;
  onUpdateStatus: (orderId: string, newStatus: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Get status display info (color, label, icon)
 */
const getStatusInfo = (status: string) => {
  const statusMap: { [key: string]: { label: string; labelAr: string; color: string; icon: string } } = {
    pending: { label: 'Pending', labelAr: 'قيد الانتظار', color: '#f59e0b', icon: 'time-outline' },
    preparing: { label: 'Preparing', labelAr: 'قيد التحضير', color: '#3b82f6', icon: 'construct-outline' },
    shipped: { label: 'Shipped', labelAr: 'تم الشحن', color: '#eab308', icon: 'airplane-outline' },
    out_for_delivery: { label: 'Out for Delivery', labelAr: 'في الطريق', color: '#6b7280', icon: 'car-outline' },
    delivered: { label: 'Delivered', labelAr: 'تم التسليم', color: '#10b981', icon: 'checkmark-circle' },
    cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: '#ef4444', icon: 'close-circle' },
  };
  return statusMap[status] || statusMap.pending;
};

/**
 * Status action button with loading state
 */
const StatusActionButton: React.FC<{
  orderId: string;
  status: string;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
  updatingOrderId: string | null;
  language: string;
  onPress: () => void;
}> = ({ orderId, status, label, labelAr, icon, color, updatingOrderId, language, onPress }) => {
  const isLoading = updatingOrderId === `${orderId}_${status}`;

  return (
    <Pressable
      style={[styles.statusActionBtn, { backgroundColor: color }]}
      onPress={onPress}
      disabled={updatingOrderId !== null}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Ionicons name={icon as any} size={12} color="#FFF" />
          <Text style={styles.statusActionText}>{language === 'ar' ? labelAr : label}</Text>
        </>
      )}
    </Pressable>
  );
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  isRTL,
  canEditOrderStatus,
  updatingOrderId,
  onUpdateStatus,
  onRefresh,
  refreshing = false,
}) => {
  const { colors } = useTheme();
  const { language } = useTranslation();
  const router = useRouter();

  const safeOrders = Array.isArray(orders) ? orders : [];

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [language]);

  // Render order item for FlashList
  const renderOrderItem = useCallback(({ item: order }: { item: any }) => {
    const statusInfo = getStatusInfo(order.status);
    return (
      <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.orderHeader, isRTL && styles.rowReverse]}>
          <Pressable
            onPress={() => router.push(`/admin/order/${order.id}`)}
          >
            <Text style={[styles.orderNumber, { color: NEON_NIGHT_THEME.primary }]}>
              {order.order_number}
            </Text>
          </Pressable>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={10} color="#FFF" />
            <Text style={styles.statusText}>
              {language === 'ar' ? statusInfo.labelAr : statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={[styles.orderDetails, isRTL && styles.rowReverse]}>
          <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
            {formatDate(order.created_at)}
          </Text>
          <Text style={[styles.orderTotal, { color: colors.text }]}>
            {order.total?.toFixed(0)} ج.م
          </Text>
        </View>

        {/* Admin Status Actions */}
        {canEditOrderStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.orderActions}>
            {order.status === 'pending' && (
              <StatusActionButton
                orderId={order.id}
                status="preparing"
                label="Prepare"
                labelAr="تحضير"
                icon="construct-outline"
                color="#3B82F6"
                updatingOrderId={updatingOrderId}
                language={language}
                onPress={() => onUpdateStatus(order.id, 'preparing')}
              />
            )}
            {order.status === 'preparing' && (
              <StatusActionButton
                orderId={order.id}
                status="shipped"
                label="Ship"
                labelAr="شحن"
                icon="airplane-outline"
                color="#EAB308"
                updatingOrderId={updatingOrderId}
                language={language}
                onPress={() => onUpdateStatus(order.id, 'shipped')}
              />
            )}
            {order.status === 'shipped' && (
              <StatusActionButton
                orderId={order.id}
                status="out_for_delivery"
                label="Out"
                labelAr="في الطريق"
                icon="car-outline"
                color="#6B7280"
                updatingOrderId={updatingOrderId}
                language={language}
                onPress={() => onUpdateStatus(order.id, 'out_for_delivery')}
              />
            )}
            {order.status === 'out_for_delivery' && (
              <StatusActionButton
                orderId={order.id}
                status="delivered"
                label="Deliver"
                labelAr="تسليم"
                icon="checkmark-circle"
                color="#10B981"
                updatingOrderId={updatingOrderId}
                language={language}
                onPress={() => onUpdateStatus(order.id, 'delivered')}
              />
            )}
            <StatusActionButton
              orderId={order.id}
              status="cancelled"
              label="Cancel"
              labelAr="إلغاء"
              icon="close-circle"
              color="#EF4444"
              updatingOrderId={updatingOrderId}
              language={language}
              onPress={() => onUpdateStatus(order.id, 'cancelled')}
            />
          </View>
        )}
      </View>
    );
  }, [colors, language, isRTL, canEditOrderStatus, updatingOrderId, formatDate, router, onUpdateStatus]);

  // List header with section title
  const ListHeaderComponent = useCallback(() => (
    <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {language === 'ar' ? 'سجل الطلبات' : 'Order History'}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: NEON_NIGHT_THEME.primary }]}>
        <Text style={styles.countBadgeText}>{safeOrders.length}</Text>
      </View>
    </View>
  ), [colors, language, isRTL, safeOrders.length]);

  // List footer
  const ListFooterComponent = useCallback(() => (
    <View style={{ height: 100 }} />
  ), []);

  // Empty state
  const ListEmptyComponent = useCallback(() => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <EmptyState
        icon="receipt-outline"
        title={language === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}
      />
    </View>
  ), [language, colors]);

  return (
    <FlashList
      data={safeOrders}
      renderItem={renderOrderItem}
      keyExtractor={(item, index) => item.id || `order-item-${index}`}
      estimatedItemSize={100}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={NEON_NIGHT_THEME.primary}
          />
        ) : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  orderCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusActionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default OrdersTab;
