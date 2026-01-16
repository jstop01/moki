import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Copy, Code, Loader2, Save, ChevronDown, ChevronUp, GitBranch, HelpCircle, Sparkles, History, RotateCcw, Globe, Play, RefreshCw, Shield, Key, Timer, Layers } from 'lucide-react';
import { HttpMethod, Condition, ConditionalResponse, EndpointWithResponse, ConditionOperator, DelayConfig, ProxyConfig, ScenarioConfig, ScenarioResponse, ScenarioMode, AuthConfig, AuthMethod, BearerTokenConfig, JwtConfig, ApiKeyConfig, BasicAuthConfig, RateLimitConfig, RateLimitKeyBy, Environment, EnvironmentOverride, EndpointEnvironments, EnvironmentSettings } from '@/app/types';

interface ResponseHistory {
  id: string;
  endpointId: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete';
  changes: { field: string; oldValue: any; newValue: any }[];
  snapshot: Partial<EndpointWithResponse>;
}

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

  // Proxy state
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyTargetUrl, setProxyTargetUrl] = useState('');
  const [proxyCacheEnabled, setProxyCacheEnabled] = useState(false);
  const [proxyCacheTtl, setProxyCacheTtl] = useState(300);
  const [proxyTimeout, setProxyTimeout] = useState(30000);

  // History state
  const [history, setHistory] = useState<ResponseHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Scenario state
  const [scenarioEnabled, setScenarioEnabled] = useState(false);
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('sequential');
  const [scenarioLoop, setScenarioLoop] = useState(true);
  const [scenarioResetAfter, setScenarioResetAfter] = useState(0);
  const [scenarioResponses, setScenarioResponses] = useState<ScenarioResponse[]>([]);
  const [expandedScenarios, setExpandedScenarios] = useState<number[]>([]);

  // Auth state
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('bearer');
  const [bearerTokens, setBearerTokens] = useState<string[]>(['']);
  const [bearerAcceptAny, setBearerAcceptAny] = useState(false);
  const [jwtCheckExpiry, setJwtCheckExpiry] = useState(true);
  const [jwtRequiredClaims, setJwtRequiredClaims] = useState<string>('');
  const [jwtValidIssuers, setJwtValidIssuers] = useState<string>('');
  const [apiKeyHeaderName, setApiKeyHeaderName] = useState('X-API-Key');
  const [apiKeyValidKeys, setApiKeyValidKeys] = useState<string[]>(['']);
  const [basicAuthCredentials, setBasicAuthCredentials] = useState<Array<{ username: string; password: string }>>([{ username: '', password: '' }]);

  // Rate Limit state
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [rateLimitRequests, setRateLimitRequests] = useState(100);
  const [rateLimitWindow, setRateLimitWindow] = useState(60);
  const [rateLimitBurst, setRateLimitBurst] = useState(0);
  const [rateLimitKeyBy, setRateLimitKeyBy] = useState<RateLimitKeyBy>('ip');
  const [rateLimitKeyName, setRateLimitKeyName] = useState('');

  // Environment Override state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentOverrides, setEnvironmentOverrides] = useState<EndpointEnvironments>({});
  const [envSettingsEnabled, setEnvSettingsEnabled] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/endpoints/${endpointId}/history`);
      const json = await res.json();
      if (json.success && json.data) {
        setHistory(json.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadEnvironments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/environment/settings`);
      const json = await res.json();
      if (json.success && json.data) {
        setEnvironments(json.data.environments || []);
        setEnvSettingsEnabled(json.data.enabled || false);
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const handleRestore = async (historyId: string) => {
    if (!confirm('이 버전으로 복원하시겠습니까?')) return;

    setRestoring(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/history/${historyId}/restore`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        loadData();
        loadHistory();
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Failed to restore:', error);
    }
    setRestoring(false);
  };

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
          proxyConfig: ep.proxyConfig,
          scenarioConfig: ep.scenarioConfig,
          authConfig: ep.authConfig,
          rateLimitConfig: ep.rateLimitConfig,
          environmentOverrides: ep.environmentOverrides,
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
        // Initialize proxy config
        if (mappedEndpoint.proxyConfig) {
          setProxyEnabled(mappedEndpoint.proxyConfig.enabled || false);
          setProxyTargetUrl(mappedEndpoint.proxyConfig.targetUrl || '');
          setProxyCacheEnabled(mappedEndpoint.proxyConfig.cacheResponse || false);
          setProxyCacheTtl(mappedEndpoint.proxyConfig.cacheTtl || 300);
          setProxyTimeout(mappedEndpoint.proxyConfig.timeout || 30000);
        } else {
          setProxyEnabled(false);
          setProxyTargetUrl('');
          setProxyCacheEnabled(false);
          setProxyCacheTtl(300);
          setProxyTimeout(30000);
        }
        // Initialize scenario config
        if (mappedEndpoint.scenarioConfig) {
          setScenarioEnabled(mappedEndpoint.scenarioConfig.enabled || false);
          setScenarioMode(mappedEndpoint.scenarioConfig.mode || 'sequential');
          setScenarioLoop(mappedEndpoint.scenarioConfig.loop ?? true);
          setScenarioResetAfter(mappedEndpoint.scenarioConfig.resetAfter || 0);
          setScenarioResponses(mappedEndpoint.scenarioConfig.responses || []);
        } else {
          setScenarioEnabled(false);
          setScenarioMode('sequential');
          setScenarioLoop(true);
          setScenarioResetAfter(0);
          setScenarioResponses([]);
        }
        // Initialize auth config
        if (mappedEndpoint.authConfig) {
          setAuthEnabled(mappedEndpoint.authConfig.enabled || false);
          setAuthMethod(mappedEndpoint.authConfig.method || 'bearer');
          if (mappedEndpoint.authConfig.bearerConfig) {
            setBearerTokens(mappedEndpoint.authConfig.bearerConfig.validTokens?.length > 0
              ? mappedEndpoint.authConfig.bearerConfig.validTokens
              : ['']);
            setBearerAcceptAny(mappedEndpoint.authConfig.bearerConfig.acceptAny || false);
          } else {
            setBearerTokens(['']);
            setBearerAcceptAny(false);
          }
          if (mappedEndpoint.authConfig.jwtConfig) {
            setJwtCheckExpiry(mappedEndpoint.authConfig.jwtConfig.checkExpiry ?? true);
            setJwtRequiredClaims(mappedEndpoint.authConfig.jwtConfig.requiredClaims?.join(', ') || '');
            setJwtValidIssuers(mappedEndpoint.authConfig.jwtConfig.validIssuers?.join(', ') || '');
          } else {
            setJwtCheckExpiry(true);
            setJwtRequiredClaims('');
            setJwtValidIssuers('');
          }
          if (mappedEndpoint.authConfig.apiKeyConfig) {
            setApiKeyHeaderName(mappedEndpoint.authConfig.apiKeyConfig.headerName || 'X-API-Key');
            setApiKeyValidKeys(mappedEndpoint.authConfig.apiKeyConfig.validKeys?.length > 0
              ? mappedEndpoint.authConfig.apiKeyConfig.validKeys
              : ['']);
          } else {
            setApiKeyHeaderName('X-API-Key');
            setApiKeyValidKeys(['']);
          }
          if (mappedEndpoint.authConfig.basicAuthConfig) {
            setBasicAuthCredentials(mappedEndpoint.authConfig.basicAuthConfig.credentials?.length > 0
              ? mappedEndpoint.authConfig.basicAuthConfig.credentials
              : [{ username: '', password: '' }]);
          } else {
            setBasicAuthCredentials([{ username: '', password: '' }]);
          }
        } else {
          setAuthEnabled(false);
          setAuthMethod('bearer');
          setBearerTokens(['']);
          setBearerAcceptAny(false);
          setJwtCheckExpiry(true);
          setJwtRequiredClaims('');
          setJwtValidIssuers('');
          setApiKeyHeaderName('X-API-Key');
          setApiKeyValidKeys(['']);
          setBasicAuthCredentials([{ username: '', password: '' }]);
        }
        // Initialize rate limit config
        if (mappedEndpoint.rateLimitConfig) {
          setRateLimitEnabled(mappedEndpoint.rateLimitConfig.enabled || false);
          setRateLimitRequests(mappedEndpoint.rateLimitConfig.requestsPerWindow || 100);
          setRateLimitWindow(mappedEndpoint.rateLimitConfig.windowSeconds || 60);
          setRateLimitBurst(mappedEndpoint.rateLimitConfig.burstLimit || 0);
          setRateLimitKeyBy(mappedEndpoint.rateLimitConfig.keyBy || 'ip');
          setRateLimitKeyName(mappedEndpoint.rateLimitConfig.keyName || '');
        } else {
          setRateLimitEnabled(false);
          setRateLimitRequests(100);
          setRateLimitWindow(60);
          setRateLimitBurst(0);
          setRateLimitKeyBy('ip');
          setRateLimitKeyName('');
        }
        // Initialize environment overrides
        if (mappedEndpoint.environmentOverrides) {
          setEnvironmentOverrides(mappedEndpoint.environmentOverrides);
        } else {
          setEnvironmentOverrides({});
        }
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
    loadHistory();
    loadEnvironments();
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

      // Prepare proxy config
      const proxyConfig: ProxyConfig | undefined = proxyEnabled
        ? {
            enabled: true,
            targetUrl: proxyTargetUrl,
            cacheResponse: proxyCacheEnabled,
            cacheTtl: proxyCacheTtl,
            timeout: proxyTimeout,
          }
        : undefined;

      // Prepare scenario config
      const parsedScenarioResponses = scenarioResponses.map((sr) => ({
        ...sr,
        responseData:
          typeof sr.responseData === 'string'
            ? (() => {
                try {
                  return JSON.parse(sr.responseData);
                } catch {
                  return sr.responseData;
                }
              })()
            : sr.responseData,
      }));

      const scenarioConfig: ScenarioConfig | undefined = scenarioEnabled
        ? {
            enabled: true,
            mode: scenarioMode,
            loop: scenarioLoop,
            resetAfter: scenarioResetAfter,
            responses: parsedScenarioResponses,
          }
        : undefined;

      // Prepare auth config
      let authConfig: AuthConfig | undefined;
      if (authEnabled) {
        const baseAuthConfig: AuthConfig = {
          enabled: true,
          method: authMethod,
        };

        switch (authMethod) {
          case 'bearer':
            baseAuthConfig.bearerConfig = {
              validTokens: bearerTokens.filter(t => t.trim() !== ''),
              acceptAny: bearerAcceptAny,
            };
            break;
          case 'jwt':
            baseAuthConfig.jwtConfig = {
              checkExpiry: jwtCheckExpiry,
              requiredClaims: jwtRequiredClaims ? jwtRequiredClaims.split(',').map(s => s.trim()).filter(Boolean) : undefined,
              validIssuers: jwtValidIssuers ? jwtValidIssuers.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            };
            break;
          case 'apiKey':
            baseAuthConfig.apiKeyConfig = {
              headerName: apiKeyHeaderName || 'X-API-Key',
              validKeys: apiKeyValidKeys.filter(k => k.trim() !== ''),
            };
            break;
          case 'basic':
            baseAuthConfig.basicAuthConfig = {
              credentials: basicAuthCredentials.filter(c => c.username.trim() !== '' && c.password.trim() !== ''),
            };
            break;
        }

        authConfig = baseAuthConfig;
      }

      // Prepare rate limit config
      const rateLimitConfig: RateLimitConfig | undefined = rateLimitEnabled
        ? {
            enabled: true,
            requestsPerWindow: rateLimitRequests,
            windowSeconds: rateLimitWindow,
            burstLimit: rateLimitBurst,
            keyBy: rateLimitKeyBy,
            keyName: rateLimitKeyBy !== 'ip' ? rateLimitKeyName : undefined,
          }
        : undefined;

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
          proxyConfig,
          scenarioConfig,
          authConfig,
          rateLimitConfig,
          environmentOverrides: Object.keys(environmentOverrides).length > 0 ? environmentOverrides : undefined,
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

  // Scenario Response 관리 함수들
  const addScenarioResponse = () => {
    const newSr: ScenarioResponse = {
      order: scenarioResponses.length + 1,
      name: `응답 ${scenarioResponses.length + 1}`,
      responseStatus: 200,
      responseData: '{\n  \n}',
      weight: 1,
    };
    setScenarioResponses([...scenarioResponses, newSr]);
    setExpandedScenarios([...expandedScenarios, scenarioResponses.length]);
  };

  const removeScenarioResponse = (index: number) => {
    setScenarioResponses(scenarioResponses.filter((_, i) => i !== index));
    setExpandedScenarios(expandedScenarios.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const updateScenarioResponse = (index: number, updates: Partial<ScenarioResponse>) => {
    setScenarioResponses(
      scenarioResponses.map((sr, i) => (i === index ? { ...sr, ...updates } : sr))
    );
  };

  const toggleScenarioExpanded = (index: number) => {
    setExpandedScenarios(
      expandedScenarios.includes(index)
        ? expandedScenarios.filter((i) => i !== index)
        : [...expandedScenarios, index]
    );
  };

  const resetScenarioCounter = async () => {
    try {
      await fetch(`${API_URL}/api/admin/endpoints/${endpointId}/scenario/reset`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to reset scenario counter:', error);
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

            {/* 프록시 설정 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    프록시 모드
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    실제 API로 요청을 전달하고 응답을 캐싱합니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proxyEnabled}
                    onChange={(e) => setProxyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {proxyEnabled && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      대상 API URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={proxyTargetUrl}
                      onChange={(e) => setProxyTargetUrl(e.target.value)}
                      placeholder="https://api.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      요청이 이 URL로 전달됩니다. 현재 엔드포인트 경로가 추가됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        타임아웃 (ms)
                      </label>
                      <input
                        type="number"
                        value={proxyTimeout}
                        onChange={(e) => setProxyTimeout(Number(e.target.value))}
                        min="1000"
                        max="120000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        응답 캐싱
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={proxyCacheEnabled}
                            onChange={(e) => setProxyCacheEnabled(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">캐싱 활성화</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {proxyCacheEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        캐시 TTL (초)
                      </label>
                      <input
                        type="number"
                        value={proxyCacheTtl}
                        onChange={(e) => setProxyCacheTtl(Number(e.target.value))}
                        min="1"
                        max="86400"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        성공적인 응답이 {proxyCacheTtl}초 동안 캐싱됩니다.
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>참고:</strong> 프록시 모드가 활성화되면 위의 Mock 응답 설정은 무시되고,
                      실제 API 응답이 반환됩니다. Authorization, X-API-Key 등의 헤더는 자동으로 전달됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 시나리오 모드 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    시나리오 모드
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    호출 순서에 따라 다른 응답을 반환합니다. (예: 첫 번째 성공, 두 번째 실패)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioEnabled}
                    onChange={(e) => setScenarioEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {scenarioEnabled && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  {/* 시나리오 설정 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">모드</label>
                      <select
                        value={scenarioMode}
                        onChange={(e) => setScenarioMode(e.target.value as ScenarioMode)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="sequential">순차 (Sequential)</option>
                        <option value="random">랜덤 (Random)</option>
                        <option value="weighted">가중치 (Weighted)</option>
                      </select>
                    </div>

                    {scenarioMode === 'sequential' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">반복</label>
                        <label className="inline-flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={scenarioLoop}
                            onChange={(e) => setScenarioLoop(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">마지막 응답 후 처음부터</span>
                        </label>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        자동 리셋 (초)
                      </label>
                      <input
                        type="number"
                        value={scenarioResetAfter}
                        onChange={(e) => setScenarioResetAfter(Number(e.target.value))}
                        min="0"
                        placeholder="0 = 리셋 안함"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        마지막 요청 후 N초 지나면 카운터 리셋
                      </p>
                    </div>
                  </div>

                  {/* 카운터 리셋 버튼 */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={resetScenarioCounter}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                      카운터 리셋
                    </button>
                  </div>

                  {/* 시나리오 응답 목록 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        시나리오 응답 ({scenarioResponses.length}개)
                      </label>
                      <button
                        type="button"
                        onClick={addScenarioResponse}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                        응답 추가
                      </button>
                    </div>

                    {scenarioResponses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>시나리오 응답이 없습니다</p>
                        <p className="text-sm">위 버튼을 클릭해서 추가하세요</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scenarioResponses.map((sr, srIndex) => (
                          <div
                            key={srIndex}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            {/* 시나리오 헤더 */}
                            <div
                              className="flex items-center justify-between p-4 bg-purple-50 cursor-pointer hover:bg-purple-100"
                              onClick={() => toggleScenarioExpanded(srIndex)}
                            >
                              <div className="flex items-center gap-3">
                                {expandedScenarios.includes(srIndex) ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                                <span className="font-mono text-sm bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                                  #{scenarioMode === 'sequential' ? sr.order || srIndex + 1 : srIndex + 1}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {sr.name || `응답 ${srIndex + 1}`}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  sr.responseStatus >= 200 && sr.responseStatus < 300
                                    ? 'bg-green-100 text-green-700'
                                    : sr.responseStatus >= 400
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {sr.responseStatus}
                                </span>
                                {scenarioMode === 'weighted' && (
                                  <span className="text-xs text-gray-500">
                                    (가중치: {sr.weight || 1})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeScenarioResponse(srIndex);
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* 시나리오 상세 */}
                            {expandedScenarios.includes(srIndex) && (
                              <div className="p-4 space-y-4 border-t border-gray-200">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      이름
                                    </label>
                                    <input
                                      type="text"
                                      value={sr.name || ''}
                                      onChange={(e) =>
                                        updateScenarioResponse(srIndex, { name: e.target.value })
                                      }
                                      placeholder="예: 성공 응답"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>

                                  {scenarioMode === 'sequential' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        순서
                                      </label>
                                      <input
                                        type="number"
                                        value={sr.order || srIndex + 1}
                                        onChange={(e) =>
                                          updateScenarioResponse(srIndex, { order: Number(e.target.value) })
                                        }
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      />
                                    </div>
                                  )}

                                  {scenarioMode === 'weighted' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        가중치
                                      </label>
                                      <input
                                        type="number"
                                        value={sr.weight || 1}
                                        onChange={(e) =>
                                          updateScenarioResponse(srIndex, { weight: Number(e.target.value) })
                                        }
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      상태 코드
                                    </label>
                                    <input
                                      type="number"
                                      value={sr.responseStatus}
                                      onChange={(e) =>
                                        updateScenarioResponse(srIndex, { responseStatus: Number(e.target.value) })
                                      }
                                      min="100"
                                      max="599"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
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
                                      typeof sr.responseData === 'string'
                                        ? sr.responseData
                                        : JSON.stringify(sr.responseData, null, 2)
                                    }
                                    onChange={(e) =>
                                      updateScenarioResponse(srIndex, { responseData: e.target.value })
                                    }
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>참고:</strong> 시나리오 모드가 활성화되면 조건부 응답보다 우선 적용됩니다.
                      프록시 모드가 활성화된 경우 시나리오는 무시됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 인증 설정 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    인증 시뮬레이션
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    요청에 대한 인증을 검증합니다. (Bearer, JWT, API Key, Basic Auth)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authEnabled}
                    onChange={(e) => setAuthEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {authEnabled && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  {/* 인증 방식 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">인증 방식</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'bearer', label: 'Bearer Token' },
                        { value: 'jwt', label: 'JWT' },
                        { value: 'apiKey', label: 'API Key' },
                        { value: 'basic', label: 'Basic Auth' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAuthMethod(option.value as AuthMethod)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            authMethod === option.value
                              ? 'bg-amber-50 border-amber-500 text-amber-700'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bearer Token 설정 */}
                  {authMethod === 'bearer' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 mb-3">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={bearerAcceptAny}
                            onChange={(e) => setBearerAcceptAny(e.target.checked)}
                            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">모든 토큰 허용 (테스트용)</span>
                        </label>
                      </div>

                      {!bearerAcceptAny && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              유효 토큰 목록
                            </label>
                            <button
                              type="button"
                              onClick={() => setBearerTokens([...bearerTokens, ''])}
                              className="text-sm text-amber-600 hover:text-amber-700"
                            >
                              + 토큰 추가
                            </button>
                          </div>
                          <div className="space-y-2">
                            {bearerTokens.map((token, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={token}
                                  onChange={(e) => {
                                    const newTokens = [...bearerTokens];
                                    newTokens[index] = e.target.value;
                                    setBearerTokens(newTokens);
                                  }}
                                  placeholder="my-secret-token"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                                />
                                {bearerTokens.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setBearerTokens(bearerTokens.filter((_, i) => i !== index))}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>예시 요청:</strong><br />
                          <code className="text-xs bg-amber-100 px-1 rounded">
                            Authorization: Bearer {bearerTokens[0] || 'your-token'}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* JWT 설정 */}
                  {authMethod === 'jwt' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={jwtCheckExpiry}
                            onChange={(e) => setJwtCheckExpiry(e.target.checked)}
                            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">만료 시간 검증 (exp claim)</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          필수 클레임 (쉼표로 구분)
                        </label>
                        <input
                          type="text"
                          value={jwtRequiredClaims}
                          onChange={(e) => setJwtRequiredClaims(e.target.value)}
                          placeholder="sub, email, name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">비워두면 검증하지 않습니다</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          유효 발급자 (쉼표로 구분)
                        </label>
                        <input
                          type="text"
                          value={jwtValidIssuers}
                          onChange={(e) => setJwtValidIssuers(e.target.value)}
                          placeholder="https://auth.example.com, https://api.example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                        />
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>참고:</strong> JWT 구조만 검증합니다 (서명은 검증하지 않음).
                          테스트/개발 환경용으로 적합합니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* API Key 설정 */}
                  {authMethod === 'apiKey' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          헤더 이름
                        </label>
                        <input
                          type="text"
                          value={apiKeyHeaderName}
                          onChange={(e) => setApiKeyHeaderName(e.target.value)}
                          placeholder="X-API-Key"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            유효 API Key 목록
                          </label>
                          <button
                            type="button"
                            onClick={() => setApiKeyValidKeys([...apiKeyValidKeys, ''])}
                            className="text-sm text-amber-600 hover:text-amber-700"
                          >
                            + Key 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {apiKeyValidKeys.map((key, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => {
                                  const newKeys = [...apiKeyValidKeys];
                                  newKeys[index] = e.target.value;
                                  setApiKeyValidKeys(newKeys);
                                }}
                                placeholder="your-api-key-here"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                              />
                              {apiKeyValidKeys.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setApiKeyValidKeys(apiKeyValidKeys.filter((_, i) => i !== index))}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>예시 요청:</strong><br />
                          <code className="text-xs bg-amber-100 px-1 rounded">
                            {apiKeyHeaderName || 'X-API-Key'}: {apiKeyValidKeys[0] || 'your-api-key'}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Basic Auth 설정 */}
                  {authMethod === 'basic' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            유효 자격 증명
                          </label>
                          <button
                            type="button"
                            onClick={() => setBasicAuthCredentials([...basicAuthCredentials, { username: '', password: '' }])}
                            className="text-sm text-amber-600 hover:text-amber-700"
                          >
                            + 자격 증명 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {basicAuthCredentials.map((cred, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={cred.username}
                                onChange={(e) => {
                                  const newCreds = [...basicAuthCredentials];
                                  newCreds[index].username = e.target.value;
                                  setBasicAuthCredentials(newCreds);
                                }}
                                placeholder="username"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                              <span className="text-gray-400">:</span>
                              <input
                                type="password"
                                value={cred.password}
                                onChange={(e) => {
                                  const newCreds = [...basicAuthCredentials];
                                  newCreds[index].password = e.target.value;
                                  setBasicAuthCredentials(newCreds);
                                }}
                                placeholder="password"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                              {basicAuthCredentials.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setBasicAuthCredentials(basicAuthCredentials.filter((_, i) => i !== index))}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>예시 요청:</strong><br />
                          <code className="text-xs bg-amber-100 px-1 rounded">
                            Authorization: Basic {basicAuthCredentials[0]?.username ? btoa(`${basicAuthCredentials[0].username}:${basicAuthCredentials[0].password}`) : 'base64(username:password)'}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>참고:</strong> 인증 실패 시 401 Unauthorized 응답이 반환됩니다.
                      인증이 활성화되면 다른 응답 설정보다 먼저 검증됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rate Limiting 설정 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Rate Limiting
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    요청 속도를 제한하여 API 과부하를 시뮬레이션합니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateLimitEnabled}
                    onChange={(e) => setRateLimitEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {rateLimitEnabled && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        요청 수 제한
                      </label>
                      <input
                        type="number"
                        value={rateLimitRequests}
                        onChange={(e) => setRateLimitRequests(Number(e.target.value))}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        시간 창당 최대 요청 수
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        시간 창 (초)
                      </label>
                      <input
                        type="number"
                        value={rateLimitWindow}
                        onChange={(e) => setRateLimitWindow(Number(e.target.value))}
                        min="1"
                        max="3600"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        기본값: 60초
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        버스트 허용
                      </label>
                      <input
                        type="number"
                        value={rateLimitBurst}
                        onChange={(e) => setRateLimitBurst(Number(e.target.value))}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        한도 초과 허용 수 (0=없음)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제한 기준
                      </label>
                      <select
                        value={rateLimitKeyBy}
                        onChange={(e) => setRateLimitKeyBy(e.target.value as RateLimitKeyBy)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="ip">IP 주소</option>
                        <option value="header">헤더 값</option>
                        <option value="query">쿼리 파라미터</option>
                      </select>
                    </div>

                    {rateLimitKeyBy !== 'ip' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {rateLimitKeyBy === 'header' ? '헤더 이름' : '파라미터 이름'}
                        </label>
                        <input
                          type="text"
                          value={rateLimitKeyName}
                          onChange={(e) => setRateLimitKeyName(e.target.value)}
                          placeholder={rateLimitKeyBy === 'header' ? 'X-User-ID' : 'user_id'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>설정 요약:</strong> {rateLimitKeyBy === 'ip' ? 'IP 주소' : rateLimitKeyBy === 'header' ? `헤더 "${rateLimitKeyName}"` : `쿼리 "${rateLimitKeyName}"`} 기준으로{' '}
                      {rateLimitWindow}초당 최대 {rateLimitRequests}회 요청 허용
                      {rateLimitBurst > 0 && ` (+${rateLimitBurst}회 버스트)`}.
                      초과 시 <code className="bg-red-100 px-1 rounded">429 Too Many Requests</code> 응답.
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>응답 헤더:</strong> <code className="bg-blue-100 px-1 rounded">X-RateLimit-Limit</code>,{' '}
                      <code className="bg-blue-100 px-1 rounded">X-RateLimit-Remaining</code>,{' '}
                      <code className="bg-blue-100 px-1 rounded">X-RateLimit-Reset</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 환경별 오버라이드 설정 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    환경별 응답
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    dev/staging/prod 환경에 따라 다른 응답을 반환합니다.
                  </p>
                </div>
                {!envSettingsEnabled && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    비활성화됨
                  </span>
                )}
              </div>

              {!envSettingsEnabled ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    환경 기능이 비활성화되어 있습니다.{' '}
                    <span className="text-blue-600">
                      환경 설정에서 활성화하세요.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {environments.map((env) => {
                    const override = environmentOverrides[env.name] || {};
                    const isEnabled = override.enabled !== false;

                    return (
                      <div
                        key={env.name}
                        className={`border rounded-lg p-4 ${
                          isEnabled ? 'border-gray-300' : 'border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: env.color || '#666' }}
                            />
                            <span className="font-medium text-gray-900">
                              {env.displayName}
                            </span>
                            {env.isDefault && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                기본
                              </span>
                            )}
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                setEnvironmentOverrides({
                                  ...environmentOverrides,
                                  [env.name]: {
                                    ...override,
                                    enabled: e.target.checked,
                                  },
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                        </div>

                        {isEnabled && (
                          <div className="space-y-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  상태 코드 (선택)
                                </label>
                                <input
                                  type="number"
                                  value={override.responseStatus || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    setEnvironmentOverrides({
                                      ...environmentOverrides,
                                      [env.name]: {
                                        ...override,
                                        responseStatus: val,
                                      },
                                    });
                                  }}
                                  placeholder="기본값 사용"
                                  min="100"
                                  max="599"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  지연 (ms, 선택)
                                </label>
                                <input
                                  type="number"
                                  value={typeof override.delay === 'number' ? override.delay : ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    setEnvironmentOverrides({
                                      ...environmentOverrides,
                                      [env.name]: {
                                        ...override,
                                        delay: val,
                                      },
                                    });
                                  }}
                                  placeholder="기본값 사용"
                                  min="0"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                응답 데이터 (JSON, 선택)
                              </label>
                              <textarea
                                value={
                                  override.responseData !== undefined
                                    ? typeof override.responseData === 'string'
                                      ? override.responseData
                                      : JSON.stringify(override.responseData, null, 2)
                                    : ''
                                }
                                onChange={(e) => {
                                  let val: any = e.target.value || undefined;
                                  if (e.target.value) {
                                    try {
                                      val = JSON.parse(e.target.value);
                                    } catch {
                                      val = e.target.value;
                                    }
                                  }
                                  setEnvironmentOverrides({
                                    ...environmentOverrides,
                                    [env.name]: {
                                      ...override,
                                      responseData: val,
                                    },
                                  });
                                }}
                                placeholder="비워두면 기본 응답 사용"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>사용법:</strong> 요청 시{' '}
                      <code className="bg-blue-100 px-1 rounded">X-Mock-Environment: {'{env}'}</code>{' '}
                      헤더 또는 <code className="bg-blue-100 px-1 rounded">?mock_env={'{env}'}</code>{' '}
                      쿼리 파라미터로 환경을 지정합니다.
                    </p>
                  </div>
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

            {/* 프록시 설정 (View Mode) */}
            {endpoint.proxyConfig?.enabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  프록시 모드
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                    활성화
                  </span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-gray-500">대상 URL</label>
                    <span className="text-gray-900 font-mono break-all">
                      {endpoint.proxyConfig.targetUrl}
                    </span>
                  </div>
                  <div>
                    <label className="block text-gray-500">타임아웃</label>
                    <span className="text-gray-900">{endpoint.proxyConfig.timeout || 30000}ms</span>
                  </div>
                  <div>
                    <label className="block text-gray-500">응답 캐싱</label>
                    <span className="text-gray-900">
                      {endpoint.proxyConfig.cacheResponse
                        ? `활성화 (TTL: ${endpoint.proxyConfig.cacheTtl || 300}초)`
                        : '비활성화'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    이 엔드포인트로 들어오는 요청은 <code className="bg-blue-100 px-1 rounded">{endpoint.proxyConfig.targetUrl}{endpoint.path}</code>로 전달됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 시나리오 설정 (View Mode) */}
            {endpoint.scenarioConfig?.enabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    시나리오 모드
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                      {endpoint.scenarioConfig.mode === 'sequential' ? '순차' :
                       endpoint.scenarioConfig.mode === 'random' ? '랜덤' : '가중치'}
                    </span>
                  </h3>
                  <button
                    onClick={resetScenarioCounter}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    카운터 리셋
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <label className="block text-gray-500">응답 수</label>
                    <span className="text-gray-900">{endpoint.scenarioConfig.responses?.length || 0}개</span>
                  </div>
                  {endpoint.scenarioConfig.mode === 'sequential' && (
                    <div>
                      <label className="block text-gray-500">반복</label>
                      <span className="text-gray-900">{endpoint.scenarioConfig.loop ? '활성화' : '비활성화'}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-gray-500">자동 리셋</label>
                    <span className="text-gray-900">
                      {endpoint.scenarioConfig.resetAfter
                        ? `${endpoint.scenarioConfig.resetAfter}초 후`
                        : '없음'}
                    </span>
                  </div>
                </div>

                {endpoint.scenarioConfig.responses && endpoint.scenarioConfig.responses.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-500">시나리오 응답 목록</label>
                    {endpoint.scenarioConfig.responses.map((sr, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"
                      >
                        <span className="font-mono text-sm bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                          #{endpoint.scenarioConfig?.mode === 'sequential' ? sr.order || index + 1 : index + 1}
                        </span>
                        <span className="flex-1 text-gray-900">{sr.name || `응답 ${index + 1}`}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          sr.responseStatus >= 200 && sr.responseStatus < 300
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {sr.responseStatus}
                        </span>
                        {endpoint.scenarioConfig?.mode === 'weighted' && (
                          <span className="text-xs text-gray-500">가중치: {sr.weight || 1}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 인증 설정 (View Mode) */}
            {endpoint.authConfig?.enabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  인증 시뮬레이션
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                    {endpoint.authConfig.method === 'bearer' ? 'Bearer Token' :
                     endpoint.authConfig.method === 'jwt' ? 'JWT' :
                     endpoint.authConfig.method === 'apiKey' ? 'API Key' : 'Basic Auth'}
                  </span>
                </h3>

                <div className="text-sm space-y-3">
                  {endpoint.authConfig.method === 'bearer' && endpoint.authConfig.bearerConfig && (
                    <div>
                      {endpoint.authConfig.bearerConfig.acceptAny ? (
                        <p className="text-gray-600">모든 Bearer 토큰 허용</p>
                      ) : (
                        <div>
                          <label className="block text-gray-500 mb-1">유효 토큰</label>
                          <div className="flex flex-wrap gap-2">
                            {endpoint.authConfig.bearerConfig.validTokens?.map((token, i) => (
                              <code key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                                {token.substring(0, 20)}...
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {endpoint.authConfig.method === 'jwt' && endpoint.authConfig.jwtConfig && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-500">만료 검증</label>
                        <span className="text-gray-900">
                          {endpoint.authConfig.jwtConfig.checkExpiry ? '활성화' : '비활성화'}
                        </span>
                      </div>
                      {endpoint.authConfig.jwtConfig.requiredClaims?.length > 0 && (
                        <div>
                          <label className="block text-gray-500">필수 클레임</label>
                          <span className="text-gray-900">
                            {endpoint.authConfig.jwtConfig.requiredClaims.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {endpoint.authConfig.method === 'apiKey' && endpoint.authConfig.apiKeyConfig && (
                    <div>
                      <div className="mb-2">
                        <label className="block text-gray-500">헤더 이름</label>
                        <code className="text-gray-900 font-mono">
                          {endpoint.authConfig.apiKeyConfig.headerName || 'X-API-Key'}
                        </code>
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">유효 API Key ({endpoint.authConfig.apiKeyConfig.validKeys?.length || 0}개)</label>
                        <div className="flex flex-wrap gap-2">
                          {endpoint.authConfig.apiKeyConfig.validKeys?.slice(0, 3).map((key, i) => (
                            <code key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                              {key.substring(0, 15)}...
                            </code>
                          ))}
                          {(endpoint.authConfig.apiKeyConfig.validKeys?.length || 0) > 3 && (
                            <span className="text-gray-500 text-xs">
                              +{endpoint.authConfig.apiKeyConfig.validKeys!.length - 3}개 더
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {endpoint.authConfig.method === 'basic' && endpoint.authConfig.basicAuthConfig && (
                    <div>
                      <label className="block text-gray-500 mb-1">
                        등록된 자격 증명 ({endpoint.authConfig.basicAuthConfig.credentials?.length || 0}개)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {endpoint.authConfig.basicAuthConfig.credentials?.map((cred, i) => (
                          <code key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                            {cred.username}:****
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    유효하지 않은 인증 정보로 요청 시 <code className="bg-amber-100 px-1 rounded">401 Unauthorized</code> 응답이 반환됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* Rate Limiting (View Mode) */}
            {endpoint.rateLimitConfig?.enabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Rate Limiting
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                    활성화
                  </span>
                </h3>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-gray-500">요청 제한</label>
                    <span className="text-gray-900 font-semibold">
                      {endpoint.rateLimitConfig.requestsPerWindow}회 / {endpoint.rateLimitConfig.windowSeconds || 60}초
                    </span>
                  </div>
                  <div>
                    <label className="block text-gray-500">버스트 허용</label>
                    <span className="text-gray-900">
                      {endpoint.rateLimitConfig.burstLimit || 0}회
                    </span>
                  </div>
                  <div>
                    <label className="block text-gray-500">제한 기준</label>
                    <span className="text-gray-900">
                      {endpoint.rateLimitConfig.keyBy === 'ip'
                        ? 'IP 주소'
                        : endpoint.rateLimitConfig.keyBy === 'header'
                        ? `헤더: ${endpoint.rateLimitConfig.keyName}`
                        : `쿼리: ${endpoint.rateLimitConfig.keyName}`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    제한 초과 시 <code className="bg-red-100 px-1 rounded">429 Too Many Requests</code> 응답이 반환됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 환경별 응답 (View Mode) */}
            {endpoint.environmentOverrides && Object.keys(endpoint.environmentOverrides).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  환경별 응답
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                    {Object.keys(endpoint.environmentOverrides).filter(k => endpoint.environmentOverrides?.[k]?.enabled !== false).length}개 환경
                  </span>
                </h3>

                <div className="space-y-3">
                  {Object.entries(endpoint.environmentOverrides)
                    .filter(([_, override]) => override?.enabled !== false)
                    .map(([envName, override]) => {
                      const env = environments.find(e => e.name === envName);
                      return (
                        <div
                          key={envName}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: env?.color || '#666' }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {env?.displayName || envName}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                              {override.responseStatus && (
                                <div>상태: <span className="font-mono">{override.responseStatus}</span></div>
                              )}
                              {override.delay !== undefined && (
                                <div>지연: <span className="font-mono">{typeof override.delay === 'number' ? `${override.delay}ms` : `${override.delay.min}~${override.delay.max}ms`}</span></div>
                              )}
                              {override.responseData !== undefined && (
                                <div>응답: <span className="font-mono text-xs">{typeof override.responseData === 'string' ? override.responseData.substring(0, 50) : JSON.stringify(override.responseData).substring(0, 50)}...</span></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <code className="bg-purple-100 px-1 rounded">X-Mock-Environment</code> 헤더 또는{' '}
                    <code className="bg-purple-100 px-1 rounded">mock_env</code> 쿼리로 환경을 지정하세요.
                  </p>
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

            {/* 히스토리 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  변경 히스토리
                </h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showHistory ? '접기' : `${history.length}개 보기`}
                </button>
              </div>

              {showHistory && (
                <div className="space-y-3 max-h-96 overflow-auto">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">변경 이력이 없습니다</p>
                  ) : (
                    history.map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                entry.action === 'create'
                                  ? 'bg-green-100 text-green-700'
                                  : entry.action === 'delete'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {entry.action === 'create' ? '생성' : entry.action === 'delete' ? '삭제' : '수정'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.changes.length > 0 && (
                              <div className="text-sm text-gray-600">
                                {entry.changes.map((change, i) => (
                                  <span key={i} className="mr-2">
                                    <span className="font-mono bg-gray-100 px-1 rounded">
                                      {change.field}
                                    </span>
                                    {change.field !== 'restored' && ' 변경'}
                                    {i < entry.changes.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {entry.action !== 'create' && (
                            <button
                              onClick={() => handleRestore(entry.id)}
                              disabled={restoring}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                              title="이 버전으로 복원"
                            >
                              <RotateCcw className="w-4 h-4" />
                              복원
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
