import { GenerationResponse } from '../types/tool.types';
import { CreditsResponse, UserProfile } from '../types/user.types';

const API_BASE = '/api';

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'An error occurred with the API request.');
    }

    return res.json() as Promise<T>;
  }

  // Uses FormData for file uploads + prompt data (where applicable)
  private async fetchFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'An error occurred with the file upload.');
    }

    return res.json() as Promise<T>;
  }

  // Tools
  async generateTextToImage(payload: { prompt: string; model: string; style?: string; size?: string }): Promise<GenerationResponse[]> {
    // Stub implementation that would typically map to POST /images/generations
    return this.fetch<GenerationResponse[]>('/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async removeBackground(formData: FormData): Promise<GenerationResponse> {
    return this.fetchFormData<GenerationResponse>('/remove-bg', formData);
  }

  // Users
  async getUserProfile(): Promise<UserProfile> {
    return this.fetch<UserProfile>('/users/me');
  }
}

export const api = new ApiClient();
