import { Endpoint } from './endpoint';

/**
 * Export data format
 */
export interface ExportData {
  /** Format version for compatibility */
  version: string;
  
  /** Export timestamp */
  exportedAt: Date;
  
  /** Exported endpoints */
  endpoints: Endpoint[];
  
  /** Metadata */
  metadata?: {
    projectName?: string;
    description?: string;
    author?: string;
  };
}

/**
 * Import result
 */
export interface ImportResult {
  /** Number of endpoints imported */
  imported: number;
  
  /** Number of endpoints skipped */
  skipped: number;
  
  /** Import errors */
  errors: string[];
  
  /** IDs of imported endpoints */
  importedIds: string[];
}

/**
 * Import options
 */
export interface ImportOptions {
  /** Replace existing endpoints with same path/method */
  replace?: boolean;
  
  /** Skip invalid endpoints */
  skipInvalid?: boolean;
  
  /** Preserve original IDs */
  preserveIds?: boolean;
}
