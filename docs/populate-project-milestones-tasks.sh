#!/usr/bin/env bash
# Script to populate a project with milestones and tasks via the running API (localhost:8080)
# Usage: PROJECT_ID=<uuid> ./docs/populate-project-milestones-tasks.sh
# If PROJECT_ID is not set, the script will try to look up a project by slug via the API (project-slug variable).
set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8080/v1}
PROJECT_ID=${PROJECT_ID:-}
PROJECT_SLUG=${PROJECT_SLUG:-agent-dashboard}

if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID not provided, attempting to resolve by slug: $PROJECT_SLUG"
  resp=$(curl -sS "$API_BASE/projects")
  # prefer jq for robust JSON handling
  if command -v jq >/dev/null 2>&1; then
    PROJECT_ID=$(printf '%s' "$resp" | jq -r --arg slug "$PROJECT_SLUG" '.[] | select((.name // "" | ascii_downcase | gsub(" "; "-")) == ($slug | ascii_downcase)) | .id' | head -n1 || true)
  else
    # fallback: python (expand shell variable into heredoc)
    PROJECT_ID=$(printf '%s' "$resp" | python - <<PY
import sys, json
slug = "${PROJECT_SLUG}"
arr = json.load(sys.stdin)
for p in arr:
    name = (p.get('name') or '').lower().replace(' ', '-')
    if name == slug.lower():
        print(p['id'])
        sys.exit(0)
sys.exit(1)
PY
    ) || true
  fi
  if [ -z "$PROJECT_ID" ]; then
    echo "Could not resolve project id. Please set PROJECT_ID env var." >&2
    exit 1
  fi
fi

echo "Using project id: $PROJECT_ID"

# create milestones
create_milestone() {
  local name="$1"
  local description="$2"
  local slug="$3"
  local start_date="$4"
  local due_date="$5"

  body=$(jq -n --arg project_id "$PROJECT_ID" --arg name "$name" \
    --arg description "$description" --arg slug "$slug" \
    --arg start_date "$start_date" --arg due_date "$due_date" \
    '{project_id: $project_id, name: $name, description: $description, slug: ($slug // null), start_date: ($start_date // null), due_date: ($due_date // null)}')

  echo "Creating milestone: $name" >&2
  echo "Payload: $body" >&2
  resp=$(curl -sS -X POST "$API_BASE/milestones" -H 'Content-Type: application/json' -d "$body" -w "\nHTTP_STATUS:%{http_code}")
  # separate body and status
  status=$(printf '%s' "$resp" | awk -F'HTTP_STATUS:' '{print $2}')
  body_only=$(printf '%s' "$resp" | sed 's/HTTP_STATUS:.*//')
  echo "HTTP status: ${status:-}" >&2
  # Safely pretty-print JSON only if body looks like JSON; avoid failing jq when input is empty or invalid
  trimmed=$(printf '%s' "$body_only" | awk '{$1=$1;print}')
  if [ -n "$trimmed" ] && (printf '%s' "$trimmed" | grep -qE '^[[:space:]]*[{\[]'); then
    if command -v jq >/dev/null 2>&1; then
      if printf '%s' "$trimmed" | jq . >/dev/null 2>&1; then
        printf '%s' "$trimmed" | jq . >&2
      else
        echo "$trimmed" >&2
      fi
    else
      echo "$trimmed" >&2
    fi
  else
    echo "$body_only" >&2
  fi
  echo "---"
}

