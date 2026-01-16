export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 조건 연산자 타입
export type ConditionOperator = 'eq' | 'neq' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';

// 단일 조건
export interface Condition {
  field: string;
  source: 'query' | 'header' | 'body';
  operator: ConditionOperator;
  value?: string;
}

// 조건부 응답
export interface ConditionalResponse {
  name?: string;
  conditions: Condition[];
  responseStatus: number;
  responseData: any;
  delay?: number;
}

export interface Endpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  enabled: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// 확장된 엔드포인트 (응답 데이터 포함)
export interface EndpointWithResponse extends Endpoint {
  responseStatus?: number;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  delay?: number;
  conditionalResponses?: ConditionalResponse[];
}

export interface RuleCondition {
  type: 'query' | 'header' | 'body';
  key: string;
  operator: 'equals' | 'exists' | 'contains' | 'regex';
  value?: string;
}

export interface Rule {
  id: string;
  endpointId: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  delayMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestLog {
  id: string;
  timestamp: string;
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  matchedRuleId?: string;
  responseStatus: number;
  responseTimeMs: number;
}

export interface MockApiData {
  endpoints: Endpoint[];
  rules: Rule[];
  logs: RequestLog[];
}
