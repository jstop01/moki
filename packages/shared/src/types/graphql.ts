/**
 * GraphQL Mock Types
 *
 * Support for mocking GraphQL queries and mutations
 * with custom resolvers and response data.
 */

/**
 * GraphQL operation type
 */
export type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

/**
 * GraphQL mock resolver
 * Defines how to respond to specific GraphQL operations
 */
export interface GraphQLMockResolver {
  /** Unique identifier */
  id: string;

  /** Operation name to match (e.g., "GetUser", "CreatePost") */
  operationName: string;

  /** Operation type */
  operationType: GraphQLOperationType;

  /** Description */
  description?: string;

  /** Whether this resolver is enabled */
  enabled: boolean;

  /** Mock response data */
  responseData: any;

  /** Optional errors to include in response */
  errors?: GraphQLMockError[];

  /** Response delay in ms */
  delay?: number | { min: number; max: number };

  /** Variables matching (optional - if specified, only match when variables match) */
  variablesMatch?: Record<string, any>;

  /** Created at */
  createdAt: Date;

  /** Updated at */
  updatedAt: Date;
}

/**
 * GraphQL error format
 */
export interface GraphQLMockError {
  /** Error message */
  message: string;

  /** Error locations */
  locations?: Array<{ line: number; column: number }>;

  /** Error path */
  path?: string[];

  /** Error extensions */
  extensions?: Record<string, any>;
}

/**
 * GraphQL endpoint configuration
 */
export interface GraphQLEndpoint {
  /** Unique identifier */
  id: string;

  /** Endpoint path (default: /graphql) */
  path: string;

  /** Description */
  description?: string;

  /** Whether this endpoint is enabled */
  enabled: boolean;

  /** GraphQL schema (SDL format) */
  schema?: string;

  /** Mock resolvers for this endpoint */
  resolvers: GraphQLMockResolver[];

  /** Default response for unmatched operations */
  defaultResponse?: {
    data?: any;
    errors?: GraphQLMockError[];
  };

  /** Introspection enabled */
  introspectionEnabled?: boolean;

  /** Created at */
  createdAt: Date;

  /** Updated at */
  updatedAt: Date;
}

/**
 * DTO for creating a GraphQL endpoint
 */
export interface CreateGraphQLEndpointDto {
  path?: string;
  description?: string;
  enabled?: boolean;
  schema?: string;
  resolvers?: Omit<GraphQLMockResolver, 'id' | 'createdAt' | 'updatedAt'>[];
  defaultResponse?: {
    data?: any;
    errors?: GraphQLMockError[];
  };
  introspectionEnabled?: boolean;
}

/**
 * DTO for updating a GraphQL endpoint
 */
export interface UpdateGraphQLEndpointDto {
  path?: string;
  description?: string;
  enabled?: boolean;
  schema?: string;
  resolvers?: GraphQLMockResolver[];
  defaultResponse?: {
    data?: any;
    errors?: GraphQLMockError[];
  };
  introspectionEnabled?: boolean;
}

/**
 * DTO for creating a GraphQL resolver
 */
export interface CreateGraphQLResolverDto {
  operationName: string;
  operationType: GraphQLOperationType;
  description?: string;
  enabled?: boolean;
  responseData: any;
  errors?: GraphQLMockError[];
  delay?: number | { min: number; max: number };
  variablesMatch?: Record<string, any>;
}

/**
 * DTO for updating a GraphQL resolver
 */
export interface UpdateGraphQLResolverDto {
  operationName?: string;
  operationType?: GraphQLOperationType;
  description?: string;
  enabled?: boolean;
  responseData?: any;
  errors?: GraphQLMockError[];
  delay?: number | { min: number; max: number };
  variablesMatch?: Record<string, any>;
}

/**
 * GraphQL request body format
 */
export interface GraphQLRequestBody {
  query: string;
  operationName?: string;
  variables?: Record<string, any>;
}

/**
 * GraphQL response format
 */
export interface GraphQLResponse {
  data?: any;
  errors?: GraphQLMockError[];
  extensions?: Record<string, any>;
}

/**
 * GraphQL request log
 */
export interface GraphQLRequestLog {
  id: string;
  endpointId: string;
  timestamp: Date;
  query: string;
  operationName?: string;
  operationType?: GraphQLOperationType;
  variables?: Record<string, any>;
  matchedResolverId?: string;
  responseData?: any;
  responseErrors?: GraphQLMockError[];
  responseTime: number;
  clientIp?: string;
  userAgent?: string;
}
