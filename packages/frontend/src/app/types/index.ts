export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 지연 설정 (고정 또는 랜덤 범위)
export type DelayConfig = number | { min: number; max: number };

// 프록시 설정
export interface ProxyConfig {
  enabled: boolean;
  targetUrl: string;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  cacheResponse?: boolean;
  cacheTtl?: number;
}

// 시나리오 모드 타입
export type ScenarioMode = 'sequential' | 'random' | 'weighted';

// 시나리오 응답
export interface ScenarioResponse {
  order?: number;
  weight?: number;
  name?: string;
  responseStatus: number;
  responseData: any;
  delay?: DelayConfig;
}

// 시나리오 설정
export interface ScenarioConfig {
  enabled: boolean;
  mode: ScenarioMode;
  resetAfter?: number;
  loop?: boolean;
  responses: ScenarioResponse[];
}

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
  delay?: DelayConfig;
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

// 인증 방식 타입
export type AuthMethod = 'none' | 'bearer' | 'jwt' | 'apiKey' | 'basic';

// Bearer 토큰 설정
export interface BearerTokenConfig {
  validTokens: string[];
  acceptAny?: boolean;
}

// JWT 설정
export interface JwtConfig {
  secrets?: string[];
  validateSignature?: boolean;
  checkExpiry?: boolean;
  requiredClaims?: string[];
  validIssuers?: string[];
  validAudiences?: string[];
}

// API Key 설정
export interface ApiKeyConfig {
  headerName?: string;
  queryParamName?: string;
  validKeys: string[];
}

// Basic Auth 설정
export interface BasicAuthConfig {
  credentials: Array<{
    username: string;
    password: string;
  }>;
}

// 인증 에러 응답 설정
export interface AuthErrorResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
}

// 인증 설정
export interface AuthConfig {
  enabled: boolean;
  method: AuthMethod;
  bearerConfig?: BearerTokenConfig;
  jwtConfig?: JwtConfig;
  apiKeyConfig?: ApiKeyConfig;
  basicAuthConfig?: BasicAuthConfig;
  errorResponse?: AuthErrorResponse;
  excludePaths?: string[];
}

// 글로벌 인증 설정
export interface GlobalAuthSettings {
  enabled: boolean;
  defaultMethod: AuthMethod;
  bearerConfig?: BearerTokenConfig;
  jwtConfig?: JwtConfig;
  apiKeyConfig?: ApiKeyConfig;
  basicAuthConfig?: BasicAuthConfig;
  defaultErrorResponse?: AuthErrorResponse;
  excludePaths?: string[];
}

// Rate Limit 키 소스 타입
export type RateLimitKeyBy = 'ip' | 'header' | 'query';

// Rate Limit 설정
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerWindow: number;
  windowSeconds?: number;
  burstLimit?: number;
  keyBy: RateLimitKeyBy;
  keyName?: string;
  response?: {
    status: number;
    data: any;
  };
}

// 확장된 엔드포인트 (응답 데이터 포함)
export interface EndpointWithResponse extends Endpoint {
  responseStatus?: number;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  delay?: DelayConfig;
  conditionalResponses?: ConditionalResponse[];
  proxyConfig?: ProxyConfig;
  scenarioConfig?: ScenarioConfig;
  authConfig?: AuthConfig;
  rateLimitConfig?: RateLimitConfig;
  environmentOverrides?: EndpointEnvironments;
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

// WebSocket Types
export type WebSocketStatus = 'active' | 'inactive';
export type MessageMatchType = 'exact' | 'contains' | 'regex' | 'json-path';

export interface WebSocketMessagePattern {
  name?: string;
  matchType: MessageMatchType;
  pattern: string;
  response: WebSocketResponse;
}

export interface WebSocketResponse {
  type: 'text' | 'json' | 'binary';
  data: any;
  delay?: number;
  broadcast?: boolean;
}

export interface ScheduledMessage {
  id: string;
  name: string;
  enabled: boolean;
  interval: number;
  message: WebSocketResponse;
}

export interface WebSocketEndpoint {
  id: string;
  path: string;
  description?: string;
  status: WebSocketStatus;
  messagePatterns: WebSocketMessagePattern[];
  scheduledMessages?: ScheduledMessage[];
  onConnectMessage?: WebSocketResponse;
  onDisconnectMessage?: WebSocketResponse;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketConnection {
  id: string;
  endpointId: string;
  clientIp?: string;
  userAgent?: string;
  connectedAt: string;
}

export interface WebSocketMessageLog {
  id: string;
  endpointId: string;
  connectionId: string;
  direction: 'incoming' | 'outgoing';
  messageType: 'text' | 'json' | 'binary';
  data: any;
  matchedPattern?: string;
  timestamp: string;
}

// Team Types
export interface TeamMember {
  tokenId: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  lastActive?: string;
}

export interface TeamSettings {
  enabled: boolean;
  requireAuth: boolean;
  broadcastChanges: boolean;
  trackUserInHistory: boolean;
}

export interface ActiveSession {
  sessionId: string;
  tokenId: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  connectedAt: string;
  lastActivity: string;
  currentView?: string;
}

// Environment Types
export type EnvironmentName = 'dev' | 'staging' | 'prod' | string;

export interface EnvironmentOverride {
  responseStatus?: number;
  responseData?: any;
  delay?: number | { min: number; max: number };
  enabled?: boolean;
}

export interface Environment {
  name: EnvironmentName;
  displayName: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EndpointEnvironments = Record<EnvironmentName, EnvironmentOverride>;

export interface EnvironmentSettings {
  enabled: boolean;
  defaultEnvironment: EnvironmentName;
  headerName: string;
  queryParamName?: string;
  environments: Environment[];
}

// GraphQL Types
export type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

export interface GraphQLMockError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, any>;
}

export interface GraphQLMockResolver {
  id: string;
  operationName: string;
  operationType: GraphQLOperationType;
  description?: string;
  enabled: boolean;
  responseData: any;
  errors?: GraphQLMockError[];
  delay?: number | { min: number; max: number };
  variablesMatch?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphQLEndpoint {
  id: string;
  path: string;
  description?: string;
  enabled: boolean;
  schema?: string;
  resolvers: GraphQLMockResolver[];
  defaultResponse?: {
    data?: any;
    errors?: GraphQLMockError[];
  };
  introspectionEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GraphQLRequestLog {
  id: string;
  endpointId: string;
  timestamp: string;
  query: string;
  operationName?: string;
  operationType?: GraphQLOperationType;
  variables?: Record<string, any>;
  matchedResolverId?: string;
  responseData?: any;
  responseErrors?: GraphQLMockError[];
  responseTime: number;
  clientIp?: string;
  userAgent?: string;
}
