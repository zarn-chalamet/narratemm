import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type AuthResponse } from '../services/authService';

interface AuthState {
  user: AuthResponse['user'] | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register({ name, email, password });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          const message = err.response?.data?.message || 'Registration failed. Please try again.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          // In production, you'd get the idToken from Google SDK
          const response = await authService.loginWithOAuth({
            provider: 'google',
            idToken: 'google-id-token',
          });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          const message = err.response?.data?.message || 'Google login failed.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      loginWithFacebook: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithOAuth({
            provider: 'facebook',
            idToken: 'facebook-id-token',
          });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          const message = err.response?.data?.message || 'Facebook login failed.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      logout: async () => {
        await authService.logout();
        set({ user: null, token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),

      loadUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch {
          localStorage.removeItem('narratemm-token');
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'narratemm-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
