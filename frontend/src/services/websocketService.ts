/**
 * WebSocket Service for Real-time Notifications & Granular Cache Updates
 * OPTIMIZED: Supports granular updates for orders, products, customers
 * v2.0.0
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/appStore';
import { useDataCacheStore } from '../store/useDataCacheStore';

const WS_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:8001';

// WebSocket message types for type safety
export type WSMessageType = 
  | 'notification'
  | 'sync'
  | 'ping'
  | 'pong'
  | 'order_created'
  | 'order_updated'
  | 'order_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'product_stock_updated'
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'cart_updated'
  | 'favorites_updated'
  | 'price_changed'
  | 'promotion_started'
  | 'promotion_ended';

export interface WSMessage {
  type: WSMessageType;
  data?: any;
  timestamp?: string;
  affected_ids?: string[];
}

// Message handler type with priority
export interface MessageHandler {
  handler: (data: WSMessage) => void;
  priority: number;
  types?: WSMessageType[];
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private userId: string | undefined;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPong: number = Date.now();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private stateListeners: Set<(state: string) => void> = new Set();

  // Connection state getter
  get state(): string {
    return this.connectionState;
  }

  // Subscribe to connection state changes
  onStateChange(listener: (state: string) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') {
    this.connectionState = state;
    this.stateListeners.forEach(listener => listener(state));
  }

  connect(userId?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.userId = userId;
    this.setConnectionState('connecting');

    const url = userId ? `${WS_URL}/api/ws?user_id=${userId}` : `${WS_URL}/api/ws`;
    
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.startHeartbeat();
        
        // Send authentication if user is logged in
        if (userId) {
          this.send({ type: 'auth', userId });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          data.timestamp = data.timestamp || new Date().toISOString();
          
          // Handle pong for heartbeat
          if (data.type === 'pong') {
            this.lastPong = Date.now();
            return;
          }
          
          console.log('[WS] Message:', data.type, data.affected_ids?.length || 0, 'affected items');
          this.dispatchMessage(data);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        this.stopHeartbeat();
        this.setConnectionState('disconnected');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      this.setConnectionState('disconnected');
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check if we received pong in last 30 seconds
        if (Date.now() - this.lastPong > 30000) {
          console.log('[WS] Heartbeat timeout, reconnecting...');
          this.ws?.close();
          return;
        }
        this.send({ type: 'ping' });
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private dispatchMessage(data: WSMessage) {
    // Sort handlers by priority (higher first)
    const sortedHandlers = Array.from(this.messageHandlers.values())
      .sort((a, b) => b.priority - a.priority);

    for (const { handler, types } of sortedHandlers) {
      // If handler has type filter, check if message type matches
      if (types && types.length > 0 && !types.includes(data.type)) {
        continue;
      }
      
      try {
        handler(data);
      } catch (err) {
        console.error('[WS] Handler error:', err);
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.setConnectionState('reconnecting');

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      console.log(`[WS] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect(this.userId);
    }, delay);
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Add a message handler with optional type filtering and priority
   * @param id Unique identifier for the handler
   * @param handler The handler function
   * @param options Optional configuration (types to listen for, priority)
   * @returns Cleanup function
   */
  addMessageHandler(
    id: string,
    handler: (data: WSMessage) => void,
    options?: { types?: WSMessageType[]; priority?: number }
  ): () => void {
    this.messageHandlers.set(id, {
      handler,
      priority: options?.priority ?? 0,
      types: options?.types,
    });
    return () => this.messageHandlers.delete(id);
  }

  removeMessageHandler(id: string) {
    this.messageHandlers.delete(id);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Manual reconnect (resets attempt counter)
  reconnect() {
    this.reconnectAttempts = 0;
    this.disconnect();
    setTimeout(() => this.connect(this.userId), 100);
  }
}

export const wsService = new WebSocketService();

/**
 * React hook for WebSocket with granular cache updates
 * Optimizes real-time data by updating specific items instead of full refetch
 */
