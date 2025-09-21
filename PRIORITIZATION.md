# Prioritization & Decision Rubric

Last Updated: 2025-09-20T00:00:00Z

## Purpose
Provide a consistent, lightweight framework for selecting what to build next that enforces an MVP-first mindset. Every decision should answer: "Does this accelerate delivering or validating the core value of the AI Agent Dashboard?" If not, it is deferred.

## High-Level Goal
Rapidly deliver a thin vertical slice (Task + Bug CRUD + Status Updates + Schema) enabling multiple agents to coordinate, then iterate based on observed usage, not conjecture.

## Core Prioritization Principles
| Principle | Explanation | Example |
|-----------|-------------|---------|
| MVP First | Prefer features directly enabling the minimum coordination workflow | Implement Task CRUD before adding webhook notifications |
| Evidence over Assumption | Ship instrumentation & collect usage before optimizing | Add metrics before performance tuning |
| Simplicity > Completeness | Start with smallest schema supporting workflow | Defer complex role matrix until Phase 3 |
| Reversible Changes First | Tackle decisions that are easy to refactor early | In-memory store before DB |
| Risk Reduction | Prioritize tasks that burn down critical uncertainties | Define domain model early |
| Leverage Existing | Avoid reinventing stable solutions | Use existing validation lib |
| Security Hygiene Early | Light touch: dependency scanning & no secrets | Add scan script before auth system |

## Scoring Model (Prioritization Worksheet)
Weighted qualitative scoring. Default weights may evolve post-MVP.

| Factor | Weight | Scoring Guidance |
|--------|--------|------------------|
| MVP Alignment | 5 | Directly required (5), Enables soon (3), Nice-to-have (1) |
| Risk Reduction | 3 | Eliminates major unknown (3), minor (1) |
| Implementation Effort (Inverse) | 2 | Tiny (<1h)=5, Small (1-3h)=4, Medium (0.5d)=3, Large (1d)=2, Huge (multi-day)=1 |
| Dependency Unblocker | 2 | Unblocks multiple tasks (2), single (1), none (0) |
| Quality/Integrity Impact | 2 | Prevents defects / data loss (2), improves clarity (1) |

Priority Score = Sum(weighted factor scores). Higher = sooner.

## Decision Flow
1. Does it unblock MVP acceptance criteria? If yes -> High.
2. Does a cheaper alternative exist? If yes -> pick simpler path.
3. Will delaying it increase future rework cost > 3x? If yes -> pull in earlier.
4. Is it a polish feature (analytics, automation) pre-MVP? Defer.

## Examples
| Candidate | MVP Align | Risk Reduc | Effort Inv | Dep Unblock | Quality | Score | Priority | Notes |
|-----------|-----------|-----------|------------|-------------|---------|-------|----------|-------|
| Task CRUD API | 5*5=25 | 3*3=9 | 2*4=8 | 2*2=4 | 2*2=4 | 50 | High | Core |
| Webhook notifications | 1*5=5 | 0 | 2*2=4 | 0 | 0 | 9 | Low | Post-MVP |
| Dependency vulnerability scan | 3*5=15 | 1*3=3 | 2*5=10 | 0 | 2*2=4 | 32 | Medium | Early hygiene |

## Trade-Off Guidelines
| Situation | Bias Toward |
|-----------|-------------|
| Uncertainty high, reversible | Ship quickly, measure |
| Uncertainty low, irreversible | Slow down, document | 
| Performance vs Clarity | Clarity early; optimize after metrics |
| Feature vs Stability | Stability until MVP stable |
| Automation vs Manual | Manual path first |

## Deferral Categories
| Category | Definition | Example |
|----------|------------|---------|
| Post-MVP | Not needed to validate core workflow | Rich UI styling |
| Phase-Gated | Requires earlier phase completion | Persistence adapter swap |
| Spike | Short exploration to reduce risk; result may be discardable | Quick test of alternative schema |
| Backlog | Ideas with potential value; not yet justified | AI summarization of status updates |

## Change Control
1. Any change to scoring weights requires ADR-lite entry.
2. Recalculate impacted task scores when backlog shifts materially.
3. Keep this file updated—if stale > 7 days, trigger a Plan Refresh ritual.

## Rapid Triage Checklist (For New Tasks)
| Step | Question | Action If No |
|------|----------|-------------|
| 1 | Supports MVP acceptance? | Defer / backlog |
| 2 | Has clear acceptance criteria? | Draft before queuing |
| 3 | Small enough (< 1 day)? | Split into smaller tasks |
| 4 | Dependencies identified? | Add dependency list |
| 5 | Owner clear? | Assign or mark unowned |

## Anti-Patterns to Avoid
| Anti-Pattern | Consequence | Mitigation |
|-------------|-------------|-----------|
| Parallel large tasks w/o integration points | Merge conflicts & delay | Slice smaller verticals |
| Over-modeling early schemas | Waste & churn | Add fields only when required |
| Premature auth complexity | Slow progress | Stubs + plan security phase |
| Hidden decision making | Knowledge loss | Log ADR-lite entries |

## Governance
| Role | Responsibility |
|------|---------------|
| Project Manager | Ensures rubric applied consistently |
| Architect | Validates architectural impact of prioritization |
| Security Agent | Flags tasks introducing security risk |
| QA Tester | Ensures testability considered pre-implementation |
| Code Reviewer | Confirms maintainability cost acceptable |

## Next Immediate Priorities (Sync With Project Plan)
Refer to Project Plan Logical Next Steps. This section should NOT diverge; if mismatch occurs update both or centralize to the plan and link here.

---
End of Prioritization Rubric.
