import type {
  GenerateImageRequest,
  ImageToImageRequest,
  VectorizeRequest,
  RemoveBackgroundRequest,
  ReplaceBackgroundRequest,
  UpscaleRequest,
  CreateStyleRequest,
  EraseRegionRequest,
  RecraftGenerateResponse,
  RecraftStyleResponse,
  RecraftUserResponse,
} from '@/types/recraft.types';

const BASE_URL = process.env.RECRAFT_API_BASE || 'https://external.api.recraft.ai/v1';
const API_KEY = process.env.RECRAFT_API_KEY || '';

class RecraftService {
  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...init.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Recraft API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  private jsonRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private formRequest<T>(path: string, form: FormData): Promise<T> {
    // Don't set Content-Type — fetch will set multipart boundary automatically
    return this.request<T>(path, { method: 'POST', body: form });
  }

  // ─── Generation ─────────────────────────────────────────────────────────

  async generateImage(params: GenerateImageRequest): Promise<RecraftGenerateResponse> {
    return this.jsonRequest('/images/generations', params as unknown as Record<string, unknown>);
  }

  // ─── Image-to-Image ────────────────────────────────────────────────────

  async imageToImage(params: ImageToImageRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    form.append('prompt', params.prompt);
    if (params.model) form.append('model', params.model);
    if (params.style) form.append('style', params.style);
    if (params.substyle) form.append('substyle', params.substyle);
    if (params.n) form.append('n', String(params.n));
    if (params.response_format) form.append('response_format', params.response_format);
    if (params.strength !== undefined) form.append('strength', String(params.strength));

    return this.formRequest('/images/imageToImage', form);
  }

  // ─── Vectorize ─────────────────────────────────────────────────────────

  async vectorize(params: VectorizeRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/vectorize', form);
  }

  // ─── Background Operations ─────────────────────────────────────────────

  async removeBackground(params: RemoveBackgroundRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/removeBackground', form);
  }

  async replaceBackground(params: ReplaceBackgroundRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    form.append('prompt', params.prompt);
    if (params.model) form.append('model', params.model);
    if (params.style) form.append('style', params.style);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/replaceBackground', form);
  }

  // ─── Upscaling ─────────────────────────────────────────────────────────

  async crispUpscale(params: UpscaleRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/crispUpscale', form);
  }

  async creativeUpscale(params: UpscaleRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/creativeUpscale', form);
  }

  // ─── Erase Region ──────────────────────────────────────────────────────

  async eraseRegion(params: EraseRegionRequest): Promise<RecraftGenerateResponse> {
    const form = new FormData();
    form.append('image', params.image);
    form.append('mask', params.mask);
    if (params.response_format) form.append('response_format', params.response_format);

    return this.formRequest('/images/eraseRegion', form);
  }

  // ─── Styles ─────────────────────────────────────────────────────────────

  async createStyle(params: CreateStyleRequest): Promise<RecraftStyleResponse> {
    const form = new FormData();
    form.append('style', params.style);
    params.images.forEach((img) => form.append('images', img));

    return this.formRequest('/styles', form);
  }

  // ─── User ───────────────────────────────────────────────────────────────

  async getUser(): Promise<RecraftUserResponse> {
    return this.request('/user', { method: 'GET' });
  }
}

export const recraft = new RecraftService();
