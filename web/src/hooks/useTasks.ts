import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPost } from "../api/client";

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

export function useTasks(milestoneId?: string) {
  return useQuery({
    enabled: Boolean(milestoneId),
    queryKey: ["tasks", milestoneId],
    queryFn: () => api<Task[]>(`/v1/tasks?milestone_id=${milestoneId}`),
  });
}

export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiPost<Task>("/v1/tasks", input),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["tasks", variables.milestone_id] });
    },
  });
}
