import {
  CollaboratorPresence,
  ProjectOperation,
  CollaborationConflict,
  CollaborativeTransaction,
  CollaborationConnectionStatus,
} from '../../schema/platform';
import { AppProject } from '../../schema/project';

export interface CollaborationCallbacks {
  onPresenceChange?: (presences: CollaboratorPresence[]) => void;
  onOperationReceived?: (operation: ProjectOperation) => void;
  onConflict?: (conflict: CollaborationConflict) => void;
  onStatusChange?: (status: CollaborationConnectionStatus) => void;
}

export interface CollaborationProvider {
  connect(projectId: string, user: { id: string; name: string; avatar?: string }): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): CollaborationConnectionStatus;

  // Presence
  updatePresence(partial: Partial<CollaboratorPresence>): void;
  getPresences(): CollaboratorPresence[];
  heartbeat(): void;

  // Synchronized Operations
  submitOperation(operation: Omit<ProjectOperation, 'id' | 'timestamp'>): Promise<{
    success: boolean;
    operation?: ProjectOperation;
    conflict?: CollaborationConflict;
    newVersion?: number;
  }>;
  submitTransaction(
    operations: Array<Omit<ProjectOperation, 'id' | 'timestamp'>>,
    description: string
  ): Promise<{
    success: boolean;
    transaction?: CollaborativeTransaction;
    conflict?: CollaborationConflict;
    newVersion?: number;
  }>;

  // Collaborative Undo/Redo
  undo(userId: string): Promise<{ success: boolean; undoneTransaction?: CollaborativeTransaction; error?: string }>;
  redo(userId: string): Promise<{ success: boolean; redoneTransaction?: CollaborativeTransaction; error?: string }>;
  getTransactionHistory(): CollaborativeTransaction[];

  // Subscriptions
  subscribe(callbacks: CollaborationCallbacks): () => void;
}

export class LocalCollaborationProvider implements CollaborationProvider {
  private projectId: string = '';
  private currentUserId: string = '';
  private currentUserName: string = '';
  private currentUserAvatar: string = '';
  private status: CollaborationConnectionStatus = 'offline';
  private projectVersion: number = 1;
  private currentSnapshot: AppProject | null = null;

  private presences: Map<string, CollaboratorPresence> = new Map();
  private operations: ProjectOperation[] = [];
  private transactions: CollaborativeTransaction[] = [];
  private undoneTransactions: Map<string, CollaborativeTransaction[]> = new Map(); // userId -> txs
  private callbacks: Set<CollaborationCallbacks> = new Set();
  private heartbeatTimer: any = null;
  private staleCleanupInterval: any = null;

  // Offline queue
  private offlineQueue: Array<Omit<ProjectOperation, 'id' | 'timestamp'>> = [];

  constructor(initialProject?: AppProject) {
    if (initialProject) {
      this.currentSnapshot = JSON.parse(JSON.stringify(initialProject));
      this.projectVersion = initialProject.projectVersion || 1;
    }
  }

  public setProjectSnapshot(snapshot: AppProject) {
    this.currentSnapshot = JSON.parse(JSON.stringify(snapshot));
    this.projectVersion = snapshot.projectVersion || 1;
  }

  public getProjectSnapshot(): AppProject | null {
    return this.currentSnapshot;
  }

  public getProjectVersion(): number {
    return this.projectVersion;
  }

