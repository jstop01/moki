import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Settings, ToggleLeft, ToggleRight, Database, Loader2 } from 'lucide-react';
import { Endpoint, HttpMethod } from '@/app/types';
import { api } from '@/app/utils/api';

interface EndpointsListProps {
  onSelectEndpoint: (endpointId: string) => void;
}

export function EndpointsList({ onSelectEndpoint }: EndpointsListProps) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewEndpointForm, setShowNewEndpointForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEndpoints = async () => {
    setLoading(true);
    const data = await api.getEndpoints();
    setEndpoints(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEndpoints();
  }, []);

  const filteredEndpoints = endpoints.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleEnabled = async (endpoint: Endpoint) => {
    await api.updateEndpoint(endpoint.id, { enabled: !endpoint.enabled });
    loadEndpoints();
  };

  const deleteEndpoint = async (id: string) => {
    if (confirm('이 엔드포인트를 삭제하시겠습니까?')) {
      await api.deleteEndpoint(id);
      loadEndpoints();
    }
  };

  const getMethodColor = (method: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: 'bg-green-100 text-green-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700',
      PATCH: 'bg-purple-100 text-purple-700',
    };
    return colors[method];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">엔드포인트</h2>
            <p className="text-sm text-gray-500 mt-1">
              {endpoints.length}개의 엔드포인트
            </p>
          </div>
          <button
            onClick={() => setShowNewEndpointForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 엔드포인트
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="엔드포인트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">메서드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경로</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEndpoints.map(endpoint => (
                <tr
                  key={endpoint.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectEndpoint(endpoint.id)}
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEnabled(endpoint);
                      }}
                      className="focus:outline-none"
                    >
                      {endpoint.enabled ? (
                        <ToggleRight className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{endpoint.path}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{endpoint.name}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEndpoint(endpoint.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filteredEndpoints.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>엔드포인트가 없습니다</p>
            <p className="text-sm mt-1">새 엔드포인트를 생성해보세요</p>
          </div>
        )}
      </div>

      {/* New Endpoint Modal */}
      {showNewEndpointForm && (
        <NewEndpointModal
          onClose={() => setShowNewEndpointForm(false)}
          onSave={() => {
            loadEndpoints();
            setShowNewEndpointForm(false);
          }}
        />
      )}
    </div>
  );
}

interface NewEndpointModalProps {
  onClose: () => void;
  onSave: () => void;
}

function NewEndpointModal({ onClose, onSave }: NewEndpointModalProps) {
  const [name, setName] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/api/');
  const [responseStatus, setResponseStatus] = useState(200);
  const [responseBody, setResponseBody] = useState('{\n  "message": "OK"\n}');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let responseData;
    try {
      responseData = JSON.parse(responseBody);
    } catch {
      responseData = responseBody;
    }

    const newEndpoint = {
      id: '',
      name,
      method,
      path,
      enabled: true,
      responseStatus,
      responseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await api.createEndpoint(newEndpoint);
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">새 엔드포인트</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 (설명)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="사용자 조회"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메서드
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                응답 상태
              </label>
              <input
                type="number"
                value={responseStatus}
                onChange={(e) => setResponseStatus(Number(e.target.value))}
                min="100"
                max="599"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              경로
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/users"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              응답 Body (JSON)
            </label>
            <textarea
              value={responseBody}
              onChange={(e) => setResponseBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
