/**
 * OpenAPI/Swagger Parser
 * Converts OpenAPI 3.x or Swagger 2.x specs to Moki endpoints
 */

import { CreateEndpointDto } from '@mock-api-builder/shared';

interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  head?: OpenAPIOperation;
  options?: OpenAPIOperation;
}

interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  responses?: Record<string, OpenAPIResponse>;
  requestBody?: {
    content?: Record<string, { schema?: any }>;
  };
}

interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: any; example?: any }>;
  schema?: any; // Swagger 2.x
  examples?: any; // Swagger 2.x
}

interface OpenAPISpec {
  openapi?: string; // OpenAPI 3.x
  swagger?: string; // Swagger 2.x
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, OpenAPIPathItem>;
  definitions?: Record<string, any>; // Swagger 2.x
  components?: {
    schemas?: Record<string, any>; // OpenAPI 3.x
  };
}

/**
 * Convert OpenAPI path format to Express path format
 * e.g., /users/{id} -> /users/:id
 */
function convertPath(openApiPath: string): string {
  return openApiPath.replace(/\{(\w+)\}/g, ':$1');
}

/**
 * Generate mock data from JSON Schema
 */
function generateMockFromSchema(schema: any, definitions?: Record<string, any>, depth = 0): any {
  if (!schema || depth > 10) return null;

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/definitions/', '').replace('#/components/schemas/', '');
    if (definitions && definitions[refPath]) {
      return generateMockFromSchema(definitions[refPath], definitions, depth + 1);
    }
    return { $ref: refPath };
  }

  // Handle allOf, oneOf, anyOf
  if (schema.allOf) {
    let merged = {};
    for (const subSchema of schema.allOf) {
      const result = generateMockFromSchema(subSchema, definitions, depth + 1);
      if (typeof result === 'object' && result !== null) {
        merged = { ...merged, ...result };
      }
    }
    return merged;
  }

  if (schema.oneOf || schema.anyOf) {
    const choices = schema.oneOf || schema.anyOf;
    return generateMockFromSchema(choices[0], definitions, depth + 1);
  }

  // Handle example
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Handle by type
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return '{{$isoDate}}';
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'email') return '{{$randomEmail}}';
      if (schema.format === 'uuid') return '{{$uuid}}';
      if (schema.format === 'uri') return 'https://example.com';
      return 'string';

    case 'integer':
    case 'number':
      if (schema.enum) return schema.enum[0];
      if (schema.minimum !== undefined) return schema.minimum;
      return schema.type === 'integer' ? '{{$randomInt 1 100}}' : '{{$randomFloat 0 100 2}}';

    case 'boolean':
      return '{{$randomBoolean}}';

    case 'array':
      if (schema.items) {
        return [generateMockFromSchema(schema.items, definitions, depth + 1)];
      }
      return [];

    case 'object':
      if (schema.properties) {
        const obj: Record<string, any> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateMockFromSchema(propSchema, definitions, depth + 1);
        }
        return obj;
      }
      if (schema.additionalProperties) {
        return { key: generateMockFromSchema(schema.additionalProperties, definitions, depth + 1) };
      }
      return {};

    default:
      // Try to infer from properties
      if (schema.properties) {
        const obj: Record<string, any> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateMockFromSchema(propSchema, definitions, depth + 1);
        }
        return obj;
      }
      return null;
  }
}

/**
 * Extract response data from OpenAPI operation
 */
function extractResponseData(
  operation: OpenAPIOperation,
  definitions?: Record<string, any>
): { status: number; data: any } {
  const responses = operation.responses || {};

  // Priority: 200 > 201 > 2xx > first available
  const successCodes = ['200', '201', '202', '204'];
  let statusCode = 200;
  let response: OpenAPIResponse | undefined;

  for (const code of successCodes) {
    if (responses[code]) {
      statusCode = parseInt(code);
      response = responses[code];
      break;
    }
  }

  if (!response) {
    // Get first available response
    const codes = Object.keys(responses).filter(c => c !== 'default');
    if (codes.length > 0) {
      statusCode = parseInt(codes[0]) || 200;
      response = responses[codes[0]];
    }
  }

  if (!response) {
    return { status: 200, data: { message: 'Success' } };
  }

  // OpenAPI 3.x: content
  if (response.content) {
    const jsonContent = response.content['application/json'] ||
                        response.content['*/*'] ||
                        Object.values(response.content)[0];

    if (jsonContent) {
      if (jsonContent.example) {
        return { status: statusCode, data: jsonContent.example };
      }
      if (jsonContent.schema) {
        return { status: statusCode, data: generateMockFromSchema(jsonContent.schema, definitions) || {} };
      }
    }
  }

  // Swagger 2.x: schema directly on response
  if (response.schema) {
    if (response.examples && response.examples['application/json']) {
      return { status: statusCode, data: response.examples['application/json'] };
    }
    return { status: statusCode, data: generateMockFromSchema(response.schema, definitions) || {} };
  }

  return { status: statusCode, data: { message: response.description || 'Success' } };
}

/**
 * Parse OpenAPI/Swagger spec and convert to Moki endpoints
 */
export function parseOpenApiSpec(spec: OpenAPISpec): CreateEndpointDto[] {
  const endpoints: CreateEndpointDto[] = [];
  const paths = spec.paths || {};

  // Get definitions (Swagger 2.x) or schemas (OpenAPI 3.x)
  const definitions = spec.definitions || spec.components?.schemas || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods: Array<{ method: string; operation: OpenAPIOperation }> = [];

    if (pathItem.get) methods.push({ method: 'GET', operation: pathItem.get });
    if (pathItem.post) methods.push({ method: 'POST', operation: pathItem.post });
    if (pathItem.put) methods.push({ method: 'PUT', operation: pathItem.put });
    if (pathItem.delete) methods.push({ method: 'DELETE', operation: pathItem.delete });
    if (pathItem.patch) methods.push({ method: 'PATCH', operation: pathItem.patch });
    if (pathItem.head) methods.push({ method: 'HEAD', operation: pathItem.head });
    if (pathItem.options) methods.push({ method: 'OPTIONS', operation: pathItem.options });

    for (const { method, operation } of methods) {
      const { status, data } = extractResponseData(operation, definitions);

      const endpoint: CreateEndpointDto = {
        method: method as any,
        path: convertPath(path),
        description: operation.summary || operation.description || `${method} ${path}`,
        responseStatus: status,
        responseData: data,
        tags: operation.tags,
        status: 'active',
      };

      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

/**
 * Validate if the input is a valid OpenAPI/Swagger spec
 */
export function validateOpenApiSpec(spec: any): { valid: boolean; error?: string; version?: string } {
  if (!spec || typeof spec !== 'object') {
    return { valid: false, error: 'Invalid JSON format' };
  }

  if (!spec.openapi && !spec.swagger) {
    return { valid: false, error: 'Not a valid OpenAPI/Swagger spec (missing openapi or swagger field)' };
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    return { valid: false, error: 'No paths defined in the spec' };
  }

  const version = spec.openapi || spec.swagger;
  return { valid: true, version };
}
