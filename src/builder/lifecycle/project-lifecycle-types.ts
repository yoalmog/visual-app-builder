export type ProjectLifecycleState =
  | 'NO_PROJECT'
  | 'CREATING'
  | 'OPENING'
  | 'OPEN'
  | 'DIRTY'
  | 'SAVING'
  | 'SAVED'
  | 'CLOSING'
  | 'ERROR';

export interface RecentProjectMetadata {
  id: string;
  name: string;
  description?: string;
  lastOpened: string;
  schemaVersion: number;
  pageCount: number;
  exists: boolean;
}

export interface CrashCheckpoint {
  operation: 'new' | 'open' | 'save' | 'save_as' | 'import' | 'export' | 'close';
  status: 'in_progress' | 'completed' | 'failed';
  projectId: string;
  previousProjectId?: string;
  checkpointTime: string;
  isDirty: boolean;
  serializedProject?: string;
}

export interface NewProjectOptions {
  name: string;
  description?: string;
  templateId?: string;
  type?: string;
  language?: string;
}

export interface ProjectValidationSummary {
  valid: boolean;
  errors: string[];
  warnings: string[];
  pageCount: number;
  componentCount: number;
  collectionCount: number;
  schemaVersion: number;
}
