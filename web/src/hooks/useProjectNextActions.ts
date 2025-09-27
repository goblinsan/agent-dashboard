import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

export type NextAction = {
  task_id: string;
  title: string;
  status: string;
  persona_required?: string | null;
  priority_score: number;
  reasons: string[];
  reason?: string | null;
  blocker_task_ids?: string[];
};

export type ProjectNextActions = {
  project_id: string;
  suggestions: NextAction[];
};

export function useProjectNextActions(projectId?: string, persona?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["project", projectId, "next-actions", persona ?? "all"],
    queryFn: () => {
      if (!projectId) {
        throw new Error("Project id is required to fetch next actions");
      }
      const personaParam = persona ? `?persona=${encodeURIComponent(persona)}` : "";
      return api<ProjectNextActions>(`/v1/projects/${projectId}/next-action${personaParam}`);
    },
    staleTime: 1000 * 30,
  });
}
