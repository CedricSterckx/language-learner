import type {
  AuthResponse,
  GoogleAuthRequest,
  VocabularyUnitsResponse,
  VocabularyUnitResponse,
  SessionResponse,
  SaveSessionRequest,
  SettingsResponse,
  UpdateSettingsRequest,
  ProgressResponse,
  MarkEasyRequest,
  UpdateProgressRequest,
  MigrateLocalStorageRequest,
  MigrateLocalStorageResponse,
} from '@language-learner/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async loginWithGoogle(code: string, redirectUri: string): Promise<AuthResponse> {
    const body: GoogleAuthRequest = { code, redirectUri };
    return this.request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/me');
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  // Vocabulary
  async getUnits(): Promise<VocabularyUnitsResponse> {
    return this.request<VocabularyUnitsResponse>('/api/vocabulary/units');
  }

  async getUnit(unitId: string): Promise<VocabularyUnitResponse> {
    return this.request<VocabularyUnitResponse>(`/api/vocabulary/${unitId}`);
  }

  // Session
  async getSession(unitId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>(`/api/session/${unitId}`);
  }

  async saveSession(unitId: string, data: SaveSessionRequest): Promise<{ success: boolean }> {
    return this.request(`/api/session/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(unitId: string): Promise<{ success: boolean }> {
    return this.request(`/api/session/${unitId}`, { method: 'DELETE' });
  }

  // Settings
  async getSettings(): Promise<SettingsResponse> {
    return this.request<SettingsResponse>('/api/settings');
  }

  async updateSettings(data: UpdateSettingsRequest): Promise<{ success: boolean }> {
    return this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Progress
  async getProgress(unitId: string): Promise<ProgressResponse> {
    return this.request<ProgressResponse>(`/api/progress/${unitId}`);
  }

  async markEasy(unitId: string, data: MarkEasyRequest): Promise<{ success: boolean }> {
    return this.request(`/api/progress/${unitId}/mark-easy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateProgress(unitId: string, data: UpdateProgressRequest): Promise<{ success: boolean }> {
    return this.request(`/api/progress/${unitId}/update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Migration
  async migrateFromLocalStorage(data: MigrateLocalStorageRequest): Promise<MigrateLocalStorageResponse> {
    return this.request<MigrateLocalStorageResponse>('/api/migrate/from-localstorage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_URL);

