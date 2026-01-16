import { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Trash2, FileJson, FileCode } from 'lucide-react';
import { storage } from '@/app/utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type ImportTab = 'moki' | 'openapi';

export function ImportExport() {
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>('moki');
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    try {
      const data = storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mock-api-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: '설정을 성공적으로 내보냈습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: '내보내기 실패' });
    }
  };

  const handleImport = () => {
    try {
      storage.importData(importText, mergeMode);
      setMessage({
        type: 'success',
        text: mergeMode ? '설정을 병합했습니다' : '설정을 가져왔습니다'
      });
      setImportText('');
      setTimeout(() => {
        setMessage(null);
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'JSON 형식이 올바르지 않습니다' });
    }
  };

  const handleOpenApiImport = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    try {
      const spec = JSON.parse(importText);

      const response = await fetch(
        `${API_URL}/api/admin/import/openapi?replace=${mergeMode ? 'false' : 'true'}&skipInvalid=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(spec),
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `OpenAPI ${result.data.specVersion}에서 ${result.data.imported}개 엔드포인트 가져옴 (${result.data.skipped}개 건너뜀)`
        });
        setImportText('');
        setTimeout(() => {
          setMessage(null);
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'OpenAPI 가져오기 실패' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'JSON 파싱 오류 또는 네트워크 오류' });
    }
    setImporting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleClearAll = () => {
    if (confirm('모든 엔드포인트, 규칙, 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      storage.clearAll();
      setMessage({ type: 'success', text: '모든 데이터를 삭제했습니다' });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const getCurrentStats = () => {
    const data = storage.getData();
    return {
      endpoints: data.endpoints.length,
      rules: data.rules.length,
      logs: data.logs.length,
    };
  };

  const stats = getCurrentStats();

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">가져오기 / 내보내기</h2>
          <p className="text-sm text-gray-500 mt-1">
            설정을 내보내거나 가져와서 팀과 공유하거나 백업하세요
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">현재 설정</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.endpoints}</div>
              <div className="text-sm text-gray-600 mt-1">엔드포인트</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.rules}</div>
              <div className="text-sm text-gray-600 mt-1">규칙</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats.logs}</div>
              <div className="text-sm text-gray-600 mt-1">로그</div>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">설정 내보내기</h3>
              <p className="text-sm text-gray-500">
                모든 엔드포인트와 규칙을 JSON 파일로 다운로드합니다
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">설정 가져오기</h3>

          {/* Import Type Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setImportTab('moki'); setImportText(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importTab === 'moki'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <FileJson className="w-4 h-4" />
              Moki 형식
            </button>
            <button
              onClick={() => { setImportTab('openapi'); setImportText(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importTab === 'openapi'
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <FileCode className="w-4 h-4" />
              OpenAPI / Swagger
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              파일에서 가져오기
            </label>
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Or paste JSON */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              또는 JSON 직접 붙여넣기
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={importTab === 'moki'
                ? '{"endpoints": [], "rules": [], "logs": []}'
                : '{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
              }
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Merge Mode */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="mergeMode"
              checked={mergeMode}
              onChange={(e) => setMergeMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="mergeMode" className="text-sm text-gray-700">
              {importTab === 'moki'
                ? '기존 설정과 병합 (체크 해제 시 기존 설정을 덮어씁니다)'
                : '기존 엔드포인트 유지 (체크 해제 시 같은 경로가 있으면 덮어씁니다)'
              }
            </label>
          </div>

          <button
            onClick={importTab === 'moki' ? handleImport : handleOpenApiImport}
            disabled={!importText.trim() || importing}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed ${
              importTab === 'moki'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            {importing ? '가져오는 중...' : '가져오기'}
          </button>
        </div>

        {/* OpenAPI Info */}
        {importTab === 'openapi' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="font-semibold text-orange-900 mb-3">OpenAPI / Swagger 가져오기</h3>
            <ul className="space-y-2 text-sm text-orange-800">
              <li className="flex gap-2">
                <span className="font-semibold">•</span>
                <span>OpenAPI 3.x 및 Swagger 2.x 형식을 지원합니다</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">•</span>
                <span>스펙의 paths에 정의된 모든 엔드포인트가 자동으로 생성됩니다</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">•</span>
                <span>스키마에서 Mock 응답 데이터가 자동 생성됩니다</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">•</span>
                <span>경로 파라미터 {'{id}'} 형식이 :id 형식으로 자동 변환됩니다</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">•</span>
                <span>템플릿 변수 {'{{$uuid}}'}, {'{{$randomEmail}}'} 등이 스키마 타입에 따라 자동 적용됩니다</span>
              </li>
            </ul>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-white border-2 border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-1">위험 영역</h3>
          <p className="text-sm text-gray-600 mb-4">
            이 작업은 되돌릴 수 없습니다
          </p>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            모든 데이터 삭제
          </button>
        </div>

        {/* Usage Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">사용 가이드</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>Export 버튼을 클릭하여 현재 설정을 JSON 파일로 다운로드합니다</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>팀원과 파일을 공유하거나 버전 관리 시스템에 저장합니다</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>다른 환경에서 Import하여 동일한 설정을 사용합니다</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>OpenAPI 탭에서 Swagger 스펙을 가져와 빠르게 Mock 엔드포인트를 생성할 수 있습니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
