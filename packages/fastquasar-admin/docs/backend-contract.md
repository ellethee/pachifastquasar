# Backend contract

**Minimum pachifast version:** 0.5.0 (list, detail, create, update, delete, `_schema` and `_options` exist from 0.4.0; change history, bulk actions and the `lookup` component need 0.5.0; from 0.11.0 the lists default to page 1 of 25 and at most 200 rows per page). See the pachifast CHANGELOG.

Written against `pachifast` 0.5.0 or later. Everything is under the envelope `{ success, message, data }` and the
client of the shell unwraps it; ids can be `int`, `str` or `uuid`. All paths below are prefixed with
`/api/admin/models` (option `basePath`).

| Request | Response (`data`) |
| --- | --- |
| `GET /` | `[{ app, model, title, titleKey, permissions: { view, add, change, delete } }]`, only models with `view`. |
| `GET /{app}/{model}/_schema` | the schema (below). |
| `GET /{app}/{model}?page&pageSize&orderBy&search&<filter>=<value>` | `{ items, total, page, pageSize, pages }`; default `pageSize` 25, max 200. `orderBy` accepts several fields separated by commas (`-status,number`, `-` = descending, only `orderFields`); an invalid one is a `422` `api.invalid_order_by` with `loc: ["query", "orderBy"]`. |
| `GET /{app}/{model}/{pk}` | the row. |
| `POST /{app}/{model}` | `201`, the row. |
| `PATCH /{app}/{model}/{pk}` | the row (only the sent fields change). |
| `DELETE /{app}/{model}/{pk}` | `204`. |
| `GET /{app}/{model}/_options?search&page&pageSize&ids=1,2` | `{ items: [{ value, label }], total, page, pageSize, pages }`. |
| `POST /{app}/{model}/_actions/{name}` with `{ "ids": [...] }` (1-500) | `{ affected, message }`. |
| `GET /{app}/{model}/{pk}/history?page&pageSize` | `{ items: [{ id, timestamp, userId, username, action, changes: { field: { old, new } } }], ... }`, newest first. |

## Schema

```json
{
  "app": "demo", "model": "item", "title": "Item", "titleKey": "admin.demo.item.title",
  "primaryKey": "id", "primaryKeyType": "int",
  "permissions": { "view": true, "add": true, "change": true, "delete": true },
  "list": {
    "display": ["name", "status"], "search": true, "ordering": ["-id"], "orderFields": ["name", "id"],
    "filters": [{ "field": "active", "component": "toggle", "label": "Active", "labelKey": "admin.demo.item.active.label" }]
  },
  "fields": {
    "name": { "component": "input", "type": "string", "label": "Name", "labelKey": "...", "required": true,
              "readonly": false, "nullable": false, "primaryKey": false, "default": null, "maxlength": 120 }
  },
  "actions": [{ "name": "archive", "label": "Archive selected", "labelKey": "...", "permission": "change",
                "confirm": true, "allowed": true }],
  "history": true
}
```

Field `component` is one of `input`, `textarea`, `number`, `toggle`, `select`, `date`, `datetime`, `time`, `json`,
`lookup`; `type` one of `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `time`, `json`. Optional keys:
`properties` (`options: [{ label, value }]`, `min`, `max`, `step` as a number or `"any"`), `optionKeys`
(`{ <value>: "<message key>" }`) and `lookup: { app, model }`.

How the page uses it:

- read-only fields and the primary key are never written; `required` is enforced only on creation; unknown or read-only
  keys in a body are ignored by the backend;
- the buttons use `schema.permissions` (the permissions of the **current user**); an action is hidden when
  `allowed` is `false` or its `permission` is missing; `confirm` asks for confirmation;
- `lookup` fields read `GET /{lapp}/{lmodel}/_options?search=` and resolve the saved value with `?ids=`;
- filters: without `range` the filter is an equality (`?field=value`); with `range: true` (`integer`, `number`, `date`,
  `datetime`, `time`) the page shows two inputs and sends `<field>__gte` / `<field>__lte` (camelCase field; ISO values).
  For a `datetime` filter the user picks a day: `__gte` is the start of the day and `__lte` the end of the day in the
  local time zone, sent as ISO UTC (`2026-01-01T00:00:00Z`). A `lookup` filter sends the primary key (equality);
- datetimes come back in UTC and are shown in the local time zone; on write `toISOString()` (UTC, `Z`) is sent;
- row titles: before a delete confirmation (single row or bulk action with `confirm`) the page makes one call
  `GET /{app}/{model}/_options?ids=12,13` and shows the first labels and "and N more";
- bulk actions: the `message` of the response is shown when present (otherwise a generic text with `affected`);
- history: `changes` is always an object (`{}` shows "No field changes"); an unknown pk gives an empty list;
- JSON types: `date` / `time` / `datetime` are ISO 8601 strings, UUIDs are strings, Decimal is a **string**
  (`"1.50"`), float a number, JSON an object / array.

## Texts

The backend sends English or translated `title` / `label` plus the message key (`titleKey`, `labelKey`, `optionKeys`).
The page resolves a text as: `labels` option, translation of the key in the app messages, backend text. Keys follow
`admin.<app>.<model>.title|<column>.label|<column>.options.<value>|actions.<name>.label` plus the built-in
`admin.text.action.delete_selected`.

## Errors

| Status | Code | Shown as |
| --- | --- | --- |
| `422` | uniform; `loc: ["body", "<field>"]` or `["query", "<param>"]` (camelCase; for ranges the parameter name, `dueDate__gte`) | message under the form field or the matching filter; `orderBy` and `ids` errors (`["body", "ids"]`) are shown as a general message |
| `409` | `admin.integrity_error` | banner in the dialog |
| `403` | `access.permissions_missing` (`params.permissions`) | message "Missing permissions: ..." |
| `404` | `admin.object_not_found`, `admin.action_not_found`, `admin.model_not_found` | message |
| `401` | | handled by the shell (refresh, then login) |

Messages come from `errors.codes.<code>` of the app, then from the package (`pachiAdmin.errors.codes.*`), then from
the backend `msg`.
