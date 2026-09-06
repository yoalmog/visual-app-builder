import { z } from 'zod';
import { AppProject } from './project';

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 8: SCHEMA VERSION 8 & ENTERPRISE PLATFORM ENTITIES
// ══════════════════════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = 8;
export const PROJECT_SCHEMA_VERSION_V8 = 8;

// ─── 1. Organization, Workspace & Team Management ─────────────────────────────

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer' | 'billing_admin';
export type MembershipStatus = 'active' | 'invited' | 'suspended';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    allowedAuthDomains?: string[];
    enforceMfa?: boolean;
    defaultMemberRole?: OrganizationRole;
    billingEmail?: string;
  };
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: 'lead' | 'member';
  createdAt: string;
}

export type ProjectRole = 'owner' | 'editor' | 'commenter' | 'reviewer' | 'viewer';

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

// ─── 2. Real-Time Collaboration & Synchronized Operations ─────────────────────

export type CollaborationConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'offline'
  | 'reconnecting'
  | 'conflict';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  userAvatar?: string;
  color: string;
  activePageId: string;
  selectedNodeIds: string[];
  editingNodeId?: string;
  cursor?: CursorPosition;
  viewport?: { zoom: number; scrollX: number; scrollY: number };
  lastHeartbeat: number;
  isOnline: boolean;
}

export type ProjectOperationType =
  | 'add_node'
  | 'remove_node'
  | 'move_node'
  | 'update_props'
  | 'update_styles'
  | 'update_responsive_styles'
  | 'add_page'
  | 'delete_page'
  | 'rename_page'
  | 'update_theme'
  | 'update_token'
  | 'create_token'
  | 'create_component'
  | 'update_data_model'
  | 'create_collection'
  | 'update_workflow'
  | 'update_permission'
  | 'update_settings';

export interface ProjectOperation {
  id: string;
  projectId: string;
  actorId: string;
  transactionId: string;
  baseVersion: number;
  operationType: ProjectOperationType;
  payload: Record<string, any>;
  timestamp: number;
  reversible?: boolean;
}

export interface CollaborationConflict {
  id: string;
  projectId: string;
  expectedVersion: number;
  currentVersion: number;
  conflictingOperation: ProjectOperation;
  serverLatestSnapshot: any;
  message: string;
  timestamp: number;
}

export interface CollaborativeTransaction {
  id: string;
  projectId: string;
  actorId: string;
  operations: ProjectOperation[];
  baseVersion: number;
  resultingVersion: number;
  description: string;
  timestamp: number;
  reversible: boolean;
}

// ─── 3. Comments & Mentions ───────────────────────────────────────────────────

export type CommentStatus = 'open' | 'resolved';

export interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  mentions: string[]; // user IDs
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  pageId?: string;
  nodeId?: string;
  position?: { x: number; y: number };
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  mentions: string[]; // user IDs
  status: CommentStatus;
  replies: CommentReply[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ─── 4. Notifications & Review Workflows ──────────────────────────────────────

export type NotificationType =
  | 'mention'
  | 'comment'
  | 'review_request'
  | 'review_approval'
  | 'review_rejection'
  | 'invitation'
  | 'project_access'
  | 'deployment_completed'
  | 'deployment_failed'
  | 'ai_task_completed'
  | 'security_event';

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  emailMentions: boolean;
  emailReviews: boolean;
  emailDeployments: boolean;
  emailSecurity: boolean;
  inAppMentions: boolean;
  inAppReviews: boolean;
  inAppDeployments: boolean;
  inAppSecurity: boolean;
}

export type ReviewStatus =
  | 'draft'
  | 'review_requested'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'merged';

export interface ReviewReviewer {
  userId: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  feedback?: string;
  reviewedAt?: string;
}

export interface Review {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  sourceBranch: string;
  targetBranch: string;
  sourceCommitId: string;
  targetCommitId: string;
  title: string;
  description: string;
  status: ReviewStatus;
  reviewers: ReviewReviewer[];
  changesSummary?: {
    addedNodes: number;
    modifiedNodes: number;
    removedNodes: number;
    changedPages: number;
  };
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  mergedBy?: string;
}

// ─── 5. Version Control, Semantic Diff & Merging ──────────────────────────────

