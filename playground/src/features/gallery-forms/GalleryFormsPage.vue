<template>
  <q-page padding class="gallery-forms column q-gutter-y-xl">
    <!-- PachiEditDialog (+ PachiDialogEditActions, rendered in its footer) -->
    <section data-test="gallery-edit-dialog">
      <h2 class="text-h6">PachiEditDialog</h2>
      <p class="text-caption">
        Dialog assembled from sections (a card and an expansion item, both FieldsSection). The footer
        (PachiDialogEditActions) shows restore and save only when there are changes. Save is fake and takes
        about half a second.
      </p>
      <div class="row items-center q-gutter-md">
        <q-btn color="primary" label="Open dialog" data-test="gallery-open-dialog" @click="openDialog" />
        <q-toggle v-model="failSave" label="Make save fail" />
        <q-toggle v-model="closeOnSave" label="closeOnSave" />
        <q-toggle v-model="showActionLabels" label="showActionLabels" />
      </div>
      <pre class="gallery-json">{{ savedRecord }}</pre>
    </section>

    <!-- SectionsContainer -->
    <section data-test="gallery-sections-container">
      <h2 class="text-h6">SectionsContainer</h2>
      <p class="text-caption">
        The inner renderer of the dialog, used inline: ordering, containers and the aggregate API
        (validateAll, getResults, resetAll, commitAll, hasChanges).
      </p>
      <sections-container ref="containerRef" :sections="inlineSections" :common-props="{}" />
      <div class="row q-gutter-sm q-mt-sm">
        <q-btn outline label="validateAll + getResults" @click="collectContainer" />
        <q-btn outline label="resetAll" @click="containerRef?.resetAll()" />
        <q-btn outline label="commitAll" @click="containerRef?.commitAll()" />
        <q-btn outline label="hasChanges" @click="containerChanges = containerRef?.hasChanges() ?? null" />
        <span class="self-center">hasChanges: {{ containerChanges }}</span>
      </div>
      <pre class="gallery-json">{{ containerResult }}</pre>
    </section>

    <!-- DynamicField -->
    <section data-test="gallery-dynamic-field">
      <h2 class="text-h6">DynamicField</h2>
      <p class="text-caption">
        One field per supported type, bound with v-model: text, textarea, number, boolean, pdate, local
        select, remote select (fake client), custom component. The dependent city needs the
        <code>values</code> prop.
      </p>
      <div class="column q-gutter-y-sm gallery-narrow">
        <dynamic-field
          v-for="field in singleFields"
          :key="field.field"
          v-model="single[field.field]"
          :field="field"
          :values="single"
        />
      </div>
      <pre class="gallery-json">{{ single }}</pre>
    </section>

    <!-- FieldsSection standalone -->
    <section data-test="gallery-fields-section">
      <h2 class="text-h6">FieldsSection</h2>
      <p class="text-caption">
        Field-driven form outside a dialog: rows lay fields side by side, required and rules are checked
        by validate(), commit/reset track the baseline.
      </p>
      <q-toggle v-model="readonly" label="readonly" />
      <fields-section
        ref="fieldsRef"
        :rows="[...generalRows, ...locationRows]"
        :initial-value="fakeRecord"
        :readonly="readonly"
      />
      <div class="row q-gutter-sm q-mt-sm">
        <q-btn outline label="validate" @click="fieldsInfo = `valid: ${fieldsRef?.validate()}`" />
        <q-btn outline label="getResults" @click="fieldsInfo = fieldsRef?.getResults()" />
        <q-btn outline label="commit" @click="fieldsRef?.commit()" />
        <q-btn outline label="reset" @click="fieldsRef?.reset()" />
        <q-btn outline label="hasChanges" @click="fieldsInfo = `hasChanges: ${fieldsRef?.hasChanges()}`" />
      </div>
      <pre class="gallery-json">{{ fieldsInfo }}</pre>
    </section>

    <!-- PachiUploader -->
    <section data-test="gallery-uploader">
      <h2 class="text-h6">PachiUploader</h2>
      <p class="text-caption">
        Cards (PachiUploaderCard: thumbnail, rename, metadata via the card-extension slot, status) and
        header (PachiUploaderHeader: add, upload, abort, remove). Uploads are simulated by a scoped
        XMLHttpRequest stub that only answers the fake URL while this page is mounted. Limit: 2 MB per file.
      </p>
      <pachi-uploader :pachi-uploader-props="pachiUploaderProps">
        <template #card-extension="{ item }">
          <q-input v-model="item.title" dense outlined label="Title" />
          <q-input v-model="item.description" dense outlined type="textarea" autogrow label="Description" />
        </template>
      </pachi-uploader>
      <ul>
        <li v-for="name in uploadedNames" :key="name">{{ name }}</li>
      </ul>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { markRaw, onBeforeUnmount, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import type { QRejectedEntry } from 'quasar'
import { mdiFormTextbox, mdiMapMarker } from '@quasar/extras/mdi-v7'
import { PachiEditDialog, SectionsContainer } from '@ilpachi/pachi-kit/edit-dialog'
import type {
  AwaitableData,
  ISectionDefinition,
  SectionsContainerExpose
} from '@ilpachi/pachi-kit/edit-dialog'
import { DynamicField, FieldsSection, setPachiFieldsHttp } from '@ilpachi/pachi-kit/fields'
import type { IFieldDef } from '@ilpachi/pachi-kit/fields'
import { PachiUploader, defaultUploaderProps, usePachiUploader } from '@ilpachi/pachi-kit/uploader'
import { fakeFieldsHttp, fakeRecord, generalRows, locationRows } from './fixtures'
import { installFakeUpload, FAKE_UPLOAD_URL } from './fake-upload'

const $q = useQuasar()

// Scoped stubs: installed while the page is alive, removed when it goes away.
setPachiFieldsHttp(fakeFieldsHttp)
const restoreXhr = installFakeUpload()
onBeforeUnmount(() => {
  restoreXhr()
  // The setter has no "unset": null restores the default (use-alova) client lookup.
  setPachiFieldsHttp(null as never)
})

/** Builds the two section definitions (card + expansion) for a record. */
function buildSections(record: Record<string, unknown>): ISectionDefinition[] {
  return [
    {
      key: 'general', title: 'General', icon: mdiFormTextbox, order: 10,
      component: markRaw(FieldsSection), props: { rows: generalRows }, initialValue: record,
      container: { type: 'card', flat: true, bordered: true, class: 'q-pa-md q-mb-md' }
    },
    {
      key: 'location', title: 'Location', icon: mdiMapMarker, order: 20,
      component: markRaw(FieldsSection), props: { rows: locationRows }, initialValue: record,
      container: { type: 'expansion', title: 'Location', icon: mdiMapMarker, defaultOpened: true }
    }
  ]
}

// --- PachiEditDialog ---
const savedRecord = ref<Record<string, unknown>>({ ...fakeRecord })
const failSave = ref(false)
const closeOnSave = ref(true)
const showActionLabels = ref(false)

/** Opens the edit dialog on the current fake record; the "save" only updates local state. */
function openDialog(): void {
  $q.dialog({
    component: PachiEditDialog,
    componentProps: {
      title: 'Edit item',
      icon: mdiFormTextbox,
      sections: buildSections(savedRecord.value),
      avoidHideWithChanges: true,
      closeOnSave: closeOnSave.value,
      showActionLabels: showActionLabels.value,
      width: '720px',
      maxWidth: '95vw'
    }
  }).onOk(({ data, onSuccess, onError }: AwaitableData) => {
    setTimeout(() => {
      if (failSave.value) return onError(new Error('Fake save failure'))
      savedRecord.value = { ...data.sections.general as object, ...data.sections.location as object }
      $q.notify({ type: 'positive', message: 'Saved (fake)' })
      onSuccess()
    }, 500)
  })
}

// --- SectionsContainer ---
const containerRef = ref<SectionsContainerExpose | null>(null)
const inlineSections = buildSections(fakeRecord)
const containerResult = ref<unknown>('')
const containerChanges = ref<boolean | null>(null)

/** Validates every section and shows the collected results. */
async function collectContainer(): Promise<void> {
  const ok = await containerRef.value?.validateAll()
  containerResult.value = ok ? await containerRef.value?.getResults() : 'validation failed'
}

// --- DynamicField ---
const singleFields: IFieldDef[] = [
  ...generalRows.flat(),
  ...locationRows.flat()
]
const single = reactive<Record<string, unknown>>({ ...fakeRecord })

// --- FieldsSection ---
const readonly = ref(false)
const fieldsRef = ref<InstanceType<typeof FieldsSection> | null>(null)
const fieldsInfo = ref<unknown>('')

// --- PachiUploader ---
interface IFileMeta { title: string, description: string }
const uploadedNames = ref<string[]>([])
const { pachiUploaderProps } = usePachiUploader<IFileMeta>({
  itemDefaults: { title: '', description: '' },
  uploaderProps: {
    ...defaultUploaderProps,
    url: FAKE_UPLOAD_URL,
    maxFileSize: 2 * 1024 * 1024,
    onRejected: (entries: QRejectedEntry[]) => {
      for (const { failedPropValidation, file } of entries) {
        $q.notify({ type: 'warning', message: `${file.name}: ${failedPropValidation}` })
      }
    },
    onUploaded: ({ files }) => {
      uploadedNames.value.push(...files.map((f) => f.name))
    }
  }
})
</script>

<style>
.gallery-forms .gallery-json {
  background: rgba(127, 127, 127, 0.12);
  padding: 8px;
  overflow: auto;
  max-height: 220px;
}
.gallery-forms .gallery-narrow {
  max-width: 420px;
}
</style>
