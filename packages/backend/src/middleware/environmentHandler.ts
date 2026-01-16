import { Request } from 'express';
import {
  EnvironmentName,
  EnvironmentSettings,
  EnvironmentOverride,
  Environment,
  DEFAULT_ENVIRONMENT_SETTINGS,
  DEFAULT_ENVIRONMENTS,
  Endpoint,
} from '@mock-api-builder/shared';

/**
 * Environment settings (can be configured via API)
 */
let environmentSettings: EnvironmentSettings = { ...DEFAULT_ENVIRONMENT_SETTINGS };

/**
 * Get environment settings
 */
export function getEnvironmentSettings(): EnvironmentSettings {
  return { ...environmentSettings };
}

/**
 * Update environment settings
 */
export function setEnvironmentSettings(settings: Partial<EnvironmentSettings>): void {
  environmentSettings = {
    ...environmentSettings,
    ...settings,
    environments: settings.environments || environmentSettings.environments,
  };
}

/**
 * Get available environments
 */
export function getEnvironments(): Environment[] {
  return [...environmentSettings.environments];
}

/**
 * Add a new environment
 */
export function addEnvironment(env: Omit<Environment, 'createdAt' | 'updatedAt'>): Environment {
  const newEnv: Environment = {
    ...env,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  environmentSettings.environments.push(newEnv);
  return newEnv;
}

/**
 * Update an environment
 */
export function updateEnvironment(name: string, updates: Partial<Environment>): Environment | null {
  const index = environmentSettings.environments.findIndex(e => e.name === name);
  if (index === -1) return null;

  environmentSettings.environments[index] = {
    ...environmentSettings.environments[index],
    ...updates,
    updatedAt: new Date(),
  };
  return environmentSettings.environments[index];
}

/**
 * Delete an environment
 */
export function deleteEnvironment(name: string): boolean {
  const index = environmentSettings.environments.findIndex(e => e.name === name);
  if (index === -1) return false;

  // Don't delete if it's the default
  if (environmentSettings.environments[index].isDefault) {
    return false;
  }

  environmentSettings.environments.splice(index, 1);
  return true;
}

/**
 * Extract environment from request
 */
export function extractEnvironment(req: Request): EnvironmentName {
  // Check header first
  const headerEnv = req.get(environmentSettings.headerName);
  if (headerEnv) {
    return headerEnv;
  }

  // Check query parameter
  if (environmentSettings.queryParamName) {
    const queryEnv = req.query[environmentSettings.queryParamName] as string;
    if (queryEnv) {
      return queryEnv;
    }
  }

  // Return default
  return environmentSettings.defaultEnvironment;
}

/**
 * Check if environment feature is enabled
 */
export function isEnvironmentEnabled(): boolean {
  return environmentSettings.enabled;
}

/**
 * Get environment override for an endpoint
 */
export function getEnvironmentOverride(
  endpoint: Endpoint,
  environment: EnvironmentName
): EnvironmentOverride | null {
  if (!environmentSettings.enabled) {
    return null;
  }

  const overrides = endpoint.environmentOverrides;
  if (!overrides) {
    return null;
  }

  const override = overrides[environment];
  if (!override || override.enabled === false) {
    return null;
  }

  return override;
}

/**
 * Apply environment override to response
 */
export function applyEnvironmentOverride(
  endpoint: Endpoint,
  override: EnvironmentOverride | null
): {
  responseStatus: number;
  responseData: any;
  delay?: number | { min: number; max: number };
} {
  if (!override) {
    return {
      responseStatus: endpoint.responseStatus,
      responseData: endpoint.responseData,
      delay: endpoint.delay,
    };
  }

  return {
    responseStatus: override.responseStatus ?? endpoint.responseStatus,
    responseData: override.responseData !== undefined ? override.responseData : endpoint.responseData,
    delay: override.delay ?? endpoint.delay,
  };
}

/**
 * Reset environment settings to defaults
 */
export function resetEnvironmentSettings(): void {
  environmentSettings = { ...DEFAULT_ENVIRONMENT_SETTINGS };
}
