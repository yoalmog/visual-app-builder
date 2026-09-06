import { create } from 'zustand';
import {
  Organization,
  Workspace,
  Membership,
  CollaboratorPresence,
  CollaborationConnectionStatus,
  Branch,
  Commit,
  Comment,
  Notification,
  BuildJob,
  Review,
} from '../schema/platform';
import { defaultOrganizationProvider } from '../platform/organization/OrganizationProvider';
import { defaultCollaborationProvider } from '../platform/collaboration/CollaborationProvider';
import { defaultCommentsService } from '../platform/comments/CommentsService';
import { defaultNotificationService } from '../platform/notifications/NotificationService';
import { defaultVersionControlProvider } from '../platform/version-control/VersionControlProvider';
import { defaultDeploymentPipeline } from '../platform/deployments/DeploymentPipeline';

export interface PlatformState {
  // Organization & Workspace
  currentOrg: Organization | null;
  currentWorkspace: Workspace | null;
  members: Membership[];
  userRole: string;

  // Collaboration & Presence
  collabStatus: CollaborationConnectionStatus;
  collaborators: CollaboratorPresence[];
  activeEditingUser: string | null;

  // Version Control
  currentBranch: string;
  branches: Branch[];
  commits: Commit[];
  reviews: Review[];

  // Comments & Mentions
  comments: Comment[];
  activeCommentId: string | null;
  commentsFilter: 'all' | 'open' | 'resolved';

  // Notifications
  notifications: Notification[];
  unreadNotificationsCount: number;

  // Deployments & Builds
  buildJobs: BuildJob[];

  // UI Modals
  isOrgSettingsOpen: boolean;
  isVersionControlPanelOpen: boolean;
  isDeploymentsPanelOpen: boolean;
  isCommentsPanelOpen: boolean;
  isMarketplaceOpen: boolean;
  // Phase 9 UI Modals & State
  isScaleDashboardOpen: boolean;
  isEnterpriseSecurityOpen: boolean;
  isDeveloperPortalOpen: boolean;
  isExperimentationOpen: boolean;
  isAdvancedDeploymentsOpen: boolean;
  activeRegion: string;
  maintenanceMode: boolean;

