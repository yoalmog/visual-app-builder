import { create } from 'zustand';
import {
  AppProject,
  Asset,
  ComponentDefinition,
  DesignToken,
  DataCollection,
  DataField,
  DataRecord,
  Variable,
  ApiConnector,
  AuthConfig,
  EnvironmentConfig,
  EnvironmentName,
  CloudConfig,
  DeploymentConfig,
} from '../schema/project';
import { ComponentNode, ComponentStyles, ComponentStateMode, ComponentInteraction, ComponentAction, ComponentBinding, LogicRule, ConditionalVisibility } from '../schema/component';
import { findNode } from '../tree/find-node';
import { insertNode } from '../tree/insert-node';
import { removeNode, removeNodes } from '../tree/remove-node';
import { updateNode } from '../tree/update-node';
import { moveNode } from '../tree/move-node';
import { duplicateNode } from '../tree/duplicate-node';
import {
  HistoryState,
  pushHistory,
  beginTransaction,
  commitTransaction,
  cancelTransaction,
  undoHistory,
  redoHistory,
} from '../history/history-manager';
import {
  loadProjectFromStorage,
  saveProjectToStorage,
  createInitialProject,
} from '../persistence/project-storage';
import { createNewPage, duplicatePage, normalizeSlug } from '../tree/page-operations';
import {
  createComponentDefinitionFromNode,
  instantiateComponentDefinition,
} from '../tree/component-library-operations';
import {
  alignNodes,
  distributeNodes,
  changeZOrder,
  groupNodes,
  AlignmentType,
  DistributionDirection,
  ZOrderAction,
} from '../tree/alignment-operations';
import {
  findTokenReferences,
  replaceTokenReferencesInTree,
} from '../tokens/tokens-manager';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type SaveStatus = 'saved' | 'saving' | 'unsaved';
export type InteractionMode = 'select' | 'pan' | 'resize' | 'drag';

export interface BuilderState {
  project: AppProject;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  activePageId: string;
  viewport: ViewportMode;
  zoom: number;
  saveStatus: SaveStatus;
  isPreview: boolean;
  history: HistoryState;
  snapEnabled: boolean;
  interactionMode: InteractionMode;
  panOffset: { x: number; y: number };
  previewVisibleOverrides: Record<string, boolean>;
  activeInspectorTab: 'properties' | 'states' | 'interactions' | 'logic';
  activeComponentState: ComponentStateMode;

  // UI & Canvas Controls
  setProject: (project: AppProject) => void;
  selectNode: (id: string | null) => void;
  selectNodes: (ids: string[]) => void;
  toggleSelectNode: (id: string, multi?: boolean) => void;
  hoverNode: (id: string | null) => void;
  setViewport: (viewport: ViewportMode) => void;
  setZoom: (zoom: number) => void;
  togglePreview: (preview?: boolean) => void;
  toggleSnap: (enabled?: boolean) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  // Node Mutations
  addNode: (parentId: string, node: ComponentNode, index?: number) => void;
  removeNode: (nodeId: string) => void;
  removeSelectedNodes: () => void;
  updateNodeProps: (nodeId: string, props: Record<string, any>) => void;
  updateNodeStyles: (nodeId: string, styles: Partial<ComponentStyles>) => void;
  updateNodeResponsiveStyles: (nodeId: string, viewport: ViewportMode, styles: Partial<ComponentStyles>) => void;
  resetResponsiveStyle: (nodeId: string, viewport: ViewportMode, styleKey: string) => void;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  moveSelectedNodesKeyboard: (dx: number, dy: number) => void;
  duplicateNode: (nodeId: string) => string | null;
  duplicateSelectedNodes: () => string[];
  renameNode: (nodeId: string, name: string) => void;
  setNodeVisibility: (nodeId: string, visible: boolean, viewport?: ViewportMode) => void;

  // Page Operations
  addPage: (name: string, slug?: string) => string;
  duplicatePage: (pageId: string) => string | null;
  removePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  updatePageSlug: (pageId: string, slug: string) => void;
  setActivePage: (pageId: string) => void;

  // Asset Operations
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  renameAsset: (assetId: string, name: string) => void;

  // Reusable Components & Variants
  createComponentDefinition: (name: string, sourceNodeId: string) => string | null;
  insertComponentInstance: (parentId: string, definitionId: string, index?: number) => string | null;
  renameComponentDefinition: (id: string, name: string) => void;
  deleteComponentDefinition: (id: string) => void;
  setComponentVariant: (nodeId: string, variantId: string) => void;

  // Layer Lock & Z-Order
  toggleLockNode: (nodeId: string) => void;
  changeNodeZOrder: (nodeId: string, action: ZOrderAction) => void;

