97978007-2b82-44b9-97a6-c0d1a2e87d47

# replace <PROJECT_ID> with the id from step 1
curl -s "http://localhost:8080/v1/projects/97978007-2b82-44b9-97a6-c0d1a2e87d47/milestones?slug=test-milestone"


curl -s "http://localhost:8080/v1/milestones?project_id=97978007-2b82-44b9-97a6-c0d1a2e87d47"


# fetch via listing and then grep for external_id, or use the DB query below
curl -s "http://localhost:8080/v1/tasks" | jq '.[] | select(.external_id=="test_ext_1")'



removed these tasks:

419e6340-f5ca-444f-aa60-3c90c1c532e3
7c72ae95-f8d6-4b1b-8068-bf18ab08b6ec
e95643e9-72af-48cd-ab04-71b4519a222d
e45a23e7-a6cf-48d6-982a-405a46cdd4d7
7b1033c5-aad7-4601-9745-671c594f95b9
38cd80b2-2441-46f8-909f-ceda533619ce
a915e386-c3a4-48d6-9d73-3c648e856b70
6761e1d5-dc6e-4a4d-886b-81dedfe67f7d
2054b8a1-64ff-41e9-acc3-222a98c63269
1e4c381a-f63b-41e4-bd8f-9096162f95c5
