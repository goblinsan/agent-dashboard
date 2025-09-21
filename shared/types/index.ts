// Shared Type Definitions

export interface Agent {
  id: string;
  name: string;
  apiKey?: string;
  role?: string;
  lastHeartbeat?: number;
  currentTaskId?: string;
}

// Align statuses with plan (Todo, In-Progress, Blocked, Done)
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  owner?: string; // singular primary owner for accountability
  assignees: string[]; // optional collaborators
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  version: number; // optimistic concurrency control
  rationaleLog: string[]; // decision/rationale snapshots
  linkedBugIds?: string[];
  deletedAt?: number; // epoch ms when soft-deleted (undefined => active)
}

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BugStatus = 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed';

export interface BugReport {
  id: string;
  title: string;
  description?: string;
  severity: BugSeverity;
  status: BugStatus;
  linkedTaskIds: string[];
  reproSteps: string[];
  proposedFix?: string;
  reporter?: string;
  createdAt: number;
  updatedAt: number;
  version?: number; // optimistic concurrency (added Phase 2 enhancement)
  deletedAt?: number; // epoch ms when soft-deleted
}

export interface Guideline {
  id: string;
  category: string;
  version: number;
  content: string;
  updatedAt: number;
}

export interface PrioritySummary {
  focusAreas: string[];
  sprintGoal?: string;
  lastUpdated: number;
}

export interface TransitionRequest {
  newStatus: Exclude<TaskStatus, 'todo'>;
  rationale: string;
  confidence?: number;
  expectedVersion: number;
}

export interface BugCreateRequest {
  title: string;
  severity: BugSeverity;
  linkedTaskIds?: string[];
  reproSteps: string[];
  proposedFix?: string;
}

// Status update entity (global or task-scoped)
export interface StatusUpdate {
  id: string;
  actor: string; // agent or user id
  taskId?: string; // optional linking (undefined => global/project scope)
  message: string; // concise update text (<= 500 chars recommended)
  createdAt: number; // epoch ms
}

// ADR-lite / design note
export interface DesignNote {
  id: string;
  title: string;
  context: string; // problem framing / intent
  decision: string; // chosen approach summary
  consequences: string; // trade-offs / follow-ups
  createdAt: number;
  supersededBy?: string; // forward link if replaced
  deletedAt?: number; // epoch ms when soft-deleted
}

// Audit log entry for all mutations
export interface AuditEntry {
  id: string;
  actor: string;
  entityType: 'task' | 'bug' | 'status_update' | 'design_note';
  entityId: string;
  action: string; // e.g., created, updated, status_changed
  diff?: Record<string, { from: unknown; to: unknown }>; // field-level diff
  timestamp: number;
}

// Generic API response wrappers (optional early pattern)
export interface ApiSuccess<T> { success: true; data: T; }
export interface ApiError { success: false; error: { code: string; message: string; details?: unknown }; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
