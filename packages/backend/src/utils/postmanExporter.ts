/**
 * Postman Collection Exporter
 *
 * Exports mock endpoints as a Postman Collection v2.1 format
 */

import { Endpoint } from '@mock-api-builder/shared';

interface PostmanCollection {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response?: PostmanResponse[];
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
  description?: string;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQuery[];
  variable?: PostmanVariable[];
}

interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  options?: {
    raw?: {
      language: 'json' | 'xml' | 'text' | 'javascript';
    };
  };
}

interface PostmanQuery {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

interface PostmanResponse {
  name: string;
  originalRequest: PostmanRequest;
  status: string;
  code: number;
  _postman_previewlanguage?: string;
  header?: PostmanHeader[];
  body?: string;
}

/**
 * Convert path parameters from Express format to Postman format
 * /api/users/:id -> /api/users/{{id}}
 */
function convertPathToPostman(path: string): {
  formattedPath: string;
  variables: PostmanVariable[];
} {
  const variables: PostmanVariable[] = [];
  const formattedPath = path.replace(/:(\w+)/g, (_, paramName) => {
    variables.push({
      key: paramName,
      value: '',
      description: `Path parameter: ${paramName}`,
    });
    return `{{${paramName}}}`;
  });

  return { formattedPath, variables };
}

/**
 * Get HTTP status text from code
 */
function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusTexts[code] || 'Unknown';
}

/**
 * Export endpoints to Postman Collection format
 */
export function exportToPostmanCollection(
  endpoints: Endpoint[],
  options: {
    collectionName?: string;
    baseUrl?: string;
    description?: string;
  } = {}
): PostmanCollection {
  const {
    collectionName = 'Mock API Builder Collection',
    baseUrl = 'http://localhost:3001/mock',
    description = 'Exported from Mock API Builder',
  } = options;

  const items: PostmanItem[] = endpoints.map((endpoint) => {
    const { formattedPath, variables } = convertPathToPostman(endpoint.path);
    const fullUrl = `${baseUrl}${formattedPath}`;

    // Parse URL for Postman format
    const urlParts = fullUrl.replace(/^https?:\/\//, '').split('/');
    const host = urlParts[0].split('.');
    const path = urlParts.slice(1);

    // Build request headers
    const headers: PostmanHeader[] = [
      {
        key: 'Content-Type',
        value: 'application/json',
        type: 'text',
      },
    ];

    // Add custom headers if defined
    if (endpoint.responseHeaders) {
      Object.entries(endpoint.responseHeaders).forEach(([key, value]) => {
        headers.push({
          key,
          value,
          type: 'text',
          disabled: true, // Disabled by default as these are response headers
        });
      });
    }

    // Build request body for POST/PUT/PATCH
    let body: PostmanBody | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      body = {
        mode: 'raw',
        raw: JSON.stringify({}, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }

    // Build example response
    const exampleResponse: PostmanResponse = {
      name: `${endpoint.method} ${endpoint.path} - ${endpoint.responseStatus}`,
      originalRequest: {
        method: endpoint.method,
        header: headers,
        url: {
          raw: fullUrl,
          host,
          path,
          variable: variables.length > 0 ? variables : undefined,
        },
      },
      status: getStatusText(endpoint.responseStatus),
      code: endpoint.responseStatus,
      _postman_previewlanguage: 'json',
      header: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
      body: JSON.stringify(endpoint.responseData, null, 2),
    };

    const item: PostmanItem = {
      name: endpoint.description || `${endpoint.method} ${endpoint.path}`,
      request: {
        method: endpoint.method,
        header: headers,
        body,
        url: {
          raw: fullUrl,
          protocol: baseUrl.startsWith('https') ? 'https' : 'http',
          host,
          path,
          variable: variables.length > 0 ? variables : undefined,
        },
        description: endpoint.description,
      },
      response: [exampleResponse],
    };

    return item;
  });

  // Group items by tags or paths
  const groupedItems = groupItemsByPath(items);

  return {
    info: {
      name: collectionName,
      description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: groupedItems,
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string',
        description: 'Base URL for the Mock API',
      },
    ],
  };
}

/**
 * Group items by the first path segment
 */
function groupItemsByPath(items: PostmanItem[]): any[] {
  const groups: Record<string, PostmanItem[]> = {};

  items.forEach((item) => {
    const pathMatch = item.request.url.raw.match(/\/mock\/([^/]+)/);
    const groupName = pathMatch ? pathMatch[1] : 'Other';

    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });

  // If only one group, return items flat
  if (Object.keys(groups).length <= 1) {
    return items;
  }

  // Return as folders
  return Object.entries(groups).map(([name, groupItems]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    item: groupItems,
  }));
}

/**
 * Convert Postman Collection to JSON string
 */
export function postmanCollectionToJson(
  endpoints: Endpoint[],
  options?: {
    collectionName?: string;
    baseUrl?: string;
    description?: string;
  }
): string {
  const collection = exportToPostmanCollection(endpoints, options);
  return JSON.stringify(collection, null, 2);
}
