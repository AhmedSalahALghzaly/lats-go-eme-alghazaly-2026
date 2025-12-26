import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useTranslation } from '../../src/hooks/useTranslation';
import { customersApi, ordersApi, favoritesApi, cartApi, productsApi } from '../../src/services/api';
import { Header } from '../../src/components/Header';
import api from '../../src/services/api';

const SHIPPING_COST = 150; // Fixed shipping cost in EGP

export default function CustomersAdmin() {
  const { colors } = useTheme();
  const { language, isRTL } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [pendingOrderCounts, setPendingOrderCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  // Customer Profile State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'favorites' | 'cart' | 'checkout' | 'orders'>('favorites');
  
  // Customer Data State
  const [customerFavorites, setCustomerFavorites] = useState<any[]>([]);
  const [customerCart, setCustomerCart] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    country: 'Egypt',
    deliveryInstructions: '',
    paymentMethod: 'cash_on_delivery',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Order Confirmation Modal
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeCustomer, setStatusChangeCustomer] = useState<any>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  // Pulsing animation for order indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchCustomers();
    // Start pulsing animation - 1 second cycle (faster)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      const customersList = response.data?.customers || [];
      setCustomers(customersList);

      // Fetch pending order counts for each customer
      const counts: { [key: string]: number } = {};
      for (const customer of customersList) {
        try {
          const countRes = await ordersApi.getPendingCount(customer.user_id);
          counts[customer.user_id] = countRes.data?.count || 0;
        } catch (e) {
          counts[customer.user_id] = 0;
        }
      }
      setPendingOrderCounts(counts);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomerProfile = async (customer: any) => {
    setSelectedCustomer(customer);
    setShowProfile(true);
    setActiveTab('favorites');
    
    // Pre-populate checkout form
    setCheckoutForm({
      firstName: customer.name?.split(' ')[0] || '',
      lastName: customer.name?.split(' ').slice(1).join(' ') || '',
      email: customer.email || '',
      phone: customer.phone || '',
      streetAddress: '',
      city: '',
      state: '',
      country: 'Egypt',
      deliveryInstructions: '',
      paymentMethod: 'cash_on_delivery',
    });

    await loadCustomerData(customer.user_id);
  };

  const loadCustomerData = async (userId: string) => {
    setLoadingData(true);
    try {
      // Get customer's favorites, cart and orders using admin endpoints
      const [favRes, cartRes, ordersRes] = await Promise.all([
        api.get(`/admin/customer/${userId}/favorites`).catch(() => ({ data: { favorites: [] } })),
        api.get(`/admin/customer/${userId}/cart`).catch(() => ({ data: { items: [] } })),
        api.get(`/admin/customer/${userId}/orders`).catch(() => ({ data: { orders: [] } })),
      ]);
      
      setCustomerFavorites(favRes.data?.favorites || []);
      setCustomerCart(cartRes.data?.items || []);
      setCustomerOrders(ordersRes.data?.orders || []);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCustomerCart(prev => prev.map(item => 
      item.product_id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCustomerCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const addFavoriteToCart = (product: any) => {
    const existing = customerCart.find(item => item.product_id === product.id);
    if (existing) {
      updateCartQuantity(product.id, existing.quantity + 1);
    } else {
      setCustomerCart(prev => [...prev, {
        product_id: product.id,
        product: product,
        quantity: 1,
      }]);
    }
    setActiveTab('cart');
  };

  const calculateSubtotal = () => {
    return customerCart.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (!checkoutForm.firstName || !checkoutForm.phone || !checkoutForm.streetAddress || !checkoutForm.city) {
      return;
    }

    if (customerCart.length === 0) {
      return;
    }

    setSubmittingOrder(true);
    try {
      // Create order using the admin endpoint
      const orderPayload = {
        user_id: selectedCustomer.user_id,
        first_name: checkoutForm.firstName,
        last_name: checkoutForm.lastName,
        email: checkoutForm.email,
        phone: checkoutForm.phone,
        street_address: checkoutForm.streetAddress,
        city: checkoutForm.city,
        state: checkoutForm.state,
        country: checkoutForm.country,
        delivery_instructions: checkoutForm.deliveryInstructions,
        payment_method: checkoutForm.paymentMethod,
        notes: '',
        items: customerCart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const response = await api.post('/admin/orders/create', orderPayload);
      const order = response.data;

      setConfirmedOrder(order);
      setShowOrderConfirmation(true);
      setCustomerCart([]);
      
      // Update pending order count
      setPendingOrderCounts(prev => ({
        ...prev,
        [selectedCustomer.user_id]: (prev[selectedCustomer.user_id] || 0) + 1
      }));

      // Reload customer orders
      const ordersRes = await api.get(`/admin/customer/${selectedCustomer.user_id}/orders`).catch(() => ({ data: { orders: [] } }));
      setCustomerOrders(ordersRes.data?.orders || []);

    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleViewOrders = async (customer: any) => {
    openCustomerProfile(customer);
    setActiveTab('orders');
    // Mark all orders as viewed for this customer
    try {
      await api.patch(`/admin/customer/${customer.user_id}/orders/mark-viewed`);
      setPendingOrderCounts(prev => ({ ...prev, [customer.user_id]: 0 }));
    } catch (error) {
      console.error('Error marking orders as viewed:', error);
    }
  };

  // Order status update function
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/orders/${orderId}/status?status=${newStatus}`);
      // Refresh customer orders
      if (selectedCustomer) {
        const ordersRes = await api.get(`/admin/customer/${selectedCustomer.user_id}/orders`);
        setCustomerOrders(ordersRes.data?.orders || []);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Delete order function
  const deleteOrder = async (orderId: string) => {
    try {
      await api.delete(`/orders/${orderId}`);
      // Refresh customer orders
      if (selectedCustomer) {
        const ordersRes = await api.get(`/admin/customer/${selectedCustomer.user_id}/orders`);
        setCustomerOrders(ordersRes.data?.orders || []);
      }
      setShowStatusModal(false);
      setStatusChangeCustomer(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusMap: { [key: string]: { label: string, labelAr: string, color: string } } = {
      'pending': { label: 'Pending', labelAr: 'قيد الانتظار', color: '#f59e0b' },
      'preparing': { label: 'Preparing', labelAr: 'قيد التحضير', color: '#3b82f6' },
      'shipped': { label: 'Shipped', labelAr: 'تم الشحن', color: '#eab308' },
      'out_for_delivery': { label: 'Out for Delivery', labelAr: 'في الطريق', color: '#6b7280' },
      'delivered': { label: 'Delivered', labelAr: 'تم التسليم', color: '#10b981' },
      'cancelled': { label: 'Cancelled', labelAr: 'ملغي', color: '#ef4444' },
    };
    return statusMap[status] || statusMap['pending'];
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await customersApi.delete(id);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  // Main Customer List View
  if (!showProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Header title={language === 'ar' ? 'العملاء' : 'Customers'} showBack showSearch={false} showCart={false} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Breadcrumb */}
          <View style={[styles.breadcrumb, isRTL && styles.breadcrumbRTL]}>
            <TouchableOpacity onPress={() => router.push('/admin')}>
              <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
                {language === 'ar' ? 'لوحة التحكم' : 'Admin'}
              </Text>
            </TouchableOpacity>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
            <Text style={[styles.breadcrumbText, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'العملاء' : 'Customers'}
            </Text>
          </View>

          {/* Stats Card */}
          <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{customers.length}</Text>
              <Text style={styles.statLabel}>
                {language === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}
              </Text>
            </View>
          </View>

          {/* Customers List */}
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              {language === 'ar' ? 'قائمة العملاء' : 'Customer List'}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : customers.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {language === 'ar' ? 'لا يوجد عملاء' : 'No customers found'}
              </Text>
            ) : (
              customers.map((customer) => (
                <View key={customer.user_id} style={[styles.customerItem, { borderColor: colors.border }]}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    {customer.picture ? (
                      <Image source={{ uri: customer.picture }} style={styles.avatarImage} />
                    ) : (
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {(customer.name || customer.email || '?')[0].toUpperCase()}
                      </Text>
                    )}
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]}>
                      {customer.name || customer.email?.split('@')[0] || 'Unknown'}
                    </Text>
                    <View style={styles.customerMeta}>
                      <Ionicons name="mail" size={12} color={colors.textSecondary} />
                      <Text style={[styles.customerEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                        {customer.email}
                      </Text>
                    </View>
                    {customer.phone && (
                      <View style={styles.customerMeta}>
                        <Ionicons name="call" size={12} color={colors.textSecondary} />
                        <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                          {customer.phone}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.customerDate, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'انضم:' : 'Joined:'} {formatDate(customer.created_at)}
                    </Text>
                  </View>

                  {/* Action Icons */}
                  <View style={styles.actionIcons}>
                    {/* Order Status Indicator - Pulsing Yellow (Non-clickable) */}
                    {pendingOrderCounts[customer.user_id] > 0 && (
                      <Animated.View 
                        style={[
                          styles.orderIndicator, 
                          { 
                            backgroundColor: '#f59e0b', // Bright Yellow
                            transform: [{ scale: pulseAnim }],
                            shadowColor: '#f59e0b',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.6,
                            shadowRadius: 8,
                          }
                        ]}
                      >
                        <Ionicons name="receipt-outline" size={14} color="#FFF" />
                        {pendingOrderCounts[customer.user_id] > 1 && (
                          <View style={styles.orderCountBadge}>
                            <Text style={styles.orderCountText}>
                              {pendingOrderCounts[customer.user_id]}
                            </Text>
                          </View>
                        )}
                      </Animated.View>
                    )}

                    {/* View Details */}
                    <TouchableOpacity 
                      style={[styles.iconBtn, { backgroundColor: colors.surface }]}
                      onPress={() => openCustomerProfile(customer)}
                    >
                      <Ionicons name="eye" size={18} color={colors.text} />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.error + '20' }]}
                      onPress={() => handleDelete(customer.user_id)}
                    >
                      <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Customer Profile View
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Header 
        title={selectedCustomer?.name || language === 'ar' ? 'ملف العميل' : 'Customer Profile'} 
        showBack 
        showSearch={false} 
        showCart={false} 
      />

      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
          {selectedCustomer?.picture ? (
            <Image source={{ uri: selectedCustomer.picture }} style={styles.profileAvatarImage} />
          ) : (
            <Text style={styles.profileAvatarText}>
              {(selectedCustomer?.name || selectedCustomer?.email || '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {selectedCustomer?.name || 'Unknown'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {selectedCustomer?.email}
          </Text>
          {selectedCustomer?.phone && (
            <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>
              {selectedCustomer.phone}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.closeProfileBtn, { backgroundColor: colors.surface }]}
          onPress={() => setShowProfile(false)}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { key: 'favorites', icon: 'heart', label: language === 'ar' ? 'المفضلة' : 'Favorites' },
          { key: 'cart', icon: 'cart', label: language === 'ar' ? 'السلة' : 'Cart' },
          { key: 'checkout', icon: 'card', label: language === 'ar' ? 'الدفع' : 'Checkout' },
          { key: 'orders', icon: 'receipt', label: language === 'ar' ? 'الطلبات' : 'Orders' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? colors.primary : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {loadingData ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'المنتجات المفضلة' : 'Favorite Products'} ({customerFavorites.length})
                </Text>
                {customerFavorites.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {language === 'ar' ? 'لا توجد منتجات مفضلة' : 'No favorites yet'}
                  </Text>
                ) : (
                  customerFavorites.map((item) => (
                    <TouchableOpacity 
                      key={item.product_id} 
                      style={[styles.productItem, { borderColor: colors.border }]}
                      onPress={() => router.push(`/product/${item.product_id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.productThumb, { backgroundColor: colors.surface }]}>
                        {item.product?.image_url ? (
                          <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
                        ) : (
                          <Ionicons name="cube" size={20} color={colors.textSecondary} />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                          {language === 'ar' ? item.product?.name_ar : item.product?.name}
                        </Text>
                        <Text style={[styles.productPrice, { color: colors.primary }]}>
                          {item.product?.price?.toFixed(2)} ج.م
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addToCartBtn, { backgroundColor: colors.primary }]}
                        onPress={(e) => { e.stopPropagation(); addFavoriteToCart(item.product); }}
                      >
                        <Ionicons name="cart-outline" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Cart Tab */}
            {activeTab === 'cart' && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'سلة التسوق' : 'Shopping Cart'} ({customerCart.length})
                </Text>
                {customerCart.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}
                  </Text>
                ) : (
                  <>
                    {customerCart.map((item) => (
                      <TouchableOpacity 
                        key={item.product_id} 
                        style={[styles.cartItem, { borderColor: colors.border }]}
                        onPress={() => router.push(`/product/${item.product_id}`)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.productThumb, { backgroundColor: colors.surface }]}>
                          {item.product?.image_url ? (
                            <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
                          ) : (
                            <Ionicons name="cube" size={20} color={colors.textSecondary} />
                          )}
                        </View>
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                            {language === 'ar' ? item.product?.name_ar : item.product?.name}
                          </Text>
                          <Text style={[styles.productSku, { color: colors.textSecondary }]}>
                            SKU: {item.product?.sku}
                          </Text>
                          <Text style={[styles.productPrice, { color: colors.primary }]}>
                            {item.product?.price?.toFixed(2)} ج.م
                          </Text>
                        </View>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={[styles.quantityBtn, { backgroundColor: colors.surface }]}
                            onPress={(e) => { e.stopPropagation(); updateCartQuantity(item.product_id, item.quantity - 1); }}
                          >
                            <Ionicons name="remove" size={16} color={colors.text} />
                          </TouchableOpacity>
                          <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={[styles.quantityBtn, { backgroundColor: colors.surface }]}
                            onPress={(e) => { e.stopPropagation(); updateCartQuantity(item.product_id, item.quantity + 1); }}
                          >
                            <Ionicons name="add" size={16} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.lineTotal, { color: colors.text }]}>
                          {((item.product?.price || 0) * item.quantity).toFixed(2)} ج.م
                        </Text>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={(e) => { e.stopPropagation(); removeFromCart(item.product_id); }}
                        >
                          <Ionicons name="close" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}

                    {/* Cart Summary */}
                    <View style={[styles.cartSummary, { borderColor: colors.border }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {calculateSubtotal().toFixed(2)} ج.م
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {language === 'ar' ? 'الشحن' : 'Shipping'}
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {SHIPPING_COST.toFixed(2)} ج.م
                        </Text>
                      </View>
                      <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={[styles.totalLabel, { color: colors.text }]}>
                          {language === 'ar' ? 'الإجمالي' : 'Total'}
                        </Text>
                        <Text style={[styles.totalValue, { color: colors.primary }]}>
                          {(calculateSubtotal() + SHIPPING_COST).toFixed(2)} ج.م
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.proceedBtn, { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('checkout')}
                      >
                        <Text style={styles.proceedBtnText}>
                          {language === 'ar' ? 'المتابعة للدفع' : 'Proceed to Checkout'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Checkout Tab */}
            {activeTab === 'checkout' && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'إتمام الطلب' : 'Checkout'}
                </Text>

                {/* Customer Information */}
                <View style={styles.formSection}>
                  <Text style={[styles.formSectionTitle, { color: colors.primary }]}>
                    {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
                  </Text>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === 'ar' ? 'الاسم الأول *' : 'First Name *'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={checkoutForm.firstName}
                        onChangeText={(t) => setCheckoutForm({ ...checkoutForm, firstName: t })}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === 'ar' ? 'الاسم الأخير' : 'Last Name'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={checkoutForm.lastName}
                        onChangeText={(t) => setCheckoutForm({ ...checkoutForm, lastName: t })}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={checkoutForm.email}
                      onChangeText={(t) => setCheckoutForm({ ...checkoutForm, email: t })}
                      keyboardType="email-address"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {language === 'ar' ? 'رقم الهاتف *' : 'Phone *'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={checkoutForm.phone}
                      onChangeText={(t) => setCheckoutForm({ ...checkoutForm, phone: t })}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Delivery Address */}
                <View style={styles.formSection}>
                  <Text style={[styles.formSectionTitle, { color: colors.primary }]}>
                    {language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {language === 'ar' ? 'العنوان *' : 'Street Address *'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={checkoutForm.streetAddress}
                      onChangeText={(t) => setCheckoutForm({ ...checkoutForm, streetAddress: t })}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === 'ar' ? 'المدينة *' : 'City *'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={checkoutForm.city}
                        onChangeText={(t) => setCheckoutForm({ ...checkoutForm, city: t })}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {language === 'ar' ? 'المحافظة' : 'State'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        value={checkoutForm.state}
                        onChangeText={(t) => setCheckoutForm({ ...checkoutForm, state: t })}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      {language === 'ar' ? 'تعليمات التوصيل' : 'Delivery Instructions'}
                    </Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={checkoutForm.deliveryInstructions}
                      onChangeText={(t) => setCheckoutForm({ ...checkoutForm, deliveryInstructions: t })}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Order Summary */}
                <View style={[styles.orderSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.primary }]}>
                    {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                  </Text>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {calculateSubtotal().toFixed(2)} ج.م
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'الشحن' : 'Shipping'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {SHIPPING_COST.toFixed(2)} ج.م
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>
                      {(calculateSubtotal() + SHIPPING_COST).toFixed(2)} ج.م
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSubmitOrder}
                  disabled={submittingOrder || customerCart.length === 0}
                >
                  {submittingOrder ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.submitBtnText}>
                        {language === 'ar' ? 'تأكيد الطلب' : 'Submit Order'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'سجل الطلبات' : 'Order History'}
                </Text>
                {customerOrders.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {language === 'ar' ? 'لا توجد طلبات' : 'No orders yet'}
                  </Text>
                ) : (
                  customerOrders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                    <View key={order.id} style={[styles.orderItem, { borderColor: colors.border }]}>
                      <View style={styles.orderHeader}>
                        <TouchableOpacity onPress={() => router.push(`/admin/order/${order.id}`)}>
                          <Text style={[styles.orderNumber, { color: '#3b82f6', textDecorationLine: 'underline' }]}>
                            {order.order_number}
                          </Text>
                        </TouchableOpacity>
                        <Animated.View style={[styles.statusBadge, { 
                          backgroundColor: statusInfo.color,
                          shadowColor: statusInfo.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 4,
                        }]}>
                          <Text style={styles.statusText}>
                            {language === 'ar' ? statusInfo.labelAr : statusInfo.label}
                          </Text>
                        </Animated.View>
                      </View>
                      <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                        {formatDate(order.created_at)}
                      </Text>
                      <Text style={[
                        styles.orderTotal, 
                        { color: order.discount > 0 ? '#10b981' : colors.text },
                        order.discount > 0 && { textShadowColor: '#10b981', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 }
                      ]}>
                        {language === 'ar' ? 'الإجمالي:' : 'Total:'} {order.total?.toFixed(2)} ج.م
                        {order.discount > 0 && ` (${language === 'ar' ? 'خصم' : 'Discount'}: -${order.discount?.toFixed(2)})`}
                      </Text>
                      
                      {/* Status Action Icons - Only show for orders (admin view) */}
                      <View style={styles.orderStatusActions}>
                        {/* 1. Preparing Icon - Blue (show when pending) */}
                        {order.status === 'pending' && (
                          <TouchableOpacity
                            style={[styles.statusActionBtn, { backgroundColor: '#3b82f6' }]}
                            onPress={() => updateOrderStatus(order.id, 'preparing')}
                          >
                            <Text style={styles.statusActionText}>
                              {language === 'ar' ? 'تحضير' : 'Preparing'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* 2. Shipped Icon - Yellow (show when preparing) */}
                        {order.status === 'preparing' && (
                          <TouchableOpacity
                            style={[styles.statusActionBtn, { backgroundColor: '#eab308' }]}
                            onPress={() => updateOrderStatus(order.id, 'shipped')}
                          >
                            <Text style={styles.statusActionText}>
                              {language === 'ar' ? 'شحن' : 'Shipped'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* 3. Out for Delivery Icon - Gray (show when shipped) */}
                        {order.status === 'shipped' && (
                          <TouchableOpacity
                            style={[styles.statusActionBtn, { backgroundColor: '#6b7280' }]}
                            onPress={() => updateOrderStatus(order.id, 'out_for_delivery')}
                          >
                            <Text style={styles.statusActionText}>
                              {language === 'ar' ? 'في الطريق' : 'Out for Delivery'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* 4. Delivered Icon - Green (show when out for delivery) */}
                        {order.status === 'out_for_delivery' && (
                          <TouchableOpacity
                            style={[styles.statusActionBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            <Text style={styles.statusActionText}>
                              {language === 'ar' ? 'تسليم' : 'Delivered'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* 5. Cancel/Delete Icon - Red (visible to both admin and customer) */}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <TouchableOpacity
                            style={[styles.statusActionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => {
                              setStatusChangeCustomer(order);
                              setShowStatusModal(true);
                            }}
                          >
                            <Ionicons name="trash-outline" size={14} color="#FFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )})
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Order Confirmation Modal */}
      <Modal
        visible={showOrderConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmationIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تم تأكيد الطلب!' : 'Order Confirmed!'}
            </Text>
            <Text style={[styles.confirmationOrder, { color: colors.primary }]}>
              {confirmedOrder?.order_number}
            </Text>
            <Text style={[styles.confirmationDetail, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'العميل:' : 'Customer:'} {confirmedOrder?.customer_name}
            </Text>
            <Text style={[styles.confirmationDetail, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'الإجمالي:' : 'Total:'} {confirmedOrder?.total?.toFixed(2)} ج.م
            </Text>
            <Text style={[styles.confirmationDetail, { color: colors.textSecondary }]}>
              {formatDate(confirmedOrder?.created_at)}
            </Text>
            <TouchableOpacity
              style={[styles.closeConfirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowOrderConfirmation(false);
                setActiveTab('orders');
              }}
            >
              <Text style={styles.closeConfirmBtnText}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Order Confirmation Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmationIcon, { backgroundColor: '#ef4444' }]}>
              <Ionicons name="warning" size={40} color="#FFF" />
            </View>
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تأكيد حذف الطلب' : 'Confirm Delete Order'}
            </Text>
            <Text style={[styles.confirmationDetail, { color: colors.textSecondary, textAlign: 'center', marginVertical: 12 }]}>
              {language === 'ar' 
                ? `هل أنت متأكد أنك تريد حذف الطلب "${statusChangeCustomer?.order_number}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete order "${statusChangeCustomer?.order_number}"? This action cannot be undone.`}
            </Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => deleteOrder(statusChangeCustomer?.id)}
                disabled={changingStatus}
              >
                {changingStatus ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash" size={20} color="#FFF" />
                    <Text style={styles.statusBtnText}>
                      {language === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setShowStatusModal(false);
                  setStatusChangeCustomer(null);
                }}
                disabled={changingStatus}
              >
                <Ionicons name="close" size={20} color={colors.text} />
                <Text style={[styles.statusBtnText, { color: colors.text }]}>
                  {language === 'ar' ? 'لا' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { padding: 16 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  breadcrumbRTL: { flexDirection: 'row-reverse' },
  breadcrumbText: { fontSize: 14 },
  statsCard: { borderRadius: 12, padding: 20, marginBottom: 16, alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  listCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyText: { textAlign: 'center', padding: 20 },
  customerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '600' },
  customerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  customerEmail: { fontSize: 12, flex: 1 },
  customerPhone: { fontSize: 12 },
  customerDate: { fontSize: 11, marginTop: 2 },
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  orderIndicator: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  orderCountBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  orderCountText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  // Profile styles
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarImage: { width: 60, height: 60, borderRadius: 30 },
  profileAvatarText: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  profilePhone: { fontSize: 13, marginTop: 2 },
  closeProfileBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, gap: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  sectionCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  productThumb: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: 48, height: 48 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600' },
  productSku: { fontSize: 11, marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  addToCartBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // Cart styles
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  cartItemInfo: { flex: 1 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quantityText: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  lineTotal: { fontSize: 13, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  removeBtn: { padding: 4 },
  cartSummary: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  proceedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, marginTop: 16, gap: 8 },
  proceedBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  // Checkout styles
  formSection: { marginBottom: 20 },
  formSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  orderSummary: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Orders styles
  orderItem: { paddingVertical: 12, borderBottomWidth: 1 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  orderDate: { fontSize: 12, marginTop: 4 },
  orderTotal: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmationModal: { width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, alignItems: 'center' },
  confirmationIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmationTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  confirmationOrder: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  confirmationDetail: { fontSize: 14, marginBottom: 4 },
  closeConfirmBtn: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  closeConfirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  // Status modal styles
  statusButtons: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 8, flex: 1, justifyContent: 'center' },
  statusBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  // Order status action styles
  orderStatusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusActionText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
});
