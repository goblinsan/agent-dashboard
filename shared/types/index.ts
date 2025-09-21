// Shared Type Definitions

export interface Agent {
  id: string;
  name: string;
  apiKey?: string;
  role?: string;
  lastHeartbeat?: number;
  currentTaskId?: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  version: number;
  assignees: string[];
  priority?: string;
  rationaleLog: string[];
}

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Bug {
  id: string;
  title: string;
  severity: BugSeverity;
  taskId?: string;
  reproSteps: string[];
  proposedFix?: string;
  createdAt: number;
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
  newStatus: Exclude<TaskStatus, 'open'>;
  rationale: string;
  confidence?: number;
  expectedVersion: number;
}

export interface BugCreateRequest {
  title: string;
  severity: BugSeverity;
  taskId?: string;
  reproSteps: string[];
  proposedFix?: string;
}
