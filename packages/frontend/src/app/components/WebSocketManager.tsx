import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, Users, MessageSquare, Send, Radio, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { WebSocketEndpoint, WebSocketConnection, WebSocketMessageLog, WebSocketMessagePattern, WebSocketResponse, MessageMatchType } from '@/app/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MATCH_TYPES: { value: MessageMatchType; label: string }[] = [
  { value: 'exact', label: '정확히 일치' },
  { value: 'contains', label: '포함' },
  { value: 'regex', label: '정규식' },
  { value: 'json-path', label: 'JSON 경로' },
];

interface WebSocketManagerProps {
  onBack?: () => void;
}

export function WebSocketManager({ onBack }: WebSocketManagerProps) {
  const [endpoints, setEndpoints] = useState<WebSocketEndpoint[]>([]);
  const [connections, setConnections] = useState<WebSocketConnection[]>([]);
  const [logs, setLogs] = useState<WebSocketMessageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEndpoint, setSelectedEndpoint] = useState<WebSocketEndpoint | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formPath, setFormPath] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPatterns, setFormPatterns] = useState<WebSocketMessagePattern[]>([]);
  const [formOnConnectMessage, setFormOnConnectMessage] = useState('');
  const [expandedPatterns, setExpandedPatterns] = useState<number[]>([]);

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [endpointsRes, connectionsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/websocket/endpoints`),
        fetch(`${API_URL}/api/admin/websocket/connections`),
        fetch(`${API_URL}/api/admin/websocket/logs?limit=50`),
      ]);

      const endpointsData = await endpointsRes.json();
      const connectionsData = await connectionsRes.json();
      const logsData = await logsRes.json();

      if (endpointsData.success) setEndpoints(endpointsData.data);
      if (connectionsData.success) setConnections(connectionsData.data);
      if (logsData.success) setLogs(logsData.data);
    } catch (error) {
      console.error('Failed to load WebSocket data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    setFormPath('');
    setFormDescription('');
    setFormPatterns([]);
    setFormOnConnectMessage('');
    setExpandedPatterns([]);
  };

  const startCreate = () => {
    resetForm();
    setSelectedEndpoint(null);
    setEditMode(false);
    setCreating(true);
  };

  const startEdit = (endpoint: WebSocketEndpoint) => {
    setSelectedEndpoint(endpoint);
    setFormPath(endpoint.path);
    setFormDescription(endpoint.description || '');
    setFormPatterns(endpoint.messagePatterns || []);
    setFormOnConnectMessage(
      endpoint.onConnectMessage
        ? typeof endpoint.onConnectMessage.data === 'string'
          ? endpoint.onConnectMessage.data
          : JSON.stringify(endpoint.onConnectMessage.data, null, 2)
        : ''
    );
    setEditMode(true);
    setCreating(false);
  };

  const handleSave = async () => {
    try {
      const parsedPatterns = formPatterns.map((p) => ({
        ...p,
        response: {
          ...p.response,
          data:
            p.response.type === 'json'
              ? (() => {
                  try {
                    return JSON.parse(
                      typeof p.response.data === 'string' ? p.response.data : JSON.stringify(p.response.data)
                    );
                  } catch {
                    return p.response.data;
                  }
                })()
              : p.response.data,
        },
      }));

      const body = {
        path: formPath,
        description: formDescription,
        messagePatterns: parsedPatterns,
        onConnectMessage: formOnConnectMessage
          ? {
              type: 'json' as const,
              data: (() => {
                try {
                  return JSON.parse(formOnConnectMessage);
                } catch {
                  return formOnConnectMessage;
                }
              })(),
            }
          : undefined,
      };

      const url = creating
        ? `${API_URL}/api/admin/websocket/endpoints`
        : `${API_URL}/api/admin/websocket/endpoints/${selectedEndpoint?.id}`;

      const res = await fetch(url, {
        method: creating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        loadData();
        setCreating(false);
        setEditMode(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save WebSocket endpoint:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 WebSocket 엔드포인트를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/websocket/endpoints/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
        setSelectedEndpoint(null);
      }
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedEndpoint || !broadcastMessage) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/websocket/endpoints/${selectedEndpoint.id}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: (() => {
            try {
              return JSON.parse(broadcastMessage);
            } catch {
              return broadcastMessage;
            }
          })(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastMessage('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to broadcast:', error);
    }
    setSending(false);
  };

  const addPattern = () => {
    const newPattern: WebSocketMessagePattern = {
      name: `패턴 ${formPatterns.length + 1}`,
      matchType: 'contains',
      pattern: '',
      response: {
        type: 'json',
        data: '{\n  "status": "ok"\n}',
      },
    };
    setFormPatterns([...formPatterns, newPattern]);
    setExpandedPatterns([...expandedPatterns, formPatterns.length]);
  };

  const removePattern = (index: number) => {
    setFormPatterns(formPatterns.filter((_, i) => i !== index));
    setExpandedPatterns(expandedPatterns.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const updatePattern = (index: number, updates: Partial<WebSocketMessagePattern>) => {
    setFormPatterns(formPatterns.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const togglePatternExpanded = (index: number) => {
    setExpandedPatterns(
      expandedPatterns.includes(index) ? expandedPatterns.filter((i) => i !== index) : [...expandedPatterns, index]
    );
  };

  if (loading && endpoints.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Create/Edit form
  if (creating || editMode) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {creating ? 'WebSocket 엔드포인트 생성' : 'WebSocket 엔드포인트 수정'}
            </h2>
            <button
              onClick={() => {
                setCreating(false);
                setEditMode(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl space-y-6">
            {/* Basic Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 설정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경로 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500">
                      ws://...:{import.meta.env.VITE_API_PORT || 3001}/ws
                    </span>
                    <input
                      type="text"
                      value={formPath}
                      onChange={(e) => setFormPath(e.target.value)}
                      placeholder="/chat"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="채팅 WebSocket"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* On Connect Message */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">연결 시 메시지</h3>
              <p className="text-sm text-gray-500 mb-4">클라이언트 연결 시 자동으로 전송할 환영 메시지</p>
              <textarea
                value={formOnConnectMessage}
                onChange={(e) => setFormOnConnectMessage(e.target.value)}
                rows={4}
                placeholder='{"type": "connected", "message": "Welcome!"}'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Message Patterns */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">메시지 패턴</h3>
                  <p className="text-sm text-gray-500 mt-1">수신 메시지 패턴에 따른 자동 응답 설정</p>
                </div>
                <button
                  onClick={addPattern}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  패턴 추가
                </button>
              </div>

              {formPatterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>메시지 패턴이 없습니다</p>
                  <p className="text-sm">위 버튼을 클릭해서 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formPatterns.map((pattern, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => togglePatternExpanded(index)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedPatterns.includes(index) ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">{pattern.name || `패턴 ${index + 1}`}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {MATCH_TYPES.find((m) => m.value === pattern.matchType)?.label}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePattern(index);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {expandedPatterns.includes(index) && (
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                              <input
                                type="text"
                                value={pattern.name || ''}
                                onChange={(e) => updatePattern(index, { name: e.target.value })}
                                placeholder="ping 응답"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">매칭 타입</label>
                              <select
                                value={pattern.matchType}
                                onChange={(e) => updatePattern(index, { matchType: e.target.value as MessageMatchType })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {MATCH_TYPES.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              패턴
                              {pattern.matchType === 'json-path' && (
                                <span className="text-gray-400 font-normal ml-2">예: type=subscribe</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={pattern.pattern}
                              onChange={(e) => updatePattern(index, { pattern: e.target.value })}
                              placeholder={pattern.matchType === 'regex' ? '^ping$' : 'ping'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">응답 (JSON)</label>
                            <textarea
                              value={
                                typeof pattern.response.data === 'string'
                                  ? pattern.response.data
                                  : JSON.stringify(pattern.response.data, null, 2)
                              }
                              onChange={(e) =>
                                updatePattern(index, {
                                  response: { ...pattern.response, data: e.target.value },
                                })
                              }
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={pattern.response.broadcast || false}
                                onChange={(e) =>
                                  updatePattern(index, {
                                    response: { ...pattern.response, broadcast: e.target.checked },
                                  })
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">모든 클라이언트에 브로드캐스트</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCreating(false);
                  setEditMode(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!formPath}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              WebSocket Mock
            </h2>
            <p className="text-gray-500 mt-1">WebSocket 엔드포인트를 관리하고 실시간 메시지를 모니터링합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="새로고침">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={startCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              엔드포인트 추가
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Endpoints List */}
        <div className="w-80 border-r border-gray-200 bg-white overflow-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">엔드포인트 ({endpoints.length})</h3>
          </div>

          {endpoints.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Radio className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>엔드포인트가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {endpoints.map((ep) => {
                const connCount = connections.filter((c) => c.endpointId === ep.id).length;
                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEndpoint(ep)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedEndpoint?.id === ep.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-900">/ws{ep.path}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ep.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ep.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </div>
                    {ep.description && <p className="text-sm text-gray-500 mt-1">{ep.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {connCount} 연결
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ep.messagePatterns?.length || 0} 패턴
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-auto">
          {selectedEndpoint ? (
            <div className="p-6 space-y-6">
              {/* Endpoint Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">엔드포인트 정보</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(selectedEndpoint)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEndpoint.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-gray-500">경로</label>
                    <span className="font-mono text-gray-900">/ws{selectedEndpoint.path}</span>
                  </div>
                  <div>
                    <label className="block text-gray-500">상태</label>
                    <span className="text-gray-900">{selectedEndpoint.status === 'active' ? '활성' : '비활성'}</span>
                  </div>
                  {selectedEndpoint.description && (
                    <div className="col-span-2">
                      <label className="block text-gray-500">설명</label>
                      <span className="text-gray-900">{selectedEndpoint.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connections */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  연결된 클라이언트 ({connections.filter((c) => c.endpointId === selectedEndpoint.id).length})
                </h3>

                {connections.filter((c) => c.endpointId === selectedEndpoint.id).length === 0 ? (
                  <p className="text-gray-500 text-sm">연결된 클라이언트가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {connections
                      .filter((c) => c.endpointId === selectedEndpoint.id)
                      .map((conn) => (
                        <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-mono text-sm text-gray-900">{conn.id.substring(0, 8)}...</span>
                            <span className="text-xs text-gray-500 ml-2">{conn.clientIp}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(conn.connectedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Broadcast */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">메시지 브로드캐스트</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder='{"type": "broadcast", "data": "hello"}'
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <button
                      onClick={handleBroadcast}
                      disabled={sending || !broadcastMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      전송
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Logs */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  메시지 로그
                </h3>

                {logs.filter((l) => l.endpointId === selectedEndpoint.id).length === 0 ? (
                  <p className="text-gray-500 text-sm">메시지 로그가 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {logs
                      .filter((l) => l.endpointId === selectedEndpoint.id)
                      .map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-lg ${
                            log.direction === 'incoming' ? 'bg-blue-50' : 'bg-green-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-semibold ${
                                log.direction === 'incoming' ? 'text-blue-700' : 'text-green-700'
                              }`}
                            >
                              {log.direction === 'incoming' ? '← 수신' : '→ 발신'}
                              {log.matchedPattern && (
                                <span className="text-gray-500 font-normal ml-2">({log.matchedPattern})</span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
                            {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Radio className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>엔드포인트를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