  // Alignment, Distribution, Grouping
  alignSelectedNodes: (alignment: AlignmentType) => void;
  distributeSelectedNodes: (direction: DistributionDirection) => void;
  groupSelectedNodes: () => string | null;

  // Responsive Reset All
  resetAllResponsiveOverrides: (nodeId: string) => void;

  // Design Tokens Operations
  addToken: (token: DesignToken) => void;
  updateToken: (tokenId: string, updates: Partial<DesignToken>) => void;
  deleteToken: (
    tokenId: string,
    fallbackOption?: 'replace' | 'remove',
    replacementTokenId?: string
  ) => { success: boolean; affectedCount: number };
  applyTokenToNode: (nodeId: string, property: string, tokenId: string) => void;
  removeTokenFromNode: (nodeId: string, property: string) => void;

  // Component States Operations
  setActiveInspectorTab: (tab: 'properties' | 'states' | 'interactions' | 'logic') => void;
  setActiveComponentState: (state: ComponentStateMode) => void;
  updateNodeStateStyles: (nodeId: string, state: ComponentStateMode, styles: Partial<ComponentStyles>) => void;

  // Interactions Operations
  addNodeInteraction: (nodeId: string, interaction: ComponentInteraction) => void;
  updateNodeInteraction: (nodeId: string, index: number, interaction: ComponentInteraction) => void;
  removeNodeInteraction: (nodeId: string, index: number) => void;

  // Preview Runtime Operations
  setPreviewVisibleOverride: (nodeId: string, visible: boolean) => void;
  togglePreviewVisibleOverride: (nodeId: string) => void;
  resetPreviewRuntimeState: () => void;

  // Data Collections Operations (Phase 4)
  addCollection: (collection: DataCollection) => void;
  updateCollection: (collectionId: string, updates: Partial<DataCollection>) => void;
  deleteCollection: (collectionId: string) => void;
  duplicateCollection: (collectionId: string) => string | null;
  addField: (collectionId: string, field: DataField) => void;
  updateField: (collectionId: string, fieldId: string, updates: Partial<DataField>) => void;
  deleteField: (collectionId: string, fieldId: string) => void;
  addRecord: (collectionId: string, record: DataRecord) => void;
  updateRecord: (collectionId: string, recordId: string, values: Record<string, any>) => void;
  deleteRecord: (collectionId: string, recordId: string) => void;

  // Variables Operations (Phase 4)
  addVariable: (variable: Variable) => boolean;
  updateVariable: (variableId: string, updates: Partial<Variable>) => boolean;
  deleteVariable: (variableId: string, force?: boolean) => { success: boolean; referencesCount?: number };

  // Data Bindings Operations (Phase 4)
  setNodeBinding: (nodeId: string, propertyPath: string, binding: ComponentBinding) => void;
  removeNodeBinding: (nodeId: string, propertyPath: string) => void;

  // Logic Rules Operations (Phase 4)
  addNodeLogicRule: (nodeId: string, rule: LogicRule) => void;
  updateNodeLogicRule: (nodeId: string, index: number, rule: LogicRule) => void;
  removeNodeLogicRule: (nodeId: string, index: number) => void;

  // Conditional Visibility Operations (Phase 4)
  setNodeConditionalVisibility: (nodeId: string, visibility?: ConditionalVisibility) => void;

  // Phase 5: Cloud, Authentication, Environments, API & Deployments
  updateAuthConfig: (updates: Partial<AuthConfig>) => void;
  updateEnvironmentConfig: (updates: Partial<EnvironmentConfig>) => void;
  setActiveEnvironment: (env: EnvironmentName) => void;
  updateCloudConfig: (updates: Partial<CloudConfig>) => void;
  updateDeploymentConfig: (updates: Partial<DeploymentConfig>) => void;
  addApiConnector: (connector: ApiConnector) => void;
  updateApiConnector: (connectorId: string, updates: Partial<ApiConnector>) => void;
  deleteApiConnector: (connectorId: string) => void;
  setPageAuthProtection: (pageId: string, protection?: { requireAuth: boolean; allowedRoles?: string[]; redirectTo?: string }) => void;

  // History Actions & Transactions
  beginTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;

  // Persistence
  save: () => void;
  initializeProject: (projectId: string) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  project: createInitialProject('default'),
  selectedNodeId: null,
  selectedNodeIds: [],
  hoveredNodeId: null,
  activePageId: 'page_home',
  viewport: 'desktop',
  zoom: 1.0,
  saveStatus: 'saved',
  isPreview: false,
  history: { past: [], future: [] },
  snapEnabled: true,
  interactionMode: 'select',
  panOffset: { x: 0, y: 0 },
  previewVisibleOverrides: {},
  activeInspectorTab: 'properties',
  activeComponentState: 'default',

