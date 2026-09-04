import { ComponentNode } from './component';

export type PageAuthProtectionConfig = {
  requireAuth: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
};

export type PageAuthProtection = 'public' | 'authenticated' | 'unauthenticated' | PageAuthProtectionConfig;

export type AppPage = {
  id: string;
  name: string;
  slug: string;
  root: ComponentNode;
  authProtection?: PageAuthProtection;
  unauthorizedRedirectPageId?: string;
};
