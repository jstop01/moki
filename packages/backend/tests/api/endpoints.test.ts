/**
 * Endpoint API Tests
 *
 * Tests for the /api/admin/endpoints routes
 */

import { memoryStore } from '../../src/storage/MemoryStore';

describe('Endpoint API', () => {
  beforeEach(() => {
    // Clear all endpoints before each test
    const endpoints = memoryStore.getAllEndpoints();
    endpoints.forEach((ep) => memoryStore.deleteEndpoint(ep.id));
  });

  describe('MemoryStore', () => {
    describe('createEndpoint', () => {
      it('should create a new endpoint', () => {
        const endpoint = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: { message: 'hello' },
        });

        expect(endpoint).toBeDefined();
        expect(endpoint.id).toBeDefined();
        expect(endpoint.method).toBe('GET');
        expect(endpoint.path).toBe('/api/test');
        expect(endpoint.responseStatus).toBe(200);
        expect(endpoint.responseData).toEqual({ message: 'hello' });
      });

      it('should generate unique IDs for each endpoint', () => {
        const ep1 = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test1',
          responseStatus: 200,
          responseData: {},
        });

        const ep2 = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test2',
          responseStatus: 200,
          responseData: {},
        });

        expect(ep1.id).not.toBe(ep2.id);
      });

      it('should set createdAt and updatedAt timestamps', () => {
        const beforeCreate = new Date();

        const endpoint = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: {},
        });

        const afterCreate = new Date();

        expect(new Date(endpoint.createdAt).getTime()).toBeGreaterThanOrEqual(
          beforeCreate.getTime()
        );
        expect(new Date(endpoint.createdAt).getTime()).toBeLessThanOrEqual(
          afterCreate.getTime()
        );
        expect(endpoint.createdAt).toEqual(endpoint.updatedAt);
      });
    });

    describe('getEndpoint', () => {
      it('should return endpoint by id', () => {
        const created = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: {},
        });

        const retrieved = memoryStore.getEndpoint(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it('should return undefined for non-existent id', () => {
        const result = memoryStore.getEndpoint('non-existent-id');
        expect(result).toBeUndefined();
      });
    });

    describe('getAllEndpoints', () => {
      it('should return empty array when no endpoints exist', () => {
        const endpoints = memoryStore.getAllEndpoints();
        expect(endpoints).toEqual([]);
      });

      it('should return all created endpoints', () => {
        memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test1',
          responseStatus: 200,
          responseData: {},
        });

        memoryStore.createEndpoint({
          method: 'POST',
          path: '/api/test2',
          responseStatus: 201,
          responseData: {},
        });

        const endpoints = memoryStore.getAllEndpoints();
        expect(endpoints).toHaveLength(2);
      });
    });

    describe('updateEndpoint', () => {
      it('should update endpoint properties', () => {
        const created = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: { old: true },
        });

        const updated = memoryStore.updateEndpoint(created.id, {
          responseStatus: 201,
          responseData: { new: true },
        });

        expect(updated).toBeDefined();
        expect(updated?.responseStatus).toBe(201);
        expect(updated?.responseData).toEqual({ new: true });
        expect(updated?.method).toBe('GET'); // Unchanged
      });

      it('should update updatedAt timestamp', async () => {
        const created = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: {},
        });

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updated = memoryStore.updateEndpoint(created.id, {
          responseStatus: 201,
        });

        expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
          new Date(created.updatedAt).getTime()
        );
      });

      it('should return null for non-existent id', () => {
        const result = memoryStore.updateEndpoint('non-existent-id', {
          responseStatus: 201,
        });

        expect(result).toBeNull();
      });
    });

    describe('deleteEndpoint', () => {
      it('should delete existing endpoint', () => {
        const created = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseData: {},
        });

        const deleted = memoryStore.deleteEndpoint(created.id);

        expect(deleted).toBe(true);
        expect(memoryStore.getEndpoint(created.id)).toBeUndefined();
      });

      it('should return false for non-existent id', () => {
        const result = memoryStore.deleteEndpoint('non-existent-id');
        expect(result).toBe(false);
      });
    });

    describe('findEndpointByPath', () => {
      it('should find endpoint by method and exact path', () => {
        memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/users',
          responseStatus: 200,
          responseData: [],
        });

        const found = memoryStore.findEndpointByPath('GET', '/api/users');

        expect(found).toBeDefined();
        expect(found?.path).toBe('/api/users');
      });

      it('should match path parameters', () => {
        const created = memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/users/:id',
          responseStatus: 200,
          responseData: {},
        });

        const found = memoryStore.findEndpointByPath('GET', '/api/users/123');

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
      });

      it('should return null when no match found', () => {
        const found = memoryStore.findEndpointByPath('GET', '/api/not-found');
        expect(found).toBeNull();
      });

      it('should match correct HTTP method', () => {
        memoryStore.createEndpoint({
          method: 'GET',
          path: '/api/users',
          responseStatus: 200,
          responseData: [],
        });

        const found = memoryStore.findEndpointByPath('POST', '/api/users');
        expect(found).toBeNull();
      });
    });
  });
});
