import { AppProject } from '../schema/project';

export interface HistoryState {
  past: AppProject[];
  future: AppProject[];
  transactionBase?: AppProject | null;
}

export const MAX_HISTORY_LENGTH = 50;

export function createHistorySnapshot(project: AppProject): AppProject {
  return JSON.parse(JSON.stringify(project));
}

export function pushHistory(
  history: HistoryState,
  currentProject: AppProject
): HistoryState {
  return {
    past: [...history.past.slice(-MAX_HISTORY_LENGTH + 1), createHistorySnapshot(currentProject)],
    future: [],
    transactionBase: null,
  };
}

export function beginTransaction(
  history: HistoryState,
  currentProject: AppProject
): HistoryState {
  // If already in a transaction, don't overwrite the initial base snapshot
  if (history.transactionBase) return history;
  return {
    ...history,
    transactionBase: createHistorySnapshot(currentProject),
  };
}

export function commitTransaction(
  history: HistoryState,
  currentProject: AppProject
): HistoryState {
  if (!history.transactionBase) {
    return pushHistory(history, currentProject);
  }
  const base = history.transactionBase;
  return {
    past: [...history.past.slice(-MAX_HISTORY_LENGTH + 1), base],
    future: [],
    transactionBase: null,
  };
}

export function cancelTransaction(
  history: HistoryState
): { restoredProject: AppProject | null; newHistory: HistoryState } {
  if (!history.transactionBase) {
    return { restoredProject: null, newHistory: history };
  }
  const base = history.transactionBase;
  return {
    restoredProject: base,
    newHistory: {
      ...history,
      transactionBase: null,
    },
  };
}

export function undoHistory(
  history: HistoryState,
  currentProject: AppProject
): { newProject: AppProject; newHistory: HistoryState } | null {
  if (history.past.length === 0) return null;

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);

  return {
    newProject: previous,
    newHistory: {
      past: newPast,
      future: [createHistorySnapshot(currentProject), ...history.future],
      transactionBase: null,
    },
  };
}

export function redoHistory(
  history: HistoryState,
  currentProject: AppProject
): { newProject: AppProject; newHistory: HistoryState } | null {
  if (history.future.length === 0) return null;

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    newProject: next,
    newHistory: {
      past: [...history.past, createHistorySnapshot(currentProject)],
      future: newFuture,
      transactionBase: null,
    },
  };
}
