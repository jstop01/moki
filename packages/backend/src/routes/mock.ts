import { Router, Request, Response } from 'express';
import { memoryStore } from '../storage/MemoryStore';
import { Endpoint, Condition, ConditionalResponse, DelayConfig, ScenarioConfig, ScenarioResponse } from '@mock-api-builder/shared';
import { processTemplateVariables, extractPathParams } from '../utils/templateEngine';
import { proxyRequest } from '../utils/proxyHandler';
import { validateAuth, sendAuthError } from '../middleware/authSimulator';
import { validateRateLimit, sendRateLimitError, setRateLimitHeaders } from '../middleware/rateLimiter';
import { extractEnvironment, getEnvironmentOverride, applyEnvironmentOverride, isEnvironmentEnabled } from '../middleware/environmentHandler';

/**
 * Calculate actual delay from DelayConfig (fixed or random range)
 */
function calculateDelay(delay: DelayConfig | undefined): number {
  if (!delay) return 0;

  if (typeof delay === 'number') {
    return delay;
  }

  // Random range: { min, max }
  const { min, max } = delay;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
 * Get scenario response based on mode and call count
 */
function getScenarioResponse(
  endpointId: string,
  scenarioConfig: ScenarioConfig
): ScenarioResponse | null {
  if (!scenarioConfig.enabled || !scenarioConfig.responses || scenarioConfig.responses.length === 0) {
    return null;
  }

  const responses = scenarioConfig.responses;

  // Get current count with auto-reset check
  const currentCount = memoryStore.getScenarioCount(endpointId, scenarioConfig.resetAfter);

  // Increment counter after getting current count
  memoryStore.incrementScenarioCount(endpointId);

  switch (scenarioConfig.mode) {
    case 'sequential': {
      // Sort by order if specified
      const sorted = [...responses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      let index = currentCount % sorted.length;

      // If not looping and we've exceeded the count, return the last response
      if (!scenarioConfig.loop && currentCount >= sorted.length) {
        index = sorted.length - 1;
      }

      return sorted[index];
    }

    case 'random': {
      const randomIndex = Math.floor(Math.random() * responses.length);
      return responses[randomIndex];
    }

    case 'weighted': {
      // Calculate total weight
      const totalWeight = responses.reduce((sum, r) => sum + (r.weight ?? 1), 0);

      // Generate random value
      let random = Math.random() * totalWeight;

      // Find matching response
      for (const response of responses) {
        random -= (response.weight ?? 1);
        if (random <= 0) {
          return response;
        }
      }

      // Fallback to last response
      return responses[responses.length - 1];
    }

    default:
      return null;
  }
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

    // Check authentication if configured
    const authResult = validateAuth(req, endpoint.authConfig);
    if (!authResult.valid) {
      // Log auth failure
      memoryStore.addLog({
        endpointId: endpoint.id,
        method,
        path,
        url: req.originalUrl,
        queryParams: req.query as Record<string, string>,
        requestHeaders: req.headers as Record<string, string>,
        requestBody: req.body,
        responseStatus: 401,
        responseData: { error: 'Unauthorized', message: authResult.error },
        responseTime: Date.now() - startTime,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
      });

      sendAuthError(res, authResult, endpoint.authConfig?.errorResponse);
      return;
    }

    // Check rate limiting if configured
    const rateLimitResult = validateRateLimit(req, endpoint.id, endpoint.rateLimitConfig || { enabled: false, requestsPerWindow: 100, keyBy: 'ip' });
    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded
      memoryStore.addLog({
        endpointId: endpoint.id,
        method,
        path,
        url: req.originalUrl,
        queryParams: req.query as Record<string, string>,
        requestHeaders: req.headers as Record<string, string>,
        requestBody: req.body,
        responseStatus: 429,
        responseData: { error: 'Too Many Requests' },
        responseTime: Date.now() - startTime,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
      });

      sendRateLimitError(res, rateLimitResult, endpoint.rateLimitConfig?.response);
      return;
    }

    // Check if proxy mode is enabled
    if (endpoint.proxyConfig?.enabled && endpoint.proxyConfig.targetUrl) {
      const proxyResult = await proxyRequest(req, endpoint.proxyConfig, path);

      const responseTime = Date.now() - startTime;

      // Log the proxied request
      memoryStore.addLog({
        endpointId: endpoint.id,
        method,
        path,
        url: req.originalUrl,
        queryParams: req.query as Record<string, string>,
        requestHeaders: req.headers as Record<string, string>,
        requestBody: req.body,
        responseStatus: proxyResult.status,
        responseData: proxyResult.data,
        responseTime,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Set response headers from proxy
      Object.entries(proxyResult.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      return res.status(proxyResult.status).json(proxyResult.data);
    }

    // Extract environment from request
    const environment = extractEnvironment(req);

    // Get environment override if enabled
    const envOverride = isEnvironmentEnabled() ? getEnvironmentOverride(endpoint, environment) : null;

    // Apply environment override to get base response values
    const envResponse = applyEnvironmentOverride(endpoint, envOverride);

    // Check for scenario mode first (takes precedence over conditional responses)
    let scenarioResponse: ScenarioResponse | null = null;
    if (endpoint.scenarioConfig?.enabled) {
      scenarioResponse = getScenarioResponse(endpoint.id, endpoint.scenarioConfig);
    }

    // Check for conditional response (only if no scenario response)
    const conditionalResponse = scenarioResponse ? null : findMatchingConditionalResponse(endpoint, req);

    // Determine which response to use (scenario > conditional > environment > default)
    const responseStatus = scenarioResponse?.responseStatus ?? conditionalResponse?.responseStatus ?? envResponse.responseStatus;
    let responseData = scenarioResponse?.responseData ?? conditionalResponse?.responseData ?? envResponse.responseData;
    const delayConfig = scenarioResponse?.delay ?? conditionalResponse?.delay ?? envResponse.delay;

    // Process template variables in response data
    responseData = processTemplateVariables(responseData, req, pathParams);

    // Simulate delay if configured (supports fixed or random range)
    const actualDelay = calculateDelay(delayConfig);
    if (actualDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
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

    // Set rate limit headers on successful response
    setRateLimitHeaders(res, rateLimitResult);

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
