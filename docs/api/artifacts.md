# Artifacts API

Artifacts are generated outputs from agent work — code diffs, test results, documents, configs.

## List Artifacts

```http
GET /api/artifacts?projectId=uuid
GET /api/artifacts?taskId=uuid
GET /api/artifacts?type=code_diff
```

## Get Artifact

```http
GET /api/artifacts/:id
```

**Response**:
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "workstreamId": "uuid",
  "taskId": "uuid",
  "type": "code_diff",
  "name": "todo-routes-implementation",
  "content": "...",
  "metadata": {
    "filesChanged": 3,
    "linesAdded": 150
  },
  "createdAt": "2026-03-31T10:06:00Z"
}
```

## Artifact Types

| Type | Description |
|------|-------------|
| `code_diff` | Code changes from agent execution |
| `test_result` | Test execution results |
| `document` | Generated documentation |
| `architecture` | Architecture diagrams and plans |
| `config` | Configuration files |
| `log` | Execution logs |
| `review_report` | QA validation reports |