# create task
create_task() {
  local title="$1"
  local external_id="$2"
  local milestone_slug_or_id="$3" # can be slug or id
  local description="$4"
  # Build base payload
  if [ -z "$milestone_slug_or_id" ]; then
    payload=$(jq -n --arg project_id "$PROJECT_ID" --arg title "$title" --arg external_id "$external_id" --arg description "$description" \
      '{project_id: $project_id, title: $title, external_id: $external_id, description: $description}')
  else
    if echo "$milestone_slug_or_id" | grep -E -q '^[0-9a-fA-F-]{36}$'; then
      payload=$(jq -n --arg project_id "$PROJECT_ID" --arg title "$title" --arg external_id "$external_id" --arg description "$description" --arg milestone_id "$milestone_slug_or_id" \
        '{project_id: $project_id, title: $title, external_id: $external_id, description: $description, milestone_id: $milestone_id}')
    else
      payload=$(jq -n --arg project_id "$PROJECT_ID" --arg title "$title" --arg external_id "$external_id" --arg description "$description" --arg milestone_slug "$milestone_slug_or_id" \
        '{project_id: $project_id, title: $title, external_id: $external_id, description: $description, milestone_slug: $milestone_slug}')
    fi
  fi

  echo "Creating task: $title"
  echo "Payload: $payload"
  resp=$(curl -sS -X POST "$API_BASE/tasks" -H 'Content-Type: application/json' -d "$payload" -w "\nHTTP_STATUS:%{http_code}")
  status=$(printf '%s' "$resp" | awk -F'HTTP_STATUS:' '{print $2}')
  body_only=$(printf '%s' "$resp" | sed 's/HTTP_STATUS:.*//')
  echo "HTTP status: ${status:-}";
  trimmed=$(printf '%s' "$body_only" | awk '{$1=$1;print}')
  if [ -n "$trimmed" ] && (printf '%s' "$trimmed" | grep -qE '^[[:space:]]*[{\[]'); then
    if command -v jq >/dev/null 2>&1; then
      if printf '%s' "$trimmed" | jq . >/dev/null 2>&1; then
        printf '%s' "$trimmed" | jq .
      else
        echo "$trimmed"
      fi
    else
      echo "$trimmed"
    fi
  else
    echo "$body_only"
  fi
  echo "---"
}

# Milestones and tasks to create (from your spec)
# Milestone 1
M1_NAME="Project & test harness setup"
M1_GOAL="Ensure a reproducible dev environment and a test runner for unit and integration tests."
M1_SLUG="project-test-harness-setup"

# Milestone 2
M2_NAME="Local log ingestion (file + optional stream)"
M2_GOAL="Implement a robust ingestion layer that can read JSON log files from disk and accept an optional local process stream interface."
M2_SLUG="local-log-ingestion"

# Milestone 3
M3_NAME="Log store, list UI, and expandable entries"
M3_GOAL="Create a local log store and a UI list component that displays JSON entries as expandable/collapsible items (with virtualization if needed)."
M3_SLUG="log-store-list-ui"

# Milestone 4
M4_NAME="LM Studio integration (local model client)"
M4_GOAL="Provide a small API client to call a local LM Studio instance to send prompts and receive completions."
M4_SLUG="lm-studio-integration"

# Milestone 5
M5_NAME="Summarization engine and time-window queries"
M5_GOAL="Build the summarization flow: query the store, build prompts, call LM Studio, and persist/display summaries."
M5_SLUG="summarization-engine"

# Milestone 6
M6_NAME="Settings UI, error handling, and UX polish"
M6_GOAL="Expose LM Studio endpoint, time-window defaults, ingestion behavior, and show unobtrusive errors and logs in the UI."
M6_SLUG="settings-ui"

# Milestone 7
M7_NAME="End-to-end tests, CI, and documentation"
M7_GOAL="Add E2E tests against a mocked LM Studio and create CI to run unit + e2e checks; document SCSS and dev workflow."
M7_SLUG="e2e-ci-docs"

# create milestones will be done via create_milestone_and_get_id below
# extract_id is no longer used externally but keep for compatibility if needed
extract_id() {
  # safe jq-based id extraction from a JSON body string
  echo "$1" | jq -r '.id // empty' 2>/dev/null || echo ""
}

