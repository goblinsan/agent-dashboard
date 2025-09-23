import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

export type Persona = {
  key: string;
  name: string;
  description?: string | null;
  maximum_active_tasks?: number | null;
};

export type ProjectPersona = {
  project_id: string;
  persona_key: string;
  limit_per_agent?: number | null;
  persona: Persona;
};

export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: () => api<Persona[]>("/v1/personas"),
    staleTime: 1000 * 60,
  });
}

export function useProjectPersonas(projectId?: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["project", projectId, "personas"],
    queryFn: () => api<ProjectPersona[]>(`/v1/personas/projects/${projectId}`),
    staleTime: 1000 * 60,
  });
}
