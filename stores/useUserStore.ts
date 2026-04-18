import { create } from 'zustand';
import { UserProfile, UserState } from '../types/user.types';

interface UserStore extends UserState {
  setUser: (user: UserProfile | null) => void;
  deductCredits: (amount: number) => void;
  refreshCredits: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),

  refreshCredits: async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        const { user } = get();
        if (user) {
          set({ user: { ...user, credits: data.credits } });
        }
      }
    } catch {
      // silently fail — stale credits are acceptable
    }
  },

  deductCredits: (amount: number) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, credits: Math.max(0, user.credits - amount) } });
    }
  }
}));
