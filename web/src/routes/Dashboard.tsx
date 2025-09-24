import { FormEvent, useEffect, useMemo, useState } from "react";

import Layout from "../components/Layout";
import { CreateMilestoneInput, useCreateMilestone, useMilestones, useUpdateMilestone } from "../hooks/useMilestones";
import { useProjectNextActions } from "../hooks/useProjectNextActions";
import { CreateProjectInput, useCreateProject, useProjects, useUpdateProject } from "../hooks/useProjects";
import { useProjectStatus } from "../hooks/useProjectStatus";
import { useProjectStatusSummary } from "../hooks/useProjectStatusSummary";
import { useProjectPersonas } from "../hooks/usePersonas";
import { Bug, BugCreateInput, BugUpdateInput, useBugs, useCreateBug, useDeleteBug, useUpdateBug } from "../hooks/useBugs";
import { CreateTaskInput, Task, useCreateTask, useProjectTasks, useTasks, useUpdateTask } from "../hooks/useTasks";
import { CreateEventInput, EventLog, useCreateEvent, useEvents } from "../hooks/useEvents";

const BUG_SEVERITIES = ["S1", "S2", "S3", "S4"];
const BUG_STATUSES = ["open", "in_progress", "blocked", "resolved", "closed"];
const EVENT_CATEGORIES = ["note", "update", "decision", "risk"];

function formatTaskLabel(task: Task, milestoneLookup: Map<string, string>): string {

  const milestoneName = milestoneLookup.get(task.milestone_id);

  return milestoneName ? `${task.title} (${milestoneName})` : task.title;

}

