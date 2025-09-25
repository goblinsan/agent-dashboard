import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPatch, apiPost } from "../api/client";

export type Task = {
  id: string;
  milestone_id: string;
  title: string;
  description?: string;
  status: string;
  lock_version: number;
  persona_required?: string | null;
  effort_estimate?: number;
  effort_spent?: number;
};

export type CreateTaskInput = {
  milestone_id: string;
  phase_id?: string;
  title: string;
  description?: string;
};

export type UpdateTaskInput = {
  id: string;
  milestone_id: string;
  project_id?: string;
  lock_version: number;
  status?: string;
  title?: string;
  description?: string;
};

export function useTasks(milestoneId?: string) {
  return useQuery({
    enabled: Boolean(milestoneId),
    queryKey: ["tasks", milestoneId],
    queryFn: () => api<Task[]>(`/v1/tasks?milestone_id=${milestoneId}`),
  });
}

export function useProjectTasks(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["tasks", "project", projectId],
    queryFn: () => api<Task[]>(`/v1/tasks?project_id=${projectId}`),
  });
}

export function useCreateTask(projectId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiPost<Task>("/v1/tasks", input),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["tasks", variables.milestone_id] });
      if (projectId) {
        client.invalidateQueries({ queryKey: ["project", projectId, "status"] });
        client.invalidateQueries({ queryKey: ["project", projectId, "next-actions"] });
      }
    },
  });
}

export function useUpdateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, milestone_id, project_id, ...payload }: UpdateTaskInput) =>
      apiPatch<Task>(`/v1/tasks/${id}`, payload),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["tasks", variables.milestone_id] });
      if (variables.project_id) {
        client.invalidateQueries({ queryKey: ["project", variables.project_id, "status"] });
        client.invalidateQueries({ queryKey: ["project", variables.project_id, "next-actions"] });
      }
    },
  });
}