export interface BranchProtectionRules {
  requireReview: boolean;
  requiredApprovalsCount: number;
  preventDirectPush: boolean;
  requireSuccessfulBuild: boolean;
}

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  sourceBranchId?: string;
  headCommitId: string;
  protected: boolean;
  protectionRules?: BranchProtectionRules;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  projectId: string;
  branchId: string;
  parentCommitId?: string;
  authorId: string;
  authorName: string;
  message: string;
  schemaVersion: number;
  snapshotId: string;
  createdAt: string;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  commitId: string;
  project: AppProject;
  createdAt: string;
}

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged' | 'conflict';

export interface SemanticChangeItem {
  id: string;
  entityType: 'page' | 'node' | 'token' | 'theme' | 'collection' | 'workflow' | 'role' | 'setting';
  entityId: string;
  name: string;
  changeType: DiffChangeType;
  details?: {
    before?: any;
    after?: any;
    fieldDifferences?: string[];
  };
}

export interface ProjectDiff {
  sourceCommitId: string;
  targetCommitId: string;
  hasConflicts: boolean;
  changes: SemanticChangeItem[];
  stats: {
    added: number;
    removed: number;
    modified: number;
    conflicts: number;
  };
}

export interface MergeResult {
  success: boolean;
  conflicts: SemanticChangeItem[];
  mergedSnapshot?: AppProject;
  mergeCommitId?: string;
  error?: string;
}

export interface Release {
  id: string;
  projectId: string;
  organizationId: string;
  environment: 'development' | 'preview' | 'production';
  branch: string;
  commitId: string;
  snapshotId: string;
  versionTag: string;
  notes?: string;
  publishedBy: string;
  publishedAt: string;
  isCurrent: boolean;
}

// ─── 6. Build Queue, Background Jobs & Deployments ────────────────────────────

