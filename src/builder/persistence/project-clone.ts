import * as crypto from 'crypto';
import { AppProject, DataCollection, DataRelationship, DataRecord } from '../schema/project';
import { ComponentNode } from '../schema/component';
import { AppPage } from '../schema/page';
import { migrateProject } from './project-storage';

export interface ProjectBackupPackage {
  format: 'visual-app-builder-backup';
  version: number;
  exportedAt: string;
  checksum: string;
  project: AppProject;
}

export class ProjectCloneEngine {
  /**
   * Deep clones a project with full ID regeneration and reference remapping.
   */
  public cloneProject(project: AppProject, newId: string, newName?: string): AppProject {
    const idMap = new Map<string, string>();

    const getOrNewId = (oldId: string, prefix = 'id'): string => {
      if (!idMap.has(oldId)) {
        idMap.set(oldId, `${prefix}_${Math.random().toString(36).substr(2, 9)}`);
      }
      return idMap.get(oldId)!;
    };

    // Deep copy base object
    const cloned: AppProject = JSON.parse(JSON.stringify(project));
    cloned.id = newId;
    cloned.name = newName || `Copy of ${project.name}`;

    // 1. Remap collection IDs and field IDs
    cloned.collections = (cloned.collections || []).map((col: DataCollection) => {
      const oldColId = col.id;
      const newColId = getOrNewId(oldColId, 'col');

      const remappedFields = col.fields.map(f => {
        const oldFId = f.id;
        const newFId = getOrNewId(`${oldColId}:${oldFId}`, 'field');
        return { ...f, id: newFId };
      });

      return {
        ...col,
        id: newColId,
        fields: remappedFields,
        records: (col.records || []).map((rec: DataRecord) => ({
          ...rec,
          id: `rec_${Math.random().toString(36).substr(2, 9)}`,
        })),
      };
    });

    // Remap relationships
    for (const col of cloned.collections) {
      if (col.relationships) {
        col.relationships = col.relationships.map((rel: DataRelationship) => ({
          ...rel,
          id: `rel_${Math.random().toString(36).substr(2, 9)}`,
          sourceCollectionId: idMap.get(rel.sourceCollectionId) || rel.sourceCollectionId,
          targetCollectionId: idMap.get(rel.targetCollectionId) || rel.targetCollectionId,
        }));
      }
    }

    // 2. Remap pages & component trees
    cloned.pages = (cloned.pages || []).map((page: AppPage) => {
      const newPageId = getOrNewId(page.id, 'page');

      const remapNode = (node: ComponentNode): ComponentNode => {
        const newNodeId = getOrNewId(node.id, 'comp');
        return {
          ...node,
          id: newNodeId,
          children: (node.children || []).map(remapNode),
        };
      };

      return {
        ...page,
        id: newPageId,
        root: remapNode(page.root),
      };
    });

    // 3. Remap workflows
    if (cloned.workflows) {
      cloned.workflows = cloned.workflows.map(wf => {
        const newWfId = getOrNewId(wf.id, 'wf');
        const wfNodeIdMap = new Map<string, string>();

        wf.nodes.forEach(n => {
          wfNodeIdMap.set(n.id, `node_${Math.random().toString(36).substr(2, 7)}`);
        });

        const remappedNodes = wf.nodes.map(n => ({
          ...n,
          id: wfNodeIdMap.get(n.id) || n.id,
          nextNodeId: n.nextNodeId ? (wfNodeIdMap.get(n.nextNodeId) || n.nextNodeId) : undefined,
          onSuccessNodeId: n.onSuccessNodeId ? (wfNodeIdMap.get(n.onSuccessNodeId) || n.onSuccessNodeId) : undefined,
          onFailureNodeId: n.onFailureNodeId ? (wfNodeIdMap.get(n.onFailureNodeId) || n.onFailureNodeId) : undefined,
        }));

        return {
          ...wf,
          id: newWfId,
          nodes: remappedNodes,
        };
      });
    }

    return cloned;
  }

  /**
   * Creates an export package with checksum.
   */
  public exportBackup(project: AppProject): ProjectBackupPackage {
    const serializedProject = JSON.stringify(project);
    const checksum = crypto.createHash('sha256').update(serializedProject).digest('hex');

    return {
      format: 'visual-app-builder-backup',
      version: project.version,
      exportedAt: new Date().toISOString(),
      checksum,
      project,
    };
  }

  /**
   * Imports and validates a backup package.
   */
  public importBackup(packageData: ProjectBackupPackage): { valid: boolean; project?: AppProject; error?: string } {
    if (packageData.format !== 'visual-app-builder-backup') {
      return { valid: false, error: 'Invalid backup format' };
    }

    const serialized = JSON.stringify(packageData.project);
    const expectedChecksum = crypto.createHash('sha256').update(serialized).digest('hex');

    if (expectedChecksum !== packageData.checksum) {
      return { valid: false, error: 'Backup checksum mismatch: file may be corrupted' };
    }

    // Migrate project to latest schema if necessary
    const migrated = migrateProject(packageData.project);

    return {
      valid: true,
      project: migrated,
    };
  }
}
