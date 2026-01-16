/**
 * Template Engine Tests
 *
 * Tests for the dynamic response template processing
 */

import { processTemplateVariables, extractPathParams } from '../../src/utils/templateEngine';

// Mock Express request
const createMockRequest = (overrides: any = {}) => ({
  query: {},
  headers: {},
  body: {},
  ...overrides,
});

describe('Template Engine', () => {
  describe('processTemplateVariables', () => {
    describe('Basic Variables', () => {
      it('should replace {{$timestamp}} with current timestamp', () => {
        const before = Date.now();
        const result = processTemplateVariables(
          { timestamp: '{{$timestamp}}' },
          createMockRequest(),
          {}
        );
        const after = Date.now();

        expect(Number(result.timestamp)).toBeGreaterThanOrEqual(before);
        expect(Number(result.timestamp)).toBeLessThanOrEqual(after);
      });

      it('should replace {{$isoDate}} with ISO date string', () => {
        const result = processTemplateVariables(
          { date: '{{$isoDate}}' },
          createMockRequest(),
          {}
        );

        expect(() => new Date(result.date)).not.toThrow();
        expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should replace {{$uuid}} with valid UUID', () => {
        const result = processTemplateVariables(
          { id: '{{$uuid}}' },
          createMockRequest(),
          {}
        );

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(result.id).toMatch(uuidRegex);
      });
    });

    describe('Random Variables', () => {
      it('should replace {{$randomInt}} with number between 0 and 1000', () => {
        const result = processTemplateVariables(
          { num: '{{$randomInt}}' },
          createMockRequest(),
          {}
        );

        const num = Number(result.num);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(1000);
        expect(Number.isInteger(num)).toBe(true);
      });

      it('should replace {{$randomInt 10 20}} with number in range', () => {
        const result = processTemplateVariables(
          { num: '{{$randomInt 10 20}}' },
          createMockRequest(),
          {}
        );

        const num = Number(result.num);
        expect(num).toBeGreaterThanOrEqual(10);
        expect(num).toBeLessThanOrEqual(20);
      });

      it('should replace {{$randomFloat}} with float between 0 and 1', () => {
        const result = processTemplateVariables(
          { num: '{{$randomFloat}}' },
          createMockRequest(),
          {}
        );

        const num = Number(result.num);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(1);
      });

      it('should replace {{$randomString 10}} with 10 character string', () => {
        const result = processTemplateVariables(
          { str: '{{$randomString 10}}' },
          createMockRequest(),
          {}
        );

        expect(result.str).toHaveLength(10);
        expect(result.str).toMatch(/^[a-zA-Z0-9]+$/);
      });

      it('should replace {{$randomEmail}} with valid email format', () => {
        const result = processTemplateVariables(
          { email: '{{$randomEmail}}' },
          createMockRequest(),
          {}
        );

        expect(result.email).toMatch(/^[a-z]+\.[a-z]+@example\.com$/);
      });

      it('should replace {{$randomBoolean}} with true or false', () => {
        const result = processTemplateVariables(
          { bool: '{{$randomBoolean}}' },
          createMockRequest(),
          {}
        );

        expect(typeof result.bool).toBe('boolean');
      });
    });

    describe('Request Variables', () => {
      it('should replace {{$request.query.xxx}} with query parameter', () => {
        const result = processTemplateVariables(
          { userId: '{{$request.query.userId}}' },
          createMockRequest({ query: { userId: '123' } }),
          {}
        );

        expect(result.userId).toBe('123');
      });

      it('should replace {{$request.header.xxx}} with header value', () => {
        const result = processTemplateVariables(
          { auth: '{{$request.header.authorization}}' },
          createMockRequest({
            headers: { authorization: 'Bearer token123' },
            get: (name: string) => {
              const headers: any = { authorization: 'Bearer token123' };
              return headers[name.toLowerCase()];
            },
          }),
          {}
        );

        expect(result.auth).toBe('Bearer token123');
      });

      it('should replace {{$request.body.xxx}} with body field', () => {
        const result = processTemplateVariables(
          { name: '{{$request.body.name}}' },
          createMockRequest({ body: { name: 'John' } }),
          {}
        );

        expect(result.name).toBe('John');
      });

      it('should replace {{$request.path.xxx}} with path parameter', () => {
        const result = processTemplateVariables(
          { id: '{{$request.path.id}}' },
          createMockRequest(),
          { id: '456' }
        );

        expect(result.id).toBe('456');
      });

      it('should handle nested body fields', () => {
        const result = processTemplateVariables(
          { city: '{{$request.body.user.address.city}}' },
          createMockRequest({
            body: {
              user: {
                address: {
                  city: 'Seoul',
                },
              },
            },
          }),
          {}
        );

        expect(result.city).toBe('Seoul');
      });
    });

    describe('Nested Objects and Arrays', () => {
      it('should process variables in nested objects', () => {
        const result = processTemplateVariables(
          {
            user: {
              id: '{{$uuid}}',
              name: '{{$randomName}}',
            },
          },
          createMockRequest(),
          {}
        );

        expect(result.user.id).toMatch(/^[0-9a-f-]{36}$/i);
        expect(result.user.name).toBeTruthy();
      });

      it('should process variables in arrays', () => {
        const result = processTemplateVariables(
          {
            items: [
              { id: '{{$uuid}}' },
              { id: '{{$uuid}}' },
            ],
          },
          createMockRequest(),
          {}
        );

        expect(result.items).toHaveLength(2);
        expect(result.items[0].id).not.toBe(result.items[1].id);
      });
    });

    describe('Error Handling', () => {
      it('should return original value for unknown variables', () => {
        const result = processTemplateVariables(
          { value: '{{$unknownVariable}}' },
          createMockRequest(),
          {}
        );

        expect(result.value).toBe('{{$unknownVariable}}');
      });

      it('should return empty string for non-existent request fields', () => {
        const result = processTemplateVariables(
          { value: '{{$request.query.nonexistent}}' },
          createMockRequest({ query: {} }),
          {}
        );

        expect(result.value).toBe('');
      });
    });
  });

  describe('extractPathParams', () => {
    it('should extract single path parameter', () => {
      const params = extractPathParams('/api/users/:id', '/api/users/123');

      expect(params).toEqual({ id: '123' });
    });

    it('should extract multiple path parameters', () => {
      const params = extractPathParams(
        '/api/users/:userId/posts/:postId',
        '/api/users/123/posts/456'
      );

      expect(params).toEqual({ userId: '123', postId: '456' });
    });

    it('should return empty object for paths without parameters', () => {
      const params = extractPathParams('/api/users', '/api/users');

      expect(params).toEqual({});
    });

    it('should handle paths with query strings', () => {
      const params = extractPathParams('/api/users/:id', '/api/users/123');

      expect(params).toEqual({ id: '123' });
    });
  });
});