  initializeProject: (projectId: string) => {
    const existing = loadProjectFromStorage(projectId);
    const initial = existing || createInitialProject(projectId);
    set({
      project: initial,
      activePageId: initial.pages[0]?.id || 'page_home',
      selectedNodeId: null,
      selectedNodeIds: [],
      hoveredNodeId: null,
      history: { past: [], future: [] },
      saveStatus: 'saved',
    });
  },

  setProject: (project: AppProject) => set({ project, saveStatus: 'unsaved' }),

  selectNode: (id: string | null) =>
    set({
      selectedNodeId: id,
      selectedNodeIds: id ? [id] : [],
    }),

  selectNodes: (ids: string[]) =>
    set({
      selectedNodeIds: ids,
      selectedNodeId: ids.length > 0 ? ids[0] : null,
    }),

  toggleSelectNode: (id: string, multi = false) => {
    const { selectedNodeIds } = get();
    if (!multi) {
      set({ selectedNodeId: id, selectedNodeIds: [id] });
      return;
    }
    const exists = selectedNodeIds.includes(id);
    const updated = exists ? selectedNodeIds.filter((x) => x !== id) : [...selectedNodeIds, id];
    set({
      selectedNodeIds: updated,
      selectedNodeId: updated.length > 0 ? updated[0] : null,
    });
  },

  hoverNode: (id: string | null) => set({ hoveredNodeId: id }),
  setViewport: (viewport: ViewportMode) => set({ viewport }),
  setZoom: (zoom: number) => set({ zoom: Math.min(Math.max(zoom, 0.25), 2.0) }),
  togglePreview: (preview?: boolean) =>
    set((state) => ({ isPreview: preview !== undefined ? preview : !state.isPreview })),
  toggleSnap: (enabled?: boolean) =>
    set((state) => ({ snapEnabled: enabled !== undefined ? enabled : !state.snapEnabled })),
  setInteractionMode: (interactionMode: InteractionMode) => set({ interactionMode }),
  setPanOffset: (panOffset: { x: number; y: number }) => set({ panOffset }),

