import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Rule, RuleCondition } from '@/app/types';
import { storage } from '@/app/utils/storage';

interface RuleEditorProps {
  endpointId: string;
  rule?: Rule;
  onClose: () => void;
  onSave: () => void;
}

export function RuleEditor({ endpointId, rule, onClose, onSave }: RuleEditorProps) {
  const [name, setName] = useState(rule?.name || '');
  const [priority, setPriority] = useState(rule?.priority || 0);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || []);
  const [responseStatus, setResponseStatus] = useState(rule?.responseStatus || 200);
  const [responseBody, setResponseBody] = useState(rule?.responseBody || '{\n  "message": "Success"\n}');
  const [delayMs, setDelayMs] = useState(rule?.delayMs || 0);
  const [responseHeaders, setResponseHeaders] = useState(
    JSON.stringify(rule?.responseHeaders || { 'Content-Type': 'application/json' }, null, 2)
  );

  const addCondition = () => {
    setConditions([
      ...conditions,
      { type: 'query', key: '', operator: 'equals', value: '' }
    ]);
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const headers = JSON.parse(responseHeaders);
      
      const ruleData: Rule = {
        id: rule?.id || `rule_${Date.now()}`,
        endpointId,
        name,
        priority,
        enabled,
        conditions,
        responseStatus,
        responseHeaders: headers,
        responseBody,
        delayMs,
        createdAt: rule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveRule(ruleData);
      onSave();
    } catch (error) {
      alert('Invalid JSON in response headers');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {rule ? '규칙 수정' : '새 규칙'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  규칙 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="성공 응답"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  우선순위 (낮을수록 우선)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                활성화
              </label>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  조건 (모두 만족해야 매칭)
                </label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  조건 추가
                </button>
              </div>

              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                    <select
                      value={condition.type}
                      onChange={(e) => updateCondition(index, { type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="query">Query</option>
                      <option value="header">Header</option>
                      <option value="body">Body</option>
                    </select>

                    <input
                      type="text"
                      value={condition.key}
                      onChange={(e) => updateCondition(index, { key: e.target.value })}
                      placeholder="키"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />

                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="equals">같음</option>
                      <option value="exists">존재함</option>
                      <option value="contains">포함</option>
                      <option value="regex">정규식</option>
                    </select>

                    {condition.operator !== 'exists' && (
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="값"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {conditions.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    조건이 없으면 모든 요청에 매칭됩니다
                  </p>
                )}
              </div>
            </div>

            {/* Response Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태 코드
                </label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={200}>200 OK</option>
                  <option value={201}>201 Created</option>
                  <option value={204}>204 No Content</option>
                  <option value={400}>400 Bad Request</option>
                  <option value={401}>401 Unauthorized</option>
                  <option value={403}>403 Forbidden</option>
                  <option value={404}>404 Not Found</option>
                  <option value={500}>500 Internal Server Error</option>
                  <option value={503}>503 Service Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  지연 시간 (ms)
                </label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Response Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                응답 헤더 (JSON)
              </label>
              <textarea
                value={responseHeaders}
                onChange={(e) => setResponseHeaders(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Response Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                응답 본문 (JSON 또는 텍스트)
              </label>
              <textarea
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}