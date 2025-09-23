from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List
from uuid import UUID

from sqlalchemy.orm import Session

from .models import Milestone, Project, Task


@dataclass
class TaskSummary:
    total_estimate: float
    remaining_effort: float
    percent_complete: float


@dataclass
class MilestoneSummary(TaskSummary):
    milestone_id: UUID
    milestone_name: str


@dataclass
class ProjectStatus:
    project_id: UUID
    total_estimate: float
    remaining_effort: float
    percent_complete: float
    status_breakdown: dict[str, int]
    milestone_summaries: List[MilestoneSummary]

@dataclass
class ProjectStatusSummary:
    project_id: UUID
    summary: str
    generated_at: datetime


@dataclass
class NextActionSuggestion:
    task_id: UUID
    title: str
    status: str
    persona_required: str | None
    priority_score: float
    reason: str


def _task_remaining(task: Task) -> float:
    estimate = float(task.effort_estimate or 0)
    spent = float(task.effort_spent or 0)
    remaining = max(estimate - spent, 0.0)

    if task.risk_level == "medium":
        remaining *= 1.1
    elif task.risk_level == "high":
        remaining *= 1.25

    return remaining


def _calculate_summary(tasks: Iterable[Task]) -> TaskSummary:
    total_estimate = 0.0
    remaining_effort = 0.0

    for task in tasks:
        total_estimate += float(task.effort_estimate or 0)
        remaining_effort += _task_remaining(task)

    percent_complete = 0.0
    if total_estimate > 0:
        percent_complete = max(0.0, min(100.0, 100.0 * (1 - (remaining_effort / total_estimate))))

    return TaskSummary(total_estimate, remaining_effort, percent_complete)


def compute_project_status(session: Session, project: Project) -> ProjectStatus:
    milestones = session.query(Milestone).filter(Milestone.project_id == project.id).all()
    milestone_map = {milestone.id: milestone for milestone in milestones}

    tasks = (
        session.query(Task)
        .filter(Task.milestone_id.in_(list(milestone_map.keys())))
        .all()
        if milestone_map
        else []
    )

    summary = _calculate_summary(tasks)
    status_breakdown = Counter(task.status for task in tasks)

    milestone_summaries: list[MilestoneSummary] = []
    for milestone in milestones:
        milestone_tasks = [task for task in tasks if task.milestone_id == milestone.id]
        milestone_summary = _calculate_summary(milestone_tasks)
        milestone_summaries.append(
            MilestoneSummary(
                milestone_id=milestone.id,
                milestone_name=milestone.name,
                total_estimate=milestone_summary.total_estimate,
                remaining_effort=milestone_summary.remaining_effort,
                percent_complete=milestone_summary.percent_complete,
            )
        )

    return ProjectStatus(
        project_id=project.id,
        total_estimate=summary.total_estimate,
        remaining_effort=summary.remaining_effort,
        percent_complete=summary.percent_complete,
        status_breakdown=dict(status_breakdown),
        milestone_summaries=milestone_summaries,
    )


def select_next_actions(session: Session, project: Project, limit: int = 3) -> list[NextActionSuggestion]:
    tasks = (
        session.query(Task)
        .join(Milestone, Task.milestone_id == Milestone.id)
        .filter(Milestone.project_id == project.id)
        .filter(Task.status != "done")
        .all()
    )

    tasks.sort(
        key=lambda task: (
            -float(task.priority_score or 0),
            task.status != "blocked",
            (datetime.max.replace(tzinfo=timezone.utc) if task.created_at is None else task.created_at),
        )
    )

    suggestions: list[NextActionSuggestion] = []
    for task in tasks[:limit]:
        reason_parts = []
        priority_score = float(task.priority_score or 0)
        if priority_score > 0:
            reason_parts.append(f"Priority score {priority_score:g}")
        if task.status == "blocked":
            reason_parts.append("Unblock this task")
        elif task.status == "not_started":
            reason_parts.append("Ready to start")

        if not reason_parts:
            reason_parts.append("Pending task")

        suggestions.append(
            NextActionSuggestion(
                task_id=task.id,
                title=task.title,
                status=task.status,
                persona_required=task.persona_required,
                priority_score=priority_score,
                reason="; ".join(reason_parts),
            )
        )

    return suggestions


def generate_project_summary(session: Session, project: Project, limit: int = 3) -> ProjectStatusSummary:
    status = compute_project_status(session, project)
    suggestions = select_next_actions(session, project, limit=limit)

    parts: list[str] = []
    parts.append(f"{project.name}: {status.percent_complete:.1f}% complete")
    if status.total_estimate > 0:
        parts.append(f"{status.remaining_effort:.1f}h remaining of {status.total_estimate:.1f}h planned")
    else:
        parts.append("No effort estimates yet")

    if status.status_breakdown:
        breakdown = ", ".join(f"{count} {state}" for state, count in status.status_breakdown.items())
        parts.append(f"Tasks: {breakdown}")
    else:
        parts.append("Tasks: none recorded")

    if suggestions:
        formatted = "; ".join(f"{s.title} ({s.status})" for s in suggestions)
        parts.append(f"Next: {formatted}")
    else:
        parts.append("Next: no pending items")

    summary = ". ".join(parts)
    return ProjectStatusSummary(
        project_id=project.id,
        summary=summary,
        generated_at=datetime.now(timezone.utc),
    )
