import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPatch, apiPost } from "../api/client";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  lock_version: number;
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
};

export function useTasks(milestoneId?: string) {
  return useQuery({
    enabled: Boolean(milestoneId),
    queryKey: ["tasks", milestoneId],
    queryFn: () => api<Task[]>(`/v1/tasks?milestone_id=${milestoneId}`),
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
    mutationFn: ({ id, lock_version, status }: UpdateTaskInput) =>
      apiPatch<Task>(`/v1/tasks/${id}`, { status, lock_version }),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["tasks", variables.milestone_id] });
      if (variables.project_id) {
        client.invalidateQueries({ queryKey: ["project", variables.project_id, "status"] });
        client.invalidateQueries({ queryKey: ["project", variables.project_id, "next-actions"] });
      }
    },
  });
}
