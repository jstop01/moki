// Mock API Service Worker
self.addEventListener('install', (event) => {
  console.log('[Mock SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Mock SW] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests to mock.api paths
  if (url.pathname.startsWith('/mock-api/')) {
    event.respondWith(handleMockRequest(event.request));
  }
});

async function handleMockRequest(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/mock-api', '');
    const method = request.method;
    
    // Get mock data from localStorage via message to client
    const client = await self.clients.get(event.clientId);
    if (!client) {
      return new Response(JSON.stringify({ error: 'No client found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const query = Object.fromEntries(url.searchParams);
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }
    
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Request mock data from main thread
    const mockData = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      client.postMessage({
        type: 'GET_MOCK_RESPONSE',
        request: { method, path, query, headers, body },
      }, [channel.port2]);
    });

    if (mockData.error) {
      return new Response(JSON.stringify({ error: mockData.error }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Apply delay
    if (mockData.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, mockData.delayMs));
    }

    return new Response(mockData.body, {
      status: mockData.status,
      headers: mockData.headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
