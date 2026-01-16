import type {
  Endpoint,
  CreateEndpointDto,
  UpdateEndpointDto,
  ApiResponse,
  RequestLog,
  LogStats,
  ExportData,
  ImportResult,
  HealthCheck,
} from '@mock-api-builder/shared';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Request failed',
        }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ============================================
  // ENDPOINT APIs
  // ============================================

  async getEndpoints(): Promise<ApiResponse<Endpoint[]>> {
    return this.request<Endpoint[]>('/api/admin/endpoints');
  }

  async getEndpoint(id: string): Promise<ApiResponse<Endpoint>> {
    return this.request<Endpoint>(`/api/admin/endpoints/${id}`);
  }

  async createEndpoint(data: CreateEndpointDto): Promise<ApiResponse<Endpoint>> {
    return this.request<Endpoint>('/api/admin/endpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEndpoint(
    id: string,
    data: UpdateEndpointDto
  ): Promise<ApiResponse<Endpoint>> {
    return this.request<Endpoint>(`/api/admin/endpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEndpoint(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/admin/endpoints/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // LOG APIs
  // ============================================

  async getLogs(options?: {
    endpointId?: string;
    method?: string;
    status?: number;
    limit?: number;
  }): Promise<ApiResponse<RequestLog[]>> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request<RequestLog[]>(
      `/api/admin/logs${query ? `?${query}` : ''}`
    );
  }

  async getLogStats(): Promise<ApiResponse<LogStats>> {
    return this.request<LogStats>('/api/admin/logs/stats');
  }

  async clearLogs(): Promise<ApiResponse<null>> {
    return this.request<null>('/api/admin/logs', {
      method: 'DELETE',
    });
  }

  // ============================================
  // IMPORT/EXPORT APIs
  // ============================================

  async exportData(): Promise<ExportData | null> {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/export`);
      if (!response.ok) throw new Error('Export failed');
      return await response.json();
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }

  async importData(
    data: ExportData,
    options?: { replace?: boolean; skipInvalid?: boolean }
  ): Promise<ApiResponse<ImportResult>> {
    const params = new URLSearchParams();
    if (options?.replace) params.append('replace', 'true');
    if (options?.skipInvalid) params.append('skipInvalid', 'true');

    const query = params.toString();
    return this.request<ImportResult>(
      `/api/admin/import${query ? `?${query}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<HealthCheck | null> {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/health`);
      if (!response.ok) throw new Error('Health check failed');
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return null;
    }
  }

  // ============================================
  // UTILITY
  // ============================================

  getMockUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${BASE_URL}/mock/${cleanPath}`;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
