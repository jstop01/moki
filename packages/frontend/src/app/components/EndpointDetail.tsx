import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Copy, Code, Loader2, Save, ChevronDown, ChevronUp, GitBranch, HelpCircle, Sparkles } from 'lucide-react';
import { HttpMethod, Condition, ConditionalResponse, EndpointWithResponse, ConditionOperator, DelayConfig } from '@/app/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Template Variables for Dynamic Responses
const TEMPLATE_VARIABLES = [
  { name: '{{$timestamp}}', desc: 'Unix timestamp (ms)' },
  { name: '{{$isoDate}}', desc: 'ISO 8601 날짜' },
  { name: '{{$uuid}}', desc: 'UUID v4' },
  { name: '{{$randomInt}}', desc: '랜덤 정수 0-1000' },
  { name: '{{$randomInt min max}}', desc: '범위 지정 랜덤' },
  { name: '{{$randomFloat}}', desc: '랜덤 실수 0-1' },
  { name: '{{$randomString n}}', desc: 'n자리 랜덤 문자열' },
  { name: '{{$randomEmail}}', desc: '랜덤 이메일' },
  { name: '{{$randomName}}', desc: '랜덤 이름' },
  { name: '{{$randomBoolean}}', desc: '랜덤 true/false' },
  { name: '{{$request.query.xxx}}', desc: '쿼리 파라미터' },
  { name: '{{$request.header.xxx}}', desc: '요청 헤더' },
  { name: '{{$request.body.xxx}}', desc: '바디 필드 (중첩: user.name)' },
  { name: '{{$request.path.xxx}}', desc: '경로 파라미터' },
];

// Template Variables Helper Component
function TemplateVariablesHelper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Sparkles className="w-4 h-4" />
        동적 변수
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-8 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <p className="font-semibold text-gray-900 text-sm">템플릿 변수</p>
              <p className="text-xs text-gray-500 mt-1">
                클릭하여 복사 - Response Body에서 동적 값 생성
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {TEMPLATE_VARIABLES.map((v, i) => (
                <div
                  key={i}
                  className="p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(v.name);
                    setIsOpen(false);
                  }}
                  title="클릭하여 복사"
                >
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">
                    {v.name}
                  </code>
                  <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface EndpointDetailProps {
  endpointId: string;
  onBack: () => void;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'eq', label: '같음 (=)' },
  { value: 'neq', label: '다름 (≠)' },
  { value: 'contains', label: '포함' },
  { value: 'startsWith', label: '시작' },
  { value: 'endsWith', label: '끝' },
  { value: 'regex', label: '정규식' },
  { value: 'exists', label: '존재함' },
];

const SOURCES: { value: 'query' | 'header' | 'body'; label: string }[] = [
  { value: 'query', label: 'Query String' },
  { value: 'header', label: 'Header' },
  { value: 'body', label: 'Body' },
];

