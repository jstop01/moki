/**
 * Request log entry for tracking Mock API calls
 */
export interface RequestLog {
  /** Unique log identifier */
  id: string;
  
  /** ID of the endpoint that handled this request */
  endpointId: string;
  
  /** HTTP method of the request */
  method: string;
  
  /** Request path */
  path: string;
  
  /** Full URL that was called */
  url: string;
  
  /** Query parameters */
  queryParams?: Record<string, string>;
  
  /** Request headers */
  requestHeaders: Record<string, string>;
  
  /** Request body (for POST/PUT/PATCH) */
  requestBody?: any;
  
  /** Response status code that was returned */
  responseStatus: number;
  
  /** Response body that was returned */
  responseData?: any;
  
  /** Response time in milliseconds */
  responseTime: number;
  
  /** Timestamp of the request */
  timestamp: Date;
  
  /** Client IP address */
  clientIp?: string;
  
  /** User agent */
  userAgent?: string;
}

/**
 * DTO for creating a log entry
 */
export interface CreateLogDto {
  endpointId: string;
  method: string;
  path: string;
  url: string;
  queryParams?: Record<string, string>;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseData?: any;
  responseTime: number;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Log statistics
 */
export interface LogStats {
  /** Total number of requests */
  totalRequests: number;
  
  /** Requests by method */
  byMethod: Record<string, number>;
  
  /** Requests by status code */
  byStatus: Record<number, number>;
  
  /** Average response time */
  avgResponseTime: number;
  
  /** Most called endpoints */
  topEndpoints: Array<{
    endpointId: string;
    path: string;
    count: number;
  }>;
}

/**
 * Log filter options
 */
export interface LogFilterOptions {
  /** Filter by endpoint ID */
  endpointId?: string;
  
  /** Filter by method */
  method?: string;
  
  /** Filter by status code */
  status?: number;
  
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
  
  /** Limit number of results */
  limit?: number;
  
  /** Search in path */
  searchPath?: string;
}
