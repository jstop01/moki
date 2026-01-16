/**
 * API Client for Backend Communication
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface BackendEndpoint {
  id: string;
  method: string;
  path: string;
  responseStatus: number;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  description?: string;
  tags?: string[];
  status: 'active' | 'inactive';
  delay?: number;
  createdAt: string;
  updatedAt: string;
}

interface BackendLog {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseTime: number;
  timestamp: string;
}

// Frontend types
import { Endpoint, Rule, RequestLog, HttpMethod } from '@/app/types';

/**
 * Convert backend endpoint to frontend format
 */
function toFrontendEndpoint(be: BackendEndpoint): Endpoint {
  return {
    id: be.id,
    name: be.description || be.path,
    method: be.method as HttpMethod,
    path: be.path,
    enabled: be.status === 'active',
    tags: be.tags,
    createdAt: be.createdAt,
    updatedAt: be.updatedAt,
  };
}

/**
 * Convert frontend endpoint to backend format
 */
function toBackendEndpoint(fe: Endpoint & { responseStatus?: number; responseData?: any; delay?: number }): Partial<BackendEndpoint> {
  return {
    method: fe.method,
    path: fe.path,
    description: fe.name,
    status: fe.enabled ? 'active' : 'inactive',
    tags: fe.tags,
    responseStatus: fe.responseStatus || 200,
    responseData: fe.responseData || { message: 'OK' },
    delay: fe.delay,
  };
}

/**
 * Convert backend log to frontend format
 */
function toFrontendLog(be: BackendLog): RequestLog {
  return {
    id: be.id,
    timestamp: be.timestamp,
    method: be.method as HttpMethod,
    path: be.path,
    query: be.query,
    headers: be.requestHeaders,
    body: be.requestBody ? JSON.stringify(be.requestBody) : undefined,
    responseStatus: be.responseStatus,
    responseTimeMs: be.responseTime,
  };
}

/**
 * API Client
 */
export const api = {
  // ============================================
  // ENDPOINTS
  // ============================================

  async getEndpoints(): Promise<Endpoint[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/endpoints`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data.map(toFrontendEndpoint);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
      return [];
    }
  },

  async getEndpoint(id: string): Promise<Endpoint | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/endpoints/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        return toFrontendEndpoint(json.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch endpoint:', error);
      return null;
    }
  },

  async createEndpoint(endpoint: Endpoint & { responseStatus?: number; responseData?: any }): Promise<Endpoint | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBackendEndpoint(endpoint)),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return toFrontendEndpoint(json.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to create endpoint:', error);
      return null;
    }
  },

  async updateEndpoint(id: string, endpoint: Partial<Endpoint> & { responseStatus?: number; responseData?: any; delay?: number }): Promise<Endpoint | null> {
    try {
      const updateData: any = {};
      if (endpoint.name !== undefined) updateData.description = endpoint.name;
      if (endpoint.method !== undefined) updateData.method = endpoint.method;
      if (endpoint.path !== undefined) updateData.path = endpoint.path;
      if (endpoint.enabled !== undefined) updateData.status = endpoint.enabled ? 'active' : 'inactive';
      if (endpoint.tags !== undefined) updateData.tags = endpoint.tags;
      if (endpoint.responseStatus !== undefined) updateData.responseStatus = endpoint.responseStatus;
      if (endpoint.responseData !== undefined) updateData.responseData = endpoint.responseData;
      if (endpoint.delay !== undefined) updateData.delay = endpoint.delay;

      const res = await fetch(`${API_BASE_URL}/api/admin/endpoints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const json = await res.json();
      if (json.success && json.data) {
        return toFrontendEndpoint(json.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to update endpoint:', error);
      return null;
    }
  },

  async deleteEndpoint(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/endpoints/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json.success === true;
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      return false;
    }
  },

  // ============================================
  // LOGS
  // ============================================

  async getLogs(): Promise<RequestLog[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/logs`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data.map(toFrontendLog);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    }
  },

  async getLogStats(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/logs/stats`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
      return null;
    }
  },

  async clearLogs(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/logs`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json.success === true;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  },

  // ============================================
  // IMPORT/EXPORT
  // ============================================

  async exportData(): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/export`);
      const json = await res.json();
      return JSON.stringify(json, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '{}';
    }
  },

  async importData(jsonString: string, options?: { replace?: boolean }): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      const res = await fetch(`${API_BASE_URL}/api/admin/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          options: options || { replace: false },
        }),
      });
      const json = await res.json();
      return json.success === true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/health`);
      const json = await res.json();
      return json.status === 'ok';
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  },
};
