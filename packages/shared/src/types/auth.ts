/**
 * Auth Simulation Types
 *
 * Supports:
 * - Bearer Token validation (static token)
 * - JWT structure validation (with optional expiry check)
 * - API Key header validation
 * - Basic Auth
 */

/**
 * Authentication method type
 */
export type AuthMethod = 'none' | 'bearer' | 'jwt' | 'apiKey' | 'basic';

/**
 * Bearer Token configuration
 * Simple static token validation
 */
export interface BearerTokenConfig {
  /** List of valid tokens */
  validTokens: string[];
  /** Whether to accept any non-empty token (for testing) */
  acceptAny?: boolean;
}

/**
 * JWT configuration
 * Validates JWT structure and optionally checks expiry
 */
export interface JwtConfig {
  /** Valid JWT secrets (for signature validation - optional) */
  secrets?: string[];
  /** Whether to validate signature (if false, only validates structure) */
  validateSignature?: boolean;
  /** Whether to check expiry claim */
  checkExpiry?: boolean;
  /** Required claims (e.g., ['sub', 'email']) */
  requiredClaims?: string[];
  /** Valid issuers (iss claim) */
  validIssuers?: string[];
  /** Valid audiences (aud claim) */
  validAudiences?: string[];
}

/**
 * API Key configuration
 * Validates API key in header or query parameter
 */
export interface ApiKeyConfig {
  /** Header name for API key (default: X-API-Key) */
  headerName?: string;
  /** Query parameter name for API key (alternative to header) */
  queryParamName?: string;
  /** List of valid API keys */
  validKeys: string[];
}

/**
 * Basic Auth configuration
 * Validates username:password combinations
 */
export interface BasicAuthConfig {
  /** Valid username:password pairs */
  credentials: Array<{
    username: string;
    password: string;
  }>;
}

/**
 * Auth error response configuration
 */
export interface AuthErrorResponse {
  /** HTTP status code for auth failure (default: 401) */
  status?: number;
  /** Error response body */
  body?: any;
  /** Additional headers to include in error response */
  headers?: Record<string, string>;
}

/**
 * Complete auth configuration for an endpoint
 */
export interface AuthConfig {
  /** Enable/disable auth for this endpoint */
  enabled: boolean;

  /** Authentication method */
  method: AuthMethod;

  /** Bearer token configuration */
  bearerConfig?: BearerTokenConfig;

  /** JWT configuration */
  jwtConfig?: JwtConfig;

  /** API Key configuration */
  apiKeyConfig?: ApiKeyConfig;

  /** Basic Auth configuration */
  basicAuthConfig?: BasicAuthConfig;

  /** Custom error response */
  errorResponse?: AuthErrorResponse;

  /** Paths to exclude from auth (glob patterns) */
  excludePaths?: string[];
}

/**
 * Auth validation result
 */
export interface AuthValidationResult {
  /** Whether authentication was successful */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Decoded token/credentials (for logging/debugging) */
  decoded?: any;
  /** Auth method used */
  method?: AuthMethod;
}

/**
 * Global auth settings (applied to all endpoints unless overridden)
 */
export interface GlobalAuthSettings {
  /** Enable global auth */
  enabled: boolean;

  /** Default auth method */
  defaultMethod: AuthMethod;

  /** Default bearer config */
  bearerConfig?: BearerTokenConfig;

  /** Default JWT config */
  jwtConfig?: JwtConfig;

  /** Default API Key config */
  apiKeyConfig?: ApiKeyConfig;

  /** Default Basic Auth config */
  basicAuthConfig?: BasicAuthConfig;

  /** Default error response */
  defaultErrorResponse?: AuthErrorResponse;

  /** Paths to exclude from global auth */
  excludePaths?: string[];
}
