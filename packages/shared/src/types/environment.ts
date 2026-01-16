/**
 * Environment Types
 *
 * Support for multiple environments (dev, staging, prod)
 * with environment-specific response overrides.
 */

/**
 * Predefined environment names
 */
export type EnvironmentName = 'dev' | 'staging' | 'prod' | string;

/**
 * Environment-specific response override
 */
export interface EnvironmentOverride {
  /** Override response status */
  responseStatus?: number;

  /** Override response data */
  responseData?: any;

  /** Override delay */
  delay?: number | { min: number; max: number };

  /** Whether this override is enabled */
  enabled?: boolean;
}

/**
 * Environment definition
 */
export interface Environment {
  /** Environment name (unique identifier) */
  name: EnvironmentName;

  /** Display name */
  displayName: string;

  /** Description */
  description?: string;

  /** Color for UI (hex) */
  color?: string;

  /** Whether this is the default environment */
  isDefault?: boolean;

  /** Created at */
  createdAt: Date;

  /** Updated at */
  updatedAt: Date;
}

/**
 * Endpoint environment overrides
 * Mapping of environment name to override settings
 */
export type EndpointEnvironments = Record<EnvironmentName, EnvironmentOverride>;

/**
 * Environment settings
 */
export interface EnvironmentSettings {
  /** Enable environment feature */
  enabled: boolean;

  /** Default environment */
  defaultEnvironment: EnvironmentName;

  /** Header name to specify environment */
  headerName: string;

  /** Query parameter name to specify environment */
  queryParamName?: string;

  /** Available environments */
  environments: Environment[];
}

/**
 * Default environments
 */
export const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    name: 'dev',
    displayName: '개발',
    description: '개발 환경',
    color: '#22c55e', // green
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'staging',
    displayName: '스테이징',
    description: '테스트/QA 환경',
    color: '#f59e0b', // amber
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'prod',
    displayName: '프로덕션',
    description: '운영 환경',
    color: '#ef4444', // red
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Default environment settings
 */
export const DEFAULT_ENVIRONMENT_SETTINGS: EnvironmentSettings = {
  enabled: false,
  defaultEnvironment: 'dev',
  headerName: 'X-Mock-Environment',
  queryParamName: 'mock_env',
  environments: DEFAULT_ENVIRONMENTS,
};
