import { Request, Response, NextFunction } from 'express';
import {
  AuthConfig,
  AuthValidationResult,
  AuthMethod,
  BearerTokenConfig,
  JwtConfig,
  ApiKeyConfig,
  BasicAuthConfig,
  AuthErrorResponse,
  GlobalAuthSettings,
} from '@mock-api-builder/shared';

/**
 * Default error responses for each auth method
 */
const defaultErrors: Record<AuthMethod, AuthErrorResponse> = {
  none: { status: 401, body: { error: 'Unauthorized' } },
  bearer: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Invalid or missing Bearer token' },
    headers: { 'WWW-Authenticate': 'Bearer' },
  },
  jwt: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Invalid or expired JWT token' },
    headers: { 'WWW-Authenticate': 'Bearer' },
  },
  apiKey: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Invalid or missing API key' },
  },
  basic: {
    status: 401,
    body: { error: 'Unauthorized', message: 'Invalid credentials' },
    headers: { 'WWW-Authenticate': 'Basic realm="Mock API"' },
  },
};

/**
 * Global auth settings (can be set via API)
 */
let globalAuthSettings: GlobalAuthSettings = {
  enabled: false,
  defaultMethod: 'none',
};

/**
 * Set global auth settings
 */
export function setGlobalAuthSettings(settings: GlobalAuthSettings): void {
  globalAuthSettings = settings;
}

/**
 * Get global auth settings
 */
export function getGlobalAuthSettings(): GlobalAuthSettings {
  return { ...globalAuthSettings };
}

/**
 * Validate Bearer token
 */
function validateBearerToken(
  req: Request,
  config: BearerTokenConfig
): AuthValidationResult {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing Bearer token', method: 'bearer' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    return { valid: false, error: 'Empty Bearer token', method: 'bearer' };
  }

  // Accept any non-empty token if configured
  if (config.acceptAny) {
    return { valid: true, decoded: { token }, method: 'bearer' };
  }

  // Check against valid tokens
  if (config.validTokens.includes(token)) {
    return { valid: true, decoded: { token }, method: 'bearer' };
  }

  return { valid: false, error: 'Invalid Bearer token', method: 'bearer' };
}

/**
 * Decode JWT without signature verification
 */
function decodeJwt(token: string): { header: any; payload: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    return { header, payload };
  } catch {
    return null;
  }
}

/**
 * Validate JWT token
 */
function validateJwtToken(req: Request, config: JwtConfig): AuthValidationResult {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing JWT token', method: 'jwt' };
  }

  const token = authHeader.substring(7);

  if (!token) {
    return { valid: false, error: 'Empty JWT token', method: 'jwt' };
  }

  // Decode JWT
  const decoded = decodeJwt(token);
  if (!decoded) {
    return { valid: false, error: 'Invalid JWT structure', method: 'jwt' };
  }

  // Check expiry if configured
  if (config.checkExpiry && decoded.payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp < now) {
      return { valid: false, error: 'JWT token expired', method: 'jwt', decoded };
    }
  }

  // Check required claims
  if (config.requiredClaims && config.requiredClaims.length > 0) {
    for (const claim of config.requiredClaims) {
      if (!(claim in decoded.payload)) {
        return {
          valid: false,
          error: `Missing required claim: ${claim}`,
          method: 'jwt',
          decoded,
        };
      }
    }
  }

  // Check issuer
  if (config.validIssuers && config.validIssuers.length > 0) {
    if (!config.validIssuers.includes(decoded.payload.iss)) {
      return { valid: false, error: 'Invalid token issuer', method: 'jwt', decoded };
    }
  }

  // Check audience
  if (config.validAudiences && config.validAudiences.length > 0) {
    const tokenAud = Array.isArray(decoded.payload.aud)
      ? decoded.payload.aud
      : [decoded.payload.aud];
    const hasValidAud = tokenAud.some((aud: string) =>
      config.validAudiences!.includes(aud)
    );
    if (!hasValidAud) {
      return { valid: false, error: 'Invalid token audience', method: 'jwt', decoded };
    }
  }

  // Note: Signature validation is not implemented (would require jsonwebtoken library)
  // For mock purposes, we only validate structure and claims

  return { valid: true, decoded, method: 'jwt' };
}

/**
 * Validate API Key
 */
