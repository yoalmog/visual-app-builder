/**
 * Phase 5: Cloud, Authentication, APIs, Environments & Deployment Schema Definitions
 */

// Cloud Data Collection Source Types
export type CollectionDataSourceMode = 'local' | 'cloud' | 'api';
export type RlsPolicyType = 'public' | 'authenticated' | 'user_owned' | 'admin';

// API Connector Definitions
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiAuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'secret';

export interface ApiAuthentication {
  type: ApiAuthType;
  headerName?: string;
  key?: string;
  value?: string;
  token?: string;
  username?: string;
  password?: string;
  secretName?: string;
}

export interface ApiConnector {
  id: string;
  name: string;
  baseUrl: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  queryParameters?: Record<string, string>;
  pathParameters?: Record<string, string>;
  body?: string;
  authentication?: ApiAuthentication;
  responseMapping?: string; // e.g. "response.data", "response.items"
  retryCount?: number; // default 0
}

// Authentication Configuration
export type AuthProviderType = 'supabase' | 'mock';

export interface AuthConfig {
  provider: AuthProviderType;
  enabled: boolean;
  loginPageId?: string;
  signupPageId?: string;
  defaultRedirectPageId?: string;
  allowUserRegistration: boolean;
  persistSession: boolean;
}

// Environment Management
export type EnvironmentName = 'development' | 'preview' | 'production';

export interface EnvironmentDetails {
  name: string;
  cloudConfig?: CloudConfig;
  apiVariables?: Record<string, string>;
  features?: Record<string, boolean>;
  isProduction?: boolean;
}

export interface EnvironmentConfig {
  activeEnvironment: EnvironmentName;
  environments: Record<EnvironmentName, EnvironmentDetails>;
}

// Cloud Connection Configuration
export interface CloudConfig {
  provider: 'supabase' | 'mock';
  projectUrl: string;
  anonKey: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: string;
}

// Deployment & Publishing Foundation
export type DeploymentStatus = 'draft' | 'building' | 'ready' | 'published' | 'failed' | 'rolled_back';

export interface CustomDomainConfig {
  domain: string;
  status: 'not_configured' | 'pending' | 'verified' | 'active' | 'failed';
  sslStatus: 'not_configured' | 'pending' | 'active' | 'failed';
}

export interface Deployment {
  id: string;
  projectId: string;
  environment: EnvironmentName;
  version: number;
  status: DeploymentStatus;
  snapshot: any; // Complete immutable project snapshot
  createdAt: string;
  publishedAt?: string;
  message?: string;
  rollbackTargetId?: string;
  buildLogs?: string[];
}

export interface DeploymentConfig {
  deployments: Deployment[];
  customDomain?: CustomDomainConfig;
  publishedReleaseId?: string;
}

// Unified Application Error Model (Section 50)
export type AppErrorCategory =
  | 'AUTH'
  | 'NETWORK'
  | 'DATABASE'
  | 'API'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'DEPLOYMENT'
  | 'STORAGE'
  | 'RUNTIME'
  | 'CONFIGURATION'
  | 'UNKNOWN';

export interface AppError {
  code: string;
  message: string;
  category: AppErrorCategory;
  retryable: boolean;
  status?: number;
  details?: Record<string, any>;
}
