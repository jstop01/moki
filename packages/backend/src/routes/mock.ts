import { Router, Request, Response } from 'express';
import { memoryStore } from '../storage/MemoryStore';
import { Endpoint, Condition, ConditionalResponse } from '@mock-api-builder/shared';
import { processTemplateVariables, extractPathParams } from '../utils/templateEngine';

const router = Router();

/**
 * Check if a single condition matches the request
 */
function checkCondition(condition: Condition, req: Request): boolean {
  let fieldValue: string | undefined;

  // Get the field value from the appropriate source
  switch (condition.source) {
    case 'query':
      fieldValue = req.query[condition.field] as string;
      break;
    case 'header':
      fieldValue = req.get(condition.field);
      break;
    case 'body':
      fieldValue = req.body?.[condition.field]?.toString();
      break;
  }

  // Handle 'exists' operator
  if (condition.operator === 'exists') {
    return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
  }

  // For other operators, if field doesn't exist, condition fails
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const conditionValue = condition.value || '';

  switch (condition.operator) {
    case 'eq':
      return fieldValue === conditionValue;
    case 'neq':
      return fieldValue !== conditionValue;
    case 'contains':
      return fieldValue.includes(conditionValue);
    case 'startsWith':
      return fieldValue.startsWith(conditionValue);
    case 'endsWith':
      return fieldValue.endsWith(conditionValue);
    case 'regex':
      try {
        return new RegExp(conditionValue).test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Find matching conditional response for the request
 */
function findMatchingConditionalResponse(
  endpoint: Endpoint,
  req: Request
): ConditionalResponse | null {
  if (!endpoint.conditionalResponses || endpoint.conditionalResponses.length === 0) {
    return null;
  }

  for (const conditional of endpoint.conditionalResponses) {
    // All conditions must match (AND logic)
    const allMatch = conditional.conditions.every((condition) =>
      checkCondition(condition, req)
    );

    if (allMatch) {
      return conditional;
    }
  }

  return null;
}

/**
 * Handle all methods and paths under /mock/*
 * This is the core functionality - responding to user-defined mock endpoints
 */
router.all('/*', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const method = req.method;
    const path = req.path; // Already excludes /mock prefix

    // Find matching endpoint
    const endpoint = memoryStore.findEndpointByPath(method, path);

    if (!endpoint) {
      // Log the failed request
      memoryStore.addLog({
        endpointId: 'not-found',
        method,
        path,
        url: req.originalUrl,
        queryParams: req.query as Record<string, string>,
        requestHeaders: req.headers as Record<string, string>,
        requestBody: req.body,
        responseStatus: 404,
        responseData: { error: 'Endpoint not found' },
        responseTime: Date.now() - startTime,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(404).json({
        error: 'Mock endpoint not found',
        message: `No mock endpoint configured for ${method} ${path}`,
        availableEndpoints: memoryStore
          .getAllEndpoints()
          .filter((ep) => ep.status === 'active')
          .map((ep) => `${ep.method} ${ep.path}`),
      });
    }

    // Extract path parameters for template processing
    const pathParams = extractPathParams(endpoint.path, path);

    // Check for conditional response first
    const conditionalResponse = findMatchingConditionalResponse(endpoint, req);

    // Determine which response to use
    const responseStatus = conditionalResponse?.responseStatus ?? endpoint.responseStatus;
    let responseData = conditionalResponse?.responseData ?? endpoint.responseData;
    const delay = conditionalResponse?.delay ?? endpoint.delay;

    // Process template variables in response data
    responseData = processTemplateVariables(responseData, req, pathParams);

    // Simulate delay if configured
    if (delay && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const responseTime = Date.now() - startTime;

    // Log the request
    memoryStore.addLog({
      endpointId: endpoint.id,
      method,
      path,
      url: req.originalUrl,
      queryParams: req.query as Record<string, string>,
      requestHeaders: req.headers as Record<string, string>,
      requestBody: req.body,
      responseStatus,
      responseData,
      responseTime,
      clientIp: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Set custom headers if configured
    if (endpoint.responseHeaders) {
      Object.entries(endpoint.responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    // Send the response (conditional or default)
    res.status(responseStatus).json(responseData);
  } catch (error: any) {
    console.error('Error handling mock request:', error);

    // Log the error
    memoryStore.addLog({
      endpointId: 'error',
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      queryParams: req.query as Record<string, string>,
      requestHeaders: req.headers as Record<string, string>,
      requestBody: req.body,
      responseStatus: 500,
      responseData: { error: 'Internal server error' },
      responseTime: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
