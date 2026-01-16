/**
 * Team Sharing Types
 *
 * Simple team collaboration features:
 * - Token-based admin authentication
 * - User tracking in changes
 * - Real-time sync notifications
 */

/**
 * Team member info (minimal, derived from token)
 */
export interface TeamMember {
  /** Token identifier (hashed) */
  tokenId: string;
  /** Display name */
  name: string;
  /** Role */
  role: 'admin' | 'editor' | 'viewer';
  /** Last active timestamp */
  lastActive?: Date;
}

/**
 * Admin token configuration
 */
export interface AdminTokenConfig {
  /** Token value */
  token: string;
  /** Associated user name */
  name: string;
  /** Role */
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * Change notification (for real-time sync)
 */
export interface ChangeNotification {
  /** Type of change */
  type: 'endpoint:create' | 'endpoint:update' | 'endpoint:delete' | 'websocket:create' | 'websocket:update' | 'websocket:delete' | 'settings:update';
  /** ID of the changed resource */
  resourceId: string;
  /** User who made the change */
  changedBy: {
    tokenId: string;
    name: string;
  };
  /** Timestamp */
  timestamp: Date;
  /** Summary of changes */
  summary?: string;
}

/**
 * Active session info
 */
export interface ActiveSession {
  /** Session ID */
  sessionId: string;
  /** Token ID */
  tokenId: string;
  /** User name */
  name: string;
  /** Role */
  role: 'admin' | 'editor' | 'viewer';
  /** Connected at */
  connectedAt: Date;
  /** Last activity */
  lastActivity: Date;
  /** Current page/view */
  currentView?: string;
}

/**
 * Team settings
 */
export interface TeamSettings {
  /** Enable team features */
  enabled: boolean;
  /** Require authentication for admin API */
  requireAuth: boolean;
  /** Broadcast changes via WebSocket */
  broadcastChanges: boolean;
  /** Track user in history */
  trackUserInHistory: boolean;
}
