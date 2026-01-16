import { Router, Request, Response } from 'express';
import { memoryStore } from '../storage/MemoryStore';
import {
  CreateEndpointDto,
  UpdateEndpointDto,
  ApiResponse,
  Endpoint,
  ExportData,
  ImportOptions,
  ImportResult,
  ResponseHistory,
  GlobalAuthSettings,
  MOCK_API_VERSION,
} from '@mock-api-builder/shared';
import { parseOpenApiSpec, validateOpenApiSpec } from '../utils/openApiParser';
import { postmanCollectionToJson } from '../utils/postmanExporter';
import { getGlobalAuthSettings, setGlobalAuthSettings } from '../middleware/authSimulator';
import { resetRateLimit, resetAllRateLimits, getRateLimitStats } from '../middleware/rateLimiter';
import {
  teamAuthMiddleware,
  getTeamSettings,
  setTeamSettings,
  getActiveSessions,
  getCurrentUser,
  broadcastChange,
  createChangeNotification,
  getUserForHistory,
} from '../middleware/teamAuth';
import {
  getEnvironmentSettings,
  setEnvironmentSettings,
  getEnvironments,
  addEnvironment,
  updateEnvironment,
  deleteEnvironment,
  resetEnvironmentSettings,
} from '../middleware/environmentHandler';
import { TeamSettings, ActiveSession, EnvironmentSettings, Environment } from '@mock-api-builder/shared';

const router = Router();

// Apply team auth middleware to all admin routes
router.use(teamAuthMiddleware);

// ============================================
// ENDPOINT CRUD
// ============================================

/**
 * GET /api/admin/endpoints
 * List all endpoints
 */
