// UI-related types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: string;
}
