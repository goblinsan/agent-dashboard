import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPost } from "../api/client";

type Milestone = { id: string; name: string; description?: string };
export type CreateMilestoneInput = { project_id: string; name: string; description?: string };

export function useMilestones(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["milestones", projectId],
    queryFn: () => api<Milestone[]>(`/v1/milestones?project_id=${projectId}`),
  });
}

export function useCreateMilestone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => apiPost<Milestone>("/v1/milestones", input),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["milestones", variables.project_id] });
    },
  });
}
