import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  GraphQLEndpoint,
  GraphQLMockResolver,
  GraphQLRequestBody,
  GraphQLResponse,
  GraphQLMockError,
  GraphQLRequestLog,
  CreateGraphQLEndpointDto,
  UpdateGraphQLEndpointDto,
  CreateGraphQLResolverDto,
  UpdateGraphQLResolverDto,
  ApiResponse,
  GraphQLOperationType,
} from '@mock-api-builder/shared';

const router = Router();

// In-memory storage for GraphQL endpoints
let graphqlEndpoints: GraphQLEndpoint[] = [];
const graphqlLogs: GraphQLRequestLog[] = [];
const MAX_LOGS = 1000;

/**
 * Extract operation name and type from GraphQL query
 */
function parseGraphQLQuery(query: string): { operationName?: string; operationType?: GraphQLOperationType } {
  // Match operation type and name: query GetUser, mutation CreatePost, etc.
  const operationMatch = query.match(/^\s*(query|mutation|subscription)\s+(\w+)?/i);

  if (operationMatch) {
    return {
      operationType: operationMatch[1].toLowerCase() as GraphQLOperationType,
      operationName: operationMatch[2] || undefined,
    };
  }

  // Default to query if no explicit type
  if (query.trim().startsWith('{')) {
    return { operationType: 'query' };
  }

  return {};
}

/**
 * Check if variables match the resolver's variablesMatch criteria
 */
