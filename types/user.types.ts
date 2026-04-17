export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  credits: number;
  plan: 'free' | 'pro' | 'business';
}

export interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface CreditsResponse {
  balance: number;
}
