import { AppProject, SCHEMA_VERSION_V9 } from '../schema/project';
import { AppProjectSchema } from '../schema/validation';
import {
  createInitialProject,
  loadProjectFromStorage,
  saveProjectToStorage,
  getStorageKey,
} from '../persistence/project-storage';
import {
  ProjectLifecycleState,
  RecentProjectMetadata,
  CrashCheckpoint,
  NewProjectOptions,
  ProjectValidationSummary,
} from './project-lifecycle-types';

const RECENT_PROJECTS_STORAGE_KEY = 'apex_recent_projects_v1';
const CRASH_CHECKPOINT_STORAGE_KEY = 'apex_crash_checkpoint_v1';
const MAX_RECENT_PROJECTS = 10;

export class ProjectLifecycleManager {
  private static instance: ProjectLifecycleManager;
  private currentState: ProjectLifecycleState = 'OPEN';
  private lastError: string | null = null;

  public static getInstance(): ProjectLifecycleManager {
    if (!ProjectLifecycleManager.instance) {
      ProjectLifecycleManager.instance = new ProjectLifecycleManager();
    }
    return ProjectLifecycleManager.instance;
  }

  public getState(): ProjectLifecycleState {
    return this.currentState;
  }

  public setState(state: ProjectLifecycleState): void {
    this.currentState = state;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  // --- RECENT PROJECTS MANAGEMENT (Safe metadata only, no secrets) ---

  public getRecentProjects(): RecentProjectMetadata[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY);
      if (!data) return [];
      const list: RecentProjectMetadata[] = JSON.parse(data);
      // Check existence for each project
      return list.map((item) => {
        const stored = localStorage.getItem(getStorageKey(item.id));
        return {
          ...item,
          exists: Boolean(stored),
        };
      });
    } catch {
      return [];
    }
  }

  public recordRecentProject(project: AppProject): void {
    if (typeof window === 'undefined') return;
    try {
      const recents = this.getRecentProjects().filter((p) => p.id !== project.id);
      const safeEntry: RecentProjectMetadata = {
        id: project.id,
        name: project.name || 'Untitled Project',
        description: (project as any).description || '',
        lastOpened: new Date().toISOString(),
        schemaVersion: project.version || SCHEMA_VERSION_V9,
        pageCount: Array.isArray(project.pages) ? project.pages.length : 1,
        exists: true,
      };
      const updated = [safeEntry, ...recents].slice(0, MAX_RECENT_PROJECTS);
      localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to record recent project:', err);
    }
  }

  public removeRecentProject(projectId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const recents = this.getRecentProjects().filter((p) => p.id !== projectId);
      localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(recents));
    } catch (err) {
      console.warn('Failed to remove recent project:', err);
    }
  }

  public clearRecentProjects(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECENT_PROJECTS_STORAGE_KEY);
  }

  // --- CRASH CHECKPOINT & RECOVERY ---

  public saveCrashCheckpoint(checkpoint: CrashCheckpoint): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CRASH_CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
    } catch (err) {
      console.warn('Failed to save crash checkpoint:', err);
    }
  }

  public getCrashCheckpoint(): CrashCheckpoint | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(CRASH_CHECKPOINT_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public clearCrashCheckpoint(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CRASH_CHECKPOINT_STORAGE_KEY);
  }

  public recoverInterruptedOperation(): { recovered: boolean; project?: AppProject; message?: string } {
    const checkpoint = this.getCrashCheckpoint();
    if (!checkpoint) {
      return { recovered: false, message: 'No interrupted operation detected.' };
    }

    if (checkpoint.status === 'in_progress') {
      // Operation was interrupted mid-flight
      if (checkpoint.operation === 'save' || checkpoint.operation === 'save_as') {
        if (checkpoint.serializedProject) {
          try {
            const project = JSON.parse(checkpoint.serializedProject);
            const val = this.validateProject(project);
            if (val.valid) {
              saveProjectToStorage(project);
              this.recordRecentProject(project);
              this.clearCrashCheckpoint();
              return {
                recovered: true,
                project,
                message: `Successfully recovered unsaved checkpoint from ${checkpoint.checkpointTime}`,
              };
            }
          } catch {
            // Fall through to loading last stable saved project
          }
        }
      }

      // Check if the previous project is available
      if (checkpoint.projectId) {
        const existing = loadProjectFromStorage(checkpoint.projectId);
        if (existing) {
          this.clearCrashCheckpoint();
          return {
            recovered: true,
            project: existing,
            message: `Restored last stable state for project ${checkpoint.projectId}`,
          };
        }
      }
    }

    this.clearCrashCheckpoint();
    return { recovered: false, message: 'Crash checkpoint cleared without recovery.' };
  }

  // --- LIFECYCLE OPERATIONS ---

  public createNewProject(opts: NewProjectOptions): { success: boolean; project?: AppProject; error?: string } {
    this.setState('CREATING');
    try {
      const cleanName = (opts.name || '').trim();
      if (!cleanName) {
        this.setState('ERROR');
        this.lastError = 'Project name cannot be empty.';
        return { success: false, error: this.lastError };
      }

      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newProj = createInitialProject(projectId, SCHEMA_VERSION_V9);
      newProj.name = cleanName;
      if (opts.description) {
        (newProj as any).description = opts.description;
      }
      if (opts.language && newProj.localization) {
        newProj.localization.defaultLocale = opts.language;
      }

      // Validate schema
      const val = this.validateProject(newProj);
      if (!val.valid) {
        this.setState('ERROR');
        this.lastError = `Project validation failed: ${val.errors.join(', ')}`;
        return { success: false, error: this.lastError || undefined };
      }

      // Record crash checkpoint before saving
      this.saveCrashCheckpoint({
        operation: 'new',
        status: 'in_progress',
        projectId,
        checkpointTime: new Date().toISOString(),
        isDirty: false,
      });

      // Save initial project to storage
      const saved = saveProjectToStorage(newProj);
      if (!saved) {
        this.setState('ERROR');
        this.lastError = 'Failed to persist new project to storage.';
        return { success: false, error: this.lastError || undefined };
      }

      this.recordRecentProject(newProj);
      this.clearCrashCheckpoint();
      this.setState('OPEN');
      this.lastError = null;
      return { success: true, project: newProj };
    } catch (err: any) {
      this.setState('ERROR');
      this.lastError = err.message || 'Unknown error creating project';
      return { success: false, error: this.lastError || undefined };
    }
  }

  public openProject(projectId: string): { success: boolean; project?: AppProject; error?: string } {
    this.setState('OPENING');
    try {
      if (!projectId || typeof projectId !== 'string') {
        this.setState('ERROR');
        this.lastError = 'Invalid project ID provided.';
        return { success: false, error: this.lastError || undefined };
      }

      const project = loadProjectFromStorage(projectId);
      if (!project) {
        this.setState('ERROR');
        this.lastError = `Project '${projectId}' could not be found in storage.`;
        return { success: false, error: this.lastError || undefined };
      }

      // Validate project schema
      const val = this.validateProject(project);
      if (!val.valid) {
        this.setState('ERROR');
        this.lastError = `Corrupt project data: ${val.errors.join('; ')}`;
        return { success: false, error: this.lastError || undefined };
      }

      this.recordRecentProject(project);
      this.setState('OPEN');
      this.lastError = null;
      return { success: true, project };
    } catch (err: any) {
      this.setState('ERROR');
      this.lastError = err.message || 'Failed to open project.';
      return { success: false, error: this.lastError || undefined };
    }
  }

  public saveProject(project: AppProject): { success: boolean; project?: AppProject; error?: string } {
    this.setState('SAVING');
    try {
      const val = this.validateProject(project);
      if (!val.valid) {
        this.setState('ERROR');
        this.lastError = `Cannot save invalid project: ${val.errors.join(', ')}`;
        return { success: false, error: this.lastError || undefined };
      }

      // Record crash checkpoint
      this.saveCrashCheckpoint({
        operation: 'save',
        status: 'in_progress',
        projectId: project.id,
        checkpointTime: new Date().toISOString(),
        isDirty: false,
        serializedProject: JSON.stringify(project),
      });

      // Update version metadata
      const updatedProject: AppProject = {
        ...project,
        projectVersion: (project.projectVersion || 1) + 1,
      };

      const success = saveProjectToStorage(updatedProject);
      if (!success) {
        this.setState('ERROR');
        this.lastError = 'LocalStorage write failed during save.';
        return { success: false, error: this.lastError || undefined };
      }

      this.recordRecentProject(updatedProject);
      this.clearCrashCheckpoint();
      this.setState('SAVED');
      this.lastError = null;
      return { success: true, project: updatedProject };
    } catch (err: any) {
      this.setState('ERROR');
      this.lastError = err.message || 'Exception occurred during save.';
      return { success: false, error: this.lastError || undefined };
    }
  }

  public saveAsProject(
    sourceProject: AppProject,
    newName: string,
    targetId?: string
  ): { success: boolean; newProject?: AppProject; error?: string } {
    this.setState('SAVING');
    try {
      const cleanName = (newName || '').trim();
      if (!cleanName) {
        this.setState('ERROR');
        this.lastError = 'New project name is required for Save As.';
        return { success: false, error: this.lastError || undefined };
      }

      const newProjectId = targetId || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (newProjectId === sourceProject.id) {
        this.setState('ERROR');
        this.lastError = 'Save As cannot use the same project ID as the source project.';
        return { success: false, error: this.lastError || undefined };
      }

      // Checkpoint before cloning
      this.saveCrashCheckpoint({
        operation: 'save_as',
        status: 'in_progress',
        projectId: newProjectId,
        previousProjectId: sourceProject.id,
        checkpointTime: new Date().toISOString(),
        isDirty: false,
      });

      // Deep clone with full isolation
      const cloned: AppProject = JSON.parse(JSON.stringify(sourceProject));
      cloned.id = newProjectId;
      cloned.name = cleanName;
      cloned.projectVersion = 1;
      if (cloned.branches && cloned.branches[0]) {
        cloned.branches[0].id = `branch_main_${newProjectId}`;
        cloned.branches[0].projectId = newProjectId;
      }
      if (cloned.cdnConfig) {
        cloned.cdnConfig.distributionId = `dist_${newProjectId}`;
        cloned.cdnConfig.domain = `${newProjectId}.cdn.apexstudio.io`;
      }

      const val = this.validateProject(cloned);
      if (!val.valid) {
        this.setState('ERROR');
        this.lastError = `Cloned project validation failed: ${val.errors.join(', ')}`;
        return { success: false, error: this.lastError || undefined };
      }

      const success = saveProjectToStorage(cloned);
      if (!success) {
        this.setState('ERROR');
        this.lastError = 'Failed to persist cloned project to storage.';
        return { success: false, error: this.lastError || undefined };
      }

      this.recordRecentProject(cloned);
      this.clearCrashCheckpoint();
      this.setState('SAVED');
      this.lastError = null;
      return { success: true, newProject: cloned };
    } catch (err: any) {
      this.setState('ERROR');
      this.lastError = err.message || 'Exception in Save As operation.';
      return { success: false, error: this.lastError || undefined };
    }
  }

  public closeProject(): void {
    this.setState('CLOSING');
    this.clearCrashCheckpoint();
    this.setState('NO_PROJECT');
  }

  public validateProject(project: any): ProjectValidationSummary {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!project || typeof project !== 'object') {
      return {
        valid: false,
        errors: ['Project payload is not a valid object.'],
        warnings: [],
        pageCount: 0,
        componentCount: 0,
        collectionCount: 0,
        schemaVersion: 0,
      };
    }

    // Check schema parsing
    const parsed = AppProjectSchema.safeParse(project);
    if (!parsed.success) {
      for (const err of parsed.error.issues) {
        errors.push(`${err.path.join('.')}: ${err.message}`);
      }
    }

    // Invariant checks
    if (!project.id || typeof project.id !== 'string') {
      errors.push('Missing or invalid project id.');
    }
    if (!project.name || typeof project.name !== 'string') {
      errors.push('Missing or invalid project name.');
    }
    if (!Array.isArray(project.pages) || project.pages.length === 0) {
      errors.push('Project must have at least one page.');
    }

    const pageCount = Array.isArray(project.pages) ? project.pages.length : 0;
    const componentCount = Array.isArray(project.components) ? project.components.length : 0;
    const collectionCount = Array.isArray(project.collections) ? project.collections.length : 0;
    const schemaVersion = project.version || 0;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      pageCount,
      componentCount,
      collectionCount,
      schemaVersion,
    };
  }

  public exportProject(project: AppProject): string {
    const val = this.validateProject(project);
    if (!val.valid) {
      throw new Error(`Cannot export invalid project: ${val.errors.join(', ')}`);
    }
    return JSON.stringify(project, null, 2);
  }

  public importProject(jsonString: string): { success: boolean; project?: AppProject; error?: string } {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'Empty import payload.' };
      }

      // Security check: reject executable or dangerous payload patterns
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /__proto__/g,
        /constructor/g,
      ];
      for (const p of dangerousPatterns) {
        if (p.test(jsonString)) {
          return { success: false, error: 'Security violation: Untrusted/malicious content in imported JSON.' };
        }
      }

      const raw = JSON.parse(jsonString);
      const val = this.validateProject(raw);
      if (!val.valid) {
        return { success: false, error: `Import schema validation failed: ${val.errors.slice(0, 3).join('; ')}` };
      }

      const project = raw as AppProject;
      // Assign fresh ID if conflict or request isolation
      project.id = project.id || `proj_imported_${Date.now()}`;

      saveProjectToStorage(project);
      this.recordRecentProject(project);
      return { success: true, project };
    } catch (err: any) {
      return { success: false, error: `Import failed: ${err.message}` };
    }
  }
}

export const defaultProjectLifecycleManager = ProjectLifecycleManager.getInstance();
