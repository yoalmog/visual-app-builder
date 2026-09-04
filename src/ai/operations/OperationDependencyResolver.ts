// Operation Dependency Resolver: Topological sorting and cycle detection
import { AIOperation } from './AIOperation';

export class OperationDependencyResolver {
  /**
   * Topologically orders operations based on declared dependencies and implicit schema hierarchy.
   */
  public static resolve(ops: AIOperation[]): { ordered: AIOperation[]; hasCycle: boolean; error?: string } {
    if (ops.length <= 1) {
      return { ordered: ops, hasCycle: false };
    }

    const opMap = new Map<string, AIOperation>();
    ops.forEach((op) => opMap.set(op.id, op));

    // Build adjacency list (graph of dependency -> dependent)
    // and in-degree map
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    ops.forEach((op) => {
      inDegree.set(op.id, 0);
      adj.set(op.id, []);
    });

    // 1. Explicit dependencies
    for (const op of ops) {
      if (Array.isArray(op.dependencies)) {
        for (const depId of op.dependencies) {
          if (opMap.has(depId)) {
            adj.get(depId)!.push(op.id);
            inDegree.set(op.id, (inDegree.get(op.id) || 0) + 1);
          }
        }
      }
    }

    // 2. Implicit schema dependencies:
    // Create collection before adding fields to it
    const collectionOps = new Map<string, string>(); // collectionId -> opId
    ops.forEach((op) => {
      if (op.type === 'create_collection') {
        collectionOps.set(op.collectionId, op.id);
      }
    });

    for (const op of ops) {
      if (op.type === 'add_field' || op.type === 'create_relationship') {
        const parentColOpId = collectionOps.get(op.collectionId);
        if (parentColOpId && parentColOpId !== op.id) {
          if (!adj.get(parentColOpId)!.includes(op.id)) {
            adj.get(parentColOpId)!.push(op.id);
            inDegree.set(op.id, (inDegree.get(op.id) || 0) + 1);
          }
        }
      }
    }

    // Create page before adding components to it
    const pageOps = new Map<string, string>(); // pageId -> opId
    ops.forEach((op) => {
      if (op.type === 'create_page') {
        pageOps.set(op.pageId, op.id);
      }
    });

    for (const op of ops) {
      if (op.type === 'add_component') {
        const pageOpId = pageOps.get(op.pageId);
        if (pageOpId && pageOpId !== op.id) {
          if (!adj.get(pageOpId)!.includes(op.id)) {
            adj.get(pageOpId)!.push(op.id);
            inDegree.set(op.id, (inDegree.get(op.id) || 0) + 1);
          }
        }
      }
    }

    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const ordered: AIOperation[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      ordered.push(opMap.get(u)!);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (ordered.length !== ops.length) {
      return {
        ordered: ops,
        hasCycle: true,
        error: 'Cycle detected in operation dependencies',
      };
    }

    return { ordered, hasCycle: false };
  }
}
