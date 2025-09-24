Using the running dashboard api at http://localhost:8080/
Look at the tasks in Milestone : adc16227-d589-4b0a-86fe-5ad60405339f
Mark the next task in that milestone as In Progress using the API, and start the implementation
When finished the implementaion, mark the task as Pending Validation using the API

Using the running dashboard api at http://localhost:8080/
Update the project id: c86f7594-ff72-486c-970e-913322ccdbd0
with the personas listed in docs\personas.json


2 changes:

when the milestone is selected, the Persona Worklist should only show tasks in that milestone
also warning appear in the console:
hook.js:608 Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>. Error Component Stack
at button (<anonymous>)
at button (<anonymous>)
at li (<anonymous>)
at ul (<anonymous>)
at section (<anonymous>)
at div (<anonymous>)
at main (<anonymous>)
at div (<anonymous>)
at Layout (Layout.tsx:9:34)
at DashboardRoute (Dashboard.tsx:51:49)