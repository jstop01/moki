import { Endpoint, Rule, RuleCondition, RequestLog } from '@/app/types';
import { storage } from './storage';

export interface MockRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  delayMs: number;
  matchedRuleId?: string;
}

export class MockRuntime {
  private static instance: MockRuntime;

  static getInstance(): MockRuntime {
    if (!MockRuntime.instance) {
      MockRuntime.instance = new MockRuntime();
    }
    return MockRuntime.instance;
  }

  async handleRequest(request: MockRequest): Promise<MockResponse | { error: string }> {
    const startTime = Date.now();

    try {
      // Find matching endpoint
      const endpoint = this.findMatchingEndpoint(request.method, request.path);
      if (!endpoint || !endpoint.enabled) {
        return { error: 'Endpoint not found or disabled' };
      }

      // Find matching rule
      const rules = storage.getRules(endpoint.id);
      const matchedRule = this.findMatchingRule(rules, request);

      if (!matchedRule) {
        return { error: 'No matching rule found' };
      }

      // Log the request
      const responseTimeMs = Date.now() - startTime + matchedRule.delayMs;
      this.logRequest(request, matchedRule, responseTimeMs);

      // Return mock response
      return {
        status: matchedRule.responseStatus,
        headers: {
          ...matchedRule.responseHeaders,
          'X-Mock-Endpoint-Id': endpoint.id,
          'X-Mock-Rule-Id': matchedRule.id,
          'X-Mock-Delay': matchedRule.delayMs.toString(),
        },
        body: matchedRule.responseBody,
        delayMs: matchedRule.delayMs,
        matchedRuleId: matchedRule.id,
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  private findMatchingEndpoint(method: string, path: string): Endpoint | null {
    const endpoints = storage.getEndpoints();
    
    for (const endpoint of endpoints) {
      if (endpoint.method !== method) continue;
      
      // Exact match
      if (endpoint.path === path) {
        return endpoint;
      }
      
      // Path parameter match (e.g., /api/users/:id)
      if (endpoint.path.includes(':')) {
        const pattern = endpoint.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(path)) {
          return endpoint;
        }
      }
    }
    
    return null;
  }

  private findMatchingRule(rules: Rule[], request: MockRequest): Rule | null {
    // Sort by priority (lower number = higher priority)
    const sortedRules = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.checkConditions(rule.conditions, request)) {
        return rule;
      }
    }

    return null;
  }

  private checkConditions(conditions: RuleCondition[], request: MockRequest): boolean {
    // No conditions means match all
    if (conditions.length === 0) {
      return true;
    }

    // All conditions must match
    for (const condition of conditions) {
      if (!this.checkCondition(condition, request)) {
        return false;
      }
    }

    return true;
  }

  private checkCondition(condition: RuleCondition, request: MockRequest): boolean {
    let actualValue: string | undefined;

    switch (condition.type) {
      case 'query':
        actualValue = request.query?.[condition.key];
        break;
      case 'header':
        actualValue = request.headers?.[condition.key.toLowerCase()];
        break;
      case 'body':
        if (request.body) {
          try {
            const bodyObj = JSON.parse(request.body);
            actualValue = this.getNestedValue(bodyObj, condition.key);
          } catch {
            actualValue = undefined;
          }
        }
        break;
    }

    switch (condition.operator) {
      case 'exists':
        return actualValue !== undefined;
      case 'equals':
        return actualValue === condition.value;
      case 'contains':
        return actualValue?.includes(condition.value || '') || false;
      case 'regex':
        if (!condition.value) return false;
        try {
          const regex = new RegExp(condition.value);
          return regex.test(actualValue || '');
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): string | undefined {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return undefined;
    }
    return String(value);
  }

  private logRequest(request: MockRequest, rule: Rule, responseTimeMs: number): void {
    const log: RequestLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      method: request.method as any,
      path: request.path,
      query: request.query,
      headers: request.headers,
      body: request.body,
      matchedRuleId: rule.id,
      responseStatus: rule.responseStatus,
      responseTimeMs,
    };

    storage.addLog(log);
  }
}
