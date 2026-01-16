/**
 * Jest Test Setup
 *
 * This file runs before each test file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close any open connections, handles, etc.
});