  addNode: (parentId: string, node: ComponentNode, index?: number) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = insertNode(page.root, parentId, node, index);

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: node.id,
      selectedNodeIds: [node.id],
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeNode: (nodeId: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    if (page.root.id === nodeId) return; // Cannot delete page root

    const newRoot = removeNode(page.root, nodeId);
    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: null,
      selectedNodeIds: [],
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeSelectedNodes: () => {
    const { project, history, activePageId, selectedNodeIds, selectedNodeId } = get();
    const idsToRemove = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (idsToRemove.length === 0) return;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const filteredIds = idsToRemove.filter((id) => id !== page.root.id);
    if (filteredIds.length === 0) return;

    const newRoot = removeNodes(page.root, filteredIds);
    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: null,
      selectedNodeIds: [],
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateNodeProps: (nodeId: string, props: Record<string, any>) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      props: { ...curr.props, ...props },
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateNodeStyles: (nodeId: string, styles: Partial<ComponentStyles>) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      styles: { ...curr.styles, ...styles },
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateNodeResponsiveStyles: (nodeId: string, viewport: ViewportMode, styles: Partial<ComponentStyles>) => {
    if (viewport === 'desktop') {
      get().updateNodeStyles(nodeId, styles);
      return;
    }

    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const resp = curr.responsiveStyles || {};
      const currentViewportStyles = resp[viewport] || {};
      return {
        ...curr,
        responsiveStyles: {
          ...resp,
          [viewport]: { ...currentViewportStyles, ...styles },
        },
      };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  resetResponsiveStyle: (nodeId: string, viewport: ViewportMode, styleKey: string) => {
    if (viewport === 'desktop') return;

    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      if (!curr.responsiveStyles || !curr.responsiveStyles[viewport]) return curr;
      const copy = { ...curr.responsiveStyles[viewport] };
      delete (copy as any)[styleKey];
      return {
        ...curr,
        responsiveStyles: {
          ...curr.responsiveStyles,
          [viewport]: copy,
        },
      };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  moveNode: (nodeId: string, targetParentId: string, index?: number) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = moveNode(page.root, nodeId, targetParentId, index);

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: nodeId,
      selectedNodeIds: [nodeId],
      saveStatus: 'unsaved',
    });
    get().save();
  },

  moveSelectedNodesKeyboard: (dx: number, dy: number) => {
    const { project, activePageId, selectedNodeIds, selectedNodeId } = get();
    const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targetIds.length === 0) return;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    let updatedRoot = page.root;

    for (const id of targetIds) {
      const node = findNode(updatedRoot, id);
      if (!node) continue;
      // If element is positioned (relative/absolute), nudge top/left. Otherwise adjust margin.
      const isPositioned = node.styles.position === 'relative' || node.styles.position === 'absolute';
      if (isPositioned) {
        const curLeft = parseInt(node.styles.left || '0', 10) || 0;
        const curTop = parseInt(node.styles.top || '0', 10) || 0;
        updatedRoot = updateNode(updatedRoot, id, (curr) => ({
          ...curr,
          styles: {
            ...curr.styles,
            left: `${curLeft + dx}px`,
            top: `${curTop + dy}px`,
          },
        }));
      } else {
        const curMarginLeft = parseInt(node.styles.marginLeft || node.styles.margin || '0', 10) || 0;
        const curMarginTop = parseInt(node.styles.marginTop || node.styles.margin || '0', 10) || 0;
        updatedRoot = updateNode(updatedRoot, id, (curr) => ({
          ...curr,
          styles: {
            ...curr.styles,
            marginLeft: `${curMarginLeft + dx}px`,
            marginTop: `${curMarginTop + dy}px`,
          },
        }));
      }
    }

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: updatedRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(get().history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  duplicateNode: (nodeId: string): string | null => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return null;

    const page = project.pages[pageIndex];
    const result = duplicateNode(page.root, nodeId);
    if (!result) return null;

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: result.newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: result.duplicatedNodeId,
      selectedNodeIds: [result.duplicatedNodeId],
      saveStatus: 'unsaved',
    });
    get().save();
    return result.duplicatedNodeId;
  },

  duplicateSelectedNodes: (): string[] => {
    const { selectedNodeIds, selectedNodeId } = get();
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    const newIds: string[] = [];
    for (const id of targets) {
      const duplicated = get().duplicateNode(id);
      if (duplicated) newIds.push(duplicated);
    }
    if (newIds.length > 0) {
      set({ selectedNodeIds: newIds, selectedNodeId: newIds[0] });
    }
    return newIds;
  },

  renameNode: (nodeId: string, name: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      name: name.trim() || curr.name,
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  setNodeVisibility: (nodeId: string, visible: boolean, viewport?: ViewportMode) => {
    const targetViewport = viewport || get().viewport;
    if (targetViewport === 'desktop') {
      get().updateNodeStyles(nodeId, { visibility: visible ? 'visible' : 'hidden' });
    } else {
      get().updateNodeResponsiveStyles(nodeId, targetViewport, {
        visibility: visible ? 'visible' : 'hidden',
      });
    }
  },

  // Page Operations
  addPage: (name: string, slug?: string): string => {
    const { project, history } = get();
    const newPage = createNewPage(name, slug, project.pages);
    const updatedProject = {
      ...project,
      pages: [...project.pages, newPage],
    };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      activePageId: newPage.id,
      selectedNodeId: null,
      selectedNodeIds: [],
      saveStatus: 'unsaved',
    });
    get().save();
    return newPage.id;
  },

  duplicatePage: (pageId: string): string | null => {
    const { project, history } = get();
    const sourcePage = project.pages.find((p) => p.id === pageId);
    if (!sourcePage) return null;

    const clonedPage = duplicatePage(sourcePage, project.pages);
    const updatedProject = {
      ...project,
      pages: [...project.pages, clonedPage],
    };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      activePageId: clonedPage.id,
      selectedNodeId: null,
      selectedNodeIds: [],
      saveStatus: 'unsaved',
    });
    get().save();
    return clonedPage.id;
  },

  removePage: (pageId: string) => {
    const { project, history, activePageId } = get();
    if (project.pages.length <= 1) return; // Prevent deleting only page

    const remainingPages = project.pages.filter((p) => p.id !== pageId);
    const nextActive = activePageId === pageId ? remainingPages[0].id : activePageId;
    const updatedProject = { ...project, pages: remainingPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      activePageId: nextActive,
      selectedNodeId: null,
      selectedNodeIds: [],
      saveStatus: 'unsaved',
    });
    get().save();
  },

  renamePage: (pageId: string, name: string) => {
    const { project, history } = get();
    const updatedPages = project.pages.map((p) =>
      p.id === pageId ? { ...p, name: name.trim() || p.name } : p
    );
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updatePageSlug: (pageId: string, rawSlug: string) => {
    const { project, history } = get();
    const normalized = normalizeSlug(rawSlug, project.pages, pageId);
    const updatedPages = project.pages.map((p) =>
      p.id === pageId ? { ...p, slug: normalized } : p
    );
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  setActivePage: (pageId: string) => {
    const { project } = get();
    if (project.pages.some((p) => p.id === pageId)) {
      set({
        activePageId: pageId,
        selectedNodeId: null,
        selectedNodeIds: [],
      });
    }
  },

  // Asset Operations
  addAsset: (asset: Asset) => {
    const { project } = get();
    const updatedAssets = [...(project.assets || []), asset];
    const updatedProject = { ...project, assets: updatedAssets };
    set({ project: updatedProject, saveStatus: 'unsaved' });
    get().save();
  },

  removeAsset: (assetId: string) => {
    const { project } = get();
    const updatedAssets = (project.assets || []).filter((a) => a.id !== assetId);
    const updatedProject = { ...project, assets: updatedAssets };
    set({ project: updatedProject, saveStatus: 'unsaved' });
    get().save();
  },

  renameAsset: (assetId: string, name: string) => {
    const { project } = get();
    const updatedAssets = (project.assets || []).map((a) =>
      a.id === assetId ? { ...a, name: name.trim() || a.name } : a
    );
    const updatedProject = { ...project, assets: updatedAssets };
    set({ project: updatedProject, saveStatus: 'unsaved' });
    get().save();
  },

  // Reusable Components & Variants
  createComponentDefinition: (name: string, sourceNodeId: string): string | null => {
    const { project, activePageId } = get();
    const page = project.pages.find((p) => p.id === activePageId);
    if (!page) return null;

    const sourceNode = findNode(page.root, sourceNodeId);
    if (!sourceNode) return null;

    const def = createComponentDefinitionFromNode(name, sourceNode);
    const updatedComponents = [...(project.components || []), def];
    const updatedProject = { ...project, components: updatedComponents };
    const newHistory = pushHistory(get().history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return def.id;
  },

  insertComponentInstance: (parentId: string, definitionId: string, index?: number): string | null => {
    const { project } = get();
    const def = (project.components || []).find((c) => c.id === definitionId);
    if (!def) return null;

    const instanceNode = instantiateComponentDefinition(def, parentId);
    get().addNode(parentId, instanceNode, index);
    return instanceNode.id;
  },

  renameComponentDefinition: (id: string, name: string) => {
    const { project } = get();
    const updatedComponents = (project.components || []).map((c) =>
      c.id === id ? { ...c, name: name.trim() || c.name } : c
    );
    const updatedProject = { ...project, components: updatedComponents };
    set({ project: updatedProject, saveStatus: 'unsaved' });
    get().save();
  },

  deleteComponentDefinition: (id: string) => {
    const { project } = get();
    const updatedComponents = (project.components || []).filter((c) => c.id !== id);
    const updatedProject = { ...project, components: updatedComponents };
    set({ project: updatedProject, saveStatus: 'unsaved' });
    get().save();
  },

  setComponentVariant: (nodeId: string, variantId: string) => {
    const { project, activePageId } = get();
    const page = project.pages.find((p) => p.id === activePageId);
    if (!page) return;

    const node = findNode(page.root, nodeId);
    if (!node) return;

    let variantProps = {};
    let variantStyles = {};

    if (node.componentInstanceId) {
      const def = (project.components || []).find((c) => c.id === node.componentInstanceId);
      const variant = def?.variants?.find((v) => v.id === variantId);
      if (variant) {
        if (variant.props) variantProps = variant.props;
        if (variant.styles) variantStyles = variant.styles;
      }
    }

    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      variantId,
      props: { ...curr.props, ...variantProps },
      styles: { ...curr.styles, ...variantStyles },
    }));

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(get().history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Layer Lock & Z-Order
  toggleLockNode: (nodeId: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      locked: !curr.locked,
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  changeNodeZOrder: (nodeId: string, action: ZOrderAction) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = changeZOrder(page.root, nodeId, action);

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Alignment, Distribution, Grouping
  alignSelectedNodes: (alignment: AlignmentType) => {
    const { project, history, activePageId, selectedNodeIds, selectedNodeId } = get();
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targets.length < 2) return;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = alignNodes(page.root, targets, alignment);

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  distributeSelectedNodes: (direction: DistributionDirection) => {
    const { project, history, activePageId, selectedNodeIds, selectedNodeId } = get();
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targets.length < 3) return;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = distributeNodes(page.root, targets, direction);

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  groupSelectedNodes: (): string | null => {
    const { project, history, activePageId, selectedNodeIds, selectedNodeId } = get();
    const targets = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (targets.length === 0) return null;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return null;

    const page = project.pages[pageIndex];
    const { newRoot, groupId } = groupNodes(page.root, targets);
    if (!groupId) return null;

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      selectedNodeId: groupId,
      selectedNodeIds: [groupId],
      saveStatus: 'unsaved',
    });
    get().save();
    return groupId;
  },

  // Responsive Reset All
  resetAllResponsiveOverrides: (nodeId: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      responsiveStyles: {},
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Design Tokens Operations
  addToken: (token: DesignToken) => {
    const { project, history } = get();
    const updatedTokens = [...(project.tokens || []), token];
    const updatedProject = { ...project, tokens: updatedTokens };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateToken: (tokenId: string, updates: Partial<DesignToken>) => {
    const { project, history } = get();
    const updatedTokens = (project.tokens || []).map((t) =>
      t.id === tokenId ? { ...t, ...updates } : t
    );
    const updatedProject = { ...project, tokens: updatedTokens };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  deleteToken: (
    tokenId: string,
    fallbackOption?: 'replace' | 'remove',
    replacementTokenId?: string
  ): { success: boolean; affectedCount: number } => {
    const { project, history } = get();
    let totalReferences = 0;

    for (const p of project.pages) {
      const matches = findTokenReferences(p.root, tokenId);
      totalReferences += matches.length;
    }

    if (totalReferences > 0 && !fallbackOption) {
      return { success: false, affectedCount: totalReferences };
    }

    // Process replacement or removal
    const updatedPages = project.pages.map((p) => ({
      ...p,
      root: replaceTokenReferencesInTree(
        p.root,
        tokenId,
        fallbackOption === 'replace' ? replacementTokenId || null : null
      ),
    }));

    const updatedTokens = (project.tokens || []).filter((t) => t.id !== tokenId);
    const updatedProject = { ...project, tokens: updatedTokens, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return { success: true, affectedCount: totalReferences };
  },

  applyTokenToNode: (nodeId: string, property: string, tokenId: string) => {
    const { project, history, activePageId } = get();
    const token = (project.tokens || []).find((t) => t.id === tokenId);
    if (!token) return;

    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const tokenReferences = { ...(curr.tokenReferences || {}), [property]: tokenId };
      const styles = { ...curr.styles };
      if (typeof token.value === 'string') {
        styles[property as keyof ComponentStyles] = token.value as any;
      } else if (typeof token.value === 'object') {
        Object.assign(styles, token.value);
      }
      return { ...curr, tokenReferences, styles };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeTokenFromNode: (nodeId: string, property: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      if (!curr.tokenReferences) return curr;
      const copy = { ...curr.tokenReferences };
      delete copy[property];
      return {
        ...curr,
        tokenReferences: Object.keys(copy).length > 0 ? copy : undefined,
      };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Component States Operations
  setActiveInspectorTab: (tab: 'properties' | 'states' | 'interactions' | 'logic') =>
    set({ activeInspectorTab: tab }),

  setActiveComponentState: (state: ComponentStateMode) =>
    set({ activeComponentState: state }),

  updateNodeStateStyles: (nodeId: string, state: ComponentStateMode, styles: Partial<ComponentStyles>) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const currentStates = curr.states || {};
      const targetState = currentStates[state] || {};
      return {
        ...curr,
        states: {
          ...currentStates,
          [state]: {
            ...targetState,
            ...styles,
          },
        },
      };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Interactions Operations
  addNodeInteraction: (nodeId: string, interaction: ComponentInteraction) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      interactions: [...(curr.interactions || []), interaction],
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateNodeInteraction: (nodeId: string, index: number, interaction: ComponentInteraction) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const inters = [...(curr.interactions || [])];
      if (index >= 0 && index < inters.length) {
        inters[index] = interaction;
      }
      return { ...curr, interactions: inters };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeNodeInteraction: (nodeId: string, index: number) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const inters = (curr.interactions || []).filter((_, i) => i !== index);
      return { ...curr, interactions: inters };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Preview Runtime Operations
  setPreviewVisibleOverride: (nodeId: string, visible: boolean) =>
    set((s) => ({
      previewVisibleOverrides: { ...s.previewVisibleOverrides, [nodeId]: visible },
    })),

  togglePreviewVisibleOverride: (nodeId: string) =>
    set((s) => ({
      previewVisibleOverrides: {
        ...s.previewVisibleOverrides,
        [nodeId]: s.previewVisibleOverrides[nodeId] === undefined ? false : !s.previewVisibleOverrides[nodeId],
      },
    })),

  resetPreviewRuntimeState: () => set({ previewVisibleOverrides: {} }),

  // Data Collections Operations (Phase 4)
  addCollection: (collection: DataCollection) => {
    const { project, history } = get();
    const updatedCollections = [...(project.collections || []), collection];
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateCollection: (collectionId: string, updates: Partial<DataCollection>) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) =>
      c.id === collectionId ? { ...c, ...updates } : c
    );
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  deleteCollection: (collectionId: string) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).filter((c) => c.id !== collectionId);
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  duplicateCollection: (collectionId: string): string | null => {
    const { project, history } = get();
    const target = (project.collections || []).find((c) => c.id === collectionId);
    if (!target) return null;

    const newId = `col_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const cloned: DataCollection = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} (Copy)`,
    };
    const updatedCollections = [...(project.collections || []), cloned];
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return newId;
  },

  addField: (collectionId: string, field: DataField) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        fields: [...c.fields, field],
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateField: (collectionId: string, fieldId: string, updates: Partial<DataField>) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        fields: c.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  deleteField: (collectionId: string, fieldId: string) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        fields: c.fields.filter((f) => f.id !== fieldId),
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  addRecord: (collectionId: string, record: DataRecord) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        records: [...c.records, record],
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateRecord: (collectionId: string, recordId: string, values: Record<string, any>) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        records: c.records.map((r) =>
          r.id === recordId ? { ...r, values: { ...r.values, ...values } } : r
        ),
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  deleteRecord: (collectionId: string, recordId: string) => {
    const { project, history } = get();
    const updatedCollections = (project.collections || []).map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        records: c.records.filter((r) => r.id !== recordId),
      };
    });
    const updatedProject = { ...project, collections: updatedCollections };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Variables Operations (Phase 4)
  addVariable: (variable: Variable): boolean => {
    const { project, history } = get();
    const existing = (project.variables || []).some(
      (v) => v.name.toLowerCase() === variable.name.toLowerCase()
    );
    if (existing) return false;

    const updatedVariables = [...(project.variables || []), variable];
    const updatedProject = { ...project, variables: updatedVariables };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return true;
  },

  updateVariable: (variableId: string, updates: Partial<Variable>): boolean => {
    const { project, history } = get();
    if (updates.name) {
      const conflict = (project.variables || []).some(
        (v) => v.id !== variableId && v.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (conflict) return false;
    }

    const updatedVariables = (project.variables || []).map((v) =>
      v.id === variableId ? { ...v, ...updates } : v
    );
    const updatedProject = { ...project, variables: updatedVariables };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return true;
  },

  deleteVariable: (variableId: string, force = false): { success: boolean; referencesCount?: number } => {
    const { project, history } = get();
    const target = (project.variables || []).find((v) => v.id === variableId);
    if (!target) return { success: false };

    let refCount = 0;
    const varNamePattern = target.name;

    function checkNode(node: ComponentNode) {
      if (node.props?.boundVariable === varNamePattern || node.props?.boundVariable === target!.id) {
        refCount++;
      }
      if (node.bindings) {
        for (const b of Object.values(node.bindings)) {
          if (b.expression && b.expression.includes(varNamePattern)) {
            refCount++;
          }
        }
      }
      if (node.logicRules) {
        for (const rule of node.logicRules) {
          if (rule.actions) {
            for (const act of rule.actions) {
              if (act.variableName === varNamePattern) refCount++;
              if (
                act.valueExpression &&
                typeof act.valueExpression === 'string' &&
                act.valueExpression.includes(varNamePattern)
              ) {
                refCount++;
              }
            }
          }
        }
      }
      if (node.children) {
        node.children.forEach(checkNode);
      }
    }

    for (const page of project.pages) {
      checkNode(page.root);
    }

    if (refCount > 0 && !force) {
      return { success: false, referencesCount: refCount };
    }

    const updatedVariables = (project.variables || []).filter((v) => v.id !== variableId);
    const updatedProject = { ...project, variables: updatedVariables };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
    return { success: true, referencesCount: refCount };
  },

  // Data Bindings Operations (Phase 4)
  setNodeBinding: (nodeId: string, propertyPath: string, binding: ComponentBinding) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      bindings: {
        ...(curr.bindings || {}),
        [propertyPath]: binding,
      },
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeNodeBinding: (nodeId: string, propertyPath: string) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      if (!curr.bindings) return curr;
      const copy = { ...curr.bindings };
      delete copy[propertyPath];
      return {
        ...curr,
        bindings: copy,
      };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Logic Rules Operations (Phase 4)
  addNodeLogicRule: (nodeId: string, rule: LogicRule) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      logicRules: [...(curr.logicRules || []), rule],
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  updateNodeLogicRule: (nodeId: string, index: number, rule: LogicRule) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const copy = [...(curr.logicRules || [])];
      if (index >= 0 && index < copy.length) {
        copy[index] = rule;
      }
      return { ...curr, logicRules: copy };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  removeNodeLogicRule: (nodeId: string, index: number) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => {
      const copy = [...(curr.logicRules || [])];
      if (index >= 0 && index < copy.length) {
        copy.splice(index, 1);
      }
      return { ...curr, logicRules: copy };
    });

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Conditional Visibility Operations (Phase 4)
  setNodeConditionalVisibility: (nodeId: string, visibility?: ConditionalVisibility) => {
    const { project, history, activePageId } = get();
    const pageIndex = project.pages.findIndex((p) => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = project.pages[pageIndex];
    const newRoot = updateNode(page.root, nodeId, (curr) => ({
      ...curr,
      conditionalVisibility: visibility,
    }));

    const updatedPages = [...project.pages];
    updatedPages[pageIndex] = { ...page, root: newRoot };
    const updatedProject = { ...project, pages: updatedPages };
    const newHistory = pushHistory(history, project);

    set({
      project: updatedProject,
      history: newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  // Phase 5: Cloud, Authentication, Environments, API & Deployments
  updateAuthConfig: (updates: Partial<AuthConfig>) => {
    const { project, history } = get();
    const current = project.authConfig || {
      provider: 'mock',
      enabled: false,
      allowUserRegistration: true,
      persistSession: true,
    };
    const updatedProject: AppProject = {
      ...project,
      authConfig: { ...current, ...updates },
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  updateEnvironmentConfig: (updates: Partial<EnvironmentConfig>) => {
    const { project, history } = get();
    const current = project.environments || {
      activeEnvironment: 'development',
      environments: {
        development: { name: 'Development', isProduction: false },
        preview: { name: 'Preview', isProduction: false },
        production: { name: 'Production', isProduction: true },
      },
    };
    const updatedProject: AppProject = {
      ...project,
      environments: { ...current, ...updates },
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  setActiveEnvironment: (env: EnvironmentName) => {
    const { project, history } = get();
    const current = project.environments || {
      activeEnvironment: 'development',
      environments: {
        development: { name: 'Development', isProduction: false },
        preview: { name: 'Preview', isProduction: false },
        production: { name: 'Production', isProduction: true },
      },
    };
    const updatedProject: AppProject = {
      ...project,
      environments: { ...current, activeEnvironment: env },
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  updateCloudConfig: (updates: Partial<CloudConfig>) => {
    const { project, history } = get();
    const current = project.cloudConfig || {
      provider: 'mock',
      projectUrl: '',
      anonKey: '',
      status: 'disconnected',
    };
    const updatedProject: AppProject = {
      ...project,
      cloudConfig: { ...current, ...updates },
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  updateDeploymentConfig: (updates: Partial<DeploymentConfig>) => {
    const { project, history } = get();
    const current = project.deploymentConfig || { deployments: [] };
    const updatedProject: AppProject = {
      ...project,
      deploymentConfig: { ...current, ...updates },
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  addApiConnector: (connector: ApiConnector) => {
    const { project, history } = get();
    const updatedProject: AppProject = {
      ...project,
      apiConnectors: [...(project.apiConnectors || []), connector],
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  updateApiConnector: (connectorId: string, updates: Partial<ApiConnector>) => {
    const { project, history } = get();
    const updatedProject: AppProject = {
      ...project,
      apiConnectors: (project.apiConnectors || []).map((c) =>
        c.id === connectorId ? { ...c, ...updates } : c
      ),
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  deleteApiConnector: (connectorId: string) => {
    const { project, history } = get();
    const updatedProject: AppProject = {
      ...project,
      apiConnectors: (project.apiConnectors || []).filter((c) => c.id !== connectorId),
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  setPageAuthProtection: (
    pageId: string,
    protection?: { requireAuth: boolean; allowedRoles?: string[]; redirectTo?: string }
  ) => {
    const { project, history } = get();
    const updatedProject: AppProject = {
      ...project,
      pages: project.pages.map((p) =>
        p.id === pageId ? { ...p, authProtection: protection } : p
      ),
    };
    const newHistory = pushHistory(history, project);
    set({ project: updatedProject, history: newHistory, saveStatus: 'unsaved' });
    get().save();
  },

  // Transactions
  beginTransaction: () => {
    const { history, project } = get();
    set({ history: beginTransaction(history, project) });
  },

  commitTransaction: () => {
    const { history, project } = get();
    set({
      history: commitTransaction(history, project),
      saveStatus: 'unsaved',
    });
    get().save();
  },

  cancelTransaction: () => {
    const { history } = get();
    const { restoredProject, newHistory } = cancelTransaction(history);
    if (restoredProject) {
      set({ project: restoredProject, history: newHistory });
    }
  },

  undo: () => {
    const { history, project } = get();
    const result = undoHistory(history, project);
    if (!result) return;

    set({
      project: result.newProject,
      history: result.newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  redo: () => {
    const { history, project } = get();
    const result = redoHistory(history, project);
    if (!result) return;

    set({
      project: result.newProject,
      history: result.newHistory,
      saveStatus: 'unsaved',
    });
    get().save();
  },

  save: () => {
    set({ saveStatus: 'saving' });
    const { project } = get();
    const success = saveProjectToStorage(project);
    setTimeout(() => {
      set({ saveStatus: success ? 'saved' : 'unsaved' });
    }, 250);
  },
}));
