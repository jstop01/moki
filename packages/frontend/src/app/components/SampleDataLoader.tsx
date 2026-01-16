import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { storage } from '@/app/utils/storage';
import { sampleEndpoints, sampleRules, sampleLogs } from '@/app/utils/sampleData';

export function SampleDataLoader() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const data = storage.getData();
    const hasData = data.endpoints.length > 0 || data.rules.length > 0;
    
    if (!hasData) {
      setShowPrompt(true);
    }
  }, []);

  const loadSampleData = () => {
    storage.saveData({
      endpoints: sampleEndpoints,
      rules: sampleRules,
      logs: sampleLogs,
    });
    setShowPrompt(false);
    window.location.reload();
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Welcome to Mock API Center</h3>
          <button onClick={() => setShowPrompt(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            시작하기 위해 샘플 데이터를 로드하시겠습니까?
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 mb-2 font-semibold">샘플 데이터 포함:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 4개의 엔드포인트 (Users, Auth)</li>
              <li>• 8개의 응답 규칙 (성공/실패 시나리오)</li>
              <li>• 5개의 요청 로그 예시</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPrompt(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              나중에
            </button>
            <button
              onClick={loadSampleData}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              샘플 데이터 로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