export type BuildJobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BuildJob {
  id: string;
  projectId: string;
  environmentId: string;
  commitId: string;
  status: BuildJobStatus;
  priority: JobPriority;
  retries: number;
  maxRetries: number;
  logs: string[];
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BackgroundJob<T = any> {
  id: string;
  type: 'build' | 'deployment' | 'notification' | 'scheduled_task' | 'usage_aggregation' | 'webhook_processing' | 'ai_background' | 'cleanup';
  payload: T;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  priority: JobPriority;
  retries: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PreviewDeployment {
  id: string;
  projectId: string;
  branchName: string;
  commitId: string;
  url: string;
  status: 'provisioning' | 'active' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
}

export interface CustomDomain {
  id: string;
  projectId: string;
  environmentId: string;
  hostname: string;
  status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
  verificationStatus: 'unverified' | 'dns_matched' | 'ssl_provisioned' | 'failed';
  dnsRecords: Array<{
    type: 'CNAME' | 'A' | 'TXT';
    name: string;
    value: string;
    status: 'pending' | 'verified';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface RollbackRecord {
  id: string;
  projectId: string;
  environment: string;
  sourceReleaseId: string;
  targetReleaseId: string;
  targetCommitId: string;
  performedBy: string;
  performedAt: string;
  reason?: string;
}

// ─── 7. Usage Metering, Entitlements & Billing ────────────────────────────────

export type UsageMetricType =
  | 'ai_requests'
  | 'ai_tokens'
  | 'storage_bytes'
  | 'database_records'
  | 'api_requests'
  | 'workflow_executions'
  | 'deployments'
  | 'build_minutes'
  | 'active_collaborators'
  | 'projects'
  | 'custom_domains';

export interface UsageRecord {
  id: string;
  organizationId: string;
  metric: UsageMetricType;
  quantity: number;
  period: string; // YYYY-MM
  source: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export type PricingPlanTier = 'free' | 'pro' | 'team' | 'business' | 'enterprise';

export interface PlanLimits {
  tier: PricingPlanTier;
  maxProjects: number;
  maxCollaborators: number;
  maxAITokensPerMonth: number;
  maxStorageBytes: number;
  maxDatabaseRecords: number;
  maxBuildMinutesPerMonth: number;
  maxCustomDomains: number;
  allowedFeatures: {
    realtimeCollaboration: boolean;
    customDomains: boolean;
    advancedWorkflows: boolean;
    auditLogs: boolean;
    marketplacePublishing: boolean;
    sandboxedPlugins: boolean;
    serviceAccounts: boolean;
    branchProtection: boolean;
    previewDeployments: boolean;
  };
}

export interface Subscription {
  id: string;
  organizationId: string;
  planTier: PricingPlanTier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string;
  createdAt: string;
}

// ─── 8. Marketplace Foundation & Plugin Sandbox ───────────────────────────────

export type MarketplaceResourceType =
  | 'template'
  | 'component'
  | 'theme'
  | 'workflow'
  | 'plugin'
  | 'integration';

export type MarketplaceResourceStatus =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'published'
  | 'rejected'
  | 'deprecated';

export interface MarketplaceResource {
  id: string;
  authorId: string;
  authorName: string;
  organizationId?: string;
  type: MarketplaceResourceType;
  name: string;
  slug: string;
  description: string;
  version: string;
  compatibility: string;
  package: Record<string, any>;
  manifest?: PluginManifest;
  metadata: {
    downloads: number;
    rating: number;
    tags: string[];
    documentationUrl?: string;
  };
  status: MarketplaceResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export type PluginPermission =
  | 'read_project'
  | 'write_project'
  | 'read_data'
  | 'write_data'
  | 'read_runtime'
  | 'storage'
  | 'notifications';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermission[];
  capabilities: string[];
  compatibleSchemaVersions: number[];
  entrypoints: {
    sidebarTab?: string;
    inspectorTab?: string;
    commandAction?: string;
  };
  settingsSchema?: Record<string, any>;
}

export interface InstalledPlugin {
  id: string;
  projectId?: string;
  organizationId: string;
  pluginId: string;
  version: string;
  enabled: boolean;
  grantedPermissions: PluginPermission[];
  settings: Record<string, any>;
  installedAt: string;
  installedBy: string;
}

// ─── 9. Enterprise Security, API Keys, Service Accounts & Audit Logs ──────────

export interface ApiKey {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  prefix: string; // e.g. "ak_live_..."
  hashedSecret: string;
  scopes: string[]; // e.g. ["projects:read", "deployments:write"]
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface ServiceAccount {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  scopes: string[];
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ImmutableAuditLogEntry {
  id: string;
  organizationId: string;
  projectId?: string;
  actorId: string;
  actorType: 'user' | 'service_account' | 'ai' | 'system';
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipHash: string;
  status: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

export type SecurityEventType =
  | 'failed_login'
  | 'suspicious_access'
  | 'permission_denial'
  | 'invalid_api_key'
  | 'rate_limit_violation'
  | 'webhook_signature_failure'
  | 'plugin_permission_violation'
  | 'unauthorized_production_deployment'
  | 'secret_exposure_attempt';

export interface SecurityEvent {
  id: string;
  organizationId?: string;
  projectId?: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  ipHash: string;
  timestamp: string;
}

// ─── 10. AI + Collaboration Bridge Entities ───────────────────────────────────

export interface AICollaborationProposal {
  proposalId: string;
  author: 'AI';
  baseVersion: number;
  branch: string;
  operations: import('../../ai/operations/AIOperation').AIOperation[] | ProjectOperation[];
  explanation: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  affectedResources: string[];
  status: 'proposed' | 'accepted' | 'rejected' | 'conflict_stale';
  staleRebaseAttempted?: boolean;
  createdAt: string;
}

// ─── Zod Schemas for Runtime Validation ───────────────────────────────────────

export const OrganizationRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer', 'billing_admin']);
export const ProjectRoleSchema = z.enum(['owner', 'editor', 'commenter', 'reviewer', 'viewer']);

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  settings: z.object({
    allowedAuthDomains: z.array(z.string()).optional(),
    enforceMfa: z.boolean().optional(),
    defaultMemberRole: OrganizationRoleSchema.optional(),
    billingEmail: z.string().email().optional(),
  }).optional(),
});

export const ProjectOperationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  actorId: z.string(),
  transactionId: z.string(),
  baseVersion: z.number(),
  operationType: z.string(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.number(),
  reversible: z.boolean().optional(),
});

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  version: z.string(),
  author: z.string(),
  description: z.string(),
  permissions: z.array(z.enum([
    'read_project',
    'write_project',
    'read_data',
    'write_data',
    'read_runtime',
    'storage',
    'notifications',
  ])),
  capabilities: z.array(z.string()),
  compatibleSchemaVersions: z.array(z.number()),
  entrypoints: z.object({
    sidebarTab: z.string().optional(),
    inspectorTab: z.string().optional(),
    commandAction: z.string().optional(),
  }),
  settingsSchema: z.record(z.string(), z.any()).optional(),
});
