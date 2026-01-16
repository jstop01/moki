import { Endpoint, Rule, RequestLog, MockApiData } from '@/app/types';

const STORAGE_KEY = 'mock-api-data';

const defaultData: MockApiData = {
  endpoints: [],
  rules: [],
  logs: [],
};

export const storage = {
  getData(): MockApiData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : defaultData;
    } catch {
      return defaultData;
    }
  },

  saveData(data: MockApiData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  // Endpoints
  getEndpoints(): Endpoint[] {
    return this.getData().endpoints;
  },

  getEndpoint(id: string): Endpoint | undefined {
    return this.getData().endpoints.find(e => e.id === id);
  },

  saveEndpoint(endpoint: Endpoint): void {
    const data = this.getData();
    const index = data.endpoints.findIndex(e => e.id === endpoint.id);
    if (index >= 0) {
      data.endpoints[index] = endpoint;
    } else {
      data.endpoints.push(endpoint);
    }
    this.saveData(data);
  },

  deleteEndpoint(id: string): void {
    const data = this.getData();
    data.endpoints = data.endpoints.filter(e => e.id !== id);
    data.rules = data.rules.filter(r => r.endpointId !== id);
    this.saveData(data);
  },

  // Rules
  getRules(endpointId?: string): Rule[] {
    const rules = this.getData().rules;
    return endpointId 
      ? rules.filter(r => r.endpointId === endpointId)
      : rules;
  },

  getRule(id: string): Rule | undefined {
    return this.getData().rules.find(r => r.id === id);
  },

  saveRule(rule: Rule): void {
    const data = this.getData();
    const index = data.rules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      data.rules[index] = rule;
    } else {
      data.rules.push(rule);
    }
    this.saveData(data);
  },

  deleteRule(id: string): void {
    const data = this.getData();
    data.rules = data.rules.filter(r => r.id !== id);
    this.saveData(data);
  },

  // Logs
  getLogs(): RequestLog[] {
    return this.getData().logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  addLog(log: RequestLog): void {
    const data = this.getData();
    data.logs.unshift(log);
    // Keep only last 500 logs
    if (data.logs.length > 500) {
      data.logs = data.logs.slice(0, 500);
    }
    this.saveData(data);
  },

  clearLogs(): void {
    const data = this.getData();
    data.logs = [];
    this.saveData(data);
  },

  // Import/Export
  exportData(): string {
    return JSON.stringify(this.getData(), null, 2);
  },

  importData(jsonString: string, merge: boolean = false): void {
    try {
      const imported: MockApiData = JSON.parse(jsonString);
      if (merge) {
        const current = this.getData();
        this.saveData({
          endpoints: [...current.endpoints, ...imported.endpoints],
          rules: [...current.rules, ...imported.rules],
          logs: [...current.logs, ...imported.logs],
        });
      } else {
        this.saveData(imported);
      }
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  },

  clearAll(): void {
    this.saveData(defaultData);
  },
};