export const useWebSocket = () => {
  const user = useAppStore((state) => state.user);
  const addNotification = useAppStore((state) => state.addNotification);
  const setSyncStatus = useAppStore((state) => state.setSyncStatus);
  const fetchData = useAppStore((state) => state.fetchInitialData);
  const queryClient = useQueryClient();
  
  // Track connection state
  const connectionStateRef = useRef<string>('disconnected');

  useEffect(() => {
    // Connect WebSocket
    wsService.connect(user?.id);

    // Listen for connection state changes
    const unsubscribeState = wsService.onStateChange((state) => {
      connectionStateRef.current = state;
    });

    // ==========================================
    // Notification Handler (Priority: 10)
    // ==========================================
    const removeNotificationHandler = wsService.addMessageHandler(
      'notification-handler',
      (data) => {
        if (data.type === 'notification' && data.data) {
          addNotification({
            id: data.data.id || `notif-${Date.now()}`,
            title: data.data.title,
            message: data.data.message,
            type: data.data.type || 'info',
            read: false,
            created_at: data.data.created_at || new Date().toISOString(),
          });
        }
      },
      { types: ['notification'], priority: 10 }
    );

    // ==========================================
    // Order Updates Handler (Priority: 8)
    // Granular cache update for orders
    // ==========================================
    const removeOrderHandler = wsService.addMessageHandler(
      'order-handler',
      (data) => {
        const orderId = data.data?.id;
        
        switch (data.type) {
          case 'order_created':
            // Invalidate orders list to refetch
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // Add notification
            addNotification({
              id: `order-${orderId}-created`,
              title: 'طلب جديد',
              message: `تم استلام طلب جديد #${data.data?.order_number || orderId?.slice(-8)}`,
              type: 'success',
              read: false,
              created_at: new Date().toISOString(),
            });
            break;

          case 'order_updated':
            // Update specific order in cache
            queryClient.setQueryData(['orders'], (old: any[] | undefined) => {
              if (!old) return old;
              return old.map(order => 
                order.id === orderId ? { ...order, ...data.data } : order
              );
            });
            // Also update the single order query
            queryClient.setQueryData(['order', orderId], data.data);
            break;

          case 'order_deleted':
            // Remove order from cache
            queryClient.setQueryData(['orders'], (old: any[] | undefined) => {
              if (!old) return old;
              return old.filter(order => order.id !== orderId);
            });
            queryClient.removeQueries({ queryKey: ['order', orderId] });
            break;
        }
      },
      { types: ['order_created', 'order_updated', 'order_deleted'], priority: 8 }
    );

    // ==========================================
    // Product Updates Handler (Priority: 8)
    // Granular cache update for products
    // ==========================================
    const removeProductHandler = wsService.addMessageHandler(
      'product-handler',
      (data) => {
        const productId = data.data?.id;
        
        switch (data.type) {
          case 'product_created':
            queryClient.invalidateQueries({ queryKey: ['products'] });
            break;

          case 'product_updated':
          case 'product_stock_updated':
          case 'price_changed':
            // Update specific product in cache
            queryClient.setQueryData(['products', 'infinite'], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  products: page.products.map((product: any) =>
                    product.id === productId ? { ...product, ...data.data } : product
                  ),
                })),
              };
            });
            // Also update single product query
            queryClient.setQueryData(['product', productId], (old: any) => 
              old ? { ...old, ...data.data } : old
            );
            break;

          case 'product_deleted':
            // Remove product from infinite query cache
            queryClient.setQueryData(['products', 'infinite'], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  products: page.products.filter((product: any) => product.id !== productId),
                })),
              };
            });
            queryClient.removeQueries({ queryKey: ['product', productId] });
            break;
        }
      },
      { types: ['product_created', 'product_updated', 'product_deleted', 'product_stock_updated', 'price_changed'], priority: 8 }
    );

    // ==========================================
    // Customer Updates Handler (Priority: 7)
    // Granular cache update for customers
    // ==========================================
    const removeCustomerHandler = wsService.addMessageHandler(
      'customer-handler',
      (data) => {
        const customerId = data.data?.id || data.data?.user_id;
        
        switch (data.type) {
          case 'customer_created':
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            break;

          case 'customer_updated':
            queryClient.setQueryData(['customers'], (old: any[] | undefined) => {
              if (!old) return old;
              return old.map(customer =>
                (customer.id === customerId || customer.user_id === customerId) 
                  ? { ...customer, ...data.data } 
                  : customer
              );
            });
            break;

          case 'customer_deleted':
            queryClient.setQueryData(['customers'], (old: any[] | undefined) => {
              if (!old) return old;
              return old.filter(customer => 
                customer.id !== customerId && customer.user_id !== customerId
              );
            });
            break;
        }
      },
      { types: ['customer_created', 'customer_updated', 'customer_deleted'], priority: 7 }
    );

    // ==========================================
    // Cart & Favorites Handler (Priority: 9)
    // For user-specific updates
    // ==========================================
    const removeCartHandler = wsService.addMessageHandler(
      'cart-favorites-handler',
      (data) => {
        switch (data.type) {
          case 'cart_updated':
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            break;

          case 'favorites_updated':
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            break;
        }
      },
      { types: ['cart_updated', 'favorites_updated'], priority: 9 }
    );

    // ==========================================
    // Promotion Handler (Priority: 6)
    // ==========================================
    const removePromoHandler = wsService.addMessageHandler(
      'promotion-handler',
      (data) => {
        if (data.type === 'promotion_started' || data.type === 'promotion_ended') {
          // Invalidate product queries to refresh prices
          queryClient.invalidateQueries({ queryKey: ['products'] });
          
          // Add notification for promotions
          if (data.type === 'promotion_started') {
            addNotification({
              id: `promo-${Date.now()}`,
              title: '🎉 عرض جديد!',
              message: data.data?.message || 'تحقق من العروض الجديدة',
              type: 'info',
              read: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      },
      { types: ['promotion_started', 'promotion_ended'], priority: 6 }
    );

    // ==========================================
    // Sync Handler (Priority: 5)
    // Full data refresh when needed
    // ==========================================
    const removeSyncHandler = wsService.addMessageHandler(
      'sync-handler',
      (data) => {
        if (data.type === 'sync') {
          setSyncStatus('syncing');
          fetchData?.()
            .then(() => {
              setSyncStatus('success');
              setTimeout(() => setSyncStatus('idle'), 2000);
            })
            .catch(() => {
              setSyncStatus('error');
            });
        }
      },
      { types: ['sync'], priority: 5 }
    );

    // ==========================================
    // Ping Handler (Priority: 1)
    // ==========================================
    const removePingHandler = wsService.addMessageHandler(
      'ping-handler',
      (data) => {
        if (data.type === 'ping') {
          wsService.send({ type: 'pong' });
        }
      },
      { types: ['ping'], priority: 1 }
    );

    // Cleanup
    return () => {
      unsubscribeState();
      removeNotificationHandler();
      removeOrderHandler();
      removeProductHandler();
      removeCustomerHandler();
      removeCartHandler();
      removePromoHandler();
      removeSyncHandler();
      removePingHandler();
      wsService.disconnect();
    };
  }, [user?.id, queryClient, addNotification, setSyncStatus, fetchData]);

  const sendMessage = useCallback((data: any) => {
    return wsService.send(data);
  }, []);

  const reconnect = useCallback(() => {
    wsService.reconnect();
  }, []);

  return {
    isConnected: wsService.isConnected(),
    connectionState: connectionStateRef.current,
    sendMessage,
    reconnect,
  };
};

/**
 * Hook for subscribing to specific WebSocket event types
 * Use this for component-specific real-time updates
 */
export const useWebSocketEvent = (
  types: WSMessageType[],
  handler: (data: WSMessage) => void,
  enabled: boolean = true
) => {
  const handlerIdRef = useRef(`ws-event-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!enabled) return;

    const removeHandler = wsService.addMessageHandler(
      handlerIdRef.current,
      handler,
      { types, priority: 5 }
    );

    return removeHandler;
  }, [enabled, JSON.stringify(types)]);
};

export default wsService;
