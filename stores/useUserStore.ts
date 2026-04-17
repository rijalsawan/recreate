import { create } from 'zustand';
import { UserProfile, UserState } from '../types/user.types';
import { api } from '../lib/api';

interface UserStore extends UserState {
  fetchProfile: () => Promise<void>;
  deductCredits: (amount: number) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: {
    id: 'user_1',
    email: 'creator@recraft-saas.demo',
    name: 'Alex Design',
    credits: 1250,
    plan: 'pro'
  },
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getUserProfile();
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deductCredits: (amount: number) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, credits: Math.max(0, user.credits - amount) } });
    }
  }
}));
