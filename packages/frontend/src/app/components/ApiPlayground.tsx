import { useState, useEffect } from 'react';
import { Play, Copy, CheckCircle, Settings, Loader2, ChevronDown, Database } from 'lucide-react';
import { HttpMethod, Endpoint } from '@/app/types';
import { api, API_BASE_URL } from '@/app/utils/api';

export function ApiPlayground() {
  // Base URL 설정 (기본값: 환경변수에서 가져옴)
  const [baseUrl, setBaseUrl] = useState(API_BASE_URL);
  const [showSettings, setShowSettings] = useState(false);

  // 엔드포인트 불러오기
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [showEndpointSelector, setShowEndpointSelector] = useState(false);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);

  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/api/users');
  const [queryParams, setQueryParams] = useState('');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 엔드포인트 목록 로드
  const loadEndpoints = async () => {
    if (showEndpointSelector) {
      setShowEndpointSelector(false);
      return;
    }
    setLoadingEndpoints(true);
    const data = await api.getEndpoints();
    setEndpoints(data);
    setLoadingEndpoints(false);
    setShowEndpointSelector(true);
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.endpoint-selector')) {
        setShowEndpointSelector(false);
      }
    };
    if (showEndpointSelector) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEndpointSelector]);

  // 엔드포인트 선택
  const selectEndpoint = (endpoint: Endpoint) => {
    setMethod(endpoint.method);
    setPath(endpoint.path);
    setShowEndpointSelector(false);
  };

  const getMethodColor = (m: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: 'bg-green-100 text-green-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700',
      PATCH: 'bg-purple-100 text-purple-700',
    };
    return colors[m];
  };

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    setResponseStatus(null);
    setResponseHeaders({});
    const startTime = Date.now();

    try {
      // Build URL with query params
      let url = `${baseUrl}/mock${path}`;
      if (queryParams.trim()) {
        url += `?${queryParams}`;
      }

      // Parse headers
      const parsedHeaders = headers.trim() ? JSON.parse(headers) : {};

      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      // Add body for non-GET requests
      if (method !== 'GET' && body.trim()) {
        fetchOptions.body = body;
      }

      // Make actual request to backend
      const res = await fetch(url, fetchOptions);

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponseStatus(res.status);

      // Get response headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });
      setResponseHeaders(resHeaders);

      // Parse response body
      const contentType = res.headers.get('content-type') || '';
      let responseBody;
      if (contentType.includes('application/json')) {
        responseBody = await res.json();
      } else {
        responseBody = await res.text();
      }

      setResponse(responseBody);
    } catch (error) {
      setResponse({ error: (error as Error).message });
      setResponseStatus(0);
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    let curl = `curl -X ${method} "${baseUrl}/mock${path}`;
    if (queryParams.trim()) {
      curl += `?${queryParams}`;
    }
    curl += '"';

    try {
      const parsedHeaders = headers.trim() ? JSON.parse(headers) : {};
      Object.entries(parsedHeaders).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    } catch {}

    if (body.trim() && method !== 'GET') {
      curl += ` \\\n  -d '${body}'`;
    }

    return curl;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-100';
    if (status >= 400 && status < 500) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Playground</h2>
            <p className="text-sm text-gray-500 mt-1">
              Mock API를 테스트하고 실제로 어떻게 동작하는지 확인하세요
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            설정
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Base URL 설정</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={API_BASE_URL}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setBaseUrl(API_BASE_URL)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                기본값으로 리셋
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Mock API는 <code className="bg-gray-100 px-1 rounded">{baseUrl}/mock</code> 경로로 호출됩니다
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Request Panel */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Request</h3>

              {/* Base URL Display */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500">Base URL:</span>
                <span className="ml-2 font-mono text-sm text-gray-700">{baseUrl}/mock</span>
              </div>

              {/* Endpoint Selector */}
              <div className="mb-4 relative endpoint-selector">
                <button
                  onClick={loadEndpoints}
                  disabled={loadingEndpoints}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">등록된 엔드포인트에서 불러오기</span>
                  </div>
                  {loadingEndpoints ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Endpoint Dropdown */}
                {showEndpointSelector && endpoints.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {endpoints.map((ep) => (
                      <button
                        key={ep.id}
                        onClick={() => selectEndpoint(ep)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0"
                      >
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getMethodColor(ep.method)}`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-sm text-gray-900 flex-1 truncate">{ep.path}</span>
                        <span className="text-xs text-gray-500 truncate max-w-32">{ep.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showEndpointSelector && endpoints.length === 0 && !loadingEndpoints && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                    등록된 엔드포인트가 없습니다
                  </div>
                )}
              </div>

              {/* Method & Path */}
              <div className="flex gap-2 mb-4">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/endpoint"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Query Parameters */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Query Parameters (key=value&key2=value2)
                </label>
                <input
                  type="text"
                  value={queryParams}
                  onChange={(e) => setQueryParams(e.target.value)}
                  placeholder="role=admin&page=1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Headers */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headers (JSON)
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Body */}
              {method !== 'GET' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"email": "test@example.com"}'
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleTest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>

            {/* cURL Example */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">cURL Command</span>
                <button
                  onClick={() => copyToClipboard(generateCurl())}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {generateCurl()}
              </pre>
            </div>
          </div>

          {/* Response Panel */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Response</h3>
              {responseStatus !== null && (
                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2 py-1 rounded font-semibold ${getStatusColor(responseStatus)}`}>
                    {responseStatus === 0 ? 'Error' : responseStatus}
                  </span>
                  <span className="text-gray-500">{responseTime}ms</span>
                </div>
              )}
            </div>

            {!response && !loading && (
              <div className="text-center py-12 text-gray-400">
                <p>Send a request to see the response</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-500 mt-4">Waiting for response...</p>
              </div>
            )}

            {response && (
              <div className="space-y-4">
                {/* Response Headers */}
                {Object.keys(responseHeaders).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Headers</h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-auto">
                      <pre className="text-xs font-mono text-gray-900">
                        {JSON.stringify(responseHeaders, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Response Body */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Body</h4>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto">
                    {'error' in response ? (
                      <div className="text-red-600 font-mono text-sm">
                        Error: {response.error}
                      </div>
                    ) : (
                      <pre className="text-xs font-mono text-gray-900 whitespace-pre-wrap">
                        {typeof response === 'string'
                          ? response
                          : JSON.stringify(response, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">사용 방법</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>
                엔드포인트 탭에서 Mock API를 생성하세요 (예: GET /api/users)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>
                위 Playground에서 경로를 입력하고 Send Request를 클릭하세요
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>
                실제 앱에서는 <code className="px-2 py-0.5 bg-blue-100 rounded font-mono text-xs">{baseUrl}/mock</code> + 경로로 호출하세요
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>
                다른 서버를 테스트하려면 상단의 "설정" 버튼을 클릭해서 Base URL을 변경하세요
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
