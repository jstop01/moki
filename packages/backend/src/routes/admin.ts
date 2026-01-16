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
  MOCK_API_VERSION,
} from '@mock-api-builder/shared';
import { parseOpenApiSpec, validateOpenApiSpec } from '../utils/openApiParser';

const router = Router();

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
    const deleted = memoryStore.deleteEndpoint(id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Endpoint not found',
      };
      return res.status(404).json(response);
    }

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
// HEALTH & STATS
// ============================================

/**
 * GET /api/admin/health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  const counts = memoryStore.getCounts();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: MOCK_API_VERSION,
    counts,
  });
});

export default router;
