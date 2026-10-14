# Backend contract

**Minimum pachifast version:** none in particular: `GET /api/admin/audit/activity` has been in pachifast since 0.1.0 (the default exclusion of `refresh-token` paths is applied from 0.8.0); the system card only needs an endpoint returning the shape below (a project route, not part of pachifast). See the pachifast CHANGELOG.

The cards do not know any endpoint: they request the `url` you give them. The shapes below are the ones produced by a
`pachifast` backend and by the demo project.

By default the backend wraps every successful (2xx) JSON response in an envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

The cards expect the **payload** (`data`), so the HTTP client must unwrap the envelope. The client of
`@ilpachi/pachifastquasar` does (`unwrapEnvelope`; switch it off with `QCLI_HTTP_ENVELOPE=false` when the backend runs
with `PACHIFAST_ENVELOPE_ENABLED=false`). A client registered through `setPachiWidgetsHttp` is used as is: the widgets make no
assumption on the shape and accept both wrapped (if the client unwraps) and bare payloads.

### Recent activity: `GET /api/admin/audit/activity`

| | |
| --- | --- |
| Request | `GET /api/admin/audit/activity?limit=10` with the bearer token |
| Access | **superusers only**. Other users get `403`. |
| Availability | the route exists only when the activity log is enabled on the backend (`PACHIFAST_ACTIVITY_LOG_ENABLED=true`, setting `activity_log_enabled`); otherwise `404`. |
| Query | `limit` (1 to 500, default 10); optional filters `search`, `userId`, `method`, `statusCode`, `dateFrom`, `dateTo`, `pathContains`, `excludePaths`, `orderBy` (default `-timestamp`, newest first). By default paths containing `refresh-token` are excluded (setting `activity_log_exclude_paths`). |
| Response | the plain list (no pagination) of the latest entries. |

Only write requests (`POST`, `PUT`, `PATCH`, `DELETE`) under `/api` with a status below 500 are logged.

Payload (inside the envelope `data`):

```json
[
  {
    "id": 42,
    "timestamp": "2026-10-05T14:02:23.430541Z",
    "user_id": "0f0b5a0c-5d0e-4a64-9f2e-2f0c8c0f9a11",
    "username": "mrossi",
    "method": "POST",
    "path": "/api/demo/items",
    "status_code": 201,
    "duration_ms": 12,
    "description": "mrossi created item 7"
  }
]
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Used as the list key. |
| `timestamp` | string | ISO 8601, UTC. Only the time is shown. |
| `user_id` | string (UUID) or `null` | The type `IDashboardActivity.user_id` declares `number`, but the backend sends a UUID string or `null`. The cards do not read it. |
| `username` | string or `null` | Denormalised: it survives the deletion of the user. Not displayed. |
| `method` | string | Not displayed. |
| `path` | string | Shown when `description` is empty. |
| `status_code` | integer | Not displayed. |
| `duration_ms` | integer or `null` | Not displayed. |
| `description` | string or `null` | Built by the backend from the `log_as` template of the route. |

### System information: `GET /api/demo/lab/system` (demo project)

The system card does not have a built-in endpoint in `pachifast`; the demo project exposes one that returns the shape the
card understands (any endpoint with the same shape works):

```json
{
  "success": true,
  "message": "...",
  "data": {
    "version": "1.2.3",
    "environment": "debug",
    "status": "ok",
    "uptime": "1h 12m 5s"
  }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `version` | string | Optional. |
| `environment` | string | Optional (the demo sends `debug` or `production`). |
| `status` | `'ok' \| 'warn' \| 'error'` | Drives the label and the dot colour. |
| `uptime` | string | Optional. Shown exactly as received (the demo sends a formatted text such as `1h 12m 5s`; a value of `0` is hidden). |

### Errors

Errors are never a 2xx. The backend answers with a non-2xx status and:

```json
{
  "detail": [
    { "loc": ["header", "authorization"], "msg": "...", "type": "...", "code": "...", "params": {} }
  ]
}
```

Any failure (`401`, `403`, `404`, network error, invalid JSON) puts the card into its error state; the body is not
inspected. A `401` is handled before by the shell client, which refreshes the token and retries.