  // Actions
  initializePlatform: (projectId: string, orgId?: string) => Promise<void>;
  switchBranch: (branchName: string) => Promise<void>;
  setCollabStatus: (status: CollaborationConnectionStatus) => void;
  setCollaborators: (collaborators: CollaboratorPresence[]) => void;
  fetchComments: (projectId: string) => Promise<void>;
  createComment: (projectId: string, body: string, pageId?: string, nodeId?: string) => Promise<Comment>;
  resolveComment: (commentId: string) => Promise<void>;
  fetchNotifications: (userId: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  setOrgSettingsOpen: (open: boolean) => void;
  setVersionControlPanelOpen: (open: boolean) => void;
  setDeploymentsPanelOpen: (open: boolean) => void;
  setCommentsPanelOpen: (open: boolean) => void;
  setMarketplaceOpen: (open: boolean) => void;
  setCommentsFilter: (filter: 'all' | 'open' | 'resolved') => void;
  setActiveCommentId: (commentId: string | null) => void;
  // Phase 9 Actions
  setScaleDashboardOpen: (open: boolean) => void;
  setEnterpriseSecurityOpen: (open: boolean) => void;
  setDeveloperPortalOpen: (open: boolean) => void;
  setExperimentationOpen: (open: boolean) => void;
  setAdvancedDeploymentsOpen: (open: boolean) => void;
  setActiveRegion: (region: string) => void;
  setMaintenanceMode: (enabled: boolean) => void;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  currentOrg: null,
  currentWorkspace: null,
  members: [],
  userRole: 'owner',

  collabStatus: 'connected',
  collaborators: [],
  activeEditingUser: null,

  currentBranch: 'main',
  branches: [],
  commits: [],
  reviews: [],

  comments: [],
  activeCommentId: null,
  commentsFilter: 'all',

  notifications: [],
  unreadNotificationsCount: 0,

  buildJobs: [],

  isOrgSettingsOpen: false,
  isVersionControlPanelOpen: false,
  isDeploymentsPanelOpen: false,
  isCommentsPanelOpen: false,
  isMarketplaceOpen: false,
  isScaleDashboardOpen: false,
  isEnterpriseSecurityOpen: false,
  isDeveloperPortalOpen: false,
  isExperimentationOpen: false,
  isAdvancedDeploymentsOpen: false,
  activeRegion: 'us-east-1',
  maintenanceMode: false,

  initializePlatform: async (projectId: string, orgId: string = 'org_default') => {
    try {
      const org = await defaultOrganizationProvider.getOrganization(orgId);
      const workspaces = await defaultOrganizationProvider.listWorkspaces(orgId);
      const members = await defaultOrganizationProvider.listMembers(orgId);

      // Version control
      let branches = await defaultVersionControlProvider.listBranches(projectId);
      if (branches.length === 0) {
        // Seed main branch
        const mainBranch = await defaultVersionControlProvider.createBranch({
          projectId,
          name: 'main',
          actorId: 'user_admin',
          currentProjectSnapshot: {
            id: projectId,
            name: 'Project',
            version: 8,
            pages: [],
            theme: { primaryColor: '#6366F1', backgroundColor: '#FFFFFF', textColor: '#000', borderRadius: '8px' },
            assets: [],
          },
        });
        branches = [mainBranch];
      }

      const commits = await defaultVersionControlProvider.listCommits(projectId);
      const reviews = await defaultVersionControlProvider.listReviews(projectId);
      const comments = await defaultCommentsService.listProjectComments(projectId);
      const buildJobs = defaultDeploymentPipeline.listBuildJobs(projectId);

      // Connect collaboration
      await defaultCollaborationProvider.connect(projectId, {
        id: 'user_admin',
        name: 'Apex Admin',
      });

      defaultCollaborationProvider.subscribe({
        onPresenceChange: (presences) => {
          set({ collaborators: presences });
        },
        onStatusChange: (status) => {
          set({ collabStatus: status });
        },
      });

      set({
        currentOrg: org,
        currentWorkspace: workspaces[0] || null,
        members,
        branches,
        commits,
        reviews,
        comments,
        buildJobs,
        currentBranch: 'main',
      });
    } catch (err) {
      console.error('Failed to initialize platform store:', err);
    }
  },

  switchBranch: async (branchName: string) => {
    set({ currentBranch: branchName });
  },

  setCollabStatus: (status) => set({ collabStatus: status }),
  setCollaborators: (collaborators) => set({ collaborators }),

  fetchComments: async (projectId: string) => {
    const comments = await defaultCommentsService.listProjectComments(projectId);
    set({ comments });
  },

  createComment: async (projectId: string, body: string, pageId?: string, nodeId?: string) => {
    const comment = await defaultCommentsService.createComment({
      projectId,
      orgId: get().currentOrg?.id || 'org_default',
      authorId: 'user_admin',
      authorName: 'Apex Admin',
      body,
      pageId,
      nodeId,
    });
    const comments = await defaultCommentsService.listProjectComments(projectId);
    set({ comments });
    return comment;
  },

  resolveComment: async (commentId: string) => {
    await defaultCommentsService.resolveComment(commentId, 'user_admin');
    const { comments } = get();
    const updated = comments.map((c) => (c.id === commentId ? { ...c, status: 'resolved' as const } : c));
    set({ comments: updated });
  },

  fetchNotifications: async (userId: string) => {
    const notifications = await defaultNotificationService.listUserNotifications(userId);
    const count = await defaultNotificationService.getUnreadCount(userId);
    set({ notifications, unreadNotificationsCount: count });
  },

  markAllNotificationsRead: async (userId: string) => {
    await defaultNotificationService.markAllAsRead(userId);
    const notifications = await defaultNotificationService.listUserNotifications(userId);
    set({ notifications, unreadNotificationsCount: 0 });
  },

  setOrgSettingsOpen: (open) => set({ isOrgSettingsOpen: open }),
  setVersionControlPanelOpen: (open) => set({ isVersionControlPanelOpen: open }),
  setDeploymentsPanelOpen: (open) => set({ isDeploymentsPanelOpen: open }),
  setCommentsPanelOpen: (open) => set({ isCommentsPanelOpen: open }),
  setMarketplaceOpen: (open) => set({ isMarketplaceOpen: open }),
  setCommentsFilter: (filter) => set({ commentsFilter: filter }),
  setActiveCommentId: (id) => set({ activeCommentId: id }),
  setScaleDashboardOpen: (open) => set({ isScaleDashboardOpen: open }),
  setEnterpriseSecurityOpen: (open) => set({ isEnterpriseSecurityOpen: open }),
  setDeveloperPortalOpen: (open) => set({ isDeveloperPortalOpen: open }),
  setExperimentationOpen: (open) => set({ isExperimentationOpen: open }),
  setAdvancedDeploymentsOpen: (open) => set({ isAdvancedDeploymentsOpen: open }),
  setActiveRegion: (region) => set({ activeRegion: region }),
  setMaintenanceMode: (enabled) => set({ maintenanceMode: enabled }),
}));
