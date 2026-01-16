import { ReactNode } from 'react';
import { Database, FileJson, History, Settings, PlayCircle, LayoutDashboard } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'endpoints' | 'logs' | 'import-export' | 'playground' | 'settings';
  onTabChange: (tab: 'dashboard' | 'endpoints' | 'logs' | 'import-export' | 'playground' | 'settings') => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'dashboard' as const, label: '대시보드', icon: LayoutDashboard },
    { id: 'endpoints' as const, label: '엔드포인트', icon: Database },
    { id: 'playground' as const, label: 'API 테스트', icon: PlayCircle },
    { id: 'logs' as const, label: '요청 로그', icon: History },
    { id: 'import-export' as const, label: '가져오기/내보내기', icon: FileJson },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="font-bold text-xl text-gray-900">모키 (Moki)</h1>
          <p className="text-sm text-gray-500 mt-1">가상 API 관리 시스템</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>Mock API 런타임</p>
            <p className="mt-1 text-gray-400">로컬 스토리지</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}