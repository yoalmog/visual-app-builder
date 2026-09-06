import {
  Organization,
  Workspace,
  Membership,
  Invitation,
  Team,
  TeamMembership,
  ProjectMembership,
  OrganizationRole,
  ProjectRole,
} from '../../schema/platform';

export interface OrganizationProvider {
  // Organizations
  createOrganization(name: string, slug: string, ownerId: string): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | null>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  updateOrganization(id: string, updates: Partial<Organization>, actorId: string): Promise<Organization>;
  deleteOrganization(id: string, actorId: string): Promise<boolean>;
  listUserOrganizations(userId: string): Promise<Organization[]>;

  // Workspaces
  createWorkspace(orgId: string, name: string, slug: string, actorId: string): Promise<Workspace>;
  getWorkspace(id: string): Promise<Workspace | null>;
  listWorkspaces(orgId: string): Promise<Workspace[]>;

  // Memberships & Invitations
  inviteMember(orgId: string, email: string, role: OrganizationRole, actorId: string): Promise<Invitation>;
  acceptInvitation(token: string, userId: string, userEmail: string): Promise<Membership>;
  rejectInvitation(token: string): Promise<boolean>;
  removeMember(orgId: string, userId: string, actorId: string): Promise<boolean>;
  updateMemberRole(orgId: string, userId: string, newRole: OrganizationRole, actorId: string): Promise<Membership>;
  listMembers(orgId: string): Promise<Membership[]>;
  listInvitations(orgId: string): Promise<Invitation[]>;

  // Teams
  createTeam(orgId: string, name: string, description: string | undefined, actorId: string): Promise<Team>;
  updateTeam(teamId: string, updates: Partial<Team>, actorId: string): Promise<Team>;
  deleteTeam(teamId: string, actorId: string): Promise<boolean>;
  listTeams(orgId: string): Promise<Team[]>;
  addTeamMember(teamId: string, userId: string, role?: 'lead' | 'member', actorId?: string): Promise<TeamMembership>;
  removeTeamMember(teamId: string, userId: string, actorId?: string): Promise<boolean>;
  listTeamMembers(teamId: string): Promise<TeamMembership[]>;

  // Project Memberships & Permissions
  assignProjectRole(projectId: string, userId: string, role: ProjectRole, actorId: string): Promise<ProjectMembership>;
  getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null>;
  listProjectMembers(projectId: string): Promise<ProjectMembership[]>;
  hasPermission(userId: string, orgId: string, action: string, projectId?: string): Promise<boolean>;
}

export class LocalOrganizationProvider implements OrganizationProvider {
  private organizations: Map<string, Organization> = new Map();
  private workspaces: Map<string, Workspace> = new Map();
  private memberships: Map<string, Membership> = new Map(); // key: `${orgId}:${userId}`
  private invitations: Map<string, Invitation> = new Map(); // key: token
  private teams: Map<string, Team> = new Map();
  private teamMemberships: Map<string, TeamMembership> = new Map(); // key: `${teamId}:${userId}`
  private projectMemberships: Map<string, ProjectMembership> = new Map(); // key: `${projectId}:${userId}`

  constructor() {
    // Seed a default organization
    this.seedDefaultOrg();
  }

