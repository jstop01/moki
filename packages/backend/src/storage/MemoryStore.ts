import { nanoid } from 'nanoid';
import {
  Endpoint,
  CreateEndpointDto,
  UpdateEndpointDto,
  RequestLog,
  CreateLogDto,
  LogFilterOptions,
  LogStats,
  MAX_LOGS,
} from '@mock-api-builder/shared';
import { fileStore } from './FileStore';

/**
 * In-memory storage for endpoints and logs
 * With file persistence support
 */
export class MemoryStore {
  private endpoints: Map<string, Endpoint> = new Map();
  private logs: RequestLog[] = [];
  private autoSave: boolean = true;

  // ============================================
  // FILE PERSISTENCE
  // ============================================

  /**
   * 파일에서 데이터 로드
   */
  loadFromFile(): void {
    try {
      const endpoints = fileStore.loadEndpoints();
      this.endpoints.clear();

      endpoints.forEach((endpoint) => {
        this.endpoints.set(endpoint.id, endpoint);
      });

      console.log(`✅ Loaded ${endpoints.length} endpoints from file`);
    } catch (error) {
      console.error('❌ Failed to load from file:', error);
    }
  }

  /**
   * 파일에 저장
   */
  private saveToFile(): void {
    if (!this.autoSave) return;

    try {
      const endpoints = Array.from(this.endpoints.values());
      fileStore.saveEndpoints(endpoints);
    } catch (error) {
      console.error('❌ Failed to save to file:', error);
    }
  }

  /**
   * 자동 저장 활성화/비활성화
   */
  setAutoSave(enabled: boolean): void {
    this.autoSave = enabled;
  }

  // ============================================
  // ENDPOINT OPERATIONS
  // ============================================

  /**
   * Create a new endpoint
   */
  createEndpoint(dto: CreateEndpointDto): Endpoint {
    const now = new Date();
    const endpoint: Endpoint = {
      id: nanoid(),
      ...dto,
      status: dto.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.saveToFile(); // 자동 저장
    return endpoint;
  }

  /**
   * Get endpoint by ID
   */
  getEndpoint(id: string): Endpoint | null {
    return this.endpoints.get(id) || null;
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints(): Endpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Update an endpoint
   */
  updateEndpoint(id: string, dto: UpdateEndpointDto): Endpoint | null {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;

    const updated: Endpoint = {
      ...endpoint,
      ...dto,
      updatedAt: new Date(),
    };

    this.endpoints.set(id, updated);
    this.saveToFile(); // 자동 저장
    return updated;
  }

  /**
   * Delete an endpoint
   */
  deleteEndpoint(id: string): boolean {
    const deleted = this.endpoints.delete(id);
    if (deleted) {
      this.saveToFile(); // 자동 저장
    }
    return deleted;
  }

  /**
   * Find endpoint by method and path
   * Supports exact match and path parameters (e.g., /users/:id)
   */
  findEndpointByPath(method: string, path: string): Endpoint | null {
    const endpoints = Array.from(this.endpoints.values());

    // First, try exact match
    const exactMatch = endpoints.find(
      (ep) => ep.method === method && ep.path === path && ep.status === 'active'
    );
    if (exactMatch) return exactMatch;

    // Then, try pattern matching for path parameters
    for (const endpoint of endpoints) {
      if (endpoint.method !== method || endpoint.status !== 'active') continue;

      if (this.matchPath(endpoint.path, path)) {
        return endpoint;
      }
    }

    return null;
  }

  /**
   * Match path with parameters (e.g., /users/:id matches /users/123)
   */
  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      // If it's a parameter (starts with :), it matches anything
      if (patternPart.startsWith(':')) continue;

      // Otherwise, must be exact match
      if (patternPart !== pathPart) return false;
    }

    return true;
  }

  /**
   * Clear all endpoints
   */
  clearEndpoints(): void {
    this.endpoints.clear();
    this.saveToFile(); // 자동 저장
  }

  // ============================================
  // LOG OPERATIONS
  // ============================================

  /**
   * Add a request log
   */
  addLog(dto: CreateLogDto): RequestLog {
    const log: RequestLog = {
      id: nanoid(),
      ...dto,
      timestamp: new Date(),
    };

    this.logs.unshift(log); // Add to beginning for newest first

    // Trim logs if exceeding max
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    return log;
  }

  /**
   * Get logs with optional filters
   */
  getLogs(options?: LogFilterOptions): RequestLog[] {
    let filtered = [...this.logs];

    if (options) {
      if (options.endpointId) {
        filtered = filtered.filter((log) => log.endpointId === options.endpointId);
      }

      if (options.method) {
        filtered = filtered.filter((log) => log.method === options.method);
      }

      if (options.status) {
        filtered = filtered.filter((log) => log.responseStatus === options.status);
      }

      if (options.searchPath) {
        filtered = filtered.filter((log) =>
          log.path.toLowerCase().includes(options.searchPath!.toLowerCase())
        );
      }

      if (options.startDate) {
        filtered = filtered.filter((log) => log.timestamp >= options.startDate!);
      }

      if (options.endDate) {
        filtered = filtered.filter((log) => log.timestamp <= options.endDate!);
      }

      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }
    }

    return filtered;
  }

  /**
   * Get log statistics
   */
  getLogStats(): LogStats {
    const byMethod: Record<string, number> = {};
    const byStatus: Record<number, number> = {};
    const endpointCounts: Record<string, { path: string; count: number }> = {};
    let totalResponseTime = 0;

    for (const log of this.logs) {
      // By method
      byMethod[log.method] = (byMethod[log.method] || 0) + 1;

      // By status
      byStatus[log.responseStatus] = (byStatus[log.responseStatus] || 0) + 1;

      // Response time
      totalResponseTime += log.responseTime;

      // Endpoint counts
      if (!endpointCounts[log.endpointId]) {
        endpointCounts[log.endpointId] = { path: log.path, count: 0 };
      }
      endpointCounts[log.endpointId].count++;
    }

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpointId, data]) => ({
        endpointId,
        path: data.path,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.logs.length,
      byMethod,
      byStatus,
      avgResponseTime: this.logs.length > 0 ? totalResponseTime / this.logs.length : 0,
      topEndpoints,
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get total counts
   */
  getCounts() {
    return {
      endpoints: this.endpoints.size,
      logs: this.logs.length,
    };
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();
