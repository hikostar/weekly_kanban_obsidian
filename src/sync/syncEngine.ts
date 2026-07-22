import type { Board } from '../domain/kanban.js';
import { ok, type Result } from '../shared/result.js';

export type SyncState = 'idle' | 'syncing' | 'conflict' | 'error';

export type KanbanEvent =
  | { type: 'board-updated'; board: Board }
  | { type: 'board-loaded'; board: Board; path: string }
  | { type: 'card-created'; cardId: string }
  | { type: 'card-updated'; cardId: string }
  | { type: 'card-moved'; cardId: string; targetColumn: 'ToDo' | 'Doing' | 'Done' }
  | { type: 'card-deleted'; cardId: string }
  | { type: 'sync-state'; state: SyncState; message?: string };

export interface KanbanChangeset {
  events: KanbanEvent[];
  enqueuedAt: Date;
}

export interface SyncContext {
  state: SyncState;
  path: string | undefined;
  board: Board | undefined;
  lastSyncTime: Date | undefined;
  errorMessage: string | undefined;
  conflictMessage: string | undefined;
  pendingChanges: KanbanChangeset[];
}

export interface SyncError {
  code: 'NO_TARGET_PATH' | 'NO_PENDING_CHANGES' | 'INVALID_STATE';
  message: string;
}

export function createSyncContext(board?: Board, path?: string): SyncContext {
  return {
    state: 'idle',
    path,
    board,
    lastSyncTime: undefined,
    errorMessage: undefined,
    conflictMessage: undefined,
    pendingChanges: [],
  };
}

export function queueKanbanChange(context: SyncContext, event: KanbanEvent, timestamp = new Date()): SyncContext {
  return {
    ...context,
    pendingChanges: [
      ...context.pendingChanges,
      {
        events: [event],
        enqueuedAt: timestamp,
      },
    ],
  };
}

export function shouldFlushPendingChanges(context: SyncContext, now = new Date(), debounceMs = 300): boolean {
  if (context.pendingChanges.length === 0) {
    return false;
  }

  const latestEnqueue = context.pendingChanges[context.pendingChanges.length - 1]?.enqueuedAt;
  if (latestEnqueue === undefined) {
    return false;
  }

  return now.getTime() - latestEnqueue.getTime() >= debounceMs;
}

export function startSync(context: SyncContext): SyncContext {
  return {
    ...context,
    state: 'syncing',
    errorMessage: undefined,
    conflictMessage: undefined,
  };
}

export function finishSync(context: SyncContext, board: Board, timestamp = new Date()): SyncContext {
  return {
    ...context,
    state: 'idle',
    board,
    lastSyncTime: timestamp,
    pendingChanges: [],
    errorMessage: undefined,
    conflictMessage: undefined,
  };
}

export function setConflict(context: SyncContext, message: string): SyncContext {
  return {
    ...context,
    state: 'conflict',
    conflictMessage: message,
  };
}

export function setError(context: SyncContext, message: string): SyncContext {
  return {
    ...context,
    state: 'error',
    errorMessage: message,
  };
}

export function clearPendingChanges(context: SyncContext): SyncContext {
  return {
    ...context,
    pendingChanges: [],
  };
}

export function applyPendingChanges(context: SyncContext): Result<SyncContext, SyncError> {
  if (context.path === undefined || context.path.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: 'NO_TARGET_PATH',
        message: 'target path is not set',
      },
    };
  }

  if (context.pendingChanges.length === 0) {
    return {
      ok: false,
      error: {
        code: 'NO_PENDING_CHANGES',
        message: 'no pending changes to apply',
      },
    };
  }

  if (context.state === 'conflict') {
    return {
      ok: false,
      error: {
        code: 'INVALID_STATE',
        message: 'cannot apply changes while in conflict state',
      },
    };
  }

  return ok(startSync(context));
}