# Create milestones and capture their IDs (fail early on unexpected responses)
create_milestone_and_get_id() {
  local name="$1"
  local description="$2"
  local slug="$3"
  local start_date="$4"
  local due_date="$5"

  body=$(jq -n --arg project_id "$PROJECT_ID" --arg name "$name" \
    --arg description "$description" --arg slug "$slug" \
    --arg start_date "$start_date" --arg due_date "$due_date" \
    '{project_id: $project_id, name: $name, description: ($description // null), slug: ($slug // null), start_date: (if $start_date=="" then null else $start_date end), due_date: (if $due_date=="" then null else $due_date end)}')

  echo "Creating milestone: $name" >&2
  echo "Payload: $body" >&2
  # use temp files to capture headers and body safely (avoids CRLF parsing issues)
  hdr=$(mktemp)
  bdy=$(mktemp)
  status=$(curl -sS -D "$hdr" -o "$bdy" -X POST "$API_BASE/milestones" -H 'Content-Type: application/json' -d "$body" -w "%{http_code}")
  headers=$(cat "$hdr" 2>/dev/null || true)
  body_only=$(cat "$bdy" 2>/dev/null || true)
  rm -f "$hdr" "$bdy"
  echo "HTTP status: ${status:-}" >&2
  if command -v jq >/dev/null 2>&1; then
    if printf '%s' "$body_only" | jq . >/dev/null 2>&1; then
      printf '%s' "$body_only" | jq . >&2
    else
      echo "$body_only" >&2
    fi
  else
    echo "$body_only" >&2
  fi

  # handle responses
  if [[ "$status" =~ ^20[01]$ ]]; then
  # try id in body
  id=$(echo "$body_only" | jq -r '.id // empty' 2>/dev/null || echo "")
    if [ -n "$id" ]; then
      echo "$id"
      return 0
    fi
    # fallback: look for Location header
    loc=$(printf '%s' "$headers" | grep -i '^Location:' | awk '{print $2}' | tr -d '\r' || true)
    if [ -n "$loc" ]; then
      # extract trailing UUID from Location (assumes /v1/milestones/<id>)
      id=$(basename "$loc")
      if [ -n "$id" ]; then
        echo "$id"
        return 0
      fi
    fi
    # no id in body or Location; try listing as last resort
  elif [ "$status" = "409" ]; then
  echo "Conflict: milestone may already exist; searching by slug..." >&2
    # list milestones for the project and find matching slug
    id=$(curl -sS "$API_BASE/milestones?project_id=$PROJECT_ID" | jq -r --arg slug "$slug" '.[] | select((.slug // "") | ascii_downcase == ($slug|ascii_downcase)) | .id' 2>/dev/null || true)
    if [ -n "$id" ]; then
      # print id only to stdout
      printf '%s' "$id"
      return 0
    fi
  fi

  echo "Failed to create/find milestone '$name' (status=$status). See output above." >&2
  return 1
}

M1_ID=$(create_milestone_and_get_id "$M1_NAME" "$M1_GOAL" "$M1_SLUG" "" "" ) || exit 1
M2_ID=$(create_milestone_and_get_id "$M2_NAME" "$M2_GOAL" "$M2_SLUG" "" "" ) || exit 1

echo "Milestone IDs: M1=$M1_ID M2=$M2_ID"

# Create remaining milestones (3-7)
M3_ID=$(create_milestone_and_get_id "$M3_NAME" "$M3_GOAL" "$M3_SLUG" "" "" ) || exit 1
M4_ID=$(create_milestone_and_get_id "$M4_NAME" "$M4_GOAL" "$M4_SLUG" "" "" ) || exit 1
M5_ID=$(create_milestone_and_get_id "$M5_NAME" "$M5_GOAL" "$M5_SLUG" "" "" ) || exit 1
M6_ID=$(create_milestone_and_get_id "$M6_NAME" "$M6_GOAL" "$M6_SLUG" "" "" ) || exit 1
M7_ID=$(create_milestone_and_get_id "$M7_NAME" "$M7_GOAL" "$M7_SLUG" "" "" ) || exit 1

echo "Milestone IDs: M1=$M1_ID M2=$M2_ID M3=$M3_ID M4=$M4_ID M5=$M5_ID M6=$M6_ID M7=$M7_ID"

# Create tasks for M1
create_task "01.0: Add a failing test that asserts the test runner is wired and the project builds in test mode." "m1-01-0" "$M1_ID" "Create tests/setup.test.ts that imports the app entry and asserts a non-null App component or that npm run build succeeds (mocked)."
create_task "02.0: Configure the test runner (Jest or Vitest), add minimal test script in package.json, and implement bootstrapping so the test passes." "m1-02-0" "$M1_ID" "Configure Vitest/Jest, update tsconfig, add scripts." 

# Create tasks for M2
create_task "01.0: Write a failing unit test that verifies the ingestion API can read a single JSON file and returns a parsed object." "m2-01-0" "$M2_ID" "Create tests/ingest/file-ingest.test.ts to write a temp json and assert ingestion returns parsed object."
create_task "02.0: Implement src/ingest/fileIngest.ts to read JSON files and return normalized records." "m2-02-0" "$M2_ID" "Implement file ingestion supporting ndjson and arrays; return parsed records."

echo "Done."