  private seedDefaultOrg() {
    const defaultOrg: Organization = {
      id: 'org_default',
      name: 'Default Organization',
      slug: 'default-org',
      ownerId: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.organizations.set(defaultOrg.id, defaultOrg);

    const defaultMembership: Membership = {
      id: 'mem_default_admin',
      organizationId: defaultOrg.id,
      userId: 'user_admin',
      userEmail: 'admin@apexstudio.io',
      userName: 'Apex Admin',
      role: 'owner',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(`${defaultOrg.id}:user_admin`, defaultMembership);

    const defaultWs: Workspace = {
      id: 'ws_default',
      organizationId: defaultOrg.id,
      name: 'Main Workspace',
      slug: 'main',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(defaultWs.id, defaultWs);
  }

  async createOrganization(name: string, slug: string, ownerId: string): Promise<Organization> {
    const id = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const org: Organization = {
      id,
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.organizations.set(id, org);

    // Automatically make the creator an owner member
    const membership: Membership = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: id,
      userId: ownerId,
      userEmail: `${ownerId}@org.local`,
      role: 'owner',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(`${id}:${ownerId}`, membership);

    // Create default workspace
    await this.createWorkspace(id, 'General Workspace', 'general', ownerId);

    return org;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.organizations.get(id) || null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    for (const org of Array.from(this.organizations.values())) {
      if (org.slug === slug) return org;
    }
    return null;
  }

  async updateOrganization(id: string, updates: Partial<Organization>, actorId: string): Promise<Organization> {
    const org = this.organizations.get(id);
    if (!org) throw new Error(`Organization ${id} not found`);

    const canEdit = await this.hasPermission(actorId, id, 'org:update');
    if (!canEdit) throw new Error('PERMISSION_DENIED: User cannot update organization');

    const updated = { ...org, ...updates, updatedAt: new Date().toISOString() };
    this.organizations.set(id, updated);
    return updated;
  }

  async deleteOrganization(id: string, actorId: string): Promise<boolean> {
    const org = this.organizations.get(id);
    if (!org) return false;

    if (org.ownerId !== actorId) {
      throw new Error('PERMISSION_DENIED: Only the organization owner can delete it');
    }

    this.organizations.delete(id);
    // Cleanup memberships
    for (const [key, mem] of Array.from(this.memberships.entries())) {
      if (mem.organizationId === id) this.memberships.delete(key);
    }
    return true;
  }

  async listUserOrganizations(userId: string): Promise<Organization[]> {
    const orgIds = new Set<string>();
    for (const mem of Array.from(this.memberships.values())) {
      if (mem.userId === userId && mem.status === 'active') {
        orgIds.add(mem.organizationId);
      }
    }
    const result: Organization[] = [];
    for (const id of Array.from(orgIds)) {
      const org = this.organizations.get(id);
      if (org) result.push(org);
    }
    return result;
  }

  // Workspaces
  async createWorkspace(orgId: string, name: string, slug: string, actorId: string): Promise<Workspace> {
    const canCreate = await this.hasPermission(actorId, orgId, 'workspace:create');
    if (!canCreate) throw new Error('PERMISSION_DENIED: Cannot create workspace');

    const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ws: Workspace = {
      id,
      organizationId: orgId,
      name,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(id, ws);
    return ws;
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }

  async listWorkspaces(orgId: string): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).filter((w) => w.organizationId === orgId);
  }

  // Memberships & Invitations
  async inviteMember(orgId: string, email: string, role: OrganizationRole, actorId: string): Promise<Invitation> {
    const canInvite = await this.hasPermission(actorId, orgId, 'members:invite');
    if (!canInvite) throw new Error('PERMISSION_DENIED: Cannot invite members');

    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const invitation: Invitation = {
      id: `inv_id_${Date.now()}`,
      organizationId: orgId,
      email: email.toLowerCase(),
      role,
      token,
      status: 'pending',
      invitedBy: actorId,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.invitations.set(token, invitation);
    return invitation;
  }

  async acceptInvitation(token: string, userId: string, userEmail: string): Promise<Membership> {
    const inv = this.invitations.get(token);
    if (!inv) throw new Error('INVALID_INVITATION: Token not found');
    if (inv.status !== 'pending') throw new Error(`INVALID_INVITATION: Status is ${inv.status}`);
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      inv.status = 'expired';
      throw new Error('INVALID_INVITATION: Invitation expired');
    }

    inv.status = 'accepted';
    const membership: Membership = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: inv.organizationId,
      userId,
      userEmail,
      role: inv.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(`${inv.organizationId}:${userId}`, membership);
    return membership;
  }

  async rejectInvitation(token: string): Promise<boolean> {
    const inv = this.invitations.get(token);
    if (!inv) return false;
    inv.status = 'rejected';
    return true;
  }

  async removeMember(orgId: string, userId: string, actorId: string): Promise<boolean> {
    const canRemove = await this.hasPermission(actorId, orgId, 'members:remove');
    if (!canRemove && actorId !== userId) {
      throw new Error('PERMISSION_DENIED: Cannot remove member');
    }

    const org = this.organizations.get(orgId);
    if (org?.ownerId === userId) {
      throw new Error('CANNOT_REMOVE_OWNER: Cannot remove the organization owner');
    }

    const key = `${orgId}:${userId}`;
    return this.memberships.delete(key);
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    newRole: OrganizationRole,
    actorId: string
  ): Promise<Membership> {
    const canChange = await this.hasPermission(actorId, orgId, 'roles:assign');
    if (!canChange) throw new Error('PERMISSION_DENIED: Cannot change member role');

    const key = `${orgId}:${userId}`;
    const mem = this.memberships.get(key);
    if (!mem) throw new Error(`Member ${userId} not found in org ${orgId}`);

    mem.role = newRole;
    mem.updatedAt = new Date().toISOString();
    return mem;
  }

  async listMembers(orgId: string): Promise<Membership[]> {
    return Array.from(this.memberships.values()).filter((m) => m.organizationId === orgId);
  }

  async listInvitations(orgId: string): Promise<Invitation[]> {
    return Array.from(this.invitations.values()).filter((i) => i.organizationId === orgId);
  }

  // Teams
  async createTeam(orgId: string, name: string, description: string | undefined, actorId: string): Promise<Team> {
    const canCreate = await this.hasPermission(actorId, orgId, 'teams:create');
    if (!canCreate) throw new Error('PERMISSION_DENIED: Cannot create team');

    const id = `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const team: Team = {
      id,
      organizationId: orgId,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>, actorId: string): Promise<Team> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);

    const canEdit = await this.hasPermission(actorId, team.organizationId, 'teams:edit');
    if (!canEdit) throw new Error('PERMISSION_DENIED: Cannot edit team');

    const updated = { ...team, ...updates, updatedAt: new Date().toISOString() };
    this.teams.set(teamId, updated);
    return updated;
  }

  async deleteTeam(teamId: string, actorId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const canDelete = await this.hasPermission(actorId, team.organizationId, 'teams:delete');
    if (!canDelete) throw new Error('PERMISSION_DENIED: Cannot delete team');

    this.teams.delete(teamId);
    for (const [k, tm] of Array.from(this.teamMemberships.entries())) {
      if (tm.teamId === teamId) this.teamMemberships.delete(k);
    }
    return true;
  }

  async listTeams(orgId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter((t) => t.organizationId === orgId);
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'lead' | 'member' = 'member',
    actorId?: string
  ): Promise<TeamMembership> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);

    if (actorId) {
      const canManage = await this.hasPermission(actorId, team.organizationId, 'teams:manage_members');
      if (!canManage) throw new Error('PERMISSION_DENIED: Cannot manage team members');
    }

    const key = `${teamId}:${userId}`;
    const tm: TeamMembership = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teamId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    };
    this.teamMemberships.set(key, tm);
    return tm;
  }

  async removeTeamMember(teamId: string, userId: string, actorId?: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    if (actorId) {
      const canManage = await this.hasPermission(actorId, team.organizationId, 'teams:manage_members');
      if (!canManage) throw new Error('PERMISSION_DENIED: Cannot manage team members');
    }

    const key = `${teamId}:${userId}`;
    return this.teamMemberships.delete(key);
  }

  async listTeamMembers(teamId: string): Promise<TeamMembership[]> {
    return Array.from(this.teamMemberships.values()).filter((tm) => tm.teamId === teamId);
  }

  // Project Memberships & Permissions
  async assignProjectRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
    actorId: string
  ): Promise<ProjectMembership> {
    const currentRole = await this.getProjectRole(projectId, actorId);
    if (currentRole !== 'owner' && actorId !== 'user_admin') {
      throw new Error('PERMISSION_DENIED: Only project owners can assign project roles');
    }

    const key = `${projectId}:${userId}`;
    const pm: ProjectMembership = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    };
    this.projectMemberships.set(key, pm);
    return pm;
  }

  async getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const pm = this.projectMemberships.get(`${projectId}:${userId}`);
    if (pm) return pm.role;
    return null;
  }

  async listProjectMembers(projectId: string): Promise<ProjectMembership[]> {
    return Array.from(this.projectMemberships.values()).filter((pm) => pm.projectId === projectId);
  }

  async hasPermission(userId: string, orgId: string, action: string, projectId?: string): Promise<boolean> {
    // 1. Check organization-level role
    const mem = this.memberships.get(`${orgId}:${userId}`);
    if (!mem || mem.status !== 'active') {
      return false;
    }

    if (mem.role === 'owner') return true;
    if (mem.role === 'admin') {
      if (action === 'org:delete') return false;
      return true;
    }

    // Billing admin role
    if (mem.role === 'billing_admin') {
      return action.startsWith('billing:') || action.startsWith('usage:');
    }

    // 2. Project-specific role check if projectId provided
    if (projectId) {
      const projRole = await this.getProjectRole(projectId, userId);
      if (projRole) {
        if (projRole === 'owner') return true;
        if (projRole === 'editor') {
          return ['projects:edit', 'projects:read', 'data:edit', 'workflows:edit', 'comments:create', 'comments:read'].includes(action);
        }
        if (projRole === 'reviewer') {
          return ['reviews:approve', 'reviews:reject', 'comments:create', 'comments:read', 'projects:read'].includes(action);
        }
        if (projRole === 'commenter') {
          return ['comments:create', 'comments:read', 'projects:read'].includes(action);
        }
        if (projRole === 'viewer') {
          return ['projects:read', 'comments:read'].includes(action);
        }
        return false;
      }
    }

    // 3. Organization-level Member role fallback
    if (mem.role === 'member') {
      const allowedActions = [
        'projects:create',
        'projects:read',
        'projects:edit',
        'comments:create',
        'comments:read',
        'teams:read',
        'workspace:read',
      ];
      if (allowedActions.includes(action)) return true;
    }

    return false;
  }
}

export const defaultOrganizationProvider = new LocalOrganizationProvider();
