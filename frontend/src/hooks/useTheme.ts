import { useAppStore } from '../store/appStore';

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#10B981',
  accent: '#F59E0B',
  border: '#E5E5E5',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  shadow: 'rgba(0, 0, 0, 0.1)',
  inputBackground: '#F9FAFB',
  tabBar: '#FFFFFF',
  tabBarActive: '#2563EB',
  tabBarInactive: '#9CA3AF',
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#10B981',
  accent: '#F59E0B',
  border: '#334155',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  shadow: 'rgba(0, 0, 0, 0.3)',
  inputBackground: '#1E293B',
  tabBar: '#1E293B',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#64748B',
};

export type ThemeColors = typeof lightTheme;

export const useTheme = () => {
  const theme = useAppStore((state) => state.theme);
  const colors = theme === 'light' ? lightTheme : darkTheme;
  const isDark = theme === 'dark';
  
  return { colors, isDark, theme };
};
