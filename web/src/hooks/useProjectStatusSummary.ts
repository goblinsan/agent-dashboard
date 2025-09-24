import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

export type ProjectStatusSummary = {
  project_id: string;
  summary: string;
  generated_at: string;
};

export function useProjectStatusSummary(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["project", projectId, "summary"],
    queryFn: () => api<ProjectStatusSummary>(`/v1/projects/${projectId}/status/summary`),
    staleTime: 1000 * 60,
  });
}
