const API_BASE = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `API error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  private async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Upload error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // ─── Generation ─────────────────────────────────────────────────────────
  async generate(payload: {
    prompt: string;
    model?: string;
    style?: string;
    size?: string;
    n?: number;
    projectId?: string;
    controls?: unknown;
  }) {
    return this.request('/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Editing ────────────────────────────────────────────────────────────
  async imageToImage(formData: FormData) {
    return this.upload('/edit/image-to-image', formData);
  }

  async eraseRegion(formData: FormData) {
    return this.upload('/edit/erase-region', formData);
  }

  async inpaint(formData: FormData) {
    return this.upload('/edit/inpaint', formData);
  }

  async replaceBackground(formData: FormData) {
    return this.upload('/edit/replace-background', formData);
  }

  // ─── Tools ──────────────────────────────────────────────────────────────
  async vectorize(formData: FormData) {
    return this.upload('/tools/vectorize', formData);
  }

  async removeBackground(formData: FormData) {
    return this.upload('/tools/remove-background', formData);
  }

  async upscale(formData: FormData) {
    return this.upload('/tools/upscale', formData);
  }

  // ─── Projects ───────────────────────────────────────────────────────────
  async listProjects() {
    return this.request('/projects');
  }

  async getProject(id: string) {
    return this.request(`/projects/${encodeURIComponent(id)}`);
  }

  async createProject(data: { name?: string; canvasData?: unknown }) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; canvasData?: unknown; thumbnail?: string }) {
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ─── Canvas Elements ──────────────────────────────────────────────────
  async listElements(projectId: string) {
    return this.request(`/projects/${encodeURIComponent(projectId)}/elements`);
  }

  async createElement(projectId: string, data: Record<string, unknown>) {
    return this.request(`/projects/${encodeURIComponent(projectId)}/elements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateElements(projectId: string, elements: Record<string, unknown>[]) {
    return this.request(`/projects/${encodeURIComponent(projectId)}/elements`, {
      method: 'PATCH',
      body: JSON.stringify({ elements }),
    });
  }

  async deleteElement(projectId: string, elementId?: string) {
    const query = elementId ? `?elementId=${encodeURIComponent(elementId)}` : '';
    return this.request(`/projects/${encodeURIComponent(projectId)}/elements${query}`, {
      method: 'DELETE',
    });
  }

  // ─── User ──────────────────────────────────────────────────────────────
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async getCredits(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/user/credits${query}`);
  }

  // ─── Images ─────────────────────────────────────────────────────────────
  async listImages(cursor?: string, limit?: number) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/images${query}`);
  }

  // ─── Palettes & Styles ─────────────────────────────────────────────────
  async listPalettes() {
    return this.request('/palettes');
  }

  async createPalette(data: { name?: string; colors: string[]; isExtracted?: boolean }) {
    return this.request('/palettes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listStyles() {
    return this.request('/styles');
  }

  async createStyle(formData: FormData) {
    return this.upload('/styles', formData);
  }
}

export const api = new ApiClient();