export function EndpointDetail({ endpointId, onBack }: EndpointDetailProps) {
  const [endpoint, setEndpoint] = useState<EndpointWithResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editMethod, setEditMethod] = useState<HttpMethod>('GET');
  const [editStatus, setEditStatus] = useState(200);
  const [editDelayMode, setEditDelayMode] = useState<'fixed' | 'random'>('fixed');
  const [editDelayFixed, setEditDelayFixed] = useState(0);
  const [editDelayMin, setEditDelayMin] = useState(0);
  const [editDelayMax, setEditDelayMax] = useState(1000);
  const [editResponseBody, setEditResponseBody] = useState('');

  // Conditional responses state
  const [conditionalResponses, setConditionalResponses] = useState<ConditionalResponse[]>([]);
  const [expandedConditions, setExpandedConditions] = useState<number[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/endpoints/${endpointId}`);
      const json = await res.json();

      if (json.success && json.data) {
        const ep = json.data;
        const mappedEndpoint: EndpointWithResponse = {
          id: ep.id,
          name: ep.description || ep.path,
          method: ep.method as HttpMethod,
          path: ep.path,
          enabled: ep.status === 'active',
          tags: ep.tags,
          createdAt: ep.createdAt,
          updatedAt: ep.updatedAt,
          responseStatus: ep.responseStatus,
          responseData: ep.responseData,
          responseHeaders: ep.responseHeaders,
          delay: ep.delay,
          conditionalResponses: ep.conditionalResponses || [],
        };
        setEndpoint(mappedEndpoint);

        // Initialize edit form
        setEditName(mappedEndpoint.name);
        setEditPath(mappedEndpoint.path);
        setEditMethod(mappedEndpoint.method);
        setEditStatus(mappedEndpoint.responseStatus || 200);
        // Initialize delay (fixed or random)
        if (mappedEndpoint.delay && typeof mappedEndpoint.delay === 'object') {
          setEditDelayMode('random');
          setEditDelayMin(mappedEndpoint.delay.min);
          setEditDelayMax(mappedEndpoint.delay.max);
          setEditDelayFixed(0);
        } else {
          setEditDelayMode('fixed');
          setEditDelayFixed(typeof mappedEndpoint.delay === 'number' ? mappedEndpoint.delay : 0);
          setEditDelayMin(0);
          setEditDelayMax(1000);
        }
        setEditResponseBody(
          typeof mappedEndpoint.responseData === 'string'
            ? mappedEndpoint.responseData
            : JSON.stringify(mappedEndpoint.responseData, null, 2)
        );
        setConditionalResponses(mappedEndpoint.conditionalResponses || []);
      } else {
        setEndpoint(null);
      }
    } catch (error) {
      console.error('Failed to load endpoint:', error);
      setEndpoint(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [endpointId]);

  const handleSave = async () => {
    if (!endpoint) return;

    setSaving(true);
    try {
      let responseData;
      try {
        responseData = JSON.parse(editResponseBody);
      } catch {
        responseData = editResponseBody;
      }

      // Parse conditional response bodies
      const parsedConditionalResponses = conditionalResponses.map((cr) => ({
        ...cr,
        responseData:
          typeof cr.responseData === 'string'
            ? (() => {
                try {
                  return JSON.parse(cr.responseData);
                } catch {
                  return cr.responseData;
                }
              })()
            : cr.responseData,
      }));

      // Prepare delay config
      const delayConfig: DelayConfig = editDelayMode === 'random'
        ? { min: editDelayMin, max: editDelayMax }
        : editDelayFixed;

      const res = await fetch(`${API_URL}/api/admin/endpoints/${endpointId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editName,
          path: editPath,
          method: editMethod,
          responseStatus: editStatus,
          responseData,
          delay: delayConfig,
          conditionalResponses: parsedConditionalResponses,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditMode(false);
        loadData();
      }
    } catch (error) {
      console.error('Failed to save endpoint:', error);
    }
    setSaving(false);
  };

  // Conditional Response 관리 함수들
  const addConditionalResponse = () => {
    const newCr: ConditionalResponse = {
      name: `조건 ${conditionalResponses.length + 1}`,
      conditions: [{ field: '', source: 'query', operator: 'eq', value: '' }],
      responseStatus: 200,
      responseData: '{\n  \n}',
    };
    setConditionalResponses([...conditionalResponses, newCr]);
    setExpandedConditions([...expandedConditions, conditionalResponses.length]);
  };

  const removeConditionalResponse = (index: number) => {
    setConditionalResponses(conditionalResponses.filter((_, i) => i !== index));
    setExpandedConditions(expandedConditions.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const updateConditionalResponse = (index: number, updates: Partial<ConditionalResponse>) => {
    setConditionalResponses(
      conditionalResponses.map((cr, i) => (i === index ? { ...cr, ...updates } : cr))
    );
  };

  const addCondition = (crIndex: number) => {
    const cr = conditionalResponses[crIndex];
    updateConditionalResponse(crIndex, {
      conditions: [...cr.conditions, { field: '', source: 'query', operator: 'eq', value: '' }],
    });
  };

  const removeCondition = (crIndex: number, condIndex: number) => {
    const cr = conditionalResponses[crIndex];
    updateConditionalResponse(crIndex, {
      conditions: cr.conditions.filter((_, i) => i !== condIndex),
    });
  };

  const updateCondition = (crIndex: number, condIndex: number, updates: Partial<Condition>) => {
    const cr = conditionalResponses[crIndex];
    updateConditionalResponse(crIndex, {
      conditions: cr.conditions.map((c, i) => (i === condIndex ? { ...c, ...updates } : c)),
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedConditions(
      expandedConditions.includes(index)
        ? expandedConditions.filter((i) => i !== index)
        : [...expandedConditions, index]
    );
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

  const generateCurlExample = () => {
    if (!endpoint) return '';
    return `curl -X ${endpoint.method} "${API_URL}/mock${endpoint.path}" \\
  -H "Content-Type: application/json"`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          엔드포인트 목록으로
        </button>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">엔드포인트를 찾을 수 없습니다</p>
          <p className="text-sm mt-1">삭제되었거나 존재하지 않는 엔드포인트입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          엔드포인트 목록으로
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMethodColor(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <h2 className="text-2xl font-bold text-gray-900">{endpoint.name}</h2>
            </div>
            <p className="text-gray-600 font-mono text-lg">{endpoint.path}</p>
          </div>

          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            {editMode ? '취소' : '수정'}
          </button>
        </div>

        {/* Curl Example */}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">cURL 예제</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(generateCurlExample())}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              복사
            </button>
          </div>
          <pre className="text-sm text-green-400 font-mono overflow-x-auto">
            {generateCurlExample()}
          </pre>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {editMode ? (
          /* Edit Mode */
          <div className="space-y-6">
            {/* 기본 설정 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 설정</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름 (설명)</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">메서드</label>
                    <select
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value as HttpMethod)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">경로</label>
                    <input
                      type="text"
                      value={editPath}
                      onChange={(e) => setEditPath(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 기본 응답 (조건 미매칭 시) */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">기본 응답</h3>
              <p className="text-sm text-gray-500 mb-4">조건에 매칭되지 않을 때 반환되는 응답입니다.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">응답 상태</label>
                    <input
                      type="number"
                      value={editStatus}
                      onChange={(e) => setEditStatus(Number(e.target.value))}
                      min="100"
                      max="599"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">지연 시간 (ms)</label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setEditDelayMode('fixed')}
                        className={`flex-1 px-3 py-1.5 text-sm rounded-lg border ${
                          editDelayMode === 'fixed'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        고정
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDelayMode('random')}
                        className={`flex-1 px-3 py-1.5 text-sm rounded-lg border ${
                          editDelayMode === 'random'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        랜덤 범위
                      </button>
                    </div>
                    {editDelayMode === 'fixed' ? (
                      <input
                        type="number"
                        value={editDelayFixed}
                        onChange={(e) => setEditDelayFixed(Number(e.target.value))}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editDelayMin}
                          onChange={(e) => setEditDelayMin(Number(e.target.value))}
                          min="0"
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500">~</span>
                        <input
                          type="number"
                          value={editDelayMax}
                          onChange={(e) => setEditDelayMax(Number(e.target.value))}
                          min="0"
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">응답 Body (JSON)</label>
                    <TemplateVariablesHelper />
                  </div>
                  <textarea
                    value={editResponseBody}
                    onChange={(e) => setEditResponseBody(e.target.value)}
                    rows={8}
                    placeholder={`{
  "id": "{{$uuid}}",
  "timestamp": "{{$isoDate}}",
  "data": {
    "name": "{{$randomName}}",
    "email": "{{$randomEmail}}"
  }
}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 조건부 응답 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    조건부 응답
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    쿼리 파라미터, 헤더, Body 값에 따라 다른 응답을 반환합니다.
                  </p>
                </div>
                <button
                  onClick={addConditionalResponse}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  조건 추가
                </button>
              </div>

              {conditionalResponses.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>조건부 응답이 없습니다</p>
                  <p className="text-sm">위 버튼을 클릭해서 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conditionalResponses.map((cr, crIndex) => (
                    <div
                      key={crIndex}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* 조건 헤더 */}
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleExpanded(crIndex)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedConditions.includes(crIndex) ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">
                            {cr.name || `조건 ${crIndex + 1}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({cr.conditions.length}개 조건)
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            cr.responseStatus >= 200 && cr.responseStatus < 300
                              ? 'bg-green-100 text-green-700'
                              : cr.responseStatus >= 400
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {cr.responseStatus}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeConditionalResponse(crIndex);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 조건 상세 */}
                      {expandedConditions.includes(crIndex) && (
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          {/* 조건 이름 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              조건 이름
                            </label>
                            <input
                              type="text"
                              value={cr.name || ''}
                              onChange={(e) =>
                                updateConditionalResponse(crIndex, { name: e.target.value })
                              }
                              placeholder="예: ProcessHTTP 필드"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* 조건 목록 */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                매칭 조건 (모두 충족 시 응답)
                              </label>
                              <button
                                onClick={() => addCondition(crIndex)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                + 조건 추가
                              </button>
                            </div>
                            <div className="space-y-2">
                              {cr.conditions.map((cond, condIndex) => (
                                <div
                                  key={condIndex}
                                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                                >
                                  <select
                                    value={cond.source}
                                    onChange={(e) =>
                                      updateCondition(crIndex, condIndex, {
                                        source: e.target.value as 'query' | 'header' | 'body',
                                      })
                                    }
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    {SOURCES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={cond.field}
                                    onChange={(e) =>
                                      updateCondition(crIndex, condIndex, { field: e.target.value })
                                    }
                                    placeholder="파라미터명"
                                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                                  />
                                  <select
                                    value={cond.operator}
                                    onChange={(e) =>
                                      updateCondition(crIndex, condIndex, {
                                        operator: e.target.value as ConditionOperator,
                                      })
                                    }
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  >
                                    {OPERATORS.map((op) => (
                                      <option key={op.value} value={op.value}>
                                        {op.label}
                                      </option>
                                    ))}
                                  </select>
                                  {cond.operator !== 'exists' && (
                                    <input
                                      type="text"
                                      value={cond.value || ''}
                                      onChange={(e) =>
                                        updateCondition(crIndex, condIndex, { value: e.target.value })
                                      }
                                      placeholder="값"
                                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                                    />
                                  )}
                                  <button
                                    onClick={() => removeCondition(crIndex, condIndex)}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                    disabled={cr.conditions.length <= 1}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 응답 설정 */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                응답 상태
                              </label>
                              <input
                                type="number"
                                value={cr.responseStatus}
                                onChange={(e) =>
                                  updateConditionalResponse(crIndex, {
                                    responseStatus: Number(e.target.value),
                                  })
                                }
                                min="100"
                                max="599"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                지연 시간 (ms)
                              </label>
                              <div className="flex gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateConditionalResponse(crIndex, {
                                      delay: typeof cr.delay === 'object' ? cr.delay.min : (cr.delay || 0),
                                    })
                                  }
                                  className={`flex-1 px-2 py-1 text-xs rounded-lg border ${
                                    typeof cr.delay !== 'object'
                                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  고정
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateConditionalResponse(crIndex, {
                                      delay: { min: typeof cr.delay === 'number' ? cr.delay : 0, max: 1000 },
                                    })
                                  }
                                  className={`flex-1 px-2 py-1 text-xs rounded-lg border ${
                                    typeof cr.delay === 'object'
                                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  랜덤
                                </button>
                              </div>
                              {typeof cr.delay !== 'object' ? (
                                <input
                                  type="number"
                                  value={typeof cr.delay === 'number' ? cr.delay : 0}
                                  onChange={(e) =>
                                    updateConditionalResponse(crIndex, {
                                      delay: Number(e.target.value),
                                    })
                                  }
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={cr.delay.min}
                                    onChange={(e) =>
                                      updateConditionalResponse(crIndex, {
                                        delay: { ...cr.delay as { min: number; max: number }, min: Number(e.target.value) },
                                      })
                                    }
                                    min="0"
                                    placeholder="Min"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-500">~</span>
                                  <input
                                    type="number"
                                    value={cr.delay.max}
                                    onChange={(e) =>
                                      updateConditionalResponse(crIndex, {
                                        delay: { ...cr.delay as { min: number; max: number }, max: Number(e.target.value) },
                                      })
                                    }
                                    min="0"
                                    placeholder="Max"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                응답 Body (JSON)
                              </label>
                              <TemplateVariablesHelper />
                            </div>
                            <textarea
                              value={
                                typeof cr.responseData === 'string'
                                  ? cr.responseData
                                  : JSON.stringify(cr.responseData, null, 2)
                              }
                              onChange={(e) =>
                                updateConditionalResponse(crIndex, { responseData: e.target.value })
                              }
                              rows={8}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* 기본 응답 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 응답</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">상태 코드</label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      (endpoint.responseStatus || 200) >= 200 &&
                      (endpoint.responseStatus || 200) < 300
                        ? 'bg-green-100 text-green-700'
                        : (endpoint.responseStatus || 200) >= 400 &&
                          (endpoint.responseStatus || 200) < 500
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {endpoint.responseStatus || 200}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">지연 시간</label>
                  <span className="text-gray-900">
                    {endpoint.delay
                      ? typeof endpoint.delay === 'object'
                        ? `${endpoint.delay.min}~${endpoint.delay.max}ms (랜덤)`
                        : `${endpoint.delay}ms`
                      : '0ms'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">응답 Body</label>
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto max-h-64 text-sm font-mono">
                  {typeof endpoint.responseData === 'string'
                    ? endpoint.responseData
                    : JSON.stringify(endpoint.responseData, null, 2)}
                </pre>
              </div>
            </div>

            {/* 조건부 응답 보기 */}
            {endpoint.conditionalResponses && endpoint.conditionalResponses.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  조건부 응답 ({endpoint.conditionalResponses.length}개)
                </h3>

                <div className="space-y-3">
                  {endpoint.conditionalResponses.map((cr, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleExpanded(index)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedConditions.includes(index) ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">
                            {cr.name || `조건 ${index + 1}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              cr.responseStatus >= 200 && cr.responseStatus < 300
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {cr.responseStatus}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {cr.conditions.map((c) => `${c.field}=${c.value}`).join(' & ')}
                        </div>
                      </div>

                      {expandedConditions.includes(index) && (
                        <div className="p-4 border-t border-gray-200">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                              조건
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {cr.conditions.map((c, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-mono"
                                >
                                  {c.source}.{c.field} {c.operator} {c.value}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                              응답 Body
                            </label>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto max-h-48 text-sm font-mono">
                              {typeof cr.responseData === 'string'
                                ? cr.responseData
                                : JSON.stringify(cr.responseData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 메타데이터 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">메타데이터</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-500">생성일</label>
                  <span className="text-gray-900">
                    {new Date(endpoint.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="block text-gray-500">수정일</label>
                  <span className="text-gray-900">
                    {new Date(endpoint.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