export default function DashboardRoute() {

  const [selectedProject, setSelectedProject] = useState<string | undefined>();

  const [selectedMilestone, setSelectedMilestone] = useState<string | undefined>();



  const [projectEdit, setProjectEdit] = useState<{ id: string; name: string } | null>(null);

  const [milestoneEdit, setMilestoneEdit] = useState<{ id: string; name: string; projectId: string } | null>(null);

  const [taskEdit, setTaskEdit] = useState<{ id: string; title: string; milestoneId: string; projectId?: string; lockVersion: number } | null>(null);

  useEffect(() => {
    setMilestoneEdit(null);
    setTaskEdit(null);
  }, [selectedProject]);

  useEffect(() => {
    setTaskEdit(null);
  }, [selectedMilestone]);

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();

  const { data: milestones } = useMilestones(selectedProject);

  const { data: tasks } = useTasks(selectedMilestone);
  const { data: bugs, isLoading: bugsLoading, error: bugsError } = useBugs(selectedProject);
  const { data: projectTasks } = useProjectTasks(selectedProject);
  const { data: events, isLoading: eventsLoading, error: eventsError } = useEvents(selectedProject);

  const { data: statusSummary } = useProjectStatus(selectedProject);

  const { data: statusText } = useProjectStatusSummary(selectedProject);

  const { data: projectPersonas } = useProjectPersonas(selectedProject);

  const { data: nextActions } = useProjectNextActions(selectedProject);



  const createProject = useCreateProject();

  const createMilestone = useCreateMilestone();

  const createTask = useCreateTask(selectedProject);

  const updateProject = useUpdateProject();

  const updateMilestone = useUpdateMilestone();

  const updateTask = useUpdateTask();

  const createBug = useCreateBug(selectedProject);

  const updateBug = useUpdateBug(selectedProject);

  const deleteBug = useDeleteBug(selectedProject);
  const createEvent = useCreateEvent(selectedProject);



  const selectedProjectName = useMemo(

    () => projects?.find((project) => project.id === selectedProject)?.name ?? "",

    [projects, selectedProject],

  );

  const milestoneLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    milestones?.forEach((milestone) => {
      lookup.set(milestone.id, milestone.name);
    });

    return lookup;
  }, [milestones]);

  const taskLookup = useMemo(() => {
    const lookup = new Map<string, Task>();

    projectTasks?.forEach((task) => {
      lookup.set(task.id, task);
    });

    return lookup;
  }, [projectTasks]);

  const handleProjectEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectEdit || !projectEdit.name.trim()) {
      return;
    }
    updateProject.mutate(
      { id: projectEdit.id, name: projectEdit.name.trim() },
      { onSuccess: () => setProjectEdit(null) },
    );
  };

  const handleMilestoneEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!milestoneEdit || !milestoneEdit.name.trim()) {
      return;
    }
    updateMilestone.mutate(
      { id: milestoneEdit.id, project_id: milestoneEdit.projectId, name: milestoneEdit.name.trim() },
      { onSuccess: () => setMilestoneEdit(null) },
    );
  };

  const handleTaskEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskEdit || !taskEdit.title.trim()) {
      return;
    }
    updateTask.mutate(
      {
        id: taskEdit.id,
        milestone_id: taskEdit.milestoneId,
        project_id: taskEdit.projectId,
        lock_version: taskEdit.lockVersion,
        title: taskEdit.title.trim(),
      },
      { onSuccess: () => setTaskEdit(null) },
    );
  };


  return (

    <Layout title="Dashboard">

      <div className="grid grid--two">

        <section>

          <h2 className="section-title">Projects</h2>

          <ProjectForm onSubmit={(values) => createProject.mutate(values)} submitting={createProject.isPending} />

          {projectsLoading && <p className="empty-state">Loading projects…</p>}

          {projectsError && <ErrorMessage error={projectsError} />}

          <ul className="list">

            {projects?.map((project) => {
              const isEditing = projectEdit?.id === project.id;
              return (
                <li key={project.id}>
                  {isEditing ? (
                    <form onSubmit={handleProjectEditSubmit} className="card inline-edit-form">
                      <input
                        type="text"
                        value={projectEdit?.name ?? ""}
                        onChange={(event) =>
                          setProjectEdit((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                        }
                        className="input"
                        placeholder="Project name"
                        autoFocus
                      />
                      <div className="inline-edit-actions">
                        <button
                          type="submit"
                          className="button button--primary"
                          disabled={updateProject.isPending || !projectEdit?.name.trim()}
                        >
                          {updateProject.isPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => setProjectEdit(null)}
                          disabled={updateProject.isPending}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(project.id);
                        setSelectedMilestone(undefined);
                      }}
                      className={`card card--selectable ${selectedProject === project.id ? "card--active" : ""}`}
                    >
                      <span
                        className="edit-icon"
                        role="button"
                        tabIndex={0}
                        aria-label={`Edit ${project.name}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setProjectEdit({ id: project.id, name: project.name });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            setProjectEdit({ id: project.id, name: project.name });
                          }
                        }}
                      >
                        <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 20 20">
                          <path
                            d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-7.3a.7.7 0 0 0 0-1L13.8 3.3a.7.7 0 0 0-1 0l-1.2 1.2 2.5 2.5 1.1-1.2z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <div className="item-title">{project.name}</div>
                      {project.goal && <div className="text-subtle">{project.goal}</div>}
                    </button>
                  )}
                </li>
              );
            })}

          </ul>


        </section>



        <section>

          <h2 className="section-title">Milestones</h2>

          {selectedProject ? (

            <>

              <MilestoneForm

                projectId={selectedProject!}

                onSubmit={(values) => createMilestone.mutate(values)}

                submitting={createMilestone.isPending}

              />

              <ul className="list">

                {milestones?.map((milestone) => {
                  const isEditing = milestoneEdit?.id === milestone.id;
                  return (
                    <li key={milestone.id}>
                      {isEditing ? (
                        <form onSubmit={handleMilestoneEditSubmit} className="card inline-edit-form">
                          <input
                            type="text"
                            value={milestoneEdit?.name ?? ""}
                            onChange={(event) =>
                              setMilestoneEdit((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                            }
                            className="input"
                            placeholder="Milestone name"
                            autoFocus
                          />
                          <div className="inline-edit-actions">
                            <button
                              type="submit"
                              className="button button--primary"
                              disabled={updateMilestone.isPending || !milestoneEdit?.name.trim()}
                            >
                              {updateMilestone.isPending ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              className="button button--secondary"
                              onClick={() => setMilestoneEdit(null)}
                              disabled={updateMilestone.isPending}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedMilestone(milestone.id)}
                          className={`card card--selectable ${selectedMilestone === milestone.id ? "card--active" : ""}`}
                        >
                          <span
                            className="edit-icon"
                            role="button"
                            tabIndex={0}
                            aria-label={`Edit ${milestone.name}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (selectedProject) {
                                setMilestoneEdit({ id: milestone.id, name: milestone.name, projectId: selectedProject });
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                if (selectedProject) {
                                  setMilestoneEdit({ id: milestone.id, name: milestone.name, projectId: selectedProject });
                                }
                              }
                            }}
                          >
                            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 20 20">
                              <path
                                d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-7.3a.7.7 0 0 0 0-1L13.8 3.3a.7.7 0 0 0-1 0l-1.2 1.2 2.5 2.5 1.1-1.2z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <div className="item-title">{milestone.name}</div>
                          {milestone.description && <div className="text-subtle">{milestone.description}</div>}
                        </button>
                      )}
                    </li>
                  );
                })}

              </ul>

            </>

          ) : (

            <p className="empty-state">Select a project to view its milestones.</p>

          )}

        </section>

      </div>



      {selectedProject && (

        <section style={{ marginTop: "2rem" }}>

          <h2 className="section-title">Personas & Limits</h2>

          {projectPersonas && projectPersonas.length > 0 ? (

            <ul className="list">

              {projectPersonas.map((entry) => (

                <li key={entry.persona_key}>

                  <div className="card">

                    <div className="item-title">{entry.persona.name}</div>

                    {entry.persona.description && (

                      <p className="text-subtle">{entry.persona.description}</p>

                    )}

                    <div className="text-subtle">

                      Max active tasks: {entry.persona.maximum_active_tasks ?? "—"}

                    </div>

                    <div className="text-subtle">

                      Limit per agent: {entry.limit_per_agent ?? "—"}

                    </div>

                  </div>

                </li>

              ))}

            </ul>

          ) : (

            <p className="empty-state">No personas assigned to this project yet.</p>

          )}

        </section>

      )}



      {selectedProject && (

        <section style={{ marginTop: "2rem" }}>

          <h2 className="section-title">Status Overview</h2>

          {statusSummary ? (

            <>

              {statusText && (

                <div className="card" style={{ marginBottom: "1rem" }}>

                  <div className="item-title">Daily summary</div>

                  <p className="text-subtle" style={{ marginTop: "0.5rem" }}>{statusText.summary}</p>

                  <p className="text-subtle">

                    Generated {new Date(statusText.generated_at).toLocaleString()}

                  </p>

                </div>

              )}

              <div className="grid grid--two">

                <div className="card">

                  <div className="item-title">Progress</div>

                  <p className="text-subtle" style={{ marginTop: "0.5rem" }}>

                    {statusSummary.percent_complete.toFixed(1)}% complete

                  </p>

                  <p className="text-subtle">

                    Remaining {statusSummary.remaining_effort.toFixed(1)}h of {statusSummary.total_estimate.toFixed(1)}h

                  </p>

                  <div style={{ marginTop: "0.75rem" }}>

                    <small className="text-subtle">Status breakdown</small>

                    <ul className="list" style={{ marginTop: "0.35rem" }}>

                      {Object.entries(statusSummary.status_breakdown).map(([status, count]) => (

                        <li key={status} className="text-subtle">

                          {status}: {count}

                        </li>

                      ))}

                      {Object.keys(statusSummary.status_breakdown).length === 0 && (

                        <li className="text-subtle">No tasks yet.</li>

                      )}

                    </ul>

                  </div>

                </div>



                <div className="card">

                  <div className="item-title">Milestone roll-up</div>

                  <ul className="list" style={{ marginTop: "0.5rem" }}>

                    {statusSummary.milestones.length === 0 && (

                      <li className="text-subtle">Add a milestone to compute progress.</li>

                    )}

                    {statusSummary.milestones.map((milestone) => (

                      <li key={milestone.milestone_id} className="text-subtle">

                        <strong>{milestone.name}</strong>: {milestone.percent_complete.toFixed(1)}% • Remaining {" "}

                        {milestone.remaining_effort.toFixed(1)}h

                      </li>

                    ))}

                  </ul>

                </div>

              </div>

            </>

          ) : (

            <p className="empty-state">Status metrics will appear after tasks are added.</p>

          )}

        </section>

      )}



      <section style={{ marginTop: "2rem" }}>

        <h2 className="section-title">Tasks {selectedProjectName ? `for ${selectedProjectName}` : ""}</h2>

        {selectedMilestone ? (

          <>

            <TaskForm

              milestoneId={selectedMilestone}

              onSubmit={(values) => createTask.mutate(values)}

              submitting={createTask.isPending}

            />

            <ul className="list" style={{ marginTop: "1rem" }}>

              {tasks?.map((task) => {
                const isEditing = taskEdit?.id === task.id;
                return (
                  <li key={task.id}>
                    {isEditing ? (
                      <form onSubmit={handleTaskEditSubmit} className="card inline-edit-form">
                        <input
                          type="text"
                          value={taskEdit?.title ?? ""}
                          onChange={(event) =>
                            setTaskEdit((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                          }
                          className="input"
                          placeholder="Task title"
                          autoFocus
                        />
                        <div className="inline-edit-actions">
                          <button
                            type="submit"
                            className="button button--primary"
                            disabled={updateTask.isPending || !taskEdit?.title.trim()}
                          >
                            {updateTask.isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            className="button button--secondary"
                            onClick={() => setTaskEdit(null)}
                            disabled={updateTask.isPending}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="card">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Edit ${task.title}`}
                          onClick={() =>
                            setTaskEdit({
                              id: task.id,
                              title: task.title,
                              milestoneId: task.milestone_id,
                              projectId: selectedProject,
                              lockVersion: task.lock_version,
                            })
                          }
                        >
                          <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 20 20">
                            <path
                              d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-7.3a.7.7 0 0 0 0-1L13.8 3.3a.7.7 0 0 0-1 0l-1.2 1.2 2.5 2.5 1.1-1.2z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <div className="item-title">{task.title}</div>
                        {task.description && <div className="text-subtle">{task.description}</div>}
                        <span className="status-tag">Status: {task.status}</span>
                      </div>
                    )}
                  </li>
                );
              })}

              {!tasks?.length && <p className="empty-state">No tasks yet for this milestone.</p>}

            </ul>

          </>

        ) : (

          <p className="empty-state">Select a milestone to view tasks.</p>

        )}

      </section>

      {selectedProject && (
        <section style={{ marginTop: "2rem" }}>
          <h2 className="section-title">Bug Tracker</h2>

          <BugForm
            projectId={selectedProject!}
            tasks={projectTasks ?? []}
            milestoneLookup={milestoneLookup}
            onSubmit={(values) => createBug.mutate(values)}
            submitting={createBug.isPending}
          />

          {bugsLoading && <p className="empty-state">Loading bugs.</p>}
          {bugsError && <ErrorMessage error={bugsError} />}

          {bugs && bugs.length > 0 ? (
            <BugList
              bugs={bugs}
              tasks={projectTasks ?? []}
              milestoneLookup={milestoneLookup}
              onUpdate={(input) => updateBug.mutate(input)}
              onDelete={(bugId) => deleteBug.mutate(bugId)}
              updating={updateBug.isPending}
              deleting={deleteBug.isPending}
            />
          ) : (
            !bugsLoading && <p className="empty-state">No bugs reported for this project.</p>
          )}
        </section>
      )}

      {selectedProject && (
        <section style={{ marginTop: "2rem" }}>
          <h2 className="section-title">Activity Log</h2>

          <EventForm
            projectId={selectedProject!}
            milestones={milestones ?? []}
            milestoneLookup={milestoneLookup}
            tasks={projectTasks ?? []}
            onSubmit={(values) => createEvent.mutate(values)}
            submitting={createEvent.isPending}
          />

          {eventsLoading && <p className="empty-state">Loading activity.</p>}
          {eventsError && <ErrorMessage error={eventsError} />}

          {events && events.length > 0 ? (
            <EventList events={events} milestoneLookup={milestoneLookup} taskLookup={taskLookup} />
          ) : (
            !eventsLoading && <p className="empty-state">No activity logged yet.</p>
          )}
        </section>
      )}

      {selectedProject && (

        <section style={{ marginTop: "2rem" }}>

          <h2 className="section-title">Next Suggested Actions</h2>

          {nextActions && nextActions.suggestions.length > 0 ? (

            <ul className="list">

              {nextActions.suggestions.map((suggestion) => (

                <li key={suggestion.task_id}>

                  <div className="card">

                    <div className="item-title">{suggestion.title}</div>

                    <div className="text-subtle">{suggestion.reason}</div>

                    <span className="status-tag">Status: {suggestion.status}</span>

                    {suggestion.persona_required && (

                      <span className="status-tag" style={{ marginLeft: "0.5rem" }}>

                        Persona: {suggestion.persona_required}

                      </span>

                    )}

                  </div>

                </li>

              ))}

            </ul>

          ) : (

            <p className="empty-state">Add tasks with priority to see suggested actions.</p>

          )}

        </section>

      )}

    </Layout>

  );

}





type ProjectFormProps = {

  onSubmit: (values: CreateProjectInput) => void;

  submitting: boolean;

};



function ProjectForm({ onSubmit, submitting }: ProjectFormProps) {

  const [form, setForm] = useState<CreateProjectInput>({ name: "", goal: "" });



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!form.name.trim()) return;

    onSubmit(form);

    setForm({ name: "", goal: "" });

  };



  return (

    <form onSubmit={handleSubmit} className="card form" style={{ marginBottom: "1rem" }}>

      <div className="form-field">

        <label htmlFor="project-name">Project name</label>

        <input

          id="project-name"

          type="text"

          value={form.name}

          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}

          className="input"

          placeholder="Infrastructure & API"

        />

      </div>

      <div className="form-field">

        <label htmlFor="project-goal">Goal</label>

        <textarea

          id="project-goal"

          value={form.goal}

          onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}

          className="textarea"

          rows={2}

          placeholder="Outline the scope for vertical slice"

        />

      </div>

      <button type="submit" className="button button--primary" disabled={submitting}>

        {submitting ? "Creating…" : "Create project"}

      </button>

    </form>

  );

}





type MilestoneFormProps = {

  projectId: string;

  onSubmit: (values: CreateMilestoneInput) => void;

  submitting: boolean;

};



function MilestoneForm({ projectId, onSubmit, submitting }: MilestoneFormProps) {

  const [form, setForm] = useState<CreateMilestoneInput>({ project_id: projectId, name: "", description: "" });



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!form.name.trim()) return;

    onSubmit({ ...form, project_id: projectId });

    setForm({ project_id: projectId, name: "", description: "" });

  };



  return (

    <form onSubmit={handleSubmit} className="card form" style={{ marginBottom: "1rem" }}>

      <div className="form-field">

        <label htmlFor="milestone-name">Milestone name</label>

        <input

          id="milestone-name"

          type="text"

          value={form.name}

          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}

          className="input"

          placeholder="MVP0: Vertical Slice"

        />

      </div>

      <div className="form-field">

        <label htmlFor="milestone-description">Description</label>

        <textarea

          id="milestone-description"

          value={form.description}

          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}

          className="textarea"

          rows={2}

          placeholder="Plan and deliver the first usable experience"

        />

      </div>

      <button type="submit" className="button button--primary" disabled={submitting}>

        {submitting ? "Creating…" : "Create milestone"}

      </button>

    </form>

  );

}





type TaskFormProps = {

  milestoneId: string;

  onSubmit: (values: CreateTaskInput) => void;

  submitting: boolean;

};



function TaskForm({ milestoneId, onSubmit, submitting }: TaskFormProps) {

  const [form, setForm] = useState<CreateTaskInput>({ milestone_id: milestoneId, title: "", description: "" });



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!form.title.trim()) return;

    onSubmit({ ...form, milestone_id: milestoneId });

    setForm({ milestone_id: milestoneId, title: "", description: "" });

  };



  return (

    <form onSubmit={handleSubmit} className="card form">

      <div className="form-field">

        <label htmlFor="task-title">Task title</label>

        <input

          id="task-title"

          type="text"

          value={form.title}

          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}

          className="input"

          placeholder="Draft API models"

        />

      </div>

      <div className="form-field">

        <label htmlFor="task-description">Description</label>

        <textarea

          id="task-description"

          value={form.description}

          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}

          className="textarea"

          rows={2}

          placeholder="Document project, milestone, task schema"

        />

      </div>

      <button type="submit" className="button button--primary" disabled={submitting}>

        {submitting ? "Adding…" : "Add task"}

      </button>

    </form>

  );

}


type EventFormProps = {

  projectId: string;

  milestones: { id: string; name: string }[];

  milestoneLookup: Map<string, string>;

  tasks: Task[];

  onSubmit: (values: CreateEventInput) => void;

  submitting: boolean;

};



type EventListProps = {

  events: EventLog[];

  milestoneLookup: Map<string, string>;

  taskLookup: Map<string, Task>;

};



function EventForm({ projectId, milestones, milestoneLookup, tasks, onSubmit, submitting }: EventFormProps) {

  const [summary, setSummary] = useState("");

  const [details, setDetails] = useState("");

  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);

  const [milestoneId, setMilestoneId] = useState("");

  const [taskId, setTaskId] = useState("");



  useEffect(() => {

    setSummary("");

    setDetails("");

    setCategory(EVENT_CATEGORIES[0]);

    setMilestoneId("");

    setTaskId("");

  }, [projectId]);



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    const trimmedSummary = summary.trim();

    if (!trimmedSummary) {

      return;

    }

    const payload: CreateEventInput = {

      project_id: projectId,

      summary: trimmedSummary,

      category,

    };

    const trimmedDetails = details.trim();

    if (trimmedDetails) {

      payload.details = trimmedDetails;

    }

    if (milestoneId) {

      payload.milestone_id = milestoneId;

    }

    if (taskId) {

      payload.task_id = taskId;

    }

    onSubmit(payload);

    setSummary("");

    setDetails("");

    setCategory(EVENT_CATEGORIES[0]);

    setTaskId("");

  };



  const handleTaskChange = (value: string) => {

    setTaskId(value);

    if (!value) {

      return;

    }

    const match = tasks.find((task) => task.id === value);

    if (match) {

      setMilestoneId(match.milestone_id ?? "");

    }

  };



  return (

    <form onSubmit={handleSubmit} className="card form" style={{ marginBottom: "1rem" }}>

      <div className="form-field">

        <label htmlFor="event-summary">Summary</label>

        <input

          id="event-summary"

          type="text"

          value={summary}

          onChange={(event) => setSummary(event.target.value)}

          className="input"

          placeholder="Deployment completed successfully"

        />

      </div>

      <div className="form-field">

        <label htmlFor="event-details">Details</label>

        <textarea

          id="event-details"

          value={details}

          onChange={(event) => setDetails(event.target.value)}

          className="textarea"

          rows={3}

          placeholder="Expanded notes for future reference"

        />

      </div>

      <div className="form-field">

        <label htmlFor="event-category">Category</label>

        <select

          id="event-category"

          className="input"

          value={category}

          onChange={(event) => setCategory(event.target.value)}

        >

          {EVENT_CATEGORIES.map((value) => (

            <option key={value} value={value}>

              {value}

            </option>

          ))}

        </select>

      </div>

      <div className="form-field">

        <label htmlFor="event-milestone">Milestone</label>

        <select

          id="event-milestone"

          className="input"

          value={milestoneId}

          onChange={(event) => setMilestoneId(event.target.value)}

        >

          <option value="">Not specified</option>

          {milestones.map((milestone) => (

            <option key={milestone.id} value={milestone.id}>

              {milestone.name}

            </option>

          ))}

        </select>

      </div>

      <div className="form-field">

        <label htmlFor="event-task">Task</label>

        <select

          id="event-task"

          className="input"

          value={taskId}

          onChange={(event) => handleTaskChange(event.target.value)}

        >

          <option value="">Not linked</option>

          {tasks.map((task) => (

            <option key={task.id} value={task.id}>

              {formatTaskLabel(task, milestoneLookup)}

            </option>

          ))}

        </select>

        {tasks.length === 0 && <p className="text-subtle">Events can reference tasks, but it is optional.</p>}

      </div>

      <button type="submit" className="button button--primary" disabled={submitting}>

        {submitting ? "Logging..." : "Log event"}

      </button>

    </form>

  );

}



function EventList({ events, milestoneLookup, taskLookup }: EventListProps) {

  return (

    <ul className="list" style={{ marginTop: "1rem" }}>

      {events.map((event) => {

        const milestoneName = event.milestone_id ? milestoneLookup.get(event.milestone_id) : undefined;

        const task = event.task_id ? taskLookup.get(event.task_id) : undefined;

        return (

          <li key={event.id}>

            <div className="card">

              <div className="item-title">{event.summary}</div>

              <span className="status-tag">{event.category}</span>

              <p className="text-subtle">Logged {new Date(event.created_at).toLocaleString()}</p>

              {milestoneName && <p className="text-subtle">Milestone: {milestoneName}</p>}

              {task && <p className="text-subtle">Task: {formatTaskLabel(task, milestoneLookup)}</p>}

              {event.details && (

                <p className="text-subtle" style={{ marginTop: "0.5rem" }}>{event.details}</p>

              )}

            </div>

          </li>

        );

      })}

    </ul>

  );

}



type BugFormProps = {

  projectId: string;

  tasks: Task[];

  milestoneLookup: Map<string, string>;

  onSubmit: (values: BugCreateInput) => void;

  submitting: boolean;

};



function BugForm({ projectId, tasks, milestoneLookup, onSubmit, submitting }: BugFormProps) {

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [severity, setSeverity] = useState("S3");

  const [taskId, setTaskId] = useState<string>("");



  useEffect(() => {

    setTitle("");

    setDescription("");

    setSeverity("S3");

    setTaskId("");

  }, [projectId]);



  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();



    const trimmedTitle = title.trim();

    if (!trimmedTitle) {

      return;

    }



    onSubmit({

      project_id: projectId,

      title: trimmedTitle,

      description: description.trim() ? description : undefined,

      severity,

      task_id: taskId ? taskId : undefined,

    });



    setTitle("");

    setDescription("");

    setSeverity("S3");

    setTaskId("");

  };



  const taskOptions = tasks.map((task) => ({

    id: task.id,

    label: formatTaskLabel(task, milestoneLookup),

  }));



  return (

    <form onSubmit={handleSubmit} className="card form" style={{ marginBottom: "1rem" }}>

      <div className="form-field">

        <label htmlFor="bug-title">Bug title</label>

        <input

          id="bug-title"

          type="text"

          value={title}

          onChange={(event) => setTitle(event.target.value)}

          className="input"

          placeholder="Provisioning webhook fails"

        />

      </div>

      <div className="form-field">

        <label htmlFor="bug-description">Description</label>

        <textarea

          id="bug-description"

          value={description}

          onChange={(event) => setDescription(event.target.value)}

          className="textarea"

          rows={2}

          placeholder="Steps to reproduce or environment details"

        />

      </div>

      <div className="form-field">

        <label htmlFor="bug-severity">Severity</label>

        <select

          id="bug-severity"

          className="input"

          value={severity}

          onChange={(event) => setSeverity(event.target.value)}

        >

          {BUG_SEVERITIES.map((level) => (

            <option key={level} value={level}>

              {level}

            </option>

          ))}

        </select>

      </div>

      <div className="form-field">

        <label htmlFor="bug-task">Linked task</label>

        <select

          id="bug-task"

          className="input"

          value={taskId}

          onChange={(event) => setTaskId(event.target.value)}

        >

          <option value="">Not linked</option>

          {taskOptions.map((task) => (

            <option key={task.id} value={task.id}>

              {task.label}

            </option>

          ))}

        </select>

        {tasks.length === 0 && <p className="text-subtle">Tasks help give bugs context but are optional.</p>}

      </div>

      <button type="submit" className="button button--primary" disabled={submitting}>

        {submitting ? "Logging..." : "Log bug"}

      </button>

    </form>

  );

}



type BugListProps = {

  bugs: Bug[];

  tasks: Task[];

  milestoneLookup: Map<string, string>;

  onUpdate: (input: BugUpdateInput, options?: { onSuccess?: () => void }) => void;

  onDelete: (bugId: string) => void;

  updating: boolean;

  deleting: boolean;

};



function BugList({ bugs, tasks, milestoneLookup, onUpdate, onDelete, updating, deleting }: BugListProps) {

  const [editingBugId, setEditingBugId] = useState<string | null>(null);

  const [editingTitle, setEditingTitle] = useState<string>("");

  const taskOptions = tasks.map((task) => ({

    id: task.id,

    label: formatTaskLabel(task, milestoneLookup),

  }));



  const getTaskLabel = (taskId?: string | null) => {

    if (!taskId) {

      return "Not linked";

    }



    const match = taskOptions.find((task) => task.id === taskId);

    return match ? match.label : "Not linked";

  };



  const formatStatusLabel = (value: string) =>

    value

      .split("_")

      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))

      .join(" ");



  return (

    <ul className="list" style={{ marginTop: "1rem" }}>

      {bugs.map((bug) => {
        const isEditing = editingBugId === bug.id;
        return (
          <li key={bug.id}>
            {isEditing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editingTitle.trim()) {
                    return;
                  }
                  onUpdate(
                    { id: bug.id, title: editingTitle.trim() },
                    {
                      onSuccess: () => {
                        setEditingBugId(null);
                        setEditingTitle("");
                      },
                    },
                  );
                }}
                className="card inline-edit-form"
              >
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="input"
                  placeholder="Bug title"
                  autoFocus
                />
                <div className="inline-edit-actions">
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={updating || !editingTitle.trim()}
                  >
                    {updating ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => {
                      setEditingBugId(null);
                      setEditingTitle("");
                    }}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="card">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Edit ${bug.title}`}
                  onClick={() => {
                    setEditingBugId(bug.id);
                    setEditingTitle(bug.title);
                  }}
                >
                  <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 20 20">
                    <path
                      d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm11.7-7.3a.7.7 0 0 0 0-1L13.8 3.3a.7.7 0 0 0-1 0l-1.2 1.2 2.5 2.5 1.1-1.2z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <div className="item-title">{bug.title}</div>
                {bug.description && <p className="text-subtle">{bug.description}</p>}
                <p className="text-subtle">Reported {new Date(bug.created_at).toLocaleString()}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.75rem" }}>
                  <div className="form-field" style={{ minWidth: "160px", marginBottom: 0 }}>
                    <label htmlFor={`bug-${bug.id}-status`}>Status</label>
                    <select
                      id={`bug-${bug.id}-status`}
                      className="input"
                      value={bug.status}
                      disabled={updating}
                      onChange={(event) => {
                        const nextStatus = event.target.value;
                        if (nextStatus === bug.status) {
                          return;
                        }
                        onUpdate({ id: bug.id, status: nextStatus });
                      }}
                    >
                      {BUG_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field" style={{ minWidth: "160px", marginBottom: 0 }}>
                    <label htmlFor={`bug-${bug.id}-severity`}>Severity</label>
                    <select
                      id={`bug-${bug.id}-severity`}
                      className="input"
                      value={bug.severity}
                      disabled={updating}
                      onChange={(event) => {
                        const nextSeverity = event.target.value;
                        if (nextSeverity === bug.severity) {
                          return;
                        }
                        onUpdate({ id: bug.id, severity: nextSeverity });
                      }}
                    >
                      {BUG_SEVERITIES.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field" style={{ minWidth: "220px", marginBottom: 0 }}>
                    <label htmlFor={`bug-${bug.id}-task`}>Linked task</label>
                    <select
                      id={`bug-${bug.id}-task`}
                      className="input"
                      value={bug.task_id ?? ""}
                      disabled={updating}
                      onChange={(event) => {
                        const nextValue = event.target.value ? event.target.value : null;
                        if ((bug.task_id ?? null) === nextValue) {
                          return;
                        }
                        onUpdate({ id: bug.id, task_id: nextValue });
                      }}
                    >
                      <option value="">Not linked</option>
                      {taskOptions.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-subtle">Currently: {getTaskLabel(bug.task_id)}</p>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => onDelete(bug.id)}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete bug"}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}

    </ul>

  );

}

function ErrorMessage({ error }: { error: unknown }) {

  const message = error instanceof Error ? error.message : "Something went wrong";

  return <p className="error">{message}</p>;

}

