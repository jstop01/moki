import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import {
  AdminTokenConfig,
  TeamMember,
  TeamSettings,
  ActiveSession,
  ChangeNotification,
} from '@mock-api-builder/shared';

/**
 * Team settings (can be configured via environment or API)
 */
let teamSettings: TeamSettings = {
  enabled: process.env.TEAM_ENABLED === 'true',
  requireAuth: process.env.TEAM_REQUIRE_AUTH === 'true',
  broadcastChanges: true,
  trackUserInHistory: true,
};

/**
 * Admin tokens (loaded from environment variables)
 * Format: ADMIN_TOKENS=name1:token1:role1,name2:token2:role2
 */
const adminTokens: Map<string, AdminTokenConfig> = new Map();

/**
 * Active sessions
 */
const activeSessions: Map<string, ActiveSession> = new Map();

/**
 * Change listeners (WebSocket connections)
 */
const changeListeners: Set<(notification: ChangeNotification) => void> = new Set();

/**
 * Load admin tokens from environment
 */
function loadAdminTokens(): void {
  const tokensEnv = process.env.ADMIN_TOKENS || '';
  if (!tokensEnv) {
    // Add a default token for development
    const defaultToken = process.env.ADMIN_TOKEN || 'dev-admin-token';
    adminTokens.set(defaultToken, {
      token: defaultToken,
      name: 'Admin',
      role: 'admin',
    });
    return;
  }

  const tokenPairs = tokensEnv.split(',');
  for (const pair of tokenPairs) {
    const [name, token, role = 'editor'] = pair.split(':');
    if (name && token) {
      adminTokens.set(token, {
        token,
        name,
        role: role as 'admin' | 'editor' | 'viewer',
      });
    }
  }
}

// Initialize tokens on load
loadAdminTokens();

/**
 * Hash token for storage/comparison
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').substring(0, 16);
}

/**
 * Get team settings
 */
export function getTeamSettings(): TeamSettings {
  return { ...teamSettings };
}

/**
 * Update team settings
 */
export function setTeamSettings(settings: Partial<TeamSettings>): void {
  teamSettings = { ...teamSettings, ...settings };
}

/**
 * Validate admin token
 */
export function validateAdminToken(token: string): AdminTokenConfig | null {
  return adminTokens.get(token) || null;
}

/**
 * Get current user from request
 */
export function getCurrentUser(req: Request): TeamMember | null {
  const token = extractToken(req);
  if (!token) return null;

  const config = adminTokens.get(token);
  if (!config) return null;

  return {
    tokenId: hashToken(token),
    name: config.name,
    role: config.role,
    lastActive: new Date(),
  };
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-Admin-Token header
  const adminToken = req.get('X-Admin-Token');
  if (adminToken) {
    return adminToken;
  }

  // Check query parameter
  const queryToken = req.query.admin_token as string;
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * Team authentication middleware
 */
export function teamAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip if team auth is not required
  if (!teamSettings.enabled || !teamSettings.requireAuth) {
    // Set default user for tracking
    (req as any).teamUser = {
      tokenId: 'anonymous',
      name: 'Anonymous',
      role: 'admin',
    };
    next();
    return;
  }

  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin token required. Use Authorization: Bearer <token> or X-Admin-Token header.',
    });
    return;
  }

  const config = validateAdminToken(token);
  if (!config) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin token',
    });
    return;
  }

  // Check role for write operations
  if (config.role === 'viewer' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Viewer role cannot make changes',
    });
    return;
  }

  // Attach user to request
  (req as any).teamUser = {
    tokenId: hashToken(token),
    name: config.name,
    role: config.role,
    lastActive: new Date(),
  };

  // Update session
  const sessionId = hashToken(token + req.ip);
  activeSessions.set(sessionId, {
    sessionId,
    tokenId: hashToken(token),
    name: config.name,
    role: config.role,
    connectedAt: activeSessions.get(sessionId)?.connectedAt || new Date(),
    lastActivity: new Date(),
    currentView: req.path,
  });

  next();
}

/**
 * Get active sessions
 */
export function getActiveSessions(): ActiveSession[] {
  // Clean up old sessions (inactive for more than 5 minutes)
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > 300000) {
      activeSessions.delete(id);
    }
  }

  return Array.from(activeSessions.values());
}

/**
 * Register change listener
 */
export function addChangeListener(listener: (notification: ChangeNotification) => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/**
 * Broadcast change notification
 */
export function broadcastChange(notification: ChangeNotification): void {
  if (!teamSettings.broadcastChanges) return;

  for (const listener of changeListeners) {
    try {
      listener(notification);
    } catch (error) {
      console.error('Error broadcasting change:', error);
    }
  }
}

/**
 * Create change notification
 */
export function createChangeNotification(
  type: ChangeNotification['type'],
  resourceId: string,
  user: TeamMember | null,
  summary?: string
): ChangeNotification {
  return {
    type,
    resourceId,
    changedBy: {
      tokenId: user?.tokenId || 'unknown',
      name: user?.name || 'Unknown',
    },
    timestamp: new Date(),
    summary,
  };
}

/**
 * Get user info for history tracking
 */
export function getUserForHistory(req: Request): { tokenId: string; name: string } | undefined {
  if (!teamSettings.trackUserInHistory) return undefined;

  const user = (req as any).teamUser as TeamMember | undefined;
  if (!user) return undefined;

  return {
    tokenId: user.tokenId,
    name: user.name,
  };
}
