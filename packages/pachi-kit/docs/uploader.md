# Uploader

A file upload component for [Quasar](https://quasar.dev) (Vue 3) built on `QUploader`: one card per queued file with
thumbnail (image, PDF or text), editable file name and metadata form, status and progress, full-size preview, and
an upload header that can teleport into a `PachiDialog` toolbar. It is decoupled from the host application: the
authentication headers and the (optional) event bus for server-side progress are passed in by the consumer.



## Requirements

The uploader uses `QUploader`; its header actions are teleported into the toolbar portal of the `dialog` area and files are renamed with `PachiPopupEdit` from the `ui` area (both shipped in this package). Install the package and its peers as described in [Installation](installation.md).

## Quick start

`usePachiUploader()` creates the shared state and returns the `PachiUploader` component together with the **single**
prop to pass to it (`pachiUploaderProps`). Call it in `setup()`.

```vue
<template>
  <pachi-uploader :pachi-uploader-props="pachiUploaderProps">
    <!-- optional: extra form inside every card -->
    <template #card-extension="{ item }">
      <q-input v-model="item.title" dense outlined label="Title" />
      <q-input v-model="item.description" dense outlined type="textarea" autogrow label="Description" />
    </template>
  </pachi-uploader>
</template>

<script setup lang="ts">
import { defaultUploaderProps, usePachiUploader } from '@ilpachi/pachi-kit/uploader'

interface IFileMeta { title: string, description: string }

const { PachiUploader, pachiUploaderProps } = usePachiUploader<IFileMeta>({
  itemDefaults: { title: '', description: '' },
  uploaderProps: { ...defaultUploaderProps, url: '/api/files/upload' },
  // array or function; a function is evaluated on every request (tokens that change)
  headers: () => [{ name: 'Authorization', value: `Bearer ${getToken()}` }],
})
</script>
```

The user picks (or drops) files, edits each card, and presses the upload button of the header. Nothing is uploaded
automatically (`autoUpload: false` in `defaultUploaderProps`).

### Inside a dialog

When a `PachiUploader` is rendered inside a `PachiDialog`, its header actions (add files, upload, abort, remove...)
are teleported into the dialog toolbar. Give the uploader a bounded height with `--pachi-uploader-height`:

```vue
<pachi-dialog ref="dlg" title="Upload" :icon="mdiCloudUpload" width="760px" max-width="95vw">
  <div class="my-uploader-body">
    <pachi-uploader :pachi-uploader-props="pachiUploaderProps" />
  </div>
</pachi-dialog>

<style lang="scss">
.my-uploader-body {
  // the default (calc(100vh - 100px)) is too tall inside a dialog
  --pachi-uploader-height: 340px;
}
</style>
```

To place the actions in another element use the `headerTarget` option (an `HTMLElement`).

## `PachiUploader` component

| Prop | Type | Description |
| --- | --- | --- |
| `pachiUploaderProps` | `IPachiUploaderProps<T>` | **Required.** The object returned by `usePachiUploader`. |

The component is generic (`generic="T"`) and renders a `QUploader` (class `pachi-uploader no-shadow`, full width)
whose `header` and `list` slots are replaced by the package header and a responsive grid of cards.

**Events.** None of its own: use the `onAdded` / `onUploaded` / `onFailed` / `onRejected` / ... callbacks of
`uploaderProps`.

**Slots.**

| Slot | Scope | Description |
| --- | --- | --- |
| `card-extension` | `{ fileItem: UpdatableFileItem<T>, item: T }` | Extra form rendered in every card. `item` is the card's local metadata object: bind your inputs to it (`v-model="item.title"`); changes are sent in the `metadata` field. |

**Exposed members** (template ref): `getUploaderRef`, `qUploaderRef`, `useBatch`, `dryRun`, `getFileStatus`,
`getFileMetadata`, `removeFile`, `added`, `updateMetadata`, `canUpload` (computed boolean).

### The cards

Each queued file is shown in a card (`pachi-fuc`) with:

- the (renamable) file name, edited with `PachiPopupEdit` until the file starts uploading, and the file's last-modified date;
- a thumbnail: the image itself, the first page of a PDF (in an `iframe`), the first 400 bytes of a text file, or a type icon (PDF, Word, Excel, PowerPoint, image, generic);
- a click on the thumbnail (or Enter / Space) opens a full-size preview: image, PDF, or text (the text preview is limited to `MAX_TEXT_PREVIEW_BYTES`, 1 MB, and truncated with `…` beyond it);
- a progress circle over the thumbnail and a 4 px bar while uploading; a thumb-up or thumb-down icon when finished;
- the footer: `mime · size`, translated status (or "Storage error"), a *restore* button when the metadata differs from the initial values, and a *remove from list* button.

Text files are recognised by MIME type (`text/*`, `application/json`, `xml`, `yaml`, `javascript`, ...) or by extension
(`isTextFile`).

### Rename

The name edited in the card becomes the **actual multipart file name** (`filename` of the part's `Content-Disposition`),
the value of the metadata field `keyMapping.file`, and the key of the `metadata` object: the server receives one name.
The queued `File` instance is updated (`name` redefined; the original name is kept in `file.__originalName`; restoring the
original value restores the name). An empty name, or one containing `/` or `\`, is ignored and the original is sent. The
progress events of the event bus must therefore carry the `filename` received by the server, i.e. the renamed one.

### Validation of type and size

The package applies **no limit by default**: without `accept` and `maxFileSize` any file of any size is accepted. Set the
native `QUploader` props in `uploaderProps` and handle refusals with `onRejected`:

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024

uploaderProps: {
  ...defaultUploaderProps,
  url: '/api/files/upload',
  accept: 'image/png,image/jpeg,application/pdf,text/plain', // MIME, wildcard or extensions
  maxFileSize: MAX_FILE_SIZE,    // bytes per file
  maxTotalSize: 50 * 1024 * 1024, // optional
  maxFiles: 20,                  // optional
  onRejected: (entries: QRejectedEntry[]) => {
    for (const { failedPropValidation, file } of entries) {
      $q.notify({ type: 'warning', message: `${file.name}: ${failedPropValidation}` })
    }
  },
}
```

Client-side checks never replace server validation.

### Progress

Without `eventBus` the bar shows the browser-to-server transfer (the `XMLHttpRequest` upload progress), 0-100 %.
With an `eventBus` the percentage is split in two phases:

| Phase | Range | Source |
| --- | --- | --- |
| Browser to server | 0-50 % | XHR upload progress |
| Server to storage | 50-100 % | `upload_progress` events (`status: 'done'` forces 100 %) |

`mapProgress(browserProgress, storage?)` implements the rule. The composable generates a session `upload_id`
(UUID v4), sends it as a form field and registers `{ onMessage }` with `eventBus.addHandler(progressEvent, handler)` on
mount (removed on unmount). Messages are accepted only if `upload_id` matches:

```ts
interface UploadProgressMessage {
  upload_id: string                    // the value received in the form field
  filename: string                     // the name of the multipart part (renamed name)
  progress: number                     // 0..1 (storage phase)
  status: 'uploading' | 'done' | 'error' | 'idle'
  error?: string
}
```

Files with the same name are routed to the first one not yet finished. `status: 'error'` shows "Storage error" in the card.

```ts
const { PachiUploader, pachiUploaderProps } = usePachiUploader<IFileMeta>({
  itemDefaults: { title: '', description: '' },
  uploaderProps: { ...defaultUploaderProps, url: '/api/files/upload' },
  eventBus: {
    addHandler: (event, handler) => bus.on(event, handler.onMessage),
    removeHandler: (event, handler) => bus.off(event, handler.onMessage),
  },
})
```

`bus` is whatever the app has (a WebSocket wrapper, an `EventTarget`, mitt...): the package only needs the two methods.

## `usePachiUploader` options

```ts
function usePachiUploader<T>(options: IUsePachiUploaderProps<T>): IUsePachiUploaderReturn<T>
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `uploaderProps` | `Partial<QUploaderProps>` | **required** | Props of the inner `QUploader` (`url`, `accept`, `maxFileSize`, `batch`, `onRejected`, ...). `defaultUploaderProps` provides generic defaults. The object is **not mutated**: the callback wrappers, `formFields` and `headers` are applied to a shallow copy. It is a snapshot: later changes to `url`, static `headers`, etc. are not picked up (use a `headers` function for dynamic values). |
| `itemDefaults` | `T` | **required** | Initial metadata of every file (spread in front of the automatic `filename`, `date` and `size` fields). |
| `keyMapping` | `Record<string, string>` | `{ file: 'filename', date: 'date', size: 'size' }` | Names of the automatic metadata fields. `keyMapping.file` is also the field edited by the rename popup and used as the multipart file name. |
| `filenameKey` | `string` | `'filename'` | Returned as `pachiUploaderProps.filenameKey` but not read by the components: configure the name field with `keyMapping.file`. |
| `headers` | `{ name, value }[] \| (() => { name, value }[])` | `[]` | Extra request headers. A function is evaluated on every request. Ignored when `uploaderProps.headers` is already defined. |
| `extraParams` | `Record<string, unknown>` | `{}` | Additional form fields sent with every request. Strings are sent as is, numbers/booleans with `String(...)`, `Date` as ISO 8601, arrays/objects as JSON; `null`/`undefined` omit the field. |
| `eventBus` | `{ addHandler(event, handler), removeHandler(event, handler) }` | none | Enables server-side progress (see [Progress](#progress)). `handler` is `{ onMessage(data: unknown): void }`. |
| `progressEvent` | `string` | `'upload_progress'` | Name of the event to listen to on the event bus. |
| `headerTarget` | `HTMLElement` | none | Element in which the header actions are teleported. By default the toolbar portal of the enclosing `PachiDialog`, or an internal toolbar when there is none. |
| `showBatchToggles` | `boolean` | `false` | Shows the "batch" and "dry run" toggles in the header. They only set the flags `pachiUploaderProps.useBatch` / `dryRun`, which the app may read: the package attaches no behaviour to them. |
| `label` | `string` | none | Declared in the type for the header title, but currently **not forwarded** to the component: it has no visible effect. |

`defaultUploaderProps`:

```ts
{ url: '', multiple: true, label: ADD_FILES_LABEL_KEY, autoUpload: false, method: 'POST', fieldName: 'file' }
```

`label` is the i18n **key** (`ADD_FILES_LABEL_KEY` = `'pachiUploader.addFilesLabel'`), translated by
`usePachiUploader` after the package messages are registered; spreading `defaultUploaderProps` at module level is
therefore safe. If you pass it to a plain `QUploader` without `usePachiUploader`, set `label` yourself.

### Callbacks

Your own `onAdded`, `onUploading`, `onUploaded` and `onFailed` in `uploaderProps` still run: the composable wraps them,
updates its per-file state first, then calls yours. They receive the usual Quasar payloads (`{ files, xhr }`).
Your own `formFields` (array or function) is appended after the fields added by the package.

### Return value

`{ PachiUploader, pachiUploaderProps }`. `pachiUploaderProps` (`IPachiUploaderProps<T>`) contains the options above plus
the shared state:

| Member | Type | Description |
| --- | --- | --- |
| `qUploaderRef` | `Ref<QUploader \| null>` | The inner `QUploader` (call `upload()`, `abort()`, `reset()`, ...). |
| `getUploaderRef(el)` | function | Ref callback used by the component. |
| `useBatch`, `dryRun` | `Ref<boolean>` | Flags bound to the header toggles (`showBatchToggles`). |
| `fileStatuses` | `Record<string, string>` | Status per file `__key`: `'idle' \| 'uploading' \| 'uploaded' \| 'failed'`. |
| `getFileStatus(key)` / `setFileStatus(key, status)` | functions | Read (default `'idle'`) / write a status. |
| `itemsMetadata` | `Record<string, T>` | Metadata per file `__key`. |
| `getFileMetadata(key)` | `(key) => T` | Metadata of a file, or a copy of `itemDefaults`. |
| `storageStatuses` | `Record<string, IStorageFileStatus>` | Server-to-storage progress per `__key`; populated only when an `eventBus` was given. |
| `events` | `{ removeFile, added, updateMetadata }` | Handlers wired to the component. |
| `keyMapping`, `filenameKey`, `itemDefaults`, `uploaderProps`, `headerTarget`, `showBatchToggles` | | The effective options. |

## Exports and types

| Export | Kind | Description |
| --- | --- | --- |
| `PachiUploader` | component | The uploader (normally taken from `usePachiUploader`). |
| `usePachiUploader` | function | Creates the state and returns `{ PachiUploader, pachiUploaderProps }`. |
| `defaultUploaderProps` | constant | Generic `QUploader` defaults. |
| `ADD_FILES_LABEL_KEY` | constant | `'pachiUploader.addFilesLabel'`. |
| `MAX_TEXT_PREVIEW_BYTES` | constant | `1048576`: limit of the full text preview. |
| `isTextFile(file)` | function | `true` for text MIME types or known text extensions. |
| `generateUid()` | function | UUID v4 (`crypto.randomUUID`, then `getRandomValues`, then `Math.random`). |
| `mapProgress(browserProgress, storage?)` | function | Overall percentage 0-100 (see [Progress](#progress)). |
| `cloneUploaderProps(props)` | function | Shallow copy of the `QUploader` props. |
| `resolveHeaders(headers)` | function | Normalises an array or a function of headers. |
| `buildMetadataMap(files, metadata)` | function | The `metadata` object indexed by file name (duplicates by `__key`). |
| `pickKeyForFilename(keys, isFinished)` | function | Routes a progress message to the right file among same-named ones. |
| `applyUploadNames(files, metadata, nameKey?)` | function | Applies the renamed names to the `File` instances; returns `__key` to name. |
| `IUsePachiUploaderProps<T>`, `IUsePachiUploaderReturn<T>` | types | Options and return value of `usePachiUploader`. |
| `IPachiUploaderProps<T>`, `IPachiUploaderPropsEvents` | types | The shared state and its events. |
| `IPachiUploaderFile`, `IPachiUploaderUpdatableFile`, `IPachiUploaderThumbnailableFile`, `UpdatableFileItem<T>` | types | Queued `File` extended with `__key`, `__status` (`'idle' \| 'uploading' \| 'uploaded' \| 'failed'`), `__uploaded`, `__progress`, `__progressLabel`, `__sizeLabel`, `__img?`, `__originalName?`, `__abort?`. |
| `IStorageFileStatus` | type | `{ progress, status: 'uploading' \| 'done' \| 'error' \| 'idle', error? }`. |
| `IPachiUploadCardProps<T>`, `PachiUploaderCardEmits<T>` | types | Props and emits of a card. |
| `IUploaderHeaderScope`, `UploaderHeaders` | types | Header slot scope of `QUploader`; `{ name, value }[]`. |

## Backend contract

What the server must implement to work with `PachiUploader`. The reference implementation used by the demo
application is a FastAPI endpoint `POST /api/demo/files/upload`.

### Request

`multipart/form-data`, `POST` (the `method` of `defaultUploaderProps`), sent by `XMLHttpRequest`:

| Part | Content |
| --- | --- |
| `file` | One part **per file** (`fieldName` of `defaultUploaderProps`; change it with `uploaderProps.fieldName`). The part's `filename` is the file name, **already renamed** if the user renamed it. |
| `metadata` | Optional JSON string: an object **indexed by file name** (the same name as the part), whose values are the card metadata, e.g. `{"report.pdf":{"title":"Q3","description":"","filename":"report.pdf","date":"2026-10-05T07:12:00.000Z","size":123456}}`. If several files of the same request share a name, the following ones are indexed by their unique key (`__key`). |
| `upload_id` | UUID, only when an `eventBus` is configured. Echo it in the progress events. |
| *extra params* | One field per entry of `extraParams`, as strings (objects/arrays as JSON; `null`/`undefined` entries are skipped). |
| *your `formFields`* | Fields from `uploaderProps.formFields`, appended last. |

Fields are always appended before the files. `QUploader` sends every file in its own request unless `batch` is enabled
in `uploaderProps`; in batch mode one request carries several `file` parts. A server should accept a list of `file`
parts in both cases. Authentication is carried by the request headers, for example `Authorization: Bearer <token>`
from the `headers` function (evaluated per request, so a refreshed token is used).

A minimal FastAPI-style signature:

```python
@router.post("/upload", status_code=201)
async def upload(
    file: Annotated[list[UploadFile], File(description="One part per file")],
    metadata: Annotated[str | None, Form()] = None,
): ...
```

### Success response

Any status below 400 triggers `onUploaded`. The demo backend answers `201` with the application envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {
    "files": [
      {
        "id": "0b8e...", "name": "report.pdf", "size": 123456,
        "meta": { "title": "Q3", "description": "", "filename": "report.pdf", "date": "2026-10-05T07:12:00.000Z", "size": 123456 }
      }
    ]
  }
}
```

`meta` is the entry of `metadata` for that file name. The uploader does not parse the response: use `onUploaded({ files, xhr })`
(`xhr.responseText`) if you need it.

### Limits and errors

Status 400 or above (or a network error) triggers `onFailed({ files, xhr })` and marks the files `failed`.
Errors follow the common shape:

```json
{
  "detail": [
    { "loc": ["body", "file"], "msg": "The file is too large (maximum 5 MB)", "type": "...", "code": "demo.file_too_large", "params": { "max_mb": 5 } }
  ]
}
```

| Status | `code` (demo backend) | `params` | Meaning |
| --- | --- | --- | --- |
| `413` | `demo.file_too_large` | `{ max_mb }` | A file exceeds the size limit. |
| `415` | `demo.file_type_not_allowed` | `{ types }` | A file's content type is not allowed (the demo accepts PNG, JPEG, PDF and plain text). |

The demo backend is **all or nothing**: if any file of the request is refused nothing is stored, and the files on disk are
named after the generated id, never after the client's name. `code` is a stable identifier translatable on the client with
`params` as interpolation values. A handler in the style of the demo:

```ts
import { pachiT } from '@ilpachi/pachi-i18n'

function errorFromXhr(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as {
      detail?: { msg?: string, code?: string, params?: Record<string, unknown> }[]
    }
    const first = body.detail?.[0]
    if (first?.code) {
      const key = `errors.codes.${first.code}`
      const text = pachiT(key, first.params ?? {})
      if (text !== key) return text      // translated message
    }
    if (first?.msg) return first.msg     // server message
  } catch { /* not JSON: use the status */ }
  return `Upload failed (${xhr.status})`
}

uploaderProps: {
  ...defaultUploaderProps,
  url: '/api/demo/files/upload',
  onUploaded: ({ files }) => $q.notify({ type: 'positive', message: `${files.length} file(s) uploaded` }),
  onFailed: ({ xhr }) => $q.notify({ type: 'negative', message: errorFromXhr(xhr) }),
}
```

The server must also enforce its own limits: they are only mirrored in the browser with `accept` and `maxFileSize`.

### Server-to-storage progress messages

Optional. If the backend streams progress (for instance over a WebSocket) it must tag each message with the received
`upload_id` and the part's `filename`, using the payload shown in [Progress](#progress). The demo backend does not emit
these messages: the feature is covered by unit tests of the helpers only.

## Styling

All CSS variables are named `--pachi-*` and every class defined by the package starts with `pachi-`. Styles are not
`scoped`. The defaults (`src/styles/theme-defaults.scss`, loaded by the barrel) are declared with `:where(...)`, i.e.
zero specificity, so any definition in your project wins and no `!important` is needed:

```css
:root { --pachi-accent: #ff6600; }
.my-dialog { --pachi-uploader-height: 420px; }  /* or 100% inside a card with a fixed height */
```

The package works standalone: dark theme by default, light theme under Quasar's `body.body--light`, compact density
under `:root[data-density='compact']`.

Uploader-specific variables:

| Variable | Default | Description |
| --- | --- | --- |
| `--pachi-uploader-height` | `calc(100vh - 100px)` | Height of the uploader (`height`, `min-height` and `max-height`). |
| `--pachi-uploader-columns` | `auto-fill` | Number of columns of the card grid (cards are at least 200 px wide). |
| `--pachi-code-bg` | `#1e1e1e` | Background of the text thumbnail. |
| `--pachi-code-ink` | `#d4d4d4` | Text colour of the text thumbnail. |

Shared variables read by the cards: `--pachi-surface`, `--pachi-surface-2`, `--pachi-border`, `--pachi-ink`,
`--pachi-ink-2`, `--pachi-muted`, `--pachi-font`, `--pachi-mono`, `--pachi-card-r` (defaults: `#10141b`, `#161b23`,
`#1f2530`, `#e6eaf2`, `#b7becc`, `#7b8494`, Geist stacks, `12px`). The other shared defaults (`--pachi-bg`, accent,
status colours, `--pachi-row-h`, `--pachi-pad`) are declared for consistency with the other `@ilpachi` packages.

Classes: `pachi-uploader`, `pachi-uploader-list`, `pachi-uploader__toolbar`, the card block `pachi-fuc` with
`pachi-fuc__header`, `__filename`, `__date`, `__body`, `__thumb` (`--uploading`, `--done`), `__thumb-media`, `__overlay`,
`__form`, `__footer`, `__mime`, `__status`, `__actions`, the thumbnails `__pdf-iframe` and `__text-thumb`, and the preview
classes `__zoom-img`, `__pdf-preview(-wrapper)`, `__text-preview-card`, `__text-preview-pre`; plus the transition name
`pachi-actions`.

## Internationalisation

Texts come from `@ilpachi/pachi-i18n` under the `pachiUploader` namespace (`it`, `en`):

| Key | English |
| --- | --- |
| `pachiUploader.addFilesLabel` | Add files to upload |
| `pachiUploader.addFiles` | Add files |
| `pachiUploader.upload` | Upload files |
| `pachiUploader.abort` | Abort upload |
| `pachiUploader.removeAll` | Remove all |
| `pachiUploader.removeUploaded` | Remove uploaded files |
| `pachiUploader.useBatch` | Use batch upload |
| `pachiUploader.dryRun` | Dry run mode |
| `pachiUploader.storageError` | Storage error |
| `pachiUploader.restore` | Restore |
| `pachiUploader.removeFromList` | Remove file from the list |
| `pachiUploader.status.idle` / `uploading` / `uploaded` / `failed` | Waiting / Uploading / Uploaded / Failed |

Define the same keys in the app to change a text or add a language; keys already defined by the app are never
overwritten, and only languages present in the app are registered. In vue-i18n messages the characters `{ } @ |` are
special: write a literal `@` as `{'@'}`. The `PachiPopupEdit` used for renaming has its own `pachiUi.popupEdit.*` keys.

## Troubleshooting

**The uploader is far too tall (or too short).**
The default height is `calc(100vh - 100px)`. Redefine `--pachi-uploader-height` on an ancestor (for example
`.my-dialog { --pachi-uploader-height: 340px }`, or `100%` inside a card with a fixed height). No `!important` needed.

**`Dialog.create is not a function` / the quasar plugins are "not installed" in development.**
With Vite, the app and a linked package can load *two copies* of `quasar`. The packages use the `$q` of the app: open dialogs
with `usePachiDialog()` in `setup()` instead of `createPachiDialog(options)` (or pass `$q` as second argument), and
deduplicate `quasar`, `vue` and `vue-i18n` with `resolve.dedupe` in the Vite config.

**Texts show as keys (`pachiUploader.upload`).**
The `@ilpachi/pachi-i18n` instance was not created. Call `createPachiI18n` in a boot file.

**A message containing `@` fails to compile.**
Escape vue-i18n special characters: `{'@'}`, `{'{'}`, `{'}'}`, `{'|'}`. Messages are plain TS objects, so
`@intlify/unplugin-vue-i18n` must run with `runtimeOnly: false`.

**The header buttons do not appear in the dialog toolbar.**
The uploader must be rendered **inside** the `PachiDialog` content (it injects the toolbar portal of the closest dialog). Outside a
dialog, or when the dialog comes from another copy of `@ilpachi/pachi-kit/dialog`, the actions fall back to the internal toolbar. Use `headerTarget` to choose the
element explicitly.

**The upload goes to the wrong URL, or returns 401.**
`defaultUploaderProps.url` is empty: always set `url`. For authentication pass `headers` (a function if the token is
renewed): `QUploader` uses `XMLHttpRequest`, so interceptors of your HTTP client do not apply.

**The server receives the original name although the file was renamed.**
Renaming is applied when the request is built, to files of that request. Make sure you read the part's `filename` (not
only the `metadata` field); `/` and `\` and empty names are ignored by design.

**The progress bar stays at 50 %.**
With an `eventBus` the second half comes from the server-to-storage events. Check that the server echoes the received
`upload_id` and the part's `filename` (the renamed name) in the `upload_progress` messages, and that the event name matches
`progressEvent`.

**Files are rejected silently.**
`accept` / `maxFileSize` / `maxFiles` refusals are only reported through `onRejected`.

**The title next to the header buttons is empty.**
The `label` option is not forwarded yet (see the options table); put the title in your own markup.
