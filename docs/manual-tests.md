97978007-2b82-44b9-97a6-c0d1a2e87d47

# replace <PROJECT_ID> with the id from step 1
curl -s "http://localhost:8080/v1/projects/97978007-2b82-44b9-97a6-c0d1a2e87d47/milestones?slug=test-milestone"


curl -s "http://localhost:8080/v1/milestones?project_id=97978007-2b82-44b9-97a6-c0d1a2e87d47"


# fetch via listing and then grep for external_id, or use the DB query below
curl -s "http://localhost:8080/v1/tasks" | jq '.[] | select(.external_id=="test_ext_1")'