function matchVariables(
  requestVariables: Record<string, any> | undefined,
  matchCriteria: Record<string, any> | undefined
): boolean {
  if (!matchCriteria) return true;
  if (!requestVariables) return false;

  for (const [key, value] of Object.entries(matchCriteria)) {
    if (requestVariables[key] !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate delay from config
 */
function calculateDelay(delay: number | { min: number; max: number } | undefined): number {
  if (!delay) return 0;
  if (typeof delay === 'number') return delay;
  return Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
}

/**
 * Find matching resolver for a GraphQL operation
 */
function findMatchingResolver(
  endpoint: GraphQLEndpoint,
  operationName: string | undefined,
  operationType: GraphQLOperationType | undefined,
  variables: Record<string, any> | undefined
): GraphQLMockResolver | null {
  for (const resolver of endpoint.resolvers) {
    if (!resolver.enabled) continue;

    // Match operation name
    if (operationName && resolver.operationName !== operationName) continue;

    // Match operation type
    if (operationType && resolver.operationType !== operationType) continue;

    // Match variables if specified
    if (!matchVariables(variables, resolver.variablesMatch)) continue;

    return resolver;
  }

  return null;
}

/**
 * Add log entry
 */
function addLog(log: Omit<GraphQLRequestLog, 'id'>): void {
  const entry: GraphQLRequestLog = {
    id: randomUUID(),
    ...log,
  };

  graphqlLogs.unshift(entry);
  if (graphqlLogs.length > MAX_LOGS) {
    graphqlLogs.pop();
  }
}

// ============================================
// GraphQL Mock Endpoints
// ============================================

/**
 * Handle GraphQL requests
 * POST /graphql or custom path
 */
export function handleGraphQLRequest(endpoint: GraphQLEndpoint) {
  return async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const body = req.body as GraphQLRequestBody;

      if (!body.query) {
        return res.status(400).json({
          errors: [{ message: 'GraphQL query is required' }],
        });
      }

      // Parse the query to get operation info
      const parsed = parseGraphQLQuery(body.query);
      const operationName = body.operationName || parsed.operationName;
      const operationType = parsed.operationType;

      // Find matching resolver
      const resolver = findMatchingResolver(
        endpoint,
        operationName,
        operationType,
        body.variables
      );

      let response: GraphQLResponse;
      let matchedResolverId: string | undefined;

      if (resolver) {
        matchedResolverId = resolver.id;

        // Apply delay
        const delay = calculateDelay(resolver.delay);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Build response
        response = {
          data: resolver.responseData,
        };

        if (resolver.errors && resolver.errors.length > 0) {
          response.errors = resolver.errors;
        }
      } else if (endpoint.defaultResponse) {
        // Use default response
        response = endpoint.defaultResponse;
      } else {
        // No matching resolver and no default
        response = {
          errors: [
            {
              message: `No resolver found for operation: ${operationName || 'anonymous'} (${operationType || 'unknown'})`,
            },
          ],
        };
      }

      const responseTime = Date.now() - startTime;

      // Log the request
      addLog({
        endpointId: endpoint.id,
        timestamp: new Date(),
        query: body.query,
        operationName,
        operationType,
        variables: body.variables,
        matchedResolverId,
        responseData: response.data,
        responseErrors: response.errors,
        responseTime,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(response);
    } catch (error: any) {
      const response: GraphQLResponse = {
        errors: [{ message: error.message || 'Internal server error' }],
      };
      res.status(500).json(response);
    }
  };
}

// ============================================
// Admin API for managing GraphQL endpoints
// ============================================

/**
 * GET /api/admin/graphql/endpoints
 * List all GraphQL endpoints
 */
router.get('/endpoints', (req: Request, res: Response) => {
  const response: ApiResponse<GraphQLEndpoint[]> = {
    success: true,
    data: graphqlEndpoints,
  };
  res.json(response);
});

/**
 * GET /api/admin/graphql/endpoints/:id
 * Get a specific GraphQL endpoint
 */
router.get('/endpoints/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const endpoint = graphqlEndpoints.find((e) => e.id === id);

  if (!endpoint) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<GraphQLEndpoint> = {
    success: true,
    data: endpoint,
  };
  res.json(response);
});

/**
 * POST /api/admin/graphql/endpoints
 * Create a new GraphQL endpoint
 */
router.post('/endpoints', (req: Request, res: Response) => {
  const dto: CreateGraphQLEndpointDto = req.body;

  const newEndpoint: GraphQLEndpoint = {
    id: randomUUID(),
    path: dto.path || '/graphql',
    description: dto.description,
    enabled: dto.enabled !== false,
    schema: dto.schema,
    resolvers: (dto.resolvers || []).map((r) => ({
      ...r,
      id: randomUUID(),
      enabled: r.enabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    defaultResponse: dto.defaultResponse,
    introspectionEnabled: dto.introspectionEnabled ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  graphqlEndpoints.push(newEndpoint);

  const response: ApiResponse<GraphQLEndpoint> = {
    success: true,
    data: newEndpoint,
    message: 'GraphQL endpoint created successfully',
  };
  res.status(201).json(response);
});

/**
 * PUT /api/admin/graphql/endpoints/:id
 * Update a GraphQL endpoint
 */
router.put('/endpoints/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const dto: UpdateGraphQLEndpointDto = req.body;

  const index = graphqlEndpoints.findIndex((e) => e.id === id);
  if (index === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  const existing = graphqlEndpoints[index];
  graphqlEndpoints[index] = {
    ...existing,
    path: dto.path ?? existing.path,
    description: dto.description ?? existing.description,
    enabled: dto.enabled ?? existing.enabled,
    schema: dto.schema ?? existing.schema,
    resolvers: dto.resolvers ?? existing.resolvers,
    defaultResponse: dto.defaultResponse ?? existing.defaultResponse,
    introspectionEnabled: dto.introspectionEnabled ?? existing.introspectionEnabled,
    updatedAt: new Date(),
  };

  const response: ApiResponse<GraphQLEndpoint> = {
    success: true,
    data: graphqlEndpoints[index],
    message: 'GraphQL endpoint updated successfully',
  };
  res.json(response);
});

/**
 * DELETE /api/admin/graphql/endpoints/:id
 * Delete a GraphQL endpoint
 */
router.delete('/endpoints/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const index = graphqlEndpoints.findIndex((e) => e.id === id);
  if (index === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  graphqlEndpoints.splice(index, 1);

  const response: ApiResponse<null> = {
    success: true,
    message: 'GraphQL endpoint deleted successfully',
  };
  res.json(response);
});

// ============================================
// Resolver Management
// ============================================

/**
 * POST /api/admin/graphql/endpoints/:id/resolvers
 * Add a resolver to an endpoint
 */
router.post('/endpoints/:id/resolvers', (req: Request, res: Response) => {
  const { id } = req.params;
  const dto: CreateGraphQLResolverDto = req.body;

  const endpoint = graphqlEndpoints.find((e) => e.id === id);
  if (!endpoint) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  const newResolver: GraphQLMockResolver = {
    id: randomUUID(),
    operationName: dto.operationName,
    operationType: dto.operationType,
    description: dto.description,
    enabled: dto.enabled !== false,
    responseData: dto.responseData,
    errors: dto.errors,
    delay: dto.delay,
    variablesMatch: dto.variablesMatch,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  endpoint.resolvers.push(newResolver);
  endpoint.updatedAt = new Date();

  const response: ApiResponse<GraphQLMockResolver> = {
    success: true,
    data: newResolver,
    message: 'Resolver added successfully',
  };
  res.status(201).json(response);
});

/**
 * PUT /api/admin/graphql/endpoints/:id/resolvers/:resolverId
 * Update a resolver
 */
router.put('/endpoints/:id/resolvers/:resolverId', (req: Request, res: Response) => {
  const { id, resolverId } = req.params;
  const dto: UpdateGraphQLResolverDto = req.body;

  const endpoint = graphqlEndpoints.find((e) => e.id === id);
  if (!endpoint) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  const resolverIndex = endpoint.resolvers.findIndex((r) => r.id === resolverId);
  if (resolverIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Resolver not found',
    };
    return res.status(404).json(response);
  }

  const existing = endpoint.resolvers[resolverIndex];
  endpoint.resolvers[resolverIndex] = {
    ...existing,
    operationName: dto.operationName ?? existing.operationName,
    operationType: dto.operationType ?? existing.operationType,
    description: dto.description ?? existing.description,
    enabled: dto.enabled ?? existing.enabled,
    responseData: dto.responseData ?? existing.responseData,
    errors: dto.errors ?? existing.errors,
    delay: dto.delay ?? existing.delay,
    variablesMatch: dto.variablesMatch ?? existing.variablesMatch,
    updatedAt: new Date(),
  };
  endpoint.updatedAt = new Date();

  const response: ApiResponse<GraphQLMockResolver> = {
    success: true,
    data: endpoint.resolvers[resolverIndex],
    message: 'Resolver updated successfully',
  };
  res.json(response);
});

/**
 * DELETE /api/admin/graphql/endpoints/:id/resolvers/:resolverId
 * Delete a resolver
 */
router.delete('/endpoints/:id/resolvers/:resolverId', (req: Request, res: Response) => {
  const { id, resolverId } = req.params;

  const endpoint = graphqlEndpoints.find((e) => e.id === id);
  if (!endpoint) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'GraphQL endpoint not found',
    };
    return res.status(404).json(response);
  }

  const resolverIndex = endpoint.resolvers.findIndex((r) => r.id === resolverId);
  if (resolverIndex === -1) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Resolver not found',
    };
    return res.status(404).json(response);
  }

  endpoint.resolvers.splice(resolverIndex, 1);
  endpoint.updatedAt = new Date();

  const response: ApiResponse<null> = {
    success: true,
    message: 'Resolver deleted successfully',
  };
  res.json(response);
});

// ============================================
// Logs
// ============================================

/**
 * GET /api/admin/graphql/logs
 * Get GraphQL request logs
 */
router.get('/logs', (req: Request, res: Response) => {
  const { endpointId, operationName, limit } = req.query;

  let filtered = [...graphqlLogs];

  if (endpointId) {
    filtered = filtered.filter((l) => l.endpointId === endpointId);
  }

  if (operationName) {
    filtered = filtered.filter((l) => l.operationName === operationName);
  }

  const limitNum = limit ? parseInt(limit as string) : 100;
  filtered = filtered.slice(0, limitNum);

  const response: ApiResponse<GraphQLRequestLog[]> = {
    success: true,
    data: filtered,
  };
  res.json(response);
});

/**
 * DELETE /api/admin/graphql/logs
 * Clear GraphQL logs
 */
router.delete('/logs', (req: Request, res: Response) => {
  graphqlLogs.length = 0;

  const response: ApiResponse<null> = {
    success: true,
    message: 'GraphQL logs cleared',
  };
  res.json(response);
});

// ============================================
// Export helpers
// ============================================

/**
 * Get all GraphQL endpoints for mounting
 */
export function getGraphQLEndpoints(): GraphQLEndpoint[] {
  return graphqlEndpoints.filter((e) => e.enabled);
}

/**
 * Find GraphQL endpoint by path
 */
export function findGraphQLEndpointByPath(path: string): GraphQLEndpoint | null {
  return graphqlEndpoints.find((e) => e.enabled && e.path === path) || null;
}

export default router;
