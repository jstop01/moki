/**
 * WebSocket Mock Types
 */

/**
 * WebSocket endpoint status
 */
export type WebSocketStatus = 'active' | 'inactive';

/**
 * WebSocket message match type
 */
export type MessageMatchType = 'exact' | 'contains' | 'regex' | 'json-path';

/**
 * WebSocket message pattern for matching incoming messages
 */
export interface WebSocketMessagePattern {
  /** Pattern name for identification */
  name?: string;

  /** Match type */
  matchType: MessageMatchType;

  /** Pattern value (string to match, regex, or JSON path) */
  pattern: string;

  /** Response to send when pattern matches */
  response: WebSocketResponse;
}

/**
 * WebSocket response configuration
 */
export interface WebSocketResponse {
  /** Response type */
  type: 'text' | 'json' | 'binary';

  /** Response data (string or object for JSON) */
  data: any;

  /** Delay before sending response (ms) */
  delay?: number;

  /** Send to all connected clients (broadcast) */
  broadcast?: boolean;
}

/**
 * Scheduled message configuration (for auto-push)
 */
export interface ScheduledMessage {
  /** Unique identifier */
  id: string;

  /** Message name */
  name: string;

  /** Whether this schedule is active */
  enabled: boolean;

  /** Interval in milliseconds */
  interval: number;

  /** Message to send */
  message: WebSocketResponse;
}

/**
 * WebSocket endpoint configuration
 */
export interface WebSocketEndpoint {
  /** Unique identifier */
  id: string;

  /** WebSocket path (e.g., /ws/chat) */
  path: string;

  /** Human-readable description */
  description?: string;

  /** Endpoint status */
  status: WebSocketStatus;

  /** Message patterns for auto-response */
  messagePatterns: WebSocketMessagePattern[];

  /** Scheduled messages (auto-push) */
  scheduledMessages?: ScheduledMessage[];

  /** Welcome message on connect */
  onConnectMessage?: WebSocketResponse;

  /** Message to send on disconnect */
  onDisconnectMessage?: WebSocketResponse;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating WebSocket endpoint
 */
export interface CreateWebSocketEndpointDto {
  path: string;
  description?: string;
  status?: WebSocketStatus;
  messagePatterns?: WebSocketMessagePattern[];
  scheduledMessages?: ScheduledMessage[];
  onConnectMessage?: WebSocketResponse;
  onDisconnectMessage?: WebSocketResponse;
}

/**
 * DTO for updating WebSocket endpoint
 */
export interface UpdateWebSocketEndpointDto {
  path?: string;
  description?: string;
  status?: WebSocketStatus;
  messagePatterns?: WebSocketMessagePattern[];
  scheduledMessages?: ScheduledMessage[];
  onConnectMessage?: WebSocketResponse;
  onDisconnectMessage?: WebSocketResponse;
}

/**
 * WebSocket connection info
 */
export interface WebSocketConnection {
  id: string;
  endpointId: string;
  clientIp?: string;
  userAgent?: string;
  connectedAt: Date;
}

/**
 * WebSocket message log
 */
export interface WebSocketMessageLog {
  id: string;
  endpointId: string;
  connectionId: string;
  direction: 'incoming' | 'outgoing';
  messageType: 'text' | 'json' | 'binary';
  data: any;
  matchedPattern?: string;
  timestamp: Date;
}
