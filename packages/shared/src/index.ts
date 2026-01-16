// Endpoint types
export * from './types/endpoint';

// Log types
export * from './types/log';

// Import/Export types
export * from './types/import-export';

// WebSocket types
export * from './types/websocket';

// Auth types
export * from './types/auth';

// Team types
export * from './types/team';

// Environment types
export * from './types/environment';

// GraphQL types
export * from './types/graphql';

// Utility types
export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: Date;
  uptime: number;
  version: string;
}

// Constants
export const DEFAULT_RESPONSE_STATUS = 200;
export const DEFAULT_DELAY = 0;
export const MAX_LOGS = 1000;
export const MOCK_API_VERSION = '1.0.0';
