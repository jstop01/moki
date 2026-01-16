/**
 * WebSocket Handler - manages mock WebSocket connections
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';
import { nanoid } from 'nanoid';
import {
  WebSocketEndpoint,
  WebSocketConnection,
  WebSocketMessageLog,
  WebSocketResponse,
  CreateWebSocketEndpointDto,
  UpdateWebSocketEndpointDto,
} from '@mock-api-builder/shared';

const MAX_WS_LOGS = 500;

/**
 * Extended WebSocket with custom properties
 */
interface ExtendedWebSocket extends WebSocket {
  connectionId?: string;
  endpointId?: string;
  isAlive?: boolean;
}

/**
 * WebSocket Handler class
 */
export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private endpoints: Map<string, WebSocketEndpoint> = new Map();
  private connections: Map<string, ExtendedWebSocket> = new Map();
  private connectionInfo: Map<string, WebSocketConnection> = new Map();
  private messageLogs: WebSocketMessageLog[] = [];
  private scheduledIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade requests
    server.on('upgrade', (request, socket, head) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

      // Check if path starts with /ws/
      if (!pathname.startsWith('/ws/')) {
        socket.destroy();
        return;
      }

      // Remove /ws prefix
      const wsPath = pathname.substring(3) || '/';

      // Find matching endpoint
      const endpoint = this.findEndpointByPath(wsPath);

      if (!endpoint || endpoint.status !== 'active') {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request, endpoint);
      });
    });

    // Handle new connections
    this.wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage, endpoint: WebSocketEndpoint) => {
      const connectionId = nanoid();
      ws.connectionId = connectionId;
      ws.endpointId = endpoint.id;
      ws.isAlive = true;

      // Store connection
      this.connections.set(connectionId, ws);
      this.connectionInfo.set(connectionId, {
        id: connectionId,
        endpointId: endpoint.id,
        clientIp: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date(),
      });

      console.log(`[WebSocket] New connection: ${connectionId} to ${endpoint.path}`);

      // Send welcome message if configured
      if (endpoint.onConnectMessage) {
        this.sendResponse(ws, endpoint.onConnectMessage, connectionId, endpoint.id);
      }

      // Handle incoming messages
      ws.on('message', (data: RawData) => {
        this.handleMessage(ws, data, endpoint);
      });

      // Handle pong (for keep-alive)
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        console.log(`[WebSocket] Connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
        this.connectionInfo.delete(connectionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error on ${connectionId}:`, error);
      });
    });

    // Heartbeat to detect dead connections
    setInterval(() => {
      this.connections.forEach((ws, id) => {
        if (ws.isAlive === false) {
          this.connections.delete(id);
          this.connectionInfo.delete(id);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('✅ WebSocket server initialized on /ws/*');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: ExtendedWebSocket, data: RawData, endpoint: WebSocketEndpoint): void {
    const messageStr = data.toString();

    // Log incoming message
    this.addLog({
      id: nanoid(),
      endpointId: endpoint.id,
      connectionId: ws.connectionId!,
      direction: 'incoming',
      messageType: this.detectMessageType(messageStr),
      data: messageStr,
      timestamp: new Date(),
    });

    // Try to parse as JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(messageStr);
    } catch {
      parsedData = messageStr;
    }

    // Find matching pattern
    for (const pattern of endpoint.messagePatterns) {
      if (this.matchPattern(messageStr, parsedData, pattern.matchType, pattern.pattern)) {
        console.log(`[WebSocket] Pattern matched: ${pattern.name || pattern.pattern}`);

        // Send response
        this.sendResponse(
          pattern.response.broadcast ? null : ws,
          pattern.response,
          ws.connectionId!,
          endpoint.id,
          pattern.name
        );
        return;
      }
    }

    console.log(`[WebSocket] No pattern matched for message`);
  }

  /**
   * Match message against pattern
   */
  private matchPattern(messageStr: string, parsedData: any, matchType: string, pattern: string): boolean {
    switch (matchType) {
      case 'exact':
        return messageStr === pattern;

      case 'contains':
        return messageStr.includes(pattern);

      case 'regex':
        try {
          return new RegExp(pattern).test(messageStr);
        } catch {
          return false;
        }

      case 'json-path':
        // Simple JSON path matching (e.g., "type=subscribe" or "action.type=test")
        if (typeof parsedData !== 'object') return false;

        const [path, value] = pattern.split('=');
        const keys = path.split('.');
        let current = parsedData;

        for (const key of keys) {
          if (current === null || current === undefined) return false;
          current = current[key];
        }

        return String(current) === value;

      default:
        return false;
    }
  }

  /**
   * Send response to client(s)
   */
  private sendResponse(
    ws: ExtendedWebSocket | null,
    response: WebSocketResponse,
    connectionId: string,
    endpointId: string,
    matchedPattern?: string
  ): void {
    const send = () => {
      const message = response.type === 'json'
        ? JSON.stringify(response.data)
        : String(response.data);

      if (response.broadcast) {
        // Broadcast to all clients on this endpoint
        this.connections.forEach((client, id) => {
          if (client.endpointId === endpointId && client.readyState === WebSocket.OPEN) {
            client.send(message);

            // Log outgoing message
            this.addLog({
              id: nanoid(),
              endpointId,
              connectionId: id,
              direction: 'outgoing',
              messageType: response.type,
              data: response.data,
              matchedPattern,
              timestamp: new Date(),
            });
          }
        });
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);

        // Log outgoing message
        this.addLog({
          id: nanoid(),
          endpointId,
          connectionId,
          direction: 'outgoing',
          messageType: response.type,
          data: response.data,
          matchedPattern,
          timestamp: new Date(),
        });
      }
    };

    if (response.delay && response.delay > 0) {
      setTimeout(send, response.delay);
    } else {
      send();
    }
  }

  /**
   * Detect message type
   */
  private detectMessageType(message: string): 'text' | 'json' | 'binary' {
    try {
      JSON.parse(message);
      return 'json';
    } catch {
      return 'text';
    }
  }

  /**
   * Add message log
   */
  private addLog(log: WebSocketMessageLog): void {
    this.messageLogs.unshift(log);

    if (this.messageLogs.length > MAX_WS_LOGS) {
      this.messageLogs = this.messageLogs.slice(0, MAX_WS_LOGS);
    }
  }

  // ============================================
  // ENDPOINT CRUD OPERATIONS
  // ============================================

  /**
   * Create WebSocket endpoint
   */
  createEndpoint(dto: CreateWebSocketEndpointDto): WebSocketEndpoint {
    const now = new Date();
    const endpoint: WebSocketEndpoint = {
      id: nanoid(),
      path: dto.path.startsWith('/') ? dto.path : '/' + dto.path,
      description: dto.description,
      status: dto.status || 'active',
      messagePatterns: dto.messagePatterns || [],
      scheduledMessages: dto.scheduledMessages || [],
      onConnectMessage: dto.onConnectMessage,
      onDisconnectMessage: dto.onDisconnectMessage,
      createdAt: now,
      updatedAt: now,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.setupScheduledMessages(endpoint);

    console.log(`[WebSocket] Created endpoint: ${endpoint.path}`);
    return endpoint;
  }

  /**
   * Get endpoint by ID
   */
  getEndpoint(id: string): WebSocketEndpoint | null {
    return this.endpoints.get(id) || null;
  }

  /**
   * Get all endpoints
   */
  getAllEndpoints(): WebSocketEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Update endpoint
   */
  updateEndpoint(id: string, dto: UpdateWebSocketEndpointDto): WebSocketEndpoint | null {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;

    const updated: WebSocketEndpoint = {
      ...endpoint,
      ...dto,
      path: dto.path ? (dto.path.startsWith('/') ? dto.path : '/' + dto.path) : endpoint.path,
      updatedAt: new Date(),
    };

    this.endpoints.set(id, updated);

    // Re-setup scheduled messages
    this.clearScheduledMessages(id);
    this.setupScheduledMessages(updated);

    console.log(`[WebSocket] Updated endpoint: ${updated.path}`);
    return updated;
  }

  /**
   * Delete endpoint
   */
  deleteEndpoint(id: string): boolean {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return false;

    // Close all connections to this endpoint
    this.connections.forEach((ws, connId) => {
      if (ws.endpointId === id) {
        ws.close(1000, 'Endpoint deleted');
        this.connections.delete(connId);
        this.connectionInfo.delete(connId);
      }
    });

    // Clear scheduled messages
    this.clearScheduledMessages(id);

    const deleted = this.endpoints.delete(id);
    if (deleted) {
      console.log(`[WebSocket] Deleted endpoint: ${endpoint.path}`);
    }
    return deleted;
  }

  /**
   * Find endpoint by path
   */
  findEndpointByPath(path: string): WebSocketEndpoint | null {
    const normalizedPath = path.startsWith('/') ? path : '/' + path;

    for (const endpoint of this.endpoints.values()) {
      if (endpoint.path === normalizedPath) {
        return endpoint;
      }
    }
    return null;
  }

  // ============================================
  // SCHEDULED MESSAGES
  // ============================================

  /**
   * Setup scheduled messages for an endpoint
   */
  private setupScheduledMessages(endpoint: WebSocketEndpoint): void {
    if (!endpoint.scheduledMessages) return;

    for (const scheduled of endpoint.scheduledMessages) {
      if (!scheduled.enabled) continue;

      const intervalId = setInterval(() => {
        this.connections.forEach((ws, connId) => {
          if (ws.endpointId === endpoint.id && ws.readyState === WebSocket.OPEN) {
            this.sendResponse(ws, scheduled.message, connId, endpoint.id, `scheduled:${scheduled.name}`);
          }
        });
      }, scheduled.interval);

      this.scheduledIntervals.set(`${endpoint.id}:${scheduled.id}`, intervalId);
    }
  }

  /**
   * Clear scheduled messages for an endpoint
   */
  private clearScheduledMessages(endpointId: string): void {
    this.scheduledIntervals.forEach((intervalId, key) => {
      if (key.startsWith(`${endpointId}:`)) {
        clearInterval(intervalId);
        this.scheduledIntervals.delete(key);
      }
    });
  }

  // ============================================
  // CONNECTION & LOG OPERATIONS
  // ============================================

  /**
   * Get all connections
   */
  getConnections(): WebSocketConnection[] {
    return Array.from(this.connectionInfo.values());
  }

  /**
   * Get connections for endpoint
   */
  getConnectionsForEndpoint(endpointId: string): WebSocketConnection[] {
    return Array.from(this.connectionInfo.values()).filter(
      (conn) => conn.endpointId === endpointId
    );
  }

  /**
   * Close a connection
   */
  closeConnection(connectionId: string): boolean {
    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.close(1000, 'Closed by admin');
      this.connections.delete(connectionId);
      this.connectionInfo.delete(connectionId);
      return true;
    }
    return false;
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: string): boolean {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);

      this.addLog({
        id: nanoid(),
        endpointId: ws.endpointId!,
        connectionId,
        direction: 'outgoing',
        messageType: this.detectMessageType(message),
        data: message,
        matchedPattern: 'manual',
        timestamp: new Date(),
      });
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all connections on an endpoint
   */
  broadcast(endpointId: string, message: string): number {
    let count = 0;
    this.connections.forEach((ws, connId) => {
      if (ws.endpointId === endpointId && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        count++;

        this.addLog({
          id: nanoid(),
          endpointId,
          connectionId: connId,
          direction: 'outgoing',
          messageType: this.detectMessageType(message),
          data: message,
          matchedPattern: 'broadcast',
          timestamp: new Date(),
        });
      }
    });
    return count;
  }

  /**
   * Get message logs
   */
  getLogs(endpointId?: string, limit?: number): WebSocketMessageLog[] {
    let logs = this.messageLogs;

    if (endpointId) {
      logs = logs.filter((log) => log.endpointId === endpointId);
    }

    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Clear logs
   */
  clearLogs(endpointId?: string): void {
    if (endpointId) {
      this.messageLogs = this.messageLogs.filter((log) => log.endpointId !== endpointId);
    } else {
      this.messageLogs = [];
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalEndpoints: this.endpoints.size,
      activeConnections: this.connections.size,
      totalLogs: this.messageLogs.length,
    };
  }
}

// Singleton instance
export const webSocketHandler = new WebSocketHandler();
