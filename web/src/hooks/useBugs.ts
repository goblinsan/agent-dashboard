import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPatch, apiPost } from "../api/client";

export type Bug = {
  id: string;
  project_id: string;
  task_id?: string | null;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BugCreateInput = {
  project_id: string;
  task_id?: string;
  title: string;
  description?: string;
  severity?: string;
};

export type BugUpdateInput = {
  id: string;
  status?: string;
  description?: string;
  severity?: string;
  task_id?: string | null;
};

export function useBugs(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["bugs", projectId],
    queryFn: () => api<Bug[]>(`/v1/bugs?project_id=${projectId}`),
  });
}

export function useCreateBug(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: BugCreateInput) => apiPost<Bug>("/v1/bugs", { status: "open", severity: "S3", ...input }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["bugs", projectId] });
    },
  });
}

export function useUpdateBug(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: BugUpdateInput) => apiPatch<Bug>(`/v1/bugs/${id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["bugs", projectId] });
    },
  });
}
