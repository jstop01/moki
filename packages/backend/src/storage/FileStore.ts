import fs from 'fs';
import path from 'path';
import { Endpoint, RequestLog } from '@mock-api-builder/shared';

export class FileStore {
  private dataDir: string;
  private endpointsFile: string;
  private logsFile: string;

  constructor() {
    // 데이터 디렉토리 설정
    this.dataDir = path.join(__dirname, '../../data');
    this.endpointsFile = path.join(this.dataDir, 'endpoints.json');
    this.logsFile = path.join(this.dataDir, 'logs.json');

    // 디렉토리 생성
    this.ensureDataDir();
  }

  /**
   * 데이터 디렉토리가 없으면 생성
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Data directory created:', this.dataDir);
    }
  }

  /**
   * 안전한 파일 쓰기 (원자적)
   */
  private writeFileSafe(filePath: string, data: any): void {
    const tempFile = `${filePath}.tmp`;
    const backupFile = `${filePath}.backup`;

    try {
      // 임시 파일에 먼저 쓰기
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');

      // 기존 파일이 있으면 백업
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupFile);
      }

      // 임시 파일을 실제 파일로 이동 (원자적 작업)
      fs.renameSync(tempFile, filePath);

      console.log('💾 Data saved to:', filePath);
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      // 임시 파일 정리
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw error;
    }
  }

  /**
   * 엔드포인트 저장
   */
  saveEndpoints(endpoints: Endpoint[]): void {
    this.writeFileSafe(this.endpointsFile, {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      count: endpoints.length,
      endpoints: endpoints,
    });
  }

  /**
   * 엔드포인트 로드
   */
  loadEndpoints(): Endpoint[] {
    try {
      if (!fs.existsSync(this.endpointsFile)) {
        console.log('📂 No saved endpoints found');
        return [];
      }

      const data = fs.readFileSync(this.endpointsFile, 'utf-8');
      const parsed = JSON.parse(data);

      console.log(`📥 Loaded ${parsed.count} endpoints from file`);

      // Date 객체로 변환
      return parsed.endpoints.map((ep: any) => ({
        ...ep,
        createdAt: new Date(ep.createdAt),
        updatedAt: new Date(ep.updatedAt),
      }));
    } catch (error) {
      console.error('❌ Failed to load endpoints:', error);

      // 백업 파일에서 복구 시도
      const backupFile = `${this.endpointsFile}.backup`;
      if (fs.existsSync(backupFile)) {
        console.log('🔄 Attempting to restore from backup...');
        try {
          const data = fs.readFileSync(backupFile, 'utf-8');
          const parsed = JSON.parse(data);
          return parsed.endpoints.map((ep: any) => ({
            ...ep,
            createdAt: new Date(ep.createdAt),
            updatedAt: new Date(ep.updatedAt),
          }));
        } catch (backupError) {
          console.error('❌ Backup restore failed:', backupError);
        }
      }

      return [];
    }
  }

  /**
   * 로그 저장
   */
  saveLogs(logs: RequestLog[]): void {
    this.writeFileSafe(this.logsFile, {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      count: logs.length,
      logs: logs,
    });
  }

  /**
   * 로그 로드
   */
  loadLogs(): RequestLog[] {
    try {
      if (!fs.existsSync(this.logsFile)) {
        return [];
      }

      const data = fs.readFileSync(this.logsFile, 'utf-8');
      const parsed = JSON.parse(data);

      return parsed.logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    } catch (error) {
      console.error('❌ Failed to load logs:', error);
      return [];
    }
  }

  /**
   * 모든 데이터 삭제
   */
  clearAll(): void {
    try {
      if (fs.existsSync(this.endpointsFile)) {
        fs.unlinkSync(this.endpointsFile);
      }
      if (fs.existsSync(this.logsFile)) {
        fs.unlinkSync(this.logsFile);
      }
      console.log('🗑️  All data files cleared');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  }

  /**
   * 데이터 디렉토리 경로 가져오기
   */
  getDataDir(): string {
    return this.dataDir;
  }
}

// Singleton instance
export const fileStore = new FileStore();