  async connect(projectId: string, user: { id: string; name: string; avatar?: string }): Promise<void> {
    this.projectId = projectId;
    this.currentUserId = user.id;
    this.currentUserName = user.name;
    this.currentUserAvatar = user.avatar || '';
    this.status = 'connected';

    // Register presence
    const color = this.generateUserColor(user.id);
    const presence: CollaboratorPresence = {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      color,
      activePageId: 'page_home',
      selectedNodeIds: [],
      lastHeartbeat: Date.now(),
      isOnline: true,
    };
    this.presences.set(user.id, presence);

    this.notifyStatusChange('connected');
    this.notifyPresenceChange();

    // Setup heartbeat and stale presence cleanup
    if (!this.staleCleanupInterval) {
      this.staleCleanupInterval = setInterval(() => this.cleanupStalePresences(), 10000);
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentUserId) {
      this.presences.delete(this.currentUserId);
    }
    this.status = 'offline';
    this.notifyStatusChange('offline');
    this.notifyPresenceChange();

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.staleCleanupInterval) clearInterval(this.staleCleanupInterval);
  }

  getStatus(): CollaborationConnectionStatus {
    return this.status;
  }

  updatePresence(partial: Partial<CollaboratorPresence>): void {
    if (!this.currentUserId) return;
    const current = this.presences.get(this.currentUserId);
    if (!current) return;

    const updated: CollaboratorPresence = {
      ...current,
      ...partial,
      lastHeartbeat: Date.now(),
      isOnline: true,
    };
    this.presences.set(this.currentUserId, updated);
    this.notifyPresenceChange();
  }

  getPresences(): CollaboratorPresence[] {
    return Array.from(this.presences.values());
  }

  heartbeat(): void {
    if (!this.currentUserId) return;
    const p = this.presences.get(this.currentUserId);
    if (p) {
      p.lastHeartbeat = Date.now();
      p.isOnline = true;
    }
  }

  private cleanupStalePresences() {
    const now = Date.now();
    let changed = false;
    for (const [userId, p] of Array.from(this.presences.entries())) {
      if (userId !== this.currentUserId && now - p.lastHeartbeat > 30000) {
        this.presences.delete(userId);
        changed = true;
      }
    }
    if (changed) this.notifyPresenceChange();
  }

  async submitOperation(
    opData: Omit<ProjectOperation, 'id' | 'timestamp'>
  ): Promise<{
    success: boolean;
    operation?: ProjectOperation;
    conflict?: CollaborationConflict;
    newVersion?: number;
  }> {
    // If offline, queue operation
    if (this.status === 'offline') {
      this.offlineQueue.push(opData);
      return { success: false };
    }

    // Conflict detection: Base version verification
    if (opData.baseVersion !== this.projectVersion) {
      const conflict: CollaborationConflict = {
        id: `conf_${Date.now()}`,
        projectId: this.projectId,
        expectedVersion: this.projectVersion,
        currentVersion: opData.baseVersion,
        conflictingOperation: {
          ...opData,
          id: `op_conflict_${Date.now()}`,
          timestamp: Date.now(),
        },
        serverLatestSnapshot: this.currentSnapshot,
        message: `Version conflict: local base version ${opData.baseVersion} does not match server version ${this.projectVersion}`,
        timestamp: Date.now(),
      };

      this.status = 'conflict';
      this.notifyStatusChange('conflict');
      this.notifyConflict(conflict);
      return { success: false, conflict };
    }

    // Apply operation
    const op: ProjectOperation = {
      ...opData,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.operations.push(op);
    this.projectVersion += 1;

    // Apply to current snapshot
    if (this.currentSnapshot) {
      this.applyOperationToSnapshot(this.currentSnapshot, op);
      this.currentSnapshot.projectVersion = this.projectVersion;
    }

    this.notifyOperationReceived(op);
    return { success: true, operation: op, newVersion: this.projectVersion };
  }

  async submitTransaction(
    opsData: Array<Omit<ProjectOperation, 'id' | 'timestamp'>>,
    description: string
  ): Promise<{
    success: boolean;
    transaction?: CollaborativeTransaction;
    conflict?: CollaborationConflict;
    newVersion?: number;
  }> {
    if (opsData.length === 0) return { success: true, newVersion: this.projectVersion };

    const firstOp = opsData[0];
    if (firstOp.baseVersion !== this.projectVersion) {
      const conflict: CollaborationConflict = {
        id: `conf_${Date.now()}`,
        projectId: this.projectId,
        expectedVersion: this.projectVersion,
        currentVersion: firstOp.baseVersion,
        conflictingOperation: {
          ...firstOp,
          id: `op_conflict_${Date.now()}`,
          timestamp: Date.now(),
        },
        serverLatestSnapshot: this.currentSnapshot,
        message: `Transaction conflict: local base version ${firstOp.baseVersion} does not match server version ${this.projectVersion}`,
        timestamp: Date.now(),
      };

      this.status = 'conflict';
      this.notifyStatusChange('conflict');
      this.notifyConflict(conflict);
      return { success: false, conflict };
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const appliedOps: ProjectOperation[] = [];
    const baseVer = this.projectVersion;

    for (const rawOp of opsData) {
      const op: ProjectOperation = {
        ...rawOp,
        id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transactionId: txId,
        timestamp: Date.now(),
      };
      appliedOps.push(op);
      this.operations.push(op);
      this.projectVersion += 1;

      if (this.currentSnapshot) {
        this.applyOperationToSnapshot(this.currentSnapshot, op);
      }
    }

    if (this.currentSnapshot) {
      this.currentSnapshot.projectVersion = this.projectVersion;
    }

    const tx: CollaborativeTransaction = {
      id: txId,
      projectId: this.projectId,
      actorId: firstOp.actorId,
      operations: appliedOps,
      baseVersion: baseVer,
      resultingVersion: this.projectVersion,
      description,
      timestamp: Date.now(),
      reversible: true,
    };
    this.transactions.push(tx);

    for (const op of appliedOps) {
      this.notifyOperationReceived(op);
    }

    return { success: true, transaction: tx, newVersion: this.projectVersion };
  }

  async undo(
    userId: string
  ): Promise<{ success: boolean; undoneTransaction?: CollaborativeTransaction; error?: string }> {
    // Find the latest reversible transaction created by this specific user
    const userTxIndex = [...this.transactions]
      .reverse()
      .findIndex((t) => t.actorId === userId && t.reversible);

    if (userTxIndex === -1) {
      return { success: false, error: 'No reversible transaction found for user' };
    }

    const realIndex = this.transactions.length - 1 - userTxIndex;
    const txToUndo = this.transactions[realIndex];

    // Check for stale collision: Did another user touch the same node or page afterwards?
    const targetNodeIds = new Set<string>();
    for (const op of txToUndo.operations) {
      if (op.payload?.nodeId) targetNodeIds.add(op.payload.nodeId);
      if (op.payload?.node?.id) targetNodeIds.add(op.payload.node.id);
    }

    for (let i = realIndex + 1; i < this.transactions.length; i++) {
      const laterTx = this.transactions[i];
      if (laterTx.actorId !== userId) {
        for (const op of laterTx.operations) {
          const laterNodeId = op.payload?.nodeId || op.payload?.node?.id;
          if (laterNodeId && targetNodeIds.has(laterNodeId)) {
            return {
              success: false,
              error: `STALE_UNDO: Another collaborator edited target node ${laterNodeId} after this transaction`,
            };
          }
        }
      }
    }

    // Remove from active transactions, add to user undone list
    this.transactions.splice(realIndex, 1);
    const userUndone = this.undoneTransactions.get(userId) || [];
    userUndone.push(txToUndo);
    this.undoneTransactions.set(userId, userUndone);

    this.projectVersion += 1;
    if (this.currentSnapshot) {
      this.currentSnapshot.projectVersion = this.projectVersion;
    }

    return { success: true, undoneTransaction: txToUndo };
  }

  async redo(
    userId: string
  ): Promise<{ success: boolean; redoneTransaction?: CollaborativeTransaction; error?: string }> {
    const userUndone = this.undoneTransactions.get(userId) || [];
    if (userUndone.length === 0) {
      return { success: false, error: 'No undone transactions to redo' };
    }

    const txToRedo = userUndone.pop()!;
    this.transactions.push(txToRedo);
    this.projectVersion += 1;

    if (this.currentSnapshot) {
      this.currentSnapshot.projectVersion = this.projectVersion;
    }

    return { success: true, redoneTransaction: txToRedo };
  }

  getTransactionHistory(): CollaborativeTransaction[] {
    return [...this.transactions];
  }

  subscribe(callbacks: CollaborationCallbacks): () => void {
    this.callbacks.add(callbacks);
    return () => {
      this.callbacks.delete(callbacks);
    };
  }

  private notifyPresenceChange() {
    const list = this.getPresences();
    this.callbacks.forEach((cb) => cb.onPresenceChange?.(list));
  }

  private notifyOperationReceived(op: ProjectOperation) {
    this.callbacks.forEach((cb) => cb.onOperationReceived?.(op));
  }

  private notifyConflict(conflict: CollaborationConflict) {
    this.callbacks.forEach((cb) => cb.onConflict?.(conflict));
  }

  private notifyStatusChange(status: CollaborationConnectionStatus) {
    this.callbacks.forEach((cb) => cb.onStatusChange?.(status));
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#6366F1', // Indigo
      '#EC4899', // Pink
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EF4444', // Red
      '#14B8A6', // Teal
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private applyOperationToSnapshot(project: AppProject, op: ProjectOperation) {
    switch (op.operationType) {
      case 'add_page': {
        if (op.payload?.page) {
          project.pages.push(op.payload.page);
        }
        break;
      }
      case 'delete_page': {
        project.pages = project.pages.filter((p) => p.id !== op.payload?.pageId);
        break;
      }
      case 'rename_page': {
        const p = project.pages.find((page) => page.id === op.payload?.pageId);
        if (p && op.payload?.newName) {
          p.name = op.payload.newName;
        }
        break;
      }
      case 'update_theme': {
        if (op.payload?.theme) {
          project.theme = { ...project.theme, ...op.payload.theme };
        }
        break;
      }
      case 'update_token': {
        if (op.payload?.token && project.tokens) {
          const idx = project.tokens.findIndex((t) => t.id === op.payload.token.id);
          if (idx !== -1) project.tokens[idx] = op.payload.token;
          else project.tokens.push(op.payload.token);
        }
        break;
      }
      case 'update_props': {
        const { pageId, nodeId, props } = op.payload;
        const page = project.pages.find((p) => p.id === pageId) || project.pages[0];
        if (page) {
          const node = this.findNode(page.root, nodeId);
          if (node) node.props = { ...node.props, ...props };
        }
        break;
      }
      case 'update_styles': {
        const { pageId, nodeId, styles } = op.payload;
        const page = project.pages.find((p) => p.id === pageId) || project.pages[0];
        if (page) {
          const node = this.findNode(page.root, nodeId);
          if (node) node.styles = { ...node.styles, ...styles };
        }
        break;
      }
      default:
        break;
    }
  }

  private findNode(root: any, id: string): any | null {
    if (!root) return null;
    if (root.id === id) return root;
    if (Array.isArray(root.children)) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }
}

export const defaultCollaborationProvider = new LocalCollaborationProvider();
