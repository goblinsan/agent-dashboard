import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

export type ProjectStatusMilestone = {
  milestone_id: string;
  name: string;
  total_estimate: number;
  remaining_effort: number;
  percent_complete: number;
};

export type ProjectStatus = {
  project_id: string;
  total_estimate: number;
  remaining_effort: number;
  percent_complete: number;
  status_breakdown: Record<string, number>;
  milestones: ProjectStatusMilestone[];
};

export function useProjectStatus(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["project", projectId, "status"],
    queryFn: () => api<ProjectStatus>(`/v1/projects/${projectId}/status`),
    staleTime: 1000 * 30,
  });
}
