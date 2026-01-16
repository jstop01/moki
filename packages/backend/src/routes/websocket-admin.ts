/**
 * WebSocket Admin Routes
 * API for managing WebSocket mock endpoints
 */

import { Router, Request, Response } from 'express';
import { webSocketHandler } from '../websocket/WebSocketHandler';
import {
  ApiResponse,
  WebSocketEndpoint,
  WebSocketConnection,
  WebSocketMessageLog,
  CreateWebSocketEndpointDto,
  UpdateWebSocketEndpointDto,
} from '@mock-api-builder/shared';

const router = Router();

// ============================================
// WEBSOCKET ENDPOINT CRUD
// ============================================

/**
 * GET /api/admin/websocket/endpoints
 * List all WebSocket endpoints
 */
router.get('/endpoints', (req: Request, res: Response) => {
  try {
    const endpoints = webSocketHandler.getAllEndpoints();
    const response: ApiResponse<WebSocketEndpoint[]> = {
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
 * GET /api/admin/websocket/endpoints/:id
 * Get single WebSocket endpoint
 */
router.get('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const endpoint = webSocketHandler.getEndpoint(id);

    if (!endpoint) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'WebSocket endpoint not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<WebSocketEndpoint> = {
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
 * POST /api/admin/websocket/endpoints
 * Create new WebSocket endpoint
 */
router.post('/endpoints', (req: Request, res: Response) => {
  try {
    const dto: CreateWebSocketEndpointDto = req.body;

    if (!dto.path) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Path is required',
      };
      return res.status(400).json(response);
    }

    // Check for duplicate path
    const existing = webSocketHandler.findEndpointByPath(dto.path);
    if (existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: `WebSocket endpoint with path ${dto.path} already exists`,
      };
      return res.status(400).json(response);
    }

    const endpoint = webSocketHandler.createEndpoint(dto);

    const response: ApiResponse<WebSocketEndpoint> = {
      success: true,
      data: endpoint,
      message: 'WebSocket endpoint created successfully',
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
 * PUT /api/admin/websocket/endpoints/:id
 * Update WebSocket endpoint
 */
router.put('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto: UpdateWebSocketEndpointDto = req.body;

    const endpoint = webSocketHandler.updateEndpoint(id, dto);

    if (!endpoint) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'WebSocket endpoint not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<WebSocketEndpoint> = {
      success: true,
      data: endpoint,
      message: 'WebSocket endpoint updated successfully',
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
 * DELETE /api/admin/websocket/endpoints/:id
 * Delete WebSocket endpoint
 */
router.delete('/endpoints/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = webSocketHandler.deleteEndpoint(id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'WebSocket endpoint not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'WebSocket endpoint deleted successfully',
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
// CONNECTIONS
// ============================================

/**
 * GET /api/admin/websocket/connections
 * Get all active connections
 */
router.get('/connections', (req: Request, res: Response) => {
  try {
    const { endpointId } = req.query;

    const connections = endpointId
      ? webSocketHandler.getConnectionsForEndpoint(endpointId as string)
      : webSocketHandler.getConnections();

    const response: ApiResponse<WebSocketConnection[]> = {
      success: true,
      data: connections,
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
 * DELETE /api/admin/websocket/connections/:id
 * Close a connection
 */
router.delete('/connections/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const closed = webSocketHandler.closeConnection(id);

    if (!closed) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Connection not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Connection closed successfully',
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
// MESSAGING
// ============================================

/**
 * POST /api/admin/websocket/connections/:id/send
 * Send message to specific connection
 */
router.post('/connections/:id/send', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Message is required',
      };
      return res.status(400).json(response);
    }

    const sent = webSocketHandler.sendToConnection(
      id,
      typeof message === 'string' ? message : JSON.stringify(message)
    );

    if (!sent) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Connection not found or not open',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Message sent successfully',
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
 * POST /api/admin/websocket/endpoints/:id/broadcast
 * Broadcast message to all connections on an endpoint
 */
router.post('/endpoints/:id/broadcast', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Message is required',
      };
      return res.status(400).json(response);
    }

    const count = webSocketHandler.broadcast(
      id,
      typeof message === 'string' ? message : JSON.stringify(message)
    );

    const response: ApiResponse<{ sentTo: number }> = {
      success: true,
      data: { sentTo: count },
      message: `Message broadcast to ${count} connections`,
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
 * GET /api/admin/websocket/logs
 * Get WebSocket message logs
 */
router.get('/logs', (req: Request, res: Response) => {
  try {
    const { endpointId, limit } = req.query;

    const logs = webSocketHandler.getLogs(
      endpointId as string | undefined,
      limit ? parseInt(limit as string) : undefined
    );

    const response: ApiResponse<WebSocketMessageLog[]> = {
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
 * DELETE /api/admin/websocket/logs
 * Clear WebSocket logs
 */
router.delete('/logs', (req: Request, res: Response) => {
  try {
    const { endpointId } = req.query;
    webSocketHandler.clearLogs(endpointId as string | undefined);

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
// STATS
// ============================================

/**
 * GET /api/admin/websocket/stats
 * Get WebSocket statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = webSocketHandler.getStats();
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

export default router;
