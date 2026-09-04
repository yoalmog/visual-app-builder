import { create } from 'zustand';
import {
  AppProject,
  ComponentNode,
  EditorMode,
  HistorySnapshot,
  StyleProperties,
  ViewportMode,
  Workflow,
  Collection,
  Page,
} from '@/types/schema';
import { COMPONENT_REGISTRY } from '../registry';
import { createBlankTemplate, createModernStoreTemplate } from '../templates';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'visual_app_builder_active_project';

interface EditorState {
  project: AppProject;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  viewport: ViewportMode;
  customViewportWidth: number;
  zoom: number;
  activeMode: EditorMode;
  activeBottomTab: 'pages' | 'layers' | 'data' | 'workflows' | 'assets' | 'ai' | null;
  isPreviewMode: boolean;
  draggedComponentType: string | null;
  dragOverNodeId: string | null;
  dropPosition: 'inside' | 'before' | 'after' | null;
  clipboardNode: ComponentNode | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  toastMessage: string | null;
  isPublishModalOpen: boolean;
  history: {
    past: HistorySnapshot[];
    future: HistorySnapshot[];
  };

  // Actions
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setViewport: (viewport: ViewportMode) => void;
  setCustomViewportWidth: (width: number) => void;
  setZoom: (zoom: number) => void;
  setActiveMode: (mode: EditorMode) => void;
  setActiveBottomTab: (tab: 'pages' | 'layers' | 'data' | 'workflows' | 'assets' | 'ai' | null) => void;
  togglePreview: (preview?: boolean) => void;
  showToast: (msg: string) => void;
  setPublishModalOpen: (open: boolean) => void;

  // Drag & Drop
  setDraggedComponentType: (type: string | null) => void;
  setDragOverNode: (id: string | null, pos?: 'inside' | 'before' | 'after' | null) => void;
  addNode: (type: string, targetParentId?: string | null, index?: number) => string;
  moveNode: (nodeId: string, newParentId: string, index?: number) => void;

  // Node editing
  updateNodeProps: (id: string, props: Partial<Record<string, any>>) => void;
  updateNodeStyles: (id: string, styles: Partial<StyleProperties>, breakpoint?: 'desktop' | 'tablet' | 'mobile') => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => string;
  copyNode: (id: string) => void;
  pasteNode: (targetParentId?: string | null) => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  renameNode: (id: string, name: string) => void;

  // Pages
  addPage: (name: string, slug: string) => void;
  switchPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;

  // Collections & Workflows
  addCollection: (name: string, key: string) => void;
  addRecord: (collectionKey: string, record: Record<string, any>) => void;
  updateRecord: (collectionKey: string, index: number, record: Record<string, any>) => void;
  deleteRecord: (collectionKey: string, index: number) => void;
  addWorkflow: (name: string, triggerEvent: string) => void;

  // History & Storage
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  saveProject: () => void;
  loadProject: (project: AppProject) => void;
  resetProject: (templateName?: 'modern-store' | 'blank') => void;
}

