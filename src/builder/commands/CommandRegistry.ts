import { ApplicationCommand, CommandCategory, CommandContext } from './command-types';
import { useBuilderStore } from '../state/builder-store';
import { useProjectLifecycleStore } from '../lifecycle/useProjectLifecycleStore';
import { defaultProjectLifecycleManager } from '../lifecycle/ProjectLifecycleManager';
import { useAIStore } from '../../ai/state/ai-store';
import { usePlatformStore } from '../state/platform-store';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, ApplicationCommand> = new Map();

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
      CommandRegistry.instance.registerDefaultCommands();
    }
    return CommandRegistry.instance;
  }

  public registerCommand(command: ApplicationCommand): void {
    this.commands.set(command.id, command);
  }

  public unregisterCommand(id: string): void {
    this.commands.delete(id);
  }

  public getCommand(id: string): ApplicationCommand | undefined {
    return this.commands.get(id);
  }

  public getAllCommands(): ApplicationCommand[] {
    return Array.from(this.commands.values());
  }

  public getCommandsByCategory(category: CommandCategory): ApplicationCommand[] {
    return Array.from(this.commands.values()).filter((c) => c.category === category);
  }

  public async executeCommand(id: string, payload?: any): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`Command '${id}' not found in CommandRegistry.`);
      return false;
    }
    await cmd.execute(payload);
    return true;
  }

  public registerDefaultCommands(): void {
    // --- FILE COMMANDS ---
    this.registerCommand({
      id: 'file.new',
      category: 'file',
      label: 'New Project',
      labelHe: 'פרויקט חדש',
      shortcut: 'Ctrl+N',
      description: 'Create a new visual application project',
      isEnabled: () => true,
      execute: () => {
        const isDirty = useBuilderStore.getState().saveStatus === 'unsaved';
        if (isDirty) {
          useProjectLifecycleStore.getState().openModal('unsaved_changes', 'new');
        } else {
          useProjectLifecycleStore.getState().openModal('new_project');
        }
      },
    });

    this.registerCommand({
      id: 'file.open',
      category: 'file',
      label: 'Open Project...',
      labelHe: 'פתח פרויקט...',
      shortcut: 'Ctrl+O',
      description: 'Open an existing project from storage',
      isEnabled: () => true,
      execute: () => {
        const isDirty = useBuilderStore.getState().saveStatus === 'unsaved';
        if (isDirty) {
          useProjectLifecycleStore.getState().openModal('unsaved_changes', 'open');
        } else {
          useProjectLifecycleStore.getState().openModal('open_project');
        }
      },
    });

    this.registerCommand({
      id: 'file.save',
      category: 'file',
      label: 'Save',
      labelHe: 'שמור',
      shortcut: 'Ctrl+S',
      description: 'Save current project changes to persistent storage',
      isEnabled: (ctx) => ctx.hasProject && ctx.isDirty,
      getDisabledReason: (ctx) => {
        if (!ctx.hasProject) return 'No active project to save';
        if (!ctx.isDirty) return 'No unsaved changes';
        return null;
      },
      execute: () => {
        const project = useBuilderStore.getState().project;
        if (project) {
          useBuilderStore.getState().save();
          defaultProjectLifecycleManager.recordRecentProject(project);
        }
      },
    });

    this.registerCommand({
      id: 'file.saveAs',
      category: 'file',
      label: 'Save As...',
      labelHe: 'שמור בשם...',
      shortcut: 'Ctrl+Shift+S',
      description: 'Save a duplicate copy of the current project under a new identity',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('save_as');
      },
    });

    this.registerCommand({
      id: 'file.import',
      category: 'file',
      label: 'Import Project...',
      labelHe: 'ייבא פרויקט...',
      description: 'Import project from JSON data schema',
      isEnabled: () => true,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('import');
      },
    });

    this.registerCommand({
      id: 'file.export',
      category: 'file',
      label: 'Export Project...',
      labelHe: 'ייצא פרויקט...',
      description: 'Export current project as structured JSON schema',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project to export' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('export');
      },
    });

    this.registerCommand({
      id: 'file.close',
      category: 'file',
      label: 'Close Project',
      labelHe: 'סגור פרויקט',
      shortcut: 'Ctrl+W',
      description: 'Close active project and return to no-project state',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No project is currently open' : null),
      execute: () => {
        const isDirty = useBuilderStore.getState().saveStatus === 'unsaved';
        if (isDirty) {
          useProjectLifecycleStore.getState().openModal('unsaved_changes', 'close');
        } else {
          useProjectLifecycleStore.getState().setLifecycleState('NO_PROJECT');
        }
      },
    });

    this.registerCommand({
      id: 'file.exit',
      category: 'file',
      label: 'Exit',
      labelHe: 'יציאה',
      description: 'Exit application',
      isEnabled: () => true,
      execute: () => {
        const isDirty = useBuilderStore.getState().saveStatus === 'unsaved';
        if (isDirty) {
          useProjectLifecycleStore.getState().openModal('unsaved_changes', 'exit');
        } else {
          if (typeof window !== 'undefined') {
            window.close();
          }
        }
      },
    });

    // --- EDIT COMMANDS ---
    this.registerCommand({
      id: 'edit.undo',
      category: 'edit',
      label: 'Undo',
      labelHe: 'בטל',
      shortcut: 'Ctrl+Z',
      description: 'Undo last canvas or node operation',
      isEnabled: (ctx) => ctx.hasProject && ctx.canUndo,
      getDisabledReason: (ctx) => {
        if (!ctx.hasProject) return 'No active project';
        if (!ctx.canUndo) return 'No undo history available';
        return null;
      },
      execute: () => {
        useBuilderStore.getState().undo();
      },
    });

    this.registerCommand({
      id: 'edit.redo',
      category: 'edit',
      label: 'Redo',
      labelHe: 'בצע שוב',
      shortcut: 'Ctrl+Shift+Z',
      description: 'Redo undone canvas or node operation',
      isEnabled: (ctx) => ctx.hasProject && ctx.canRedo,
      getDisabledReason: (ctx) => {
        if (!ctx.hasProject) return 'No active project';
        if (!ctx.canRedo) return 'No redo history available';
        return null;
      },
      execute: () => {
        useBuilderStore.getState().redo();
      },
    });

    this.registerCommand({
      id: 'edit.cut',
      category: 'edit',
      label: 'Cut',
      labelHe: 'גזור',
      shortcut: 'Ctrl+X',
      description: 'Cut selected component nodes to clipboard',
      isEnabled: (ctx) => ctx.hasProject && ctx.hasSelection,
      getDisabledReason: (ctx) => (!ctx.hasSelection ? 'No node selected' : null),
      execute: () => {
        const state = useBuilderStore.getState();
        if (state.selectedNodeId) {
          state.removeNode(state.selectedNodeId);
        } else if (state.selectedNodeIds.length > 0) {
          state.removeSelectedNodes();
        }
      },
    });

    this.registerCommand({
      id: 'edit.copy',
      category: 'edit',
      label: 'Copy',
      labelHe: 'העתק',
      shortcut: 'Ctrl+C',
      description: 'Copy selected component nodes to clipboard',
      isEnabled: (ctx) => ctx.hasProject && ctx.hasSelection,
      getDisabledReason: (ctx) => (!ctx.hasSelection ? 'No node selected' : null),
      execute: () => {
        // Handled via native copy handler or clipboard store
      },
    });

    this.registerCommand({
      id: 'edit.paste',
      category: 'edit',
      label: 'Paste',
      labelHe: 'הדבק',
      shortcut: 'Ctrl+V',
      description: 'Paste component nodes from clipboard',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        // Handled via paste handler
      },
    });

    this.registerCommand({
      id: 'edit.selectAll',
      category: 'edit',
      label: 'Select All',
      labelHe: 'בחר הכל',
      shortcut: 'Ctrl+A',
      description: 'Select all top-level component nodes in the active page',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        const { project, activePageId, selectNodes } = useBuilderStore.getState();
        const page = project.pages.find((p: any) => p.id === activePageId) || project.pages[0];
        if (page?.root?.children) {
          const ids = page.root.children.map((c: any) => c.id);
          selectNodes(ids);
        }
      },
    });

    // --- PROJECT COMMANDS ---
    this.registerCommand({
      id: 'project.settings',
      category: 'project',
      label: 'Project Settings',
      labelHe: 'הגדרות פרויקט',
      description: 'Configure active project settings, theme, and tokens',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('project_settings');
      },
    });

    this.registerCommand({
      id: 'project.info',
      category: 'project',
      label: 'Project Information',
      labelHe: 'מידע על הפרויקט',
      description: 'Inspect project metadata, node statistics, and version details',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('project_info');
      },
    });

    this.registerCommand({
      id: 'project.validate',
      category: 'project',
      label: 'Validate Project',
      labelHe: 'אימות פרויקט',
      description: 'Validate project integrity against Schema v9',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'project.history',
      category: 'project',
      label: 'Project History',
      labelHe: 'היסטוריית פרויקט',
      description: 'Inspect undo/redo timeline and transaction log',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().setActiveInspectorTab('properties');
      },
    });

    this.registerCommand({
      id: 'project.export',
      category: 'project',
      label: 'Export',
      labelHe: 'ייצא',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('export');
      },
    });

    this.registerCommand({
      id: 'project.import',
      category: 'project',
      label: 'Import',
      labelHe: 'ייבא',
      isEnabled: () => true,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('import');
      },
    });

    this.registerCommand({
      id: 'project.close',
      category: 'project',
      label: 'Close Project',
      labelHe: 'סגור פרויקט',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        const isDirty = useBuilderStore.getState().saveStatus === 'unsaved';
        if (isDirty) {
          useProjectLifecycleStore.getState().openModal('unsaved_changes', 'close');
        } else {
          useProjectLifecycleStore.getState().setLifecycleState('NO_PROJECT');
        }
      },
    });

    // --- VIEW COMMANDS ---
    this.registerCommand({
      id: 'view.builder',
      category: 'view',
      label: 'Builder',
      labelHe: 'עורך ויזואלי',
      description: 'Switch to visual canvas designer',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().togglePreview(false);
      },
    });

    this.registerCommand({
      id: 'view.preview',
      category: 'view',
      label: 'Preview',
      labelHe: 'תצוגה מקדימה',
      shortcut: 'Ctrl+P',
      description: 'Toggle interactive runtime preview',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().togglePreview();
      },
    });

    this.registerCommand({
      id: 'view.explorer',
      category: 'view',
      label: 'Project Explorer',
      labelHe: 'סייר פרויקט',
      description: 'Open pages and component hierarchy tree',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        // Switches to pages panel
      },
    });

    this.registerCommand({
      id: 'view.aiAssistant',
      category: 'view',
      label: 'AI Assistant',
      labelHe: 'עוזר בינה מלאכותית',
      shortcut: 'Ctrl+K',
      description: 'Open AI Builder & Autonomous Assistant panel',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        const cur = useAIStore.getState().isOpen;
        useAIStore.getState().setOpen(!cur);
      },
    });

    this.registerCommand({
      id: 'view.verification',
      category: 'view',
      label: 'Verification',
      labelHe: 'אימות',
      description: 'Open Autonomous Verification Engine dashboard',
      isEnabled: (ctx) => ctx.hasProject && ctx.canVerify,
      getDisabledReason: (ctx) => (!ctx.canVerify ? 'Verification engine unavailable' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'view.recovery',
      category: 'view',
      label: 'Recovery',
      labelHe: 'שחזור',
      description: 'Open Autonomous Recovery Engine',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        defaultProjectLifecycleManager.recoverInterruptedOperation();
      },
    });

    this.registerCommand({
      id: 'view.history',
      category: 'view',
      label: 'History',
      labelHe: 'היסטוריה',
      description: 'Show project mutation history',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        // Opens history tab
      },
    });

    this.registerCommand({
      id: 'view.logs',
      category: 'view',
      label: 'Logs',
      labelHe: 'יומני מערכת',
      description: 'Show execution and security audit logs',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        usePlatformStore.getState().setEnterpriseSecurityOpen(true);
      },
    });

    this.registerCommand({
      id: 'view.resetLayout',
      category: 'view',
      label: 'Reset Layout',
      labelHe: 'אפס פריסה',
      description: 'Reset canvas zoom, pan, and inspector layout',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().setZoom(1.0);
        useBuilderStore.getState().setPanOffset({ x: 0, y: 0 });
        useBuilderStore.getState().setViewport('desktop');
      },
    });

    // --- AI COMMANDS ---
    this.registerCommand({
      id: 'ai.assistant',
      category: 'ai',
      label: 'AI Assistant',
      labelHe: 'עוזר בינה מלאכותית',
      isEnabled: (ctx) => ctx.hasProject,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No active project' : null),
      execute: () => {
        useAIStore.getState().setOpen(true);
      },
    });

    this.registerCommand({
      id: 'ai.generate',
      category: 'ai',
      label: 'Generate',
      labelHe: 'יצירה עם בינה מלאכותית',
      isEnabled: (ctx) => ctx.hasProject && !ctx.isGenerating,
      getDisabledReason: (ctx) => {
        if (!ctx.hasProject) return 'No active project';
        if (ctx.isGenerating) return 'Generation currently in progress';
        return null;
      },
      execute: () => {
        useAIStore.getState().setOpen(true);
        useAIStore.getState().setMode('generate');
      },
    });

    this.registerCommand({
      id: 'ai.edit',
      category: 'ai',
      label: 'Edit with AI',
      labelHe: 'עריכה עם בינה מלאכותית',
      isEnabled: (ctx) => ctx.hasProject && ctx.hasSelection,
      getDisabledReason: (ctx) => (!ctx.hasSelection ? 'Select a component to edit' : null),
      execute: () => {
        useAIStore.getState().setOpen(true);
        useAIStore.getState().setMode('agent');
      },
    });

    this.registerCommand({
      id: 'ai.debug',
      category: 'ai',
      label: 'Debug with AI',
      labelHe: 'ניפוי שגיאות עם בינה מלאכותית',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useAIStore.getState().setOpen(true);
      },
    });

    this.registerCommand({
      id: 'ai.verify',
      category: 'ai',
      label: 'Verify',
      labelHe: 'אימות אוטונומי',
      isEnabled: (ctx) => ctx.hasProject && ctx.canVerify,
      getDisabledReason: (ctx) => (!ctx.hasProject ? 'No project open' : null),
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'ai.recover',
      category: 'ai',
      label: 'Recover',
      labelHe: 'שחזור אוטונומי',
      isEnabled: (ctx) => ctx.hasProject && ctx.hasRecoveryFailure,
      getDisabledReason: (ctx) => {
        if (!ctx.hasProject) return 'No active project';
        if (!ctx.hasRecoveryFailure) return 'No recoverable failure present';
        return null;
      },
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'ai.autonomy',
      category: 'ai',
      label: 'Autonomy Settings',
      labelHe: 'הגדרות אוטונומיה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useAIStore.getState().setOpen(true);
      },
    });

    this.registerCommand({
      id: 'ai.activity',
      category: 'ai',
      label: 'AI Activity',
      labelHe: 'פעילות בינה מלאכותית',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useAIStore.getState().setOpen(true);
      },
    });

    // --- RUN COMMANDS ---
    this.registerCommand({
      id: 'run.preview',
      category: 'run',
      label: 'Preview',
      labelHe: 'תצוגה מקדימה',
      shortcut: 'Ctrl+P',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().togglePreview();
      },
    });

    this.registerCommand({
      id: 'run.runApp',
      category: 'run',
      label: 'Run Application',
      labelHe: 'הפעל יישום',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().togglePreview(true);
      },
    });

    this.registerCommand({
      id: 'run.stop',
      category: 'run',
      label: 'Stop',
      labelHe: 'עצור',
      isEnabled: (ctx) => ctx.hasProject && ctx.isPreview,
      getDisabledReason: (ctx) => (!ctx.isPreview ? 'Application is not running' : null),
      execute: () => {
        useBuilderStore.getState().togglePreview(false);
      },
    });

    this.registerCommand({
      id: 'run.verifyRuntime',
      category: 'run',
      label: 'Verify Runtime',
      labelHe: 'אימות זמן ריצה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'run.openPreview',
      category: 'run',
      label: 'Open Preview',
      labelHe: 'פתח תצוגה מקדימה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useBuilderStore.getState().togglePreview(true);
      },
    });

    // --- BUILD COMMANDS ---
    this.registerCommand({
      id: 'build.validate',
      category: 'build',
      label: 'Validate',
      labelHe: 'אימות מבנה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'build.build',
      category: 'build',
      label: 'Build',
      labelHe: 'בנייה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'build.verifyBuild',
      category: 'build',
      label: 'Verify Build',
      labelHe: 'אימות בנייה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'build.diagnostics',
      category: 'build',
      label: 'Build Diagnostics',
      labelHe: 'אבחון בנייה',
      isEnabled: (ctx) => ctx.hasProject,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    // --- HELP COMMANDS ---
    this.registerCommand({
      id: 'help.docs',
      category: 'help',
      label: 'Documentation',
      labelHe: 'תיעוד',
      isEnabled: () => true,
      execute: () => {
        if (typeof window !== 'undefined') {
          window.open('https://github.com/yoalmog/visual-app-builder', '_blank');
        }
      },
    });

    this.registerCommand({
      id: 'help.shortcuts',
      category: 'help',
      label: 'Keyboard Shortcuts',
      labelHe: 'קיצורי מקשים',
      shortcut: 'F1',
      isEnabled: () => true,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('shortcuts');
      },
    });

    this.registerCommand({
      id: 'help.troubleshooting',
      category: 'help',
      label: 'Troubleshooting',
      labelHe: 'פתרון בעיות',
      isEnabled: () => true,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('build_diagnostics');
      },
    });

    this.registerCommand({
      id: 'help.report',
      category: 'help',
      label: 'Report Problem',
      labelHe: 'דווח על בעיה',
      isEnabled: () => true,
      execute: () => {
        if (typeof window !== 'undefined') {
          window.open('https://github.com/yoalmog/visual-app-builder/issues', '_blank');
        }
      },
    });

    this.registerCommand({
      id: 'help.about',
      category: 'help',
      label: 'About',
      labelHe: 'אודות',
      isEnabled: () => true,
      execute: () => {
        useProjectLifecycleStore.getState().openModal('about');
      },
    });
  }
}

export const defaultCommandRegistry = CommandRegistry.getInstance();
