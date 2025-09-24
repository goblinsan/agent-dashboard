import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPost } from "../api/client";

export type EventLog = {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  task_id?: string | null;
  category: string;
  summary: string;
  details?: string | null;
  created_at: string;
};

export type CreateEventInput = {
  project_id: string;
  milestone_id?: string;
  task_id?: string;
  category?: string;
  summary: string;
  details?: string;
};

export function useEvents(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["events", projectId],
    queryFn: () => api<EventLog[]>(`/v1/events?project_id=${projectId}&limit=100`),
  });
}

export function useCreateEvent(projectId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      apiPost<EventLog>("/v1/events", { category: "note", ...input }),
    onSuccess: () => {
      if (projectId) {
        client.invalidateQueries({ queryKey: ["events", projectId] });
      }
    },
  });
}
