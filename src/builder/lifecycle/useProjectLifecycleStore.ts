import { create } from 'zustand';
import {
  ProjectLifecycleState,
  RecentProjectMetadata,
} from './project-lifecycle-types';
import { defaultProjectLifecycleManager } from './ProjectLifecycleManager';

export type ShellModalType =
  | 'none'
  | 'new_project'
  | 'open_project'
  | 'save_as'
  | 'unsaved_changes'
  | 'project_settings'
  | 'project_info'
  | 'about'
  | 'shortcuts'
  | 'export'
  | 'import'
  | 'build_diagnostics';

export interface ProjectLifecycleStoreState {
  lifecycleState: ProjectLifecycleState;
  recentProjects: RecentProjectMetadata[];
  activeModal: ShellModalType;
  pendingAction: 'new' | 'open' | 'close' | 'exit' | null;
  pendingTargetProjectId: string | null;
  lastError: string | null;
  language: 'en' | 'he';

  setLifecycleState: (state: ProjectLifecycleState) => void;
  openModal: (
    modal: ShellModalType,
    pendingAction?: 'new' | 'open' | 'close' | 'exit' | null,
    pendingTargetProjectId?: string | null
  ) => void;
  closeModal: () => void;
  refreshRecentProjects: () => void;
  clearRecentProjects: () => void;
  removeRecentProject: (projectId: string) => void;
  setLastError: (err: string | null) => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'en' | 'he') => void;
}

export const useProjectLifecycleStore = create<ProjectLifecycleStoreState>((set, get) => ({
  lifecycleState: 'OPEN',
  recentProjects: defaultProjectLifecycleManager.getRecentProjects(),
  activeModal: 'none',
  pendingAction: null,
  pendingTargetProjectId: null,
  lastError: null,
  language: 'en',

  setLifecycleState: (state) => {
    defaultProjectLifecycleManager.setState(state);
    set({ lifecycleState: state });
  },

  openModal: (modal, pendingAction = null, pendingTargetProjectId = null) => {
    set({
      activeModal: modal,
      pendingAction,
      pendingTargetProjectId,
    });
  },

  closeModal: () => {
    set({
      activeModal: 'none',
      pendingAction: null,
      pendingTargetProjectId: null,
    });
  },

  refreshRecentProjects: () => {
    set({ recentProjects: defaultProjectLifecycleManager.getRecentProjects() });
  },

  clearRecentProjects: () => {
    defaultProjectLifecycleManager.clearRecentProjects();
    set({ recentProjects: [] });
  },

  removeRecentProject: (projectId: string) => {
    defaultProjectLifecycleManager.removeRecentProject(projectId);
    set({ recentProjects: defaultProjectLifecycleManager.getRecentProjects() });
  },

  setLastError: (err) => set({ lastError: err }),

  toggleLanguage: () => {
    const nextLang = get().language === 'en' ? 'he' : 'en';
    set({ language: nextLang });
  },

  setLanguage: (lang) => set({ language: lang }),
}));
