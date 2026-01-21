/**
 * useShoppingHubData - Main data fetching and state management hook
 * REFACTORED: Uses React Query for data fetching with caching and optimistic updates
 * Handles loading data for both customer and admin views
 */
import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  useShoppingHubQuery,
  useCustomerShoppingDataQuery,
  useCartMutations,
  useFavoritesMutations,
} from '../queries';

export interface ShoppingHubState {
  loading: boolean;
  refreshing: boolean;
  favorites: any[];
  cartItems: any[];
  orders: any[];
  profileData: any;
}

export interface UseShoppingHubDataProps {
  customerId?: string;
  customerData?: any;
  isAdminView: boolean;
}

/**
 * Main hook for shopping hub data - uses React Query for all data fetching
 */
export const useShoppingHubData = ({
  customerId,
  customerData,
  isAdminView,
}: UseShoppingHubDataProps) => {
  const user = useAppStore((state) => state.user);
  const setCartItems = useAppStore((state) => state.setCartItems);

  // Determine target user
  const targetUserId = customerId || user?.id;
  const isOwnProfile = !isAdminView && !customerId;

  // Use React Query hooks for data fetching
  const userDataQuery = useShoppingHubQuery(!isAdminView && isOwnProfile);
  const customerDataQuery = useCustomerShoppingDataQuery(
    customerId,
    isAdminView && !!customerId
  );

  // Derive state from queries
  const loading = useMemo(() => {
    if (isAdminView && customerId) {
      return customerDataQuery.isLoading;
    }
    return userDataQuery.isLoading;
  }, [isAdminView, customerId, customerDataQuery.isLoading, userDataQuery.isLoading]);

  const refreshing = useMemo(() => {
    if (isAdminView && customerId) {
      return customerDataQuery.isRefetching;
    }
    return userDataQuery.isRefetching;
  }, [isAdminView, customerId, customerDataQuery.isRefetching, userDataQuery.isRefetching]);

  const favorites = useMemo(() => {
    if (isAdminView && customerId) {
      return customerDataQuery.favorites;
    }
    return userDataQuery.favorites;
  }, [isAdminView, customerId, customerDataQuery.favorites, userDataQuery.favorites]);

  const cartItems = useMemo(() => {
    if (isAdminView && customerId) {
      return customerDataQuery.cart;
    }
    return userDataQuery.cartItems;
  }, [isAdminView, customerId, customerDataQuery.cart, userDataQuery.cartItems]);

  const orders = useMemo(() => {
    if (isAdminView && customerId) {
      return customerDataQuery.orders;
    }
    return userDataQuery.orders;
  }, [isAdminView, customerId, customerDataQuery.orders, userDataQuery.orders]);

  const profileData = useMemo(() => {
    if (isAdminView && customerId) {
      return customerData;
    }
    return userDataQuery.profileData;
  }, [isAdminView, customerId, customerData, userDataQuery.profileData]);

  // Refresh function
  const onRefresh = useCallback(() => {
    if (isAdminView && customerId) {
      customerDataQuery.refetch();
    } else {
      userDataQuery.refetch();
    }
  }, [isAdminView, customerId, customerDataQuery, userDataQuery]);

  // Load data function (for backward compatibility)
  const loadData = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Update functions (for local state management if needed)
  const setFavorites = useCallback((newFavorites: any[]) => {
    // This is now handled by React Query
    // Manual updates will be reflected after refetch
  }, []);

  const setLocalCartItems = useCallback((newCartItems: any[]) => {
    setCartItems(newCartItems);
  }, [setCartItems]);

  const setOrders = useCallback((newOrders: any[]) => {
    // This is now handled by React Query
  }, []);

  return {
    loading,
    refreshing,
    favorites,
    cartItems,
    orders,
    profileData,
    targetUserId,
    isOwnProfile,
    loadData,
    onRefresh,
    setFavorites,
    setLocalCartItems,
    setOrders,
  };
};

export default useShoppingHubData;
