import { create } from 'zustand';

interface AuthModalState {
  isOpen: boolean;
  view: 'login' | 'signup';
  openModal: (view?: 'login' | 'signup') => void;
  closeModal: () => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'signup',
  openModal: (view = 'signup') => set({ isOpen: true, view }),
  closeModal: () => set({ isOpen: false }),
}));
