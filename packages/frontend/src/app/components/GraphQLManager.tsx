import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Save,
  Loader2,
  Code,
  Copy,
  Search,
} from 'lucide-react';
import {
  GraphQLEndpoint,
  GraphQLMockResolver,
  GraphQLOperationType,
  GraphQLRequestLog,
} from '@/app/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GraphQLManagerProps {
  onBack?: () => void;
}

export function GraphQLManager({ onBack }: GraphQLManagerProps) {
  const [endpoints, setEndpoints] = useState<GraphQLEndpoint[]>([]);
  const [logs, setLogs] = useState<GraphQLRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'logs' | 'playground'>(
    'endpoints'
  );

  // New endpoint form
  const [showNewEndpoint, setShowNewEndpoint] = useState(false);
  const [newPath, setNewPath] = useState('/graphql');
  const [newDescription, setNewDescription] = useState('');

  // Edit endpoint
  const [editingEndpoint, setEditingEndpoint] = useState<GraphQLEndpoint | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<string[]>([]);

  // New resolver form
  const [addingResolverTo, setAddingResolverTo] = useState<string | null>(null);
  const [newResolverName, setNewResolverName] = useState('');
  const [newResolverType, setNewResolverType] = useState<GraphQLOperationType>('query');
  const [newResolverResponse, setNewResolverResponse] = useState('{\n  \n}');
  const [newResolverDelay, setNewResolverDelay] = useState(0);

  // Playground
  const [playgroundQuery, setPlaygroundQuery] = useState(
    `query GetUser {\n  user(id: 1) {\n    id\n    name\n    email\n  }\n}`
  );
  const [playgroundVariables, setPlaygroundVariables] = useState('{}');
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState('/graphql');
  const [playgroundResult, setPlaygroundResult] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const loadEndpoints = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/graphql/endpoints`);
      const json = await res.json();
      if (json.success && json.data) {
        setEndpoints(json.data);
      }
    } catch (error) {
      console.error('Failed to load GraphQL endpoints:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/graphql/logs`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data);
      }
    } catch (error) {
      console.error('Failed to load GraphQL logs:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadEndpoints(), loadLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createEndpoint = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/graphql/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newPath,
          description: newDescription,
          enabled: true,
          resolvers: [],
        }),
      });

      const json = await res.json();
      if (json.success) {
        await loadEndpoints();
        setShowNewEndpoint(false);
        setNewPath('/graphql');
        setNewDescription('');
      }
    } catch (error) {
      console.error('Failed to create endpoint:', error);
    }
    setSaving(false);
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await fetch(`${API_URL}/api/admin/graphql/endpoints/${id}`, {
        method: 'DELETE',
      });
      await loadEndpoints();
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
    }
  };

  const toggleEndpointEnabled = async (endpoint: GraphQLEndpoint) => {
    try {
      await fetch(`${API_URL}/api/admin/graphql/endpoints/${endpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      });
      await loadEndpoints();
    } catch (error) {
      console.error('Failed to toggle endpoint:', error);
    }
  };

  const addResolver = async (endpointId: string) => {
    setSaving(true);
    try {
      let responseData;
      try {
        responseData = JSON.parse(newResolverResponse);
      } catch {
        responseData = newResolverResponse;
      }

      const res = await fetch(
        `${API_URL}/api/admin/graphql/endpoints/${endpointId}/resolvers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationName: newResolverName,
            operationType: newResolverType,
            responseData,
            delay: newResolverDelay > 0 ? newResolverDelay : undefined,
            enabled: true,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        await loadEndpoints();
        setAddingResolverTo(null);
        setNewResolverName('');
        setNewResolverType('query');
        setNewResolverResponse('{\n  \n}');
        setNewResolverDelay(0);
      }
    } catch (error) {
      console.error('Failed to add resolver:', error);
    }
    setSaving(false);
  };

  const deleteResolver = async (endpointId: string, resolverId: string) => {
    if (!confirm('리졸버를 삭제하시겠습니까?')) return;

    try {
      await fetch(
        `${API_URL}/api/admin/graphql/endpoints/${endpointId}/resolvers/${resolverId}`,
        { method: 'DELETE' }
      );
      await loadEndpoints();
    } catch (error) {
      console.error('Failed to delete resolver:', error);
    }
  };

  const toggleResolverEnabled = async (
    endpointId: string,
    resolver: GraphQLMockResolver
  ) => {
    try {
      await fetch(
        `${API_URL}/api/admin/graphql/endpoints/${endpointId}/resolvers/${resolver.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !resolver.enabled }),
        }
      );
      await loadEndpoints();
    } catch (error) {
      console.error('Failed to toggle resolver:', error);
    }
  };

  const executeQuery = async () => {
    setExecuting(true);
    setPlaygroundResult(null);

    try {
      let variables = {};
      try {
        variables = JSON.parse(playgroundVariables);
      } catch {
        // ignore
      }

      // Parse operation name from query
      const operationNameMatch = playgroundQuery.match(
        /^\s*(query|mutation|subscription)\s+(\w+)?/i
      );
      const operationName = operationNameMatch?.[2];

      const res = await fetch(`${API_URL}${playgroundEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: playgroundQuery,
          operationName,
          variables,
        }),
      });

      const json = await res.json();
      setPlaygroundResult(JSON.stringify(json, null, 2));
    } catch (error: any) {
      setPlaygroundResult(JSON.stringify({ error: error.message }, null, 2));
    }

    setExecuting(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedEndpoints((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GraphQL Mock</h2>
          <p className="text-gray-500 mt-1">GraphQL 쿼리와 뮤테이션을 Mock 처리합니다</p>
        </div>
        {activeTab === 'endpoints' && (
          <button
            onClick={() => setShowNewEndpoint(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />새 엔드포인트
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            activeTab === 'endpoints'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          엔드포인트 ({endpoints.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('logs');
            loadLogs();
          }}
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            activeTab === 'logs'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          로그 ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('playground')}
          className={`px-4 py-2 -mb-px border-b-2 font-medium ${
            activeTab === 'playground'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Playground
        </button>
      </div>

      {/* New Endpoint Form */}
      {showNewEndpoint && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">새 GraphQL 엔드포인트</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">경로</label>
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/graphql"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="GraphQL API endpoint"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewEndpoint(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={createEndpoint}
                disabled={saving || !newPath}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints Tab */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          {endpoints.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                GraphQL 엔드포인트가 없습니다
              </h3>
              <p className="text-gray-500 mb-4">
                새 엔드포인트를 만들어 GraphQL Mock을 시작하세요
              </p>
              <button
                onClick={() => setShowNewEndpoint(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />새 엔드포인트
              </button>
            </div>
          ) : (
            endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Endpoint Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpanded(endpoint.id)}
                >
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900">
                          {endpoint.path}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            endpoint.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {endpoint.enabled ? '활성화' : '비활성화'}
                        </span>
                      </div>
                      {endpoint.description && (
                        <p className="text-sm text-gray-500">{endpoint.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {endpoint.resolvers.length}개 리졸버
                    </span>
                    {expandedEndpoints.includes(endpoint.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedEndpoints.includes(endpoint.id) && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleEndpointEnabled(endpoint)}
                        className={`px-3 py-1.5 rounded text-sm ${
                          endpoint.enabled
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {endpoint.enabled ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => setAddingResolverTo(endpoint.id)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        리졸버 추가
                      </button>
                      <button
                        onClick={() => deleteEndpoint(endpoint.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" />
                        삭제
                      </button>
                    </div>

                    {/* Add Resolver Form */}
                    {addingResolverTo === endpoint.id && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-gray-900">새 리졸버</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Operation Name
                            </label>
                            <input
                              type="text"
                              value={newResolverName}
                              onChange={(e) => setNewResolverName(e.target.value)}
                              placeholder="GetUser, CreatePost..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              타입
                            </label>
                            <select
                              value={newResolverType}
                              onChange={(e) =>
                                setNewResolverType(e.target.value as GraphQLOperationType)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="query">Query</option>
                              <option value="mutation">Mutation</option>
                              <option value="subscription">Subscription</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            응답 데이터 (JSON)
                          </label>
                          <textarea
                            value={newResolverResponse}
                            onChange={(e) => setNewResolverResponse(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                          />
                        </div>
                        <div className="w-48">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            지연 (ms)
                          </label>
                          <input
                            type="number"
                            value={newResolverDelay}
                            onChange={(e) => setNewResolverDelay(Number(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAddingResolverTo(null)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => addResolver(endpoint.id)}
                            disabled={saving || !newResolverName}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              '추가'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resolvers List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">리졸버 목록</h4>
                      {endpoint.resolvers.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          등록된 리졸버가 없습니다
                        </p>
                      ) : (
                        endpoint.resolvers.map((resolver) => (
                          <div
                            key={resolver.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              resolver.enabled
                                ? 'border-gray-200 bg-white'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                  resolver.operationType === 'query'
                                    ? 'bg-blue-100 text-blue-700'
                                    : resolver.operationType === 'mutation'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {resolver.operationType}
                              </span>
                              <span className="font-mono text-sm text-gray-900">
                                {resolver.operationName}
                              </span>
                              {resolver.delay && (
                                <span className="text-xs text-gray-500">
                                  +{typeof resolver.delay === 'number' ? resolver.delay : `${resolver.delay.min}~${resolver.delay.max}`}ms
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  toggleResolverEnabled(endpoint.id, resolver)
                                }
                                className={`px-2 py-1 rounded text-xs ${
                                  resolver.enabled
                                    ? 'text-gray-600 hover:bg-gray-100'
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {resolver.enabled ? '끄기' : '켜기'}
                              </button>
                              <button
                                onClick={() =>
                                  deleteResolver(endpoint.id, resolver.id)
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Usage Info */}
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>사용법:</strong>{' '}
                        <code className="bg-purple-100 px-1 rounded">
                          POST {endpoint.path}
                        </code>
                        로 GraphQL 쿼리를 전송하세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">요청 기록이 없습니다</h3>
              <p className="text-gray-500">GraphQL 요청이 들어오면 여기에 표시됩니다</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {log.operationType && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          log.operationType === 'query'
                            ? 'bg-blue-100 text-blue-700'
                            : log.operationType === 'mutation'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {log.operationType}
                      </span>
                    )}
                    <span className="font-mono text-sm text-gray-900">
                      {log.operationName || 'anonymous'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()} | {log.responseTime}ms
                  </div>
                </div>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 font-mono text-gray-700">
                  {log.query}
                </pre>
                {log.responseErrors && log.responseErrors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {log.responseErrors.map((e, i) => (
                      <div key={i}>{e.message}</div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Playground Tab */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                엔드포인트
              </label>
              <select
                value={playgroundEndpoint}
                onChange={(e) => setPlaygroundEndpoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {endpoints.map((ep) => (
                  <option key={ep.id} value={ep.path}>
                    {ep.path}
                  </option>
                ))}
                {endpoints.length === 0 && (
                  <option value="/graphql">/graphql (default)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query / Mutation
              </label>
              <textarea
                value={playgroundQuery}
                onChange={(e) => setPlaygroundQuery(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="query GetUser { ... }"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variables (JSON)
              </label>
              <textarea
                value={playgroundVariables}
                onChange={(e) => setPlaygroundVariables(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder='{ "id": 1 }'
              />
            </div>
            <button
              onClick={executeQuery}
              disabled={executing}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {executing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              실행
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">응답</label>
            <div className="bg-gray-900 rounded-lg p-4 h-[500px] overflow-auto">
              {playgroundResult ? (
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {playgroundResult}
                </pre>
              ) : (
                <p className="text-gray-500 text-sm">
                  쿼리를 실행하면 결과가 여기에 표시됩니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