function validateApiKey(req: Request, config: ApiKeyConfig): AuthValidationResult {
  const headerName = config.headerName || 'X-API-Key';
  const queryParamName = config.queryParamName;

  // Try header first
  let apiKey = req.get(headerName);

  // If not in header, try query param
  if (!apiKey && queryParamName) {
    apiKey = req.query[queryParamName] as string;
  }

  if (!apiKey) {
    return {
      valid: false,
      error: `Missing API key (expected in ${headerName} header${queryParamName ? ` or ${queryParamName} query param` : ''})`,
      method: 'apiKey',
    };
  }

  if (config.validKeys.includes(apiKey)) {
    return { valid: true, decoded: { apiKey }, method: 'apiKey' };
  }

  return { valid: false, error: 'Invalid API key', method: 'apiKey' };
}

/**
 * Validate Basic Auth
 */
function validateBasicAuth(
  req: Request,
  config: BasicAuthConfig
): AuthValidationResult {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { valid: false, error: 'Missing Basic auth credentials', method: 'basic' };
  }

  const base64Credentials = authHeader.substring(6);

  try {
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || password === undefined) {
      return { valid: false, error: 'Invalid Basic auth format', method: 'basic' };
    }

    const isValid = config.credentials.some(
      (cred) => cred.username === username && cred.password === password
    );

    if (isValid) {
      return { valid: true, decoded: { username }, method: 'basic' };
    }

    return { valid: false, error: 'Invalid username or password', method: 'basic' };
  } catch {
    return { valid: false, error: 'Invalid Basic auth encoding', method: 'basic' };
  }
}

/**
 * Check if path should be excluded from auth
 */
function isPathExcluded(path: string, excludePaths?: string[]): boolean {
  if (!excludePaths || excludePaths.length === 0) {
    return false;
  }

  return excludePaths.some((pattern) => {
    // Simple glob matching
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regexPattern}$`).test(path);
    }
    return path === pattern;
  });
}

/**
 * Validate auth based on configuration
 */
export function validateAuth(
  req: Request,
  authConfig?: AuthConfig
): AuthValidationResult {
  // Check global auth first
  const effectiveConfig = authConfig?.enabled
    ? authConfig
    : globalAuthSettings.enabled
    ? {
        enabled: true,
        method: globalAuthSettings.defaultMethod,
        bearerConfig: globalAuthSettings.bearerConfig,
        jwtConfig: globalAuthSettings.jwtConfig,
        apiKeyConfig: globalAuthSettings.apiKeyConfig,
        basicAuthConfig: globalAuthSettings.basicAuthConfig,
        excludePaths: globalAuthSettings.excludePaths,
      }
    : null;

  if (!effectiveConfig || !effectiveConfig.enabled) {
    return { valid: true, method: 'none' };
  }

  // Check if path is excluded
  if (isPathExcluded(req.path, effectiveConfig.excludePaths)) {
    return { valid: true, method: 'none' };
  }

  switch (effectiveConfig.method) {
    case 'bearer':
      if (!effectiveConfig.bearerConfig) {
        return { valid: false, error: 'Bearer config not provided', method: 'bearer' };
      }
      return validateBearerToken(req, effectiveConfig.bearerConfig);

    case 'jwt':
      if (!effectiveConfig.jwtConfig) {
        return { valid: false, error: 'JWT config not provided', method: 'jwt' };
      }
      return validateJwtToken(req, effectiveConfig.jwtConfig);

    case 'apiKey':
      if (!effectiveConfig.apiKeyConfig) {
        return { valid: false, error: 'API Key config not provided', method: 'apiKey' };
      }
      return validateApiKey(req, effectiveConfig.apiKeyConfig);

    case 'basic':
      if (!effectiveConfig.basicAuthConfig) {
        return { valid: false, error: 'Basic Auth config not provided', method: 'basic' };
      }
      return validateBasicAuth(req, effectiveConfig.basicAuthConfig);

    case 'none':
    default:
      return { valid: true, method: 'none' };
  }
}

/**
 * Send auth error response
 */
export function sendAuthError(
  res: Response,
  result: AuthValidationResult,
  customError?: AuthErrorResponse
): void {
  const defaultError = defaultErrors[result.method || 'none'];
  const errorConfig = customError || defaultError;

  // Set headers
  if (errorConfig.headers) {
    Object.entries(errorConfig.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  // Send response
  res.status(errorConfig.status || 401).json(
    errorConfig.body || {
      error: 'Unauthorized',
      message: result.error,
    }
  );
}

/**
 * Express middleware for auth simulation
 * This can be used directly in routes if needed
 */
export function authMiddleware(authConfig?: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateAuth(req, authConfig);

    if (!result.valid) {
      sendAuthError(res, result, authConfig?.errorResponse);
      return;
    }

    // Attach auth info to request for downstream use
    (req as any).auth = result;
    next();
  };
}
