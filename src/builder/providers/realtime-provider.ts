/**
 * Phase 5: RealtimeProvider Interface and MockRealtimeProvider
 *
 * Realtime subscription abstraction for live data updates.
 * The mock provider supports manual event dispatch for automated testing.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent {
  type: RealtimeEventType;
  record: Record<string, any>;
  oldRecord?: Record<string, any>;
  table: string;
}

export interface RealtimeCallbacks {
  onInsert?: (record: Record<string, any>) => void;
  onUpdate?: (record: Record<string, any>, oldRecord: Record<string, any>) => void;
  onDelete?: (record: Record<string, any>) => void;
  onError?: (error: Error) => void;
}

export interface Subscription {
  id: string;
  table: string;
  unsubscribe(): void;
}

export interface RealtimeProvider {
  subscribe(table: string, callbacks: RealtimeCallbacks): Subscription;
  unsubscribeAll(): void;
}

// ─── MockRealtimeProvider ─────────────────────────────────────────────────────

export class MockRealtimeProvider implements RealtimeProvider {
  private subscriptions: Map<string, { table: string; callbacks: RealtimeCallbacks }> = new Map();

  subscribe(table: string, callbacks: RealtimeCallbacks): Subscription {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.subscriptions.set(id, { table, callbacks });

    return {
      id,
      table,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      },
    };
  }

  unsubscribeAll(): void {
    this.subscriptions.clear();
  }

  /** For testing: manually dispatch an event to all subscribers for a table */
  dispatch(event: RealtimeEvent): void {
    this.subscriptions.forEach((sub) => {
      if (sub.table !== event.table) return;
      switch (event.type) {
        case 'INSERT':
          sub.callbacks.onInsert?.(event.record);
          break;
        case 'UPDATE':
          sub.callbacks.onUpdate?.(event.record, event.oldRecord || {});
          break;
        case 'DELETE':
          sub.callbacks.onDelete?.(event.record);
          break;
      }
    });
  }

  /** For test introspection */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getSubscriptionsForTable(table: string): number {
    let count = 0;
    this.subscriptions.forEach((sub) => {
      if (sub.table === table) count++;
    });
    return count;
  }
}

export const mockRealtimeProvider = new MockRealtimeProvider();
