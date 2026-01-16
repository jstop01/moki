import type { AuthConfig } from './auth';
import type { EndpointEnvironments } from './environment';

/**
 * Rate limit key source - what to use as the rate limit key
 */
export type RateLimitKeyBy = 'ip' | 'header' | 'query';

/**
 * Rate limit configuration for an endpoint
 */
export interface RateLimitConfig {
  /** Enable/disable rate limiting */
  enabled: boolean;

  /** Maximum requests allowed per time window */
  requestsPerWindow: number;

  /** Time window in seconds (default: 60) */
  windowSeconds?: number;

  /** Burst limit - allows this many extra requests beyond the limit (default: 0) */
  burstLimit?: number;

  /** What to use as the rate limit key */
  keyBy: RateLimitKeyBy;

  /** Header or query param name when keyBy is 'header' or 'query' */
  keyName?: string;

  /** Custom response when rate limited */
  response?: {
    status: number;
    data: any;
  };
}

/**
 * HTTP Methods supported by the Mock API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Delay configuration - can be fixed or random range
 */
export type DelayConfig = number | { min: number; max: number };

/**
 * Status of an endpoint (for future features like enable/disable)
 */
export type EndpointStatus = 'active' | 'inactive';

/**
 * Condition operators for matching query parameters
 */
export type ConditionOperator = 'eq' | 'neq' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';

/**
 * Single condition for matching request
 */
export interface Condition {
  /** Parameter name (query param, header, or body field) */
  field: string;

  /** Where to look for the field */
  source: 'query' | 'header' | 'body';

  /** Comparison operator */
  operator: ConditionOperator;

  /** Value to match against */
  value?: string;
}

/**
 * Conditional response based on request matching
 */
export interface ConditionalResponse {
  /** Name/description of this condition */
  name?: string;

  /** All conditions must match (AND logic) */
  conditions: Condition[];

  /** Response status code when conditions match */
  responseStatus: number;

  /** Response data when conditions match */
  responseData: any;

  /** Optional delay for this specific response (fixed or random range) */
  delay?: DelayConfig;
}

/**
 * Mock API Endpoint configuration
 */
export interface Endpoint {
  /** Unique identifier */
  id: string;
  
  /** HTTP method */
  method: HttpMethod;
  
  /** API path (e.g., /api/users or /api/users/:id) */
  path: string;
  
  /** HTTP status code to return (e.g., 200, 404, 500) */
  responseStatus: number;
  
  /** Response body data (can be any JSON-serializable value) */
  responseData: any;
  
  /** Custom response headers */
  responseHeaders?: Record<string, string>;
  
  /** Simulated delay in milliseconds (fixed or random range) */
  delay?: DelayConfig;

  /** Conditional responses based on query params, headers, or body */
  conditionalResponses?: ConditionalResponse[];

  /** Proxy configuration for forwarding to real API */
  proxyConfig?: ProxyConfig;

  /** Scenario configuration for sequential/random responses */
  scenarioConfig?: ScenarioConfig;

  /** Auth configuration for endpoint protection */
  authConfig?: AuthConfig;

  /** Rate limit configuration */
  rateLimitConfig?: RateLimitConfig;

  /** Environment-specific overrides */
  environmentOverrides?: EndpointEnvironments;

  /** Human-readable description */
  description?: string;

  /** Endpoint status */
  status?: EndpointStatus;

  /** Tags for categorization */
  tags?: string[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a new endpoint
 */
export interface CreateEndpointDto {
  method: HttpMethod;
  path: string;
  responseStatus: number;
  responseData: any;
  responseHeaders?: Record<string, string>;
  delay?: DelayConfig;
  conditionalResponses?: ConditionalResponse[];
  proxyConfig?: ProxyConfig;
  scenarioConfig?: ScenarioConfig;
  authConfig?: AuthConfig;
  rateLimitConfig?: RateLimitConfig;
  environmentOverrides?: EndpointEnvironments;
  description?: string;
  status?: EndpointStatus;
  tags?: string[];
}

/**
 * DTO for updating an endpoint
 */
export interface UpdateEndpointDto {
  method?: HttpMethod;
  path?: string;
  responseStatus?: number;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  delay?: DelayConfig;
  conditionalResponses?: ConditionalResponse[];
  proxyConfig?: ProxyConfig;
  scenarioConfig?: ScenarioConfig;
  authConfig?: AuthConfig;
  rateLimitConfig?: RateLimitConfig;
  environmentOverrides?: EndpointEnvironments;
  description?: string;
  status?: EndpointStatus;
  tags?: string[];
}

/**
 * Proxy configuration for forwarding requests to real API
 */
export interface ProxyConfig {
  enabled: boolean;
  targetUrl: string;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  cacheResponse?: boolean;
  cacheTtl?: number; // Cache TTL in seconds
}

/**
 * Scenario mode type
 * - sequential: 순차적 응답 (1번째, 2번째, 3번째...)
 * - random: 랜덤 응답
 * - weighted: 가중치 기반 랜덤
 */
export type ScenarioMode = 'sequential' | 'random' | 'weighted';

/**
 * Single scenario response
 */
export interface ScenarioResponse {
  /** Response order (for sequential mode) */
  order?: number;

  /** Weight for random selection (for weighted mode) */
  weight?: number;

  /** Name/description of this scenario */
  name?: string;

  /** Response status code */
  responseStatus: number;

  /** Response data */
  responseData: any;

  /** Optional delay */
  delay?: DelayConfig;
}

/**
 * Scenario configuration for sequential/random responses
 */
export interface ScenarioConfig {
  /** Enable/disable scenario mode */
  enabled: boolean;

  /** Scenario mode type */
  mode: ScenarioMode;

  /** Reset counter after N seconds (0 = never reset) */
  resetAfter?: number;

  /** Loop back to first response after last (for sequential mode) */
  loop?: boolean;

  /** Scenario responses */
  responses: ScenarioResponse[];
}

/**
 * Response History - tracks changes to endpoints
 */
export interface ResponseHistory {
  id: string;
  endpointId: string;
  timestamp: Date;
  action: 'create' | 'update' | 'delete';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  snapshot: Partial<Endpoint>;
}

/**
 * Response wrapper for API operations
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
