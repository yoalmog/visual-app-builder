export type CommandCategory =
  | 'file'
  | 'edit'
  | 'project'
  | 'view'
  | 'ai'
  | 'run'
  | 'build'
  | 'help';

export interface CommandContext {
  hasProject: boolean;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasClipboard: boolean;
  isPreview: boolean;
  isGenerating: boolean;
  hasRecoveryFailure: boolean;
  canVerify: boolean;
}

export interface ApplicationCommand {
  id: string;
  category: CommandCategory;
  label: string;
  labelHe: string;
  shortcut?: string;
  description?: string;
  isEnabled: (ctx: CommandContext) => boolean;
  getDisabledReason?: (ctx: CommandContext) => string | null;
  execute: (ctx?: any) => Promise<void> | void;
}
