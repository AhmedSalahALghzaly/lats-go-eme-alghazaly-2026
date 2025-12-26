import axios from 'axios';
import Constants from 'expo-constants';
import { useAppStore } from '../store/appStore';

// Get the backend URL from environment variables
const getApiUrl = () => {
  // Try to get from extra config
  const extraUrl = Constants.expoConfig?.extra?.backendUrl;
  if (extraUrl) return extraUrl;
  
  // Try process.env (works in some cases)
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;
  
  // Default fallback - use relative URL for API
  return '';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().sessionToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API functions
export const authApi = {
  exchangeSession: (sessionId: string) => 
    api.post('/auth/session', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const carBrandsApi = {
  getAll: () => api.get('/car-brands'),
  create: (data: any) => api.post('/car-brands', data),
  delete: (id: string) => api.delete(`/car-brands/${id}`),
};

export const carModelsApi = {
  getAll: (brandId?: string) => api.get('/car-models', { params: { brand_id: brandId } }),
  getById: (id: string) => api.get(`/car-models/${id}`),
  create: (data: any) => api.post('/car-models', data),
  update: (id: string, data: any) => api.put(`/car-models/${id}`, data),
  delete: (id: string) => api.delete(`/car-models/${id}`),
};

export const productBrandsApi = {
  getAll: () => api.get('/product-brands'),
  create: (data: any) => api.post('/product-brands', data),
  delete: (id: string) => api.delete(`/product-brands/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get('/categories/all'),
  getTree: () => api.get('/categories/tree'),
  getByParent: (parentId?: string) => api.get('/categories', { params: { parent_id: parentId } }),
  create: (data: any) => api.post('/categories', data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getAllAdmin: () => api.get('/products/all'),
  getById: (id: string) => api.get(`/products/${id}`),
  search: (query: string) => api.get('/products/search', { params: { q: query } }),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  updatePrice: (id: string, price: number) => api.patch(`/products/${id}/price`, { price }),
  updateHidden: (id: string, hidden_status: boolean) => api.patch(`/products/${id}/hidden`, { hidden_status }),
};

export const customersApi = {
  getAll: () => api.get('/customers'),
  getById: (id: string) => api.get(`/customers/${id}`),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (productId: string, quantity: number = 1) => 
    api.post('/cart/add', { product_id: productId, quantity }),
  updateItem: (productId: string, quantity: number) => 
    api.put('/cart/update', { product_id: productId, quantity }),
  clear: () => api.delete('/cart/clear'),
};

export const ordersApi = {
  getAll: () => api.get('/orders'),
  getAllAdmin: () => api.get('/orders/all'),
  getById: (id: string) => api.get(`/orders/${id}`),
  getPendingCount: (userId: string) => api.get(`/orders/pending-count/${userId}`),
  create: (data: any) => api.post('/orders', data),
  markViewed: (id: string) => api.patch(`/orders/${id}/viewed`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status?status=${status}`),
};

// Comments API
export const commentsApi = {
  getProductComments: (productId: string, skip: number = 0, limit: number = 50) =>
    api.get(`/products/${productId}/comments`, { params: { skip, limit } }),
  addComment: (productId: string, text: string, rating?: number) =>
    api.post(`/products/${productId}/comments`, { text, rating }),
  updateComment: (commentId: string, text: string, rating?: number) =>
    api.put(`/comments/${commentId}`, { text, rating }),
  deleteComment: (commentId: string) =>
    api.delete(`/comments/${commentId}`),
};

// Favorites API
export const favoritesApi = {
  getAll: () => api.get('/favorites'),
  check: (productId: string) => api.get(`/favorites/check/${productId}`),
  add: (productId: string) => api.post('/favorites/add', { product_id: productId }),
  remove: (productId: string) => api.delete(`/favorites/${productId}`),
  toggle: (productId: string) => api.post('/favorites/toggle', { product_id: productId }),
};

export default api;
