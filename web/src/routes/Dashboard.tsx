import { FormEvent, useMemo, useState } from "react";

import Layout from "../components/Layout";
import { CreateMilestoneInput, useCreateMilestone, useMilestones } from "../hooks/useMilestones";
import { CreateProjectInput, useCreateProject, useProjects } from "../hooks/useProjects";
import { CreateTaskInput, useCreateTask, useTasks } from "../hooks/useTasks";

export default function DashboardRoute() {
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<string | undefined>();

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: milestones } = useMilestones(selectedProject);
  const { data: tasks } = useTasks(selectedMilestone);

  const createProject = useCreateProject();
  const createMilestone = useCreateMilestone();
  const createTask = useCreateTask();

  const selectedProjectName = useMemo(
    () => projects?.find((project) => project.id === selectedProject)?.name ?? "",
    [projects, selectedProject],
  );

  return (
    <Layout title="Dashboard">
      <div className="grid grid--two">
        <section>
          <h2 className="section-title">Projects</h2>
          <ProjectForm onSubmit={(values) => createProject.mutate(values)} submitting={createProject.isPending} />
          {projectsLoading && <p className="empty-state">Loading projects…</p>}
          {projectsError && <ErrorMessage error={projectsError} />}
          <ul className="list">
            {projects?.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProject(project.id);
                    setSelectedMilestone(undefined);
                  }}
                  className={`card card--selectable ${selectedProject === project.id ? "card--active" : ""}`}
                >
                  <div className="item-title">{project.name}</div>
                  {project.goal && <div className="text-subtle">{project.goal}</div>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Milestones</h2>
          {selectedProject ? (
            <>
              <MilestoneForm
                projectId={selectedProject}
                onSubmit={(values) => createMilestone.mutate(values)}
                submitting={createMilestone.isPending}
              />
              <ul className="list">
                {milestones?.map((milestone) => (
                  <li key={milestone.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMilestone(milestone.id)}
                      className={`card card--selectable ${selectedMilestone === milestone.id ? "card--active" : ""}`}
                    >
                      <div className="item-title">{milestone.name}</div>
                      {milestone.description && <div className="text-subtle">{milestone.description}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="empty-state">Select a project to view its milestones.</p>
          )}
        </section>
      </div>

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
              {tasks?.map((task) => (
                <li key={task.id}>
                  <div className="card">
                    <div className="item-title">{task.title}</div>
                    {task.description && <div className="text-subtle">{task.description}</div>}
                    <span className="status-tag">Status: {task.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty-state">Select a milestone to view tasks.</p>
        )}
      </section>
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

function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return <p className="error">{message}</p>;
}
