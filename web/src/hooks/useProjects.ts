import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiPatch, apiPost } from "../api/client";

export type Project = { id: string; name: string; goal?: string };
export type CreateProjectInput = { name: string; goal?: string; direction?: string };
export type UpdateProjectInput = { id: string; name?: string; goal?: string; direction?: string; parent_id?: string | null };

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/v1/projects"),
  });
}

export function useCreateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => apiPost<Project>("/v1/projects", input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateProjectInput) => apiPatch<Project>(`/v1/projects/${id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
