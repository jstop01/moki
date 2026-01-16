import { useState, useEffect } from 'react';
import { Trash2, X, Search, Filter } from 'lucide-react';
import { RequestLog, HttpMethod } from '@/app/types';
import { storage } from '@/app/utils/storage';

export function RequestLogs() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadLogs = () => {
    setLogs(storage.getLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const clearLogs = () => {
    if (confirm('모든 로그를 삭제하시겠습니까?')) {
      storage.clearLogs();
      loadLogs();
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.method.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === '2xx' && log.responseStatus >= 200 && log.responseStatus < 300) ||
      (statusFilter === '4xx' && log.responseStatus >= 400 && log.responseStatus < 500) ||
      (statusFilter === '5xx' && log.responseStatus >= 500);

    return matchesSearch && matchesStatus;
  });

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

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="h-full flex">
      {/* Logs List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">요청 로그</h2>
              <p className="text-sm text-gray-500 mt-1">
                {logs.length}개의 요청 기록
              </p>
            </div>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              로그 삭제
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="경로나 메서드로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="2xx">2xx 성공</option>
              <option value="4xx">4xx 클라이언트 에러</option>
              <option value="5xx">5xx 서버 에러</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-auto bg-white">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>로그가 없습니다</p>
              <p className="text-sm mt-1">API 요청이 발생하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">메서드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">경로</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">응답 시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">규칙</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map(log => {
                  const rule = log.matchedRuleId ? storage.getRule(log.matchedRuleId) : null;
                  
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">{log.path}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${getStatusColor(log.responseStatus)}`}>
                          {log.responseStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{log.responseTimeMs}ms</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {rule ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {rule.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">매칭 없음</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Detail Panel */}
      {selectedLog && (
        <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">요청 상세</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">요청 정보</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(selectedLog.method)}`}>
                    {selectedLog.method}
                  </span>
                  <span className="font-mono text-gray-900">{selectedLog.path}</span>
                </div>
                <div className="text-gray-500">
                  {formatDateTime(selectedLog.timestamp)}
                </div>
              </div>
            </div>

            {/* Query Parameters */}
            {selectedLog.query && Object.keys(selectedLog.query).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">쿼리 파라미터</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs font-mono text-gray-900">
                    {JSON.stringify(selectedLog.query, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Request Headers */}
            {selectedLog.headers && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">요청 헤더</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs font-mono text-gray-900">
                    {JSON.stringify(selectedLog.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Request Body */}
            {selectedLog.body && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">요청 본문</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs font-mono text-gray-900">
                    {selectedLog.body}
                  </pre>
                </div>
              </div>
            )}

            {/* Response Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">응답 정보</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">상태:</span>
                  <span className={`font-semibold ${getStatusColor(selectedLog.responseStatus)}`}>
                    {selectedLog.responseStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">응답 시간:</span>
                  <span className="font-semibold text-gray-900">{selectedLog.responseTimeMs}ms</span>
                </div>
                {selectedLog.matchedRuleId && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">매칭된 규칙:</span>
                    <span className="font-semibold text-blue-600">
                      {storage.getRule(selectedLog.matchedRuleId)?.name || selectedLog.matchedRuleId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}