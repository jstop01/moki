import { useEffect, useState } from 'react';
import { Database, CheckCircle, XCircle, Activity, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { api, API_BASE_URL } from '@/app/utils/api';
import { HttpMethod, RequestLog } from '@/app/types';

export function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState({
    totalEndpoints: 0,
    enabledEndpoints: 0,
    totalRules: 0,
    totalLogs: 0,
    recentLogs: [] as RequestLog[],
  });
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    // Check backend connection
    const isHealthy = await api.healthCheck();
    setBackendConnected(isHealthy);

    if (!isHealthy) {
      setLoading(false);
      return;
    }

    // Load endpoints
    const endpoints = await api.getEndpoints();
    const logs = await api.getLogs();

    setStats({
      totalEndpoints: endpoints.length,
      enabledEndpoints: endpoints.filter(e => e.enabled).length,
      totalRules: 0, // Rules are managed in backend
      totalLogs: logs.length,
      recentLogs: logs.slice(0, 5),
    });

    setLoading(false);
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

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!backendConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">백엔드 서버 연결 실패</h2>
          <p className="text-gray-600 mb-4">
            백엔드 서버 ({API_BASE_URL})에 연결할 수 없습니다.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 text-left text-sm font-mono">
            <p className="text-gray-600 mb-2"># 백엔드 서버 실행:</p>
            <p className="text-gray-900">cd packages/backend && npm run dev</p>
          </div>
          <button
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">
            Mock API 시스템 현황 및 최근 활동
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('endpoints')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 엔드포인트</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEndpoints}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('endpoints')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">활성화된 엔드포인트</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.enabledEndpoints}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('endpoints')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 규칙</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRules}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div
            className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('logs')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">요청 로그</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLogs}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3">Mock API 사용 방법</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold mb-1">1</div>
              <p className="text-sm text-blue-100">
                엔드포인트 탭에서 API 엔드포인트를 생성하세요
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">2</div>
              <p className="text-sm text-blue-100">
                /mock 경로로 Mock API를 호출하세요
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">3</div>
              <p className="text-sm text-blue-100">
                Request Logs에서 호출 내역을 확인하세요
              </p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-lg p-3 font-mono text-sm">
            <p className="text-blue-100">Mock API 호출 예시:</p>
            <p className="text-white">curl {API_BASE_URL}/mock/api/users</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">최근 API 요청</h3>
              <button
                onClick={() => onNavigate('logs')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                전체 보기
              </button>
            </div>
          </div>

          {stats.recentLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>아직 요청 기록이 없습니다</p>
              <p className="text-sm mt-1">Mock API를 호출해보세요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stats.recentLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onNavigate('logs')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(log.method)}`}>
                        {log.method}
                      </span>
                      <span className="font-mono text-sm text-gray-900">{log.path}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`font-semibold ${getStatusColor(log.responseStatus)}`}>
                        {log.responseStatus}
                      </span>
                      <span className="text-gray-500">{log.responseTimeMs}ms</span>
                      <span className="text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
