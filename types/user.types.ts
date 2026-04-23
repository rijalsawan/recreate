export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  credits: number;
  plan: 'free' | 'pro' | 'business';
  role: 'USER' | 'ADMIN';
}

export interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface CreditsResponse {
  balance: number;
}