router.get('/endpoints', (req: Request, res: Response) => {
  try {
    const endpoints = memoryStore.getAllEndpoints();
    const response: ApiResponse<Endpoint[]> = {
      success: true,
      data: endpoints,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/endpoints/:id
 * Get single endpoint
 */
router.get('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const endpoint = memoryStore.getEndpoint(id);

    if (!endpoint) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Endpoint not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Endpoint> = {
      success: true,
      data: endpoint,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/endpoints
 * Create new endpoint
 */
router.post('/endpoints', (req: Request, res: Response) => {
  try {
    const dto: CreateEndpointDto = req.body;

    // Validation
    if (!dto.method || !dto.path) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Method and path are required',
      };
      return res.status(400).json(response);
    }

    if (dto.responseStatus === undefined) {
      dto.responseStatus = 200;
    }

    const endpoint = memoryStore.createEndpoint(dto);

    // Broadcast change notification
    broadcastChange(createChangeNotification(
      'endpoint:create',
      endpoint.id,
      getCurrentUser(req),
      `Created ${dto.method} ${dto.path}`
    ));

    const response: ApiResponse<Endpoint> = {
      success: true,
      data: endpoint,
      message: 'Endpoint created successfully',
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/endpoints/:id
 * Update endpoint
 */
router.put('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto: UpdateEndpointDto = req.body;

    const updated = memoryStore.updateEndpoint(id, dto);

    if (!updated) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Endpoint not found',
      };
      return res.status(404).json(response);
    }

    // Broadcast change notification
    broadcastChange(createChangeNotification(
      'endpoint:update',
      id,
      getCurrentUser(req),
      `Updated ${updated.method} ${updated.path}`
    ));

    const response: ApiResponse<Endpoint> = {
      success: true,
      data: updated,
      message: 'Endpoint updated successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/endpoints/:id
 * Delete endpoint
 */
router.delete('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const endpoint = memoryStore.getEndpoint(id);
    const deleted = memoryStore.deleteEndpoint(id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Endpoint not found',
      };
      return res.status(404).json(response);
    }

    // Broadcast change notification
    broadcastChange(createChangeNotification(
      'endpoint:delete',
      id,
      getCurrentUser(req),
      endpoint ? `Deleted ${endpoint.method} ${endpoint.path}` : `Deleted endpoint ${id}`
    ));

    const response: ApiResponse<null> = {
      success: true,
      message: 'Endpoint deleted successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// LOGS
// ============================================

/**
 * GET /api/admin/logs
 * Get request logs
 */
router.get('/logs', (req: Request, res: Response) => {
  try {
    const { endpointId, method, status, limit } = req.query;

    const logs = memoryStore.getLogs({
      endpointId: endpointId as string,
      method: method as string,
      status: status ? parseInt(status as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });

    const response: ApiResponse<typeof logs> = {
      success: true,
      data: logs,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/logs/stats
 * Get log statistics
 */
router.get('/logs/stats', (req: Request, res: Response) => {
  try {
    const stats = memoryStore.getLogStats();
    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/logs
 * Clear all logs
 */
router.delete('/logs', (req: Request, res: Response) => {
  try {
    memoryStore.clearLogs();
    const response: ApiResponse<null> = {
      success: true,
      message: 'Logs cleared successfully',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// IMPORT / EXPORT
// ============================================

/**
 * GET /api/admin/export
 * Export all endpoints
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const endpoints = memoryStore.getAllEndpoints();
    const exportData: ExportData = {
      version: MOCK_API_VERSION,
      exportedAt: new Date(),
      endpoints,
    };

    res.json(exportData);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/import
 * Import endpoints
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const data: ExportData = req.body;
    const options: ImportOptions = {
      replace: req.query.replace === 'true',
      skipInvalid: req.query.skipInvalid === 'true',
    };

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      importedIds: [],
    };

    if (!data.endpoints || !Array.isArray(data.endpoints)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid import data format',
      };
      return res.status(400).json(response);
    }

    for (const endpoint of data.endpoints) {
      try {
        // Check if endpoint with same method and path exists
        const existing = memoryStore
          .getAllEndpoints()
          .find((ep) => ep.method === endpoint.method && ep.path === endpoint.path);

        if (existing && !options.replace) {
          result.skipped++;
          continue;
        }

        if (existing && options.replace) {
          memoryStore.deleteEndpoint(existing.id);
        }

        const created = memoryStore.createEndpoint({
          method: endpoint.method,
          path: endpoint.path,
          responseStatus: endpoint.responseStatus,
          responseData: endpoint.responseData,
          responseHeaders: endpoint.responseHeaders,
          delay: endpoint.delay,
          description: endpoint.description,
          status: endpoint.status,
          tags: endpoint.tags,
        });

        result.imported++;
        result.importedIds.push(created.id);
      } catch (error: any) {
        if (options.skipInvalid) {
          result.skipped++;
          result.errors.push(`Failed to import ${endpoint.path}: ${error.message}`);
        } else {
          throw error;
        }
      }
    }

    const response: ApiResponse<ImportResult> = {
      success: true,
      data: result,
      message: `Imported ${result.imported} endpoints, skipped ${result.skipped}`,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/import/openapi
 * Import from OpenAPI/Swagger spec
 */
router.post('/import/openapi', (req: Request, res: Response) => {
  try {
    const spec = req.body;
    const options: ImportOptions = {
      replace: req.query.replace === 'true',
      skipInvalid: req.query.skipInvalid === 'true',
    };

    // Validate the spec
    const validation = validateOpenApiSpec(spec);
    if (!validation.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: validation.error,
      };
      return res.status(400).json(response);
    }

    // Parse the spec to endpoints
    const endpointDtos = parseOpenApiSpec(spec);

    if (endpointDtos.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No endpoints found in the OpenAPI spec',
      };
      return res.status(400).json(response);
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      importedIds: [],
    };

    for (const dto of endpointDtos) {
      try {
        // Check if endpoint with same method and path exists
        const existing = memoryStore
          .getAllEndpoints()
          .find((ep) => ep.method === dto.method && ep.path === dto.path);

        if (existing && !options.replace) {
          result.skipped++;
          continue;
        }

        if (existing && options.replace) {
          memoryStore.deleteEndpoint(existing.id);
        }

        const created = memoryStore.createEndpoint(dto);
        result.imported++;
        result.importedIds.push(created.id);
      } catch (error: any) {
        if (options.skipInvalid) {
          result.skipped++;
          result.errors.push(`Failed to import ${dto.method} ${dto.path}: ${error.message}`);
        } else {
          throw error;
        }
      }
    }

    const response: ApiResponse<ImportResult & { specVersion?: string }> = {
      success: true,
      data: { ...result, specVersion: validation.version },
      message: `Imported ${result.imported} endpoints from OpenAPI ${validation.version}, skipped ${result.skipped}`,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/export/postman
 * Export all endpoints as Postman Collection
 */
router.get('/export/postman', (req: Request, res: Response) => {
  try {
    const endpoints = memoryStore.getAllEndpoints();
    const { name, baseUrl } = req.query;

    const collectionJson = postmanCollectionToJson(endpoints, {
      collectionName: (name as string) || 'Mock API Builder Collection',
      baseUrl: (baseUrl as string) || `http://localhost:3001/mock`,
      description: `Exported from Mock API Builder on ${new Date().toISOString()}`,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mock-api-collection-${Date.now()}.json"`
    );
    res.send(collectionJson);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// HISTORY
// ============================================

/**
 * GET /api/admin/endpoints/:id/history
 * Get history for an endpoint
 */
router.get('/endpoints/:id/history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = memoryStore.getHistory(id);

    const response: ApiResponse<ResponseHistory[]> = {
      success: true,
      data: history,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/history
 * Get all history entries
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const history = memoryStore.getAllHistory().slice(0, limit);

    const response: ApiResponse<ResponseHistory[]> = {
      success: true,
      data: history,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/history/:id/restore
 * Restore endpoint from history snapshot
 */
router.post('/history/:id/restore', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restored = memoryStore.restoreFromHistory(id);

    if (!restored) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'History entry not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Endpoint> = {
      success: true,
      data: restored,
      message: 'Endpoint restored from history',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/endpoints/:id/history
 * Clear history for an endpoint
 */
router.delete('/endpoints/:id/history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryStore.clearHistory(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'History cleared',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// SCENARIO COUNTERS
// ============================================

/**
 * POST /api/admin/endpoints/:id/scenario/reset
 * Reset scenario counter for an endpoint
 */
router.post('/endpoints/:id/scenario/reset', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryStore.resetScenarioCount(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Scenario counter reset',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/scenario/reset-all
 * Reset all scenario counters
 */
router.post('/scenario/reset-all', (req: Request, res: Response) => {
  try {
    memoryStore.resetAllScenarioCounters();

    const response: ApiResponse<null> = {
      success: true,
      message: 'All scenario counters reset',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/scenario/counters
 * Get all scenario counters (for debugging)
 */
router.get('/scenario/counters', (req: Request, res: Response) => {
  try {
    const counters = memoryStore.getScenarioCounters();
    const data: Record<string, { count: number; lastAccess: number }> = {};

    counters.forEach((value, key) => {
      data[key] = value;
    });

    const response: ApiResponse<typeof data> = {
      success: true,
      data,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// AUTH SETTINGS
// ============================================

/**
 * GET /api/admin/auth/settings
 * Get global auth settings
 */
router.get('/auth/settings', (req: Request, res: Response) => {
  try {
    const settings = getGlobalAuthSettings();
    const response: ApiResponse<GlobalAuthSettings> = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/auth/settings
 * Update global auth settings
 */
router.put('/auth/settings', (req: Request, res: Response) => {
  try {
    const settings: GlobalAuthSettings = req.body;

    // Validate required fields
    if (settings.enabled && !settings.defaultMethod) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'defaultMethod is required when auth is enabled',
      };
      return res.status(400).json(response);
    }

    // Validate auth method has corresponding config
    if (settings.enabled) {
      switch (settings.defaultMethod) {
        case 'bearer':
          if (!settings.bearerConfig?.validTokens?.length && !settings.bearerConfig?.acceptAny) {
            const response: ApiResponse<null> = {
              success: false,
              error: 'Bearer config with validTokens is required for bearer auth',
            };
            return res.status(400).json(response);
          }
          break;
        case 'apiKey':
          if (!settings.apiKeyConfig?.validKeys?.length) {
            const response: ApiResponse<null> = {
              success: false,
              error: 'API Key config with validKeys is required for apiKey auth',
            };
            return res.status(400).json(response);
          }
          break;
        case 'basic':
          if (!settings.basicAuthConfig?.credentials?.length) {
            const response: ApiResponse<null> = {
              success: false,
              error: 'Basic Auth config with credentials is required for basic auth',
            };
            return res.status(400).json(response);
          }
          break;
      }
    }

    setGlobalAuthSettings(settings);

    const response: ApiResponse<GlobalAuthSettings> = {
      success: true,
      data: getGlobalAuthSettings(),
      message: 'Auth settings updated',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/auth/settings
 * Reset auth settings to defaults (disabled)
 */
router.delete('/auth/settings', (req: Request, res: Response) => {
  try {
    setGlobalAuthSettings({
      enabled: false,
      defaultMethod: 'none',
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Auth settings reset to defaults',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// RATE LIMITING
// ============================================

/**
 * POST /api/admin/endpoints/:id/ratelimit/reset
 * Reset rate limit for a specific endpoint
 */
router.post('/endpoints/:id/ratelimit/reset', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { key } = req.body; // Optional: specific key to reset

    resetRateLimit(id, key);

    const response: ApiResponse<null> = {
      success: true,
      message: key
        ? `Rate limit reset for endpoint ${id} key ${key}`
        : `Rate limit reset for endpoint ${id}`,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/ratelimit/reset-all
 * Reset all rate limits
 */
router.post('/ratelimit/reset-all', (req: Request, res: Response) => {
  try {
    resetAllRateLimits();

    const response: ApiResponse<null> = {
      success: true,
      message: 'All rate limits reset',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/ratelimit/stats
 * Get rate limit statistics
 */
router.get('/ratelimit/stats', (req: Request, res: Response) => {
  try {
    const stats = getRateLimitStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// TEAM SETTINGS
// ============================================

/**
 * GET /api/admin/team/settings
 * Get team settings
 */
router.get('/team/settings', (req: Request, res: Response) => {
  try {
    const settings = getTeamSettings();
    const response: ApiResponse<TeamSettings> = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/team/settings
 * Update team settings
 */
router.put('/team/settings', (req: Request, res: Response) => {
  try {
    const settings: Partial<TeamSettings> = req.body;
    setTeamSettings(settings);

    // Broadcast settings change
    broadcastChange(createChangeNotification(
      'settings:update',
      'team',
      getCurrentUser(req),
      'Team settings updated'
    ));

    const response: ApiResponse<TeamSettings> = {
      success: true,
      data: getTeamSettings(),
      message: 'Team settings updated',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/team/sessions
 * Get active sessions
 */
router.get('/team/sessions', (req: Request, res: Response) => {
  try {
    const sessions = getActiveSessions();
    const response: ApiResponse<ActiveSession[]> = {
      success: true,
      data: sessions,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/team/me
 * Get current user info
 */
router.get('/team/me', (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// ENVIRONMENTS
// ============================================

/**
 * GET /api/admin/environment/settings
 * Get environment settings
 */
router.get('/environment/settings', (req: Request, res: Response) => {
  try {
    const settings = getEnvironmentSettings();
    const response: ApiResponse<EnvironmentSettings> = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/environment/settings
 * Update environment settings
 */
router.put('/environment/settings', (req: Request, res: Response) => {
  try {
    const settings: Partial<EnvironmentSettings> = req.body;
    setEnvironmentSettings(settings);

    // Broadcast settings change
    broadcastChange(createChangeNotification(
      'settings:update',
      'environment',
      getCurrentUser(req),
      `Environment settings updated (enabled: ${settings.enabled})`
    ));

    const response: ApiResponse<EnvironmentSettings> = {
      success: true,
      data: getEnvironmentSettings(),
      message: 'Environment settings updated',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/environment/settings
 * Reset environment settings to defaults
 */
router.delete('/environment/settings', (req: Request, res: Response) => {
  try {
    resetEnvironmentSettings();

    const response: ApiResponse<null> = {
      success: true,
      message: 'Environment settings reset to defaults',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/environments
 * Get all environments
 */
router.get('/environments', (req: Request, res: Response) => {
  try {
    const environments = getEnvironments();
    const response: ApiResponse<Environment[]> = {
      success: true,
      data: environments,
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/admin/environments
 * Add a new environment
 */
router.post('/environments', (req: Request, res: Response) => {
  try {
    const { name, displayName, description, color, isDefault } = req.body;

    if (!name || !displayName) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'name and displayName are required',
      };
      return res.status(400).json(response);
    }

    // Check if environment already exists
    const existing = getEnvironments().find(e => e.name === name);
    if (existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Environment '${name}' already exists`,
      };
      return res.status(400).json(response);
    }

    const newEnv = addEnvironment({
      name,
      displayName,
      description,
      color,
      isDefault,
    });

    // Broadcast change
    broadcastChange(createChangeNotification(
      'settings:update',
      'environment',
      getCurrentUser(req),
      `Added environment: ${displayName}`
    ));

    const response: ApiResponse<Environment> = {
      success: true,
      data: newEnv,
      message: 'Environment added',
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/environments/:name
 * Update an environment
 */
router.put('/environments/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const updates: Partial<Environment> = req.body;

    const updated = updateEnvironment(name, updates);

    if (!updated) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Environment '${name}' not found`,
      };
      return res.status(404).json(response);
    }

    // Broadcast change
    broadcastChange(createChangeNotification(
      'settings:update',
      'environment',
      getCurrentUser(req),
      `Updated environment: ${updated.displayName}`
    ));

    const response: ApiResponse<Environment> = {
      success: true,
      data: updated,
      message: 'Environment updated',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/environments/:name
 * Delete an environment
 */
router.delete('/environments/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const deleted = deleteEnvironment(name);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Environment '${name}' not found or cannot be deleted (default environment)`,
      };
      return res.status(404).json(response);
    }

    // Broadcast change
    broadcastChange(createChangeNotification(
      'settings:update',
      'environment',
      getCurrentUser(req),
      `Deleted environment: ${name}`
    ));

    const response: ApiResponse<null> = {
      success: true,
      message: 'Environment deleted',
    };
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: error.message,
    };
    res.status(500).json(response);
  }
});

// ============================================
// HEALTH & STATS
// ============================================

/**
 * GET /api/admin/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  const counts = memoryStore.getCounts();
  const teamSettings = getTeamSettings();
  const envSettings = getEnvironmentSettings();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: MOCK_API_VERSION,
    counts,
    team: {
      enabled: teamSettings.enabled,
      requireAuth: teamSettings.requireAuth,
      activeSessions: getActiveSessions().length,
    },
    environment: {
      enabled: envSettings.enabled,
      default: envSettings.defaultEnvironment,
      available: envSettings.environments.map(e => e.name),
    },
  });
});

export default router;
