import { Request } from 'express';

/**
 * Template Engine for Dynamic Response Variables
 *
 * Supported variables:
 * - {{$timestamp}} - Unix timestamp in milliseconds
 * - {{$isoDate}} - ISO 8601 date string
 * - {{$uuid}} - UUID v4
 * - {{$randomInt}} - Random integer 0-1000
 * - {{$randomInt min max}} - Random integer in range
 * - {{$randomFloat}} - Random float 0-1
 * - {{$randomFloat min max precision}} - Random float with precision
 * - {{$randomString n}} - Random alphanumeric string of length n
 * - {{$randomEmail}} - Random email address
 * - {{$randomName}} - Random full name
 * - {{$randomBoolean}} - Random true/false
 * - {{$request.query.xxx}} - Query parameter value
 * - {{$request.header.xxx}} - Header value
 * - {{$request.body.xxx}} - Body field (supports nested paths like body.user.name)
 * - {{$request.path.xxx}} - Path parameter value
 */

// Random data generators
const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const emailDomains = ['example.com', 'test.com', 'mock.dev', 'sample.org', 'demo.net'];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function generateRandomEmail(): string {
  const name = generateRandomString(8).toLowerCase();
  const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
  return `${name}@${domain}`;
}

function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Process a string value and replace template variables
 */
function processString(
  str: string,
  req: Request,
  pathParams: Record<string, string>
): string {
  // Process all template variables in one pass
  return str.replace(/\{\{\$([^}]+)\}\}/g, (match: string, expression: string): string => {
    try {
      const trimmed = expression.trim();
      const parts = trimmed.split(/\s+/);
      const varName = parts[0];
      const args = parts.slice(1);

      switch (varName) {
        // Time-related
        case 'timestamp':
          return String(Date.now());

        case 'isoDate':
          return new Date().toISOString();

        // Random generators
        case 'uuid':
          return generateUUID();

        case 'randomInt': {
          const min = args[0] ? parseInt(args[0]) : 0;
          const max = args[1] ? parseInt(args[1]) : 1000;
          return String(Math.floor(Math.random() * (max - min + 1)) + min);
        }

        case 'randomFloat': {
          const min = args[0] ? parseFloat(args[0]) : 0;
          const max = args[1] ? parseFloat(args[1]) : 1;
          const precision = args[2] ? parseInt(args[2]) : 2;
          const value = Math.random() * (max - min) + min;
          return value.toFixed(precision);
        }

        case 'randomString': {
          const length = args[0] ? parseInt(args[0]) : 10;
          return generateRandomString(length);
        }

        case 'randomEmail':
          return generateRandomEmail();

        case 'randomName':
          return generateRandomName();

        case 'randomBoolean':
          return String(Math.random() < 0.5);

        // Request data access
        case 'request.query': {
          const key = args[0];
          if (!key) return match;
          const value = req.query[key];
          return value !== undefined ? String(value) : '';
        }

        case 'request.header': {
          const key = args[0];
          if (!key) return match;
          return req.get(key) || '';
        }

        case 'request.body': {
          const key = args[0];
          if (!key) return match;
          const value = getNestedValue(req.body, key);
          if (value === undefined || value === null) return '';
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }

        case 'request.path': {
          const key = args[0];
          if (!key) return match;
          return pathParams[key] || req.params[key] || '';
        }

        default:
          // Check for dot notation patterns (e.g., request.query.xxx)
          if (varName.startsWith('request.query.')) {
            const key = varName.slice('request.query.'.length);
            const value = req.query[key];
            return value !== undefined ? String(value) : '';
          }
          if (varName.startsWith('request.header.')) {
            const key = varName.slice('request.header.'.length);
            return req.get(key) || '';
          }
          if (varName.startsWith('request.body.')) {
            const key = varName.slice('request.body.'.length);
            const value = getNestedValue(req.body, key);
            if (value === undefined || value === null) return '';
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
          }
          if (varName.startsWith('request.path.')) {
            const key = varName.slice('request.path.'.length);
            return pathParams[key] || req.params[key] || '';
          }

          // Unknown variable - return original
          return match;
      }
    } catch (error) {
      console.error(`Template processing error for "${match}":`, error);
      return match; // Return original on error
    }
  });
}

/**
 * Recursively process an object/array with template variables
 */
function processValue(
  value: any,
  req: Request,
  pathParams: Record<string, string>
): any {
  if (typeof value === 'string') {
    return processString(value, req, pathParams);
  }

  if (Array.isArray(value)) {
    return value.map((item) => processValue(item, req, pathParams));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = processValue(val, req, pathParams);
    }
    return result;
  }

  return value;
}

/**
 * Main function to process response data with template variables
 */
export function processTemplateVariables(
  responseData: any,
  req: Request,
  pathParams: Record<string, string> = {}
): any {
  try {
    return processValue(responseData, req, pathParams);
  } catch (error) {
    console.error('Template engine error:', error);
    return responseData; // Return original data on error
  }
}

/**
 * Extract path parameters from endpoint pattern and actual path
 */
export function extractPathParams(
  pattern: string,
  path: string
): Record<string, string> {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length && i < pathParts.length; i++) {
    const patternPart = patternParts[i];
    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = pathParts[i];
    }
  }

  return params;
}

/**
 * List of available template variables for documentation/UI
 */
export const availableTemplateVariables = [
  { name: '{{$timestamp}}', description: 'Unix timestamp (밀리초)', example: '1705420800000' },
  { name: '{{$isoDate}}', description: 'ISO 8601 날짜', example: '2024-01-16T12:00:00.000Z' },
  { name: '{{$uuid}}', description: 'UUID v4', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
  { name: '{{$randomInt}}', description: '랜덤 정수 (0-1000)', example: '42' },
  { name: '{{$randomInt min max}}', description: '범위 지정 랜덤 정수', example: '{{$randomInt 1 100}} → 73' },
  { name: '{{$randomFloat}}', description: '랜덤 실수 (0-1)', example: '0.42' },
  { name: '{{$randomFloat min max precision}}', description: '범위/정밀도 지정 실수', example: '{{$randomFloat 0 100 2}} → 42.73' },
  { name: '{{$randomString n}}', description: 'n자리 랜덤 문자열', example: '{{$randomString 8}} → xK9mN2pL' },
  { name: '{{$randomEmail}}', description: '랜덤 이메일', example: 'abcdefgh@example.com' },
  { name: '{{$randomName}}', description: '랜덤 이름', example: 'John Smith' },
  { name: '{{$randomBoolean}}', description: '랜덤 true/false', example: 'true' },
  { name: '{{$request.query.xxx}}', description: '쿼리 파라미터 값', example: '{{$request.query.userId}}' },
  { name: '{{$request.header.xxx}}', description: '요청 헤더 값', example: '{{$request.header.Authorization}}' },
  { name: '{{$request.body.xxx}}', description: '요청 바디 필드 (중첩 지원)', example: '{{$request.body.user.name}}' },
  { name: '{{$request.path.xxx}}', description: '경로 파라미터 값', example: '{{$request.path.id}}' },
];
