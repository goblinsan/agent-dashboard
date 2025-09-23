import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

export type NextAction = {
  task_id: string;
  title: string;
  status: string;
  persona_required?: string | null;
  priority_score: number;
  reason: string;
};

export type ProjectNextActions = {
  project_id: string;
  suggestions: NextAction[];
};

export function useProjectNextActions(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["project", projectId, "next-actions"],
    queryFn: () => api<ProjectNextActions>(`/v1/projects/${projectId}/next-action`),
    staleTime: 1000 * 30,
  });
}
