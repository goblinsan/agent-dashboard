import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useProjectNextActions } from "../hooks/useProjectNextActions";
import { fetchTask, TaskDetail } from "../hooks/useTasks";

type PersonaOption = {
  value: string;
  label: string;
};

export type NextActionsPanelProps = {
  projectId?: string;
  personaOptions?: PersonaOption[];
  personaNameLookup?: Map<string, string>;
};

type BlockerLink = {
  id: string;
  title: string;
};

function normalizeStatus(status?: string | null): string {
  if (!status) {
    return "";
  }
  return status.replace(/_/g, " ").trim();
}

export default function NextActionsPanel({
  projectId,
  personaOptions = [],
  personaNameLookup,
}: NextActionsPanelProps) {
  const [personaFilter, setPersonaFilter] = useState<string>("");

  useEffect(() => {
    setPersonaFilter("");
  }, [projectId]);

  const nextActionsQuery = useProjectNextActions(projectId, personaFilter || undefined);

  const suggestions = useMemo(() => {
    return (nextActionsQuery.data?.suggestions ?? []).map((suggestion) => {
      const reasons = suggestion.reasons?.length
        ? suggestion.reasons
        : suggestion.reason
          ? [suggestion.reason]
          : [];
      return {
        ...suggestion,
        reasons,
      };
    });
  }, [nextActionsQuery.data]);

  const derivedPersonaOptions = useMemo(() => {
    const lookup = new Map<string, string>();
    personaOptions.forEach((option) => {
      lookup.set(option.value, option.label);
    });
    suggestions.forEach((suggestion) => {
      const key = suggestion.persona_required;
      if (key) {
        const labelFromLookup = personaNameLookup?.get(key) ?? key;
        if (!lookup.has(key)) {
          lookup.set(key, labelFromLookup);
        }
      }
    });
    return Array.from(lookup.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [personaOptions, personaNameLookup, suggestions]);

  useEffect(() => {
    if (!personaFilter) {
      return;
    }
    if (!derivedPersonaOptions.some((option) => option.value === personaFilter)) {
      setPersonaFilter("");
    }
  }, [derivedPersonaOptions, personaFilter]);

  const primarySuggestion = suggestions[0];
  const secondarySuggestions = suggestions.slice(1);

  const blockersQuery = useQuery<BlockerLink[]>({
    enabled: Boolean(primarySuggestion?.task_id),
    queryKey: ["task", primarySuggestion?.task_id, "blockers", personaFilter || "all"],
    queryFn: async () => {
      if (!primarySuggestion) {
        return [];
      }

      let blockerIds = primarySuggestion.blocker_task_ids ?? [];
      if (!blockerIds.length) {
        try {
          const detail = await fetchTask(primarySuggestion.task_id);
          blockerIds = detail.blocked_by ?? [];
        } catch (error) {
          return [];
        }
      }

      if (!blockerIds.length) {
        return [];
      }

      const uniqueIds = Array.from(new Set(blockerIds));
      const blockers: BlockerLink[] = [];

      for (const blockerId of uniqueIds) {
        try {
          const detail: TaskDetail = await fetchTask(blockerId);
          blockers.push({ id: detail.id, title: detail.title });
        } catch (error) {
          blockers.push({ id: blockerId, title: "View task" });
        }
      }

      return blockers;
    },
    staleTime: 1000 * 30,
  });

  const blockers = blockersQuery.data ?? [];
  const isBlocked = (primarySuggestion?.status ?? "") === "blocked" || blockers.length > 0;

  const statusLabel = normalizeStatus(primarySuggestion?.status);
  const personaLabel = primarySuggestion?.persona_required
    ? personaNameLookup?.get(primarySuggestion.persona_required) ?? primarySuggestion.persona_required
    : null;

  return (
    <section aria-labelledby="next-actions-heading">
      <div className="next-actions__header">
        <h2 id="next-actions-heading" className="section-title">
          Next Suggested Action
        </h2>
        {derivedPersonaOptions.length > 0 && (
          <label className="next-actions__filter">
            <span className="next-actions__filter-label">Persona</span>
            <select
              value={personaFilter}
              onChange={(event) => setPersonaFilter(event.target.value)}
              className="select"
              aria-label="Filter next actions by persona"
            >
              <option value="">All personas</option>
              {derivedPersonaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {!projectId ? (
        <p className="empty-state">Select a project to see next suggested actions.</p>
      ) : nextActionsQuery.isLoading ? (
        <div className="card next-actions__card" aria-busy="true">
          Loading next suggestion...
        </div>
      ) : nextActionsQuery.isError ? (
        <div className="card card--error" role="alert">
          <p className="next-actions__error">Could not load the next suggested action.</p>
          <button type="button" className="button button--secondary" onClick={() => nextActionsQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : !primarySuggestion ? (
        <p className="empty-state">No suggested actions are available yet.</p>
      ) : (
        <div className="next-actions__content">
          <article
            className={`card next-actions__card${isBlocked ? " card--blocked" : ""}`}
            aria-label={`Next action: ${primarySuggestion.title}`}
          >
            <header className="next-actions__card-header">
              <h3 className="item-title">
                <Link to={`/tasks/${primarySuggestion.task_id}`} className="next-actions__task-link">
                  {primarySuggestion.title}
                </Link>
              </h3>
              {personaLabel && <span className="status-tag">Persona: {personaLabel}</span>}
            </header>

            <div className="next-actions__meta">
              {statusLabel && <span className="status-tag">Status: {statusLabel}</span>}
              {primarySuggestion.priority_score > 0 && (
                <span className="status-tag">Priority {primarySuggestion.priority_score}</span>
              )}
            </div>

            <ul className="next-actions__reasons">
              {primarySuggestion.reasons.map((reason, index) => (
                <li key={`${primarySuggestion.task_id}-reason-${index}`}>{reason}</li>
              ))}
            </ul>

            {isBlocked && (
              <div className="next-actions__blockers" role="alert">
                <div className="next-actions__blockers-title">Blocked by</div>
                {blockersQuery.isLoading ? (
                  <p className="text-subtle">Loading blockers…</p>
                ) : blockers.length > 0 ? (
                  <ul>
                    {blockers.map((blocker) => (
                      <li key={blocker.id}>
                        <Link to={`/tasks/${blocker.id}`} className="next-actions__blocker-link">
                          {blocker.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-subtle">This task is blocked but no specific dependencies are recorded.</p>
                )}
              </div>
            )}
          </article>

          {secondarySuggestions.length > 0 && (
            <aside className="next-actions__secondary" aria-label="Additional suggestions">
              <h4 className="next-actions__secondary-title">Other suggestions</h4>
              <ul>
                {secondarySuggestions.map((suggestion) => {
                  const secondaryStatus = normalizeStatus(suggestion.status);
                  const label = suggestion.persona_required
                    ? personaNameLookup?.get(suggestion.persona_required) ?? suggestion.persona_required
                    : null;
                  return (
                    <li key={suggestion.task_id} className="next-actions__secondary-item">
                      <Link to={`/tasks/${suggestion.task_id}`} className="next-actions__secondary-link">
                        {suggestion.title}
                      </Link>
                      <div className="next-actions__secondary-meta">
                        {secondaryStatus && <span>{secondaryStatus}</span>}
                        {label && <span aria-label="Persona required"> - {label}</span>}
                      </div>
                      <ul className="next-actions__secondary-reasons">
                        {suggestion.reasons.map((reason, index) => (
                          <li key={`${suggestion.task_id}-secondary-reason-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
