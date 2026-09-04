/**
 * Phase 5: AuthProvider Interface and Implementations
 *
 * Authentication flows are isolated through this interface.
 * The builder never calls vendor SDKs directly — only these providers.
 * Secrets stay server-side; this client-side auth uses anon-key tokens only.
 */

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number; // unix ms
  userId: string;
}

export type AuthEvent = 'LOGIN' | 'SIGNUP' | 'LOGOUT' | 'SESSION_REFRESHED' | 'SESSION_EXPIRED' | 'SIGNED_IN' | 'SIGNED_OUT';

export interface AuthStateListener {
  (event: AuthEvent, user: AuthUser | null, session: AuthSession | null): void;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface AuthProvider {
  signup(email: string, password: string, metadata?: Record<string, any>): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }>;
  login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }>;
  logout(): Promise<{ success: boolean; error?: string }>;
  signUp?(email: string, password: string, metadata?: Record<string, any>): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }>;
  signIn?(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }>;
  signOut?(): Promise<{ success: boolean; error?: string }>;
  getSession(): Promise<AuthSession | null> | AuthSession | null;
  getCurrentUser(): Promise<AuthUser | null> | AuthUser | null;
  onAuthStateChange(listener: AuthStateListener): () => void; // returns unsubscribe fn
  refreshSession?(): Promise<{ success: boolean; error?: string }>;
}

// ─── MockAuthProvider ─────────────────────────────────────────────────────────

/**
 * Deterministic, in-memory mock auth provider for automated testing and local preview.
 * Supports multiple pre-configured users; passwords are checked by equality (test only).
 */
export class MockAuthProvider implements AuthProvider {
  private users: Map<string, { user: AuthUser; password: string }> = new Map();
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;
  private listeners: AuthStateListener[] = [];
  private sessionDurationMs: number;

  constructor(
    initialUsers: Array<{ email: string; password: string; id?: string; name?: string; role?: string }> = [],
    sessionDurationMs = 3600_000 // 1h default
  ) {
    this.sessionDurationMs = sessionDurationMs;
    for (const u of initialUsers) {
      const user: AuthUser = {
        id: u.id || `user_${Math.random().toString(36).substring(2, 9)}`,
        email: u.email,
        name: u.name,
        role: u.role || 'user',
      };
      this.users.set(u.email.toLowerCase(), { user, password: u.password });
    }
  }

  async signup(email: string, password: string, metadata?: Record<string, any>): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }> {
    const key = email.toLowerCase();
    if (this.users.has(key)) {
      return { success: false, error: 'User already exists' };
    }
    if (!email.includes('@')) return { success: false, error: 'Invalid email' };
    if (password.length < 6) return { success: false, error: 'Password too short (min 6 chars)' };

    const user: AuthUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      name: metadata?.name,
      role: metadata?.role || 'user',
      metadata,
    };
    this.users.set(key, { user, password });
    const session = this._createSession(user);
    this.currentUser = user;
    this.currentSession = session;
    this._notify('SIGNED_IN', user, session);
    return { success: true, user, session };
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; session?: AuthSession; error?: string }> {
    const key = email.toLowerCase();
    const entry = this.users.get(key);
    if (!entry) return { success: false, error: 'Invalid email or password' };
    if (entry.password !== password) return { success: false, error: 'Invalid email or password' };

    const session = this._createSession(entry.user);
    this.currentUser = entry.user;
    this.currentSession = session;
    this._notify('SIGNED_IN', entry.user, session);
    return { success: true, user: entry.user, session };
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    this.currentUser = null;
    this.currentSession = null;
    this._notify('SIGNED_OUT', null, null);
    return { success: true };
  }

  // Aliases for compatibility
  signUp = this.signup.bind(this);
  signIn = this.login.bind(this);
  signOut = this.logout.bind(this);

  getSession(): AuthSession | null {
    if (!this.currentSession) return null;
    if (Date.now() > this.currentSession.expiresAt) {
      this.currentSession = null;
      this._notify('SESSION_EXPIRED', null, null);
      return null;
    }
    return this.currentSession;
  }

  getCurrentUser(): AuthUser | null {
    const session = this.getSession();
    return session ? this.currentUser : null;
  }

  onAuthStateChange(listener: AuthStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private _createSession(user: AuthUser): AuthSession {
    return {
      token: `mock_token_${user.id}_${Date.now()}`,
      refreshToken: `mock_refresh_${user.id}`,
      expiresAt: Date.now() + this.sessionDurationMs,
      userId: user.id,
    };
  }

  private _notify(event: AuthEvent, user: AuthUser | null, session: AuthSession | null): void {
    this.listeners.forEach((l) => l(event, user, session));
  }

  /** For test introspection */
  getUserCount(): number { return this.users.size; }
  forceSetUser(user: AuthUser | null, session: AuthSession | null): void {
    this.currentUser = user;
    this.currentSession = session;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAuthProvider(
  type: 'mock' | 'supabase',
  options: {
    initialUsers?: Array<{ email: string; password: string; id?: string; name?: string; role?: string }>;
    sessionDurationMs?: number;
  } = {}
): AuthProvider {
  // Only mock is supported on client side. Supabase adapter would go server-side.
  return new MockAuthProvider(options.initialUsers, options.sessionDurationMs);
}
