/**
 * HTTP Methods supported by the Mock API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

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

  /** Optional delay for this specific response */
  delay?: number;
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
  
  /** Simulated delay in milliseconds */
  delay?: number;

  /** Conditional responses based on query params, headers, or body */
  conditionalResponses?: ConditionalResponse[];

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
  delay?: number;
  conditionalResponses?: ConditionalResponse[];
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
  delay?: number;
  conditionalResponses?: ConditionalResponse[];
  description?: string;
  status?: EndpointStatus;
  tags?: string[];
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
