import { create } from "zustand";
import { api, type AuthResponse } from "../../api/client";
import { applyTheme } from "../../lib/theme";

interface AuthState {
  user: AuthResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  load: () => Promise<void>;
  clearSession: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (email, password) => {
    const user = await api.auth.login({ email, password });
    applyTheme(user.theme_preference);
    set({ user });
  },
  register: async (email, password, name) => {
    const user = await api.auth.register({ email, password, name });
    applyTheme(user.theme_preference);
    set({ user });
  },
  logout: async () => {
    await api.auth.logout();
    set({ user: null });
  },
  load: async () => {
    try {
      const user = await api.auth.me();
      applyTheme(user.theme_preference);
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  clearSession: () => {
    set({ user: null, loading: false });
  },
}));
