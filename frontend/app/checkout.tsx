import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { useTranslation } from '../src/hooks/useTranslation';
import { useAppStore } from '../src/store/appStore';
import { ordersApi } from '../src/services/api';

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartItems, clearLocalCart, user } = useAppStore();

  const [shippingAddress, setShippingAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const getTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      Alert.alert('', t('shippingAddress') + ' required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('', t('phone') + ' required');
      return;
    }

    setLoading(true);
    try {
      await ordersApi.create({
        shipping_address: shippingAddress,
        phone: phone,
        notes: notes || undefined,
      });
      
      clearLocalCart();
      
      Alert.alert(
        '',
        t('orderPlaced'),
        [
          {
            text: 'OK',
            onPress: () => router.replace('/orders'),
          },
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert(t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[
          styles.header, 
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + 10 }
        ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons 
              name={isRTL ? 'arrow-forward' : 'arrow-back'} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('checkout')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary */}
          <View style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('myCart')}
            </Text>
            {cartItems.map((item) => (
              <View key={item.product_id} style={styles.summaryItem}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {item.product?.name || 'Product'} x {item.quantity}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {((item.product?.price || 0) * item.quantity).toFixed(2)} ج.م
                </Text>
              </View>
            ))}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>
                {t('total')}
              </Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                {getTotal().toFixed(2)} ج.م
              </Text>
            </View>
          </View>

          {/* Shipping Form */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('shippingAddress')}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }
              ]}
              placeholder={t('shippingAddress')}
              placeholderTextColor={colors.textSecondary}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
              {t('phone')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }
              ]}
              placeholder={t('phone')}
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
              {t('notes')}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }
              ]}
              placeholder={t('notes')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </ScrollView>

        {/* Place Order Button */}
        <View style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }
        ]}>
          <TouchableOpacity
            style={[styles.placeOrderButton, { backgroundColor: colors.primary }]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.placeOrderText}>{t('placeOrder')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  formSection: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  placeOrderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