function getInitialProject(): AppProject {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved project from localStorage', e);
      }
    }
  }
  return createModernStoreTemplate();
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: getInitialProject(),
  selectedNodeId: null,
  hoveredNodeId: null,
  viewport: 'desktop',
  customViewportWidth: 1024,
  zoom: 1.0,
  activeMode: 'design',
  activeBottomTab: 'layers',
  isPreviewMode: false,
  draggedComponentType: null,
  dragOverNodeId: null,
  dropPosition: null,
  clipboardNode: null,
  isSaving: false,
  lastSavedAt: null,
  toastMessage: null,
  isPublishModalOpen: false,
  history: {
    past: [],
    future: [],
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setViewport: (viewport) => set({ viewport }),
  setCustomViewportWidth: (customViewportWidth) => set({ customViewportWidth }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 2.0) }),
  setActiveMode: (activeMode) => set({ activeMode }),
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
  togglePreview: (preview) =>
    set((state) => ({ isPreviewMode: preview !== undefined ? preview : !state.isPreviewMode })),

  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3200);
  },

  setPublishModalOpen: (isPublishModalOpen) => set({ isPublishModalOpen }),

  setDraggedComponentType: (draggedComponentType) => set({ draggedComponentType }),
  setDragOverNode: (dragOverNodeId, dropPosition = 'inside') => set({ dragOverNodeId, dropPosition }),

  pushHistory: () => {
    const { project, selectedNodeId, history } = get();
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(project.nodes)),
      pages: JSON.parse(JSON.stringify(project.pages)),
      activePageId: project.activePageId,
      selectedNodeId,
    };
    set({
      history: {
        past: [...history.past.slice(-25), snapshot],
        future: [],
      },
    });
  },

  undo: () => {
    const { history, project } = get();
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(project.nodes)),
      pages: JSON.parse(JSON.stringify(project.pages)),
      activePageId: project.activePageId,
      selectedNodeId: get().selectedNodeId,
    };

    set({
      project: {
        ...project,
        nodes: previous.nodes,
        pages: previous.pages,
        activePageId: previous.activePageId,
      },
      selectedNodeId: previous.selectedNodeId,
      history: {
        past: newPast,
        future: [currentSnapshot, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, project } = get();
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(project.nodes)),
      pages: JSON.parse(JSON.stringify(project.pages)),
      activePageId: project.activePageId,
      selectedNodeId: get().selectedNodeId,
    };

    set({
      project: {
        ...project,
        nodes: next.nodes,
        pages: next.pages,
        activePageId: next.activePageId,
      },
      selectedNodeId: next.selectedNodeId,
      history: {
        past: [...history.past, currentSnapshot],
        future: newFuture,
      },
    });
  },

  addNode: (type, targetParentId, index) => {
    const def = COMPONENT_REGISTRY[type];
    if (!def) return '';

    get().pushHistory();

    const { project } = get();
    const activePage = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
    const parentId = targetParentId || activePage.rootNodeId;

    const newNodeId = generateId(type);
    const newNode: ComponentNode = {
      id: newNodeId,
      type,
      name: `${def.label}`,
      props: JSON.parse(JSON.stringify(def.defaultProps)),
      styles: JSON.parse(JSON.stringify(def.defaultStyles)),
      children: [],
      parentId,
    };

    const newNodes = { ...project.nodes, [newNodeId]: newNode };

    // Update parent's children
    const parentNode = newNodes[parentId];
    if (parentNode) {
      const updatedChildren = [...parentNode.children];
      if (typeof index === 'number' && index >= 0 && index <= updatedChildren.length) {
        updatedChildren.splice(index, 0, newNodeId);
      } else {
        updatedChildren.push(newNodeId);
      }
      newNodes[parentId] = {
        ...parentNode,
        children: updatedChildren,
      };
    }

    set({
      project: { ...project, nodes: newNodes },
      selectedNodeId: newNodeId,
      draggedComponentType: null,
      dragOverNodeId: null,
      dropPosition: null,
    });

    return newNodeId;
  },

  moveNode: (nodeId, newParentId, index) => {
    const { project } = get();
    const node = project.nodes[nodeId];
    if (!node || nodeId === newParentId) return;

    // Prevent cyclic parent nesting
    let check: string | null = newParentId;
    while (check) {
      if (check === nodeId) return; // Cannot move parent into child
      check = project.nodes[check]?.parentId || null;
    }

    get().pushHistory();

    const newNodes = { ...project.nodes };
    const oldParentId = node.parentId;

    // Remove from old parent
    if (oldParentId && newNodes[oldParentId]) {
      newNodes[oldParentId] = {
        ...newNodes[oldParentId],
        children: newNodes[oldParentId].children.filter((id) => id !== nodeId),
      };
    }

    // Insert into new parent
    const targetParent = newNodes[newParentId];
    if (targetParent) {
      const newChildren = [...targetParent.children];
      if (typeof index === 'number' && index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, nodeId);
      } else {
        newChildren.push(nodeId);
      }
      newNodes[newParentId] = {
        ...targetParent,
        children: newChildren,
      };
    }

    // Update node parentId
    newNodes[nodeId] = {
      ...node,
      parentId: newParentId,
    };

    set({
      project: { ...project, nodes: newNodes },
      selectedNodeId: nodeId,
      dragOverNodeId: null,
      dropPosition: null,
    });
  },

  updateNodeProps: (id, props) => {
    get().pushHistory();
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;

    set({
      project: {
        ...project,
        nodes: {
          ...project.nodes,
          [id]: {
            ...node,
            props: { ...node.props, ...props },
          },
        },
      },
    });
  },

  updateNodeStyles: (id, styles, breakpoint = 'desktop') => {
    get().pushHistory();
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;

    if (breakpoint === 'desktop') {
      set({
        project: {
          ...project,
          nodes: {
            ...project.nodes,
            [id]: {
              ...node,
              styles: { ...node.styles, ...styles },
            },
          },
        },
      });
    } else {
      const currentResponsive = node.responsive || {};
      const currentBreakpoint = currentResponsive[breakpoint] || {};
      set({
        project: {
          ...project,
          nodes: {
            ...project.nodes,
            [id]: {
              ...node,
              responsive: {
                ...currentResponsive,
                [breakpoint]: { ...currentBreakpoint, ...styles },
              },
            },
          },
        },
      });
    }
  },

  deleteNode: (id) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node || !node.parentId) return; // Cannot delete root node

    get().pushHistory();

    const nodesToDelete = new Set<string>();
    const collectNodes = (currId: string) => {
      nodesToDelete.add(currId);
      const curr = project.nodes[currId];
      if (curr) {
        curr.children.forEach(collectNodes);
      }
    };
    collectNodes(id);

    const newNodes = { ...project.nodes };
    nodesToDelete.forEach((nodeId) => {
      delete newNodes[nodeId];
    });

    // Remove from parent
    const parentNode = newNodes[node.parentId];
    if (parentNode) {
      newNodes[node.parentId] = {
        ...parentNode,
        children: parentNode.children.filter((childId) => childId !== id),
      };
    }

    set({
      project: { ...project, nodes: newNodes },
      selectedNodeId: node.parentId,
    });
  },

  duplicateNode: (id) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node || !node.parentId) return '';

    get().pushHistory();

    const newNodes = { ...project.nodes };
    const cloneNode = (currId: string, parentId: string): string => {
      const source = project.nodes[currId];
      const newId = generateId(source.type);
      const clonedChildren: string[] = [];

      for (const childId of source.children) {
        clonedChildren.push(cloneNode(childId, newId));
      }

      newNodes[newId] = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        parentId,
        children: clonedChildren,
      };

      return newId;
    };

    const duplicateId = cloneNode(id, node.parentId);
    const parent = newNodes[node.parentId];
    if (parent) {
      const idx = parent.children.indexOf(id);
      const updatedChildren = [...parent.children];
      updatedChildren.splice(idx + 1, 0, duplicateId);
      newNodes[node.parentId] = {
        ...parent,
        children: updatedChildren,
      };
    }

    set({
      project: { ...project, nodes: newNodes },
      selectedNodeId: duplicateId,
    });

    return duplicateId;
  },

  copyNode: (id) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;
    set({ clipboardNode: JSON.parse(JSON.stringify(node)) });
    get().showToast(`Copied ${node.name} to clipboard`);
  },

  pasteNode: (targetParentId) => {
    const { clipboardNode, selectedNodeId, project } = get();
    if (!clipboardNode) return;

    const parentId = targetParentId || selectedNodeId || project.pages[0].rootNodeId;
    get().duplicateNode(clipboardNode.id);
  },

  toggleLock: (id) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;
    set({
      project: {
        ...project,
        nodes: {
          ...project.nodes,
          [id]: { ...node, isLocked: !node.isLocked },
        },
      },
    });
  },

  toggleHidden: (id) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;
    set({
      project: {
        ...project,
        nodes: {
          ...project.nodes,
          [id]: { ...node, isHidden: !node.isHidden },
        },
      },
    });
  },

  renameNode: (id, name) => {
    const { project } = get();
    const node = project.nodes[id];
    if (!node) return;
    set({
      project: {
        ...project,
        nodes: {
          ...project.nodes,
          [id]: { ...node, name },
        },
      },
    });
  },

  addPage: (name, slug) => {
    get().pushHistory();
    const { project } = get();
    const rootId = generateId('root');
    const newPage: Page = {
      id: generateId('page'),
      name,
      slug,
      rootNodeId: rootId,
    };

    const newRootNode: ComponentNode = {
      id: rootId,
      type: 'container',
      name: `${name} Root`,
      props: {},
      styles: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#07080C',
        color: '#FFFFFF',
        paddingTop: '24px',
        paddingBottom: '48px',
        paddingLeft: '32px',
        paddingRight: '32px',
        gap: '24px',
      },
      children: [],
      parentId: null,
    };

    set({
      project: {
        ...project,
        pages: [...project.pages, newPage],
        activePageId: newPage.id,
        nodes: {
          ...project.nodes,
          [rootId]: newRootNode,
        },
      },
      selectedNodeId: rootId,
    });
  },

  switchPage: (pageId) => {
    const { project } = get();
    const page = project.pages.find((p) => p.id === pageId);
    if (!page) return;
    set({
      project: { ...project, activePageId: pageId },
      selectedNodeId: page.rootNodeId,
    });
  },

  deletePage: (pageId) => {
    const { project } = get();
    if (project.pages.length <= 1) {
      get().showToast('Cannot delete the only page in the project');
      return;
    }
    get().pushHistory();
    const updatedPages = project.pages.filter((p) => p.id !== pageId);
    set({
      project: {
        ...project,
        pages: updatedPages,
        activePageId: updatedPages[0].id,
      },
      selectedNodeId: updatedPages[0].rootNodeId,
    });
  },

  duplicatePage: (pageId) => {
    const { project } = get();
    const page = project.pages.find((p) => p.id === pageId);
    if (!page) return;

    get().pushHistory();
    const newPageId = generateId('page');
    // Duplicate root node and its descendants
    const cloneMap = new Map<string, string>();

    const cloneDescendants = (nodeId: string, parentId: string | null): string => {
      const original = project.nodes[nodeId];
      if (!original) return '';
      const newId = generateId(original.type);
      cloneMap.set(nodeId, newId);

      const clonedChildren = original.children.map((c) => cloneDescendants(c, newId));

      project.nodes[newId] = {
        ...JSON.parse(JSON.stringify(original)),
        id: newId,
        parentId,
        children: clonedChildren,
      };
      return newId;
    };

    const newRootId = cloneDescendants(page.rootNodeId, null);

    const newPage: Page = {
      id: newPageId,
      name: `${page.name} (Copy)`,
      slug: `${page.slug}-copy`,
      rootNodeId: newRootId,
    };

    set({
      project: {
        ...project,
        pages: [...project.pages, newPage],
        activePageId: newPage.id,
      },
      selectedNodeId: newRootId,
    });
  },

  addCollection: (name, key) => {
    const { project } = get();
    const newCol: Collection = {
      id: generateId('col'),
      name,
      key,
      fields: [
        { id: 'f1', name: 'Name', key: 'name', type: 'text' },
        { id: 'f2', name: 'Value', key: 'value', type: 'text' },
      ],
      records: [
        { id: '1', name: 'Item 1', value: 'Alpha' },
        { id: '2', name: 'Item 2', value: 'Beta' },
      ],
    };
    set({
      project: {
        ...project,
        collections: [...project.collections, newCol],
      },
    });
    get().showToast(`Added collection: ${name}`);
  },

  addRecord: (collectionKey, record) => {
    const { project } = get();
    const cols = project.collections.map((col) => {
      if (col.key === collectionKey) {
        return {
          ...col,
          records: [...col.records, { id: generateId('rec'), ...record }],
        };
      }
      return col;
    });
    set({ project: { ...project, collections: cols } });
  },

  updateRecord: (collectionKey, index, record) => {
    const { project } = get();
    const cols = project.collections.map((col) => {
      if (col.key === collectionKey) {
        const updated = [...col.records];
        updated[index] = { ...updated[index], ...record };
        return { ...col, records: updated };
      }
      return col;
    });
    set({ project: { ...project, collections: cols } });
  },

  deleteRecord: (collectionKey, index) => {
    const { project } = get();
    const cols = project.collections.map((col) => {
      if (col.key === collectionKey) {
        const updated = [...col.records];
        updated.splice(index, 1);
        return { ...col, records: updated };
      }
      return col;
    });
    set({ project: { ...project, collections: cols } });
  },

  addWorkflow: (name, triggerEvent) => {
    const { project } = get();
    const newWf: Workflow = {
      id: generateId('wf'),
      name,
      triggerEvent,
      nodes: [
        { id: 't1', type: 'trigger', label: `On ${triggerEvent}`, config: {} },
        { id: 'a1', type: 'toast', label: 'Show Notification', config: { message: 'Action executed successfully!' } },
      ],
    };
    set({
      project: {
        ...project,
        workflows: [...project.workflows, newWf],
      },
    });
    get().showToast(`Workflow created: ${name}`);
  },

  saveProject: () => {
    set({ isSaving: true });
    const { project } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }
    setTimeout(() => {
      set({ isSaving: false, lastSavedAt: new Date() });
      get().showToast('Project saved successfully!');
    }, 400);
  },

  loadProject: (project) => {
    set({
      project,
      selectedNodeId: project.pages[0]?.rootNodeId || null,
      history: { past: [], future: [] },
    });
    get().showToast(`Project loaded: ${project.name}`);
  },

  resetProject: (templateName = 'modern-store') => {
    const tmpl = templateName === 'blank' ? createBlankTemplate() : createModernStoreTemplate();
    set({
      project: tmpl,
      selectedNodeId: tmpl.pages[0]?.rootNodeId || null,
      history: { past: [], future: [] },
    });
    get().showToast('Loaded template');
  },
}));
