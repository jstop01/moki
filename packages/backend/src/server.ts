import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import adminRoutes from './routes/admin';
import mockRoutes from './routes/mock';
import websocketAdminRoutes from './routes/websocket-admin';
import graphqlAdminRoutes, { findGraphQLEndpointByPath, handleGraphQLRequest } from './routes/graphql';
import { memoryStore } from './storage/MemoryStore';
import { webSocketHandler } from './websocket/WebSocketHandler';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// ETag 비활성화 (304 캐싱 방지)
app.set('etag', false);

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow all origins for mock API
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ============================================
// ROUTES
// ============================================

// Health check (root)
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Mock API Builder',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      admin: '/api/admin',
      mock: '/mock',
      websocket: '/ws/*',
      graphql: '/graphql (or custom path)',
    },
    documentation: 'https://github.com/yourusername/mock-api-builder',
  });
});

// Admin routes (for managing endpoints and logs)
app.use('/api/admin', adminRoutes);

// WebSocket Admin routes
app.use('/api/admin/websocket', websocketAdminRoutes);

// GraphQL Admin routes
app.use('/api/admin/graphql', graphqlAdminRoutes);

// Dynamic GraphQL endpoint handler
app.use((req: Request, res: Response, next: NextFunction) => {
  // Only handle POST requests for GraphQL
  if (req.method !== 'POST') {
    return next();
  }

  // Check if there's a matching GraphQL endpoint
  const graphqlEndpoint = findGraphQLEndpointByPath(req.path);
  if (graphqlEndpoint) {
    return handleGraphQLRequest(graphqlEndpoint)(req, res);
  }

  next();
});

// Mock routes (user-defined endpoints)
// IMPORTANT: This must be last to catch all remaining routes
app.use('/mock', mockRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    hint: 'Use /api/admin for management or /mock for mock endpoints',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ============================================
// DATA PERSISTENCE
// ============================================

function loadPersistedData(): boolean {
  console.log('📂 Loading persisted data...');

  try {
    memoryStore.loadFromFile();

    const endpoints = memoryStore.getAllEndpoints();

    if (endpoints.length > 0) {
      console.log(`✅ Loaded ${endpoints.length} endpoints from file`);
      return true; // 데이터 로드 성공
    } else {
      console.log('📦 No persisted data found');
      return false; // 데이터 없음
    }
  } catch (error) {
    console.error('❌ Failed to load persisted data:', error);
    return false;
  }
}

// ============================================
// SERVER STARTUP
// ============================================

// Initialize WebSocket handler
webSocketHandler.initialize(server);

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Mock API Builder Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server URL:        http://localhost:${PORT}`);
  console.log(`🎛️  Admin API:        http://localhost:${PORT}/api/admin`);
  console.log(`🎭 Mock API:          http://localhost:${PORT}/mock`);
  console.log(`🔌 WebSocket:         ws://localhost:${PORT}/ws/*`);
  console.log(`📊 GraphQL:           http://localhost:${PORT}/graphql`);
  console.log(`💚 Health Check:      http://localhost:${PORT}/api/admin/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 파일에서 데이터 로드 시도
  const hasPersistedData = loadPersistedData();

  // 저장된 데이터가 없으면 샘플 데이터 로드
  if (!hasPersistedData && process.env.NODE_ENV !== 'production') {
    console.log('📦 Loading sample data...');
    loadSampleData();
    console.log('✅ Sample data loaded!');
  }

  console.log('');
});

// ============================================
// SAMPLE DATA
// ============================================

function loadSampleData() {
  // Sample endpoint 1: Get users
  memoryStore.createEndpoint({
    method: 'GET',
    path: '/api/users',
    responseStatus: 200,
    responseData: [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
    ],
    description: 'Get list of users',
    tags: ['users', 'demo'],
  });

  // Sample endpoint 2: Get single user
  memoryStore.createEndpoint({
    method: 'GET',
    path: '/api/users/:id',
    responseStatus: 200,
    responseData: {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
    },
    description: 'Get user by ID',
    tags: ['users', 'demo'],
  });

  // Sample endpoint 3: Create user
  memoryStore.createEndpoint({
    method: 'POST',
    path: '/api/users',
    responseStatus: 201,
    responseData: {
      id: 4,
      name: 'New User',
      email: 'newuser@example.com',
      createdAt: new Date().toISOString(),
    },
    description: 'Create new user',
    tags: ['users', 'demo'],
  });

  // Sample endpoint 4: Error response
  memoryStore.createEndpoint({
    method: 'GET',
    path: '/api/error',
    responseStatus: 500,
    responseData: {
      error: 'Internal Server Error',
      message: 'Something went wrong!',
    },
    description: 'Error response example',
    tags: ['demo', 'error'],
  });

  // Sample endpoint 5: Delayed response
  memoryStore.createEndpoint({
    method: 'GET',
    path: '/api/slow',
    responseStatus: 200,
    responseData: {
      message: 'This response was delayed by 2 seconds',
    },
    delay: 2000,
    description: 'Delayed response example',
    tags: ['demo', 'delay'],
  });

  console.log('');
  console.log('Try these URLs:');
  console.log(`  curl http://localhost:${PORT}/mock/api/users`);
  console.log(`  curl http://localhost:${PORT}/mock/api/users/1`);
  console.log(`  curl -X POST http://localhost:${PORT}/mock/api/users`);
  console.log('');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  process.exit(0);
});
