import { create } from 'zustand';

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface CartItem {
  product_id: string;
  quantity: number;
  product?: any;
}

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  
  // Auth
  user: User | null;
  sessionToken: string | null;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  logout: () => void;
  
  // Cart
  cartItems: CartItem[];
  cartCount: number;
  setCartItems: (items: CartItem[]) => void;
  addToLocalCart: (item: CartItem) => void;
  updateLocalCartItem: (productId: string, quantity: number) => void;
  removeFromLocalCart: (productId: string) => void;
  clearLocalCart: () => void;
}

export const useAppStore = create<AppState>()(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      
      // Language
      language: 'ar',
      setLanguage: (language) => set({ language }),
      
      // Auth
      user: null,
      sessionToken: null,
      setUser: (user) => set({ user }),
      setSessionToken: (sessionToken) => set({ sessionToken }),
      logout: () => set({ user: null, sessionToken: null, cartItems: [], cartCount: 0 }),
      
      // Cart
      cartItems: [],
      cartCount: 0,
      setCartItems: (items) => set({ 
        cartItems: items, 
        cartCount: items.reduce((sum, item) => sum + item.quantity, 0) 
      }),
      addToLocalCart: (item) => set((state) => {
        const existing = state.cartItems.find(i => i.product_id === item.product_id);
        if (existing) {
          const updated = state.cartItems.map(i => 
            i.product_id === item.product_id 
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
          return { cartItems: updated, cartCount: updated.reduce((sum, i) => sum + i.quantity, 0) };
        }
        const newItems = [...state.cartItems, item];
        return { cartItems: newItems, cartCount: newItems.reduce((sum, i) => sum + i.quantity, 0) };
      }),
      updateLocalCartItem: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          const filtered = state.cartItems.filter(i => i.product_id !== productId);
          return { cartItems: filtered, cartCount: filtered.reduce((sum, i) => sum + i.quantity, 0) };
        }
        const updated = state.cartItems.map(i => 
          i.product_id === productId ? { ...i, quantity } : i
        );
        return { cartItems: updated, cartCount: updated.reduce((sum, i) => sum + i.quantity, 0) };
      }),
      removeFromLocalCart: (productId) => set((state) => {
        const filtered = state.cartItems.filter(i => i.product_id !== productId);
        return { cartItems: filtered, cartCount: filtered.reduce((sum, i) => sum + i.quantity, 0) };
      }),
      clearLocalCart: () => set({ cartItems: [], cartCount: 0 }),
    })
);
