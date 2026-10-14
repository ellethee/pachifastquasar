<template>
  <div ref="container" class="pachi-table2--container q-pt-sm">
    <q-markup-table :class="tableClasses">
      <thead>
        <tr>
          <th v-if="selection !== 'none'" width="40px">
            <q-skeleton
              type="QCheckbox"
              animation="wave"
              width="40px"
              height="40px"
            />
          </th>
          <th
            v-for="(column, index) in columns"
            :key="index"
            :class="column.align ? `text-${column.align}` : 'text-left'"
            :style="typeof column?.style === 'string' ? column.style : undefined"
          >
            <q-skeleton animation="wave" type="text" />
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="n in 5" :key="n">
          <td v-if="selection !== 'none'" width="40px">
            <q-skeleton
              type="QCheckbox"
              animation="wave"
              width="40px"
              height="40px"
            />
          </td>
          <td
            v-for="(column, index) in columns"
            :key="index"
            :class="column.align ? `text-${column.align}` : 'text-left'"
            :style="typeof column?.style === 'string' ? column.style : undefined"
          >
            <q-skeleton animation="wave" type="text" />
          </td>
        </tr>
      </tbody>
    </q-markup-table>
  </div>
</template>
<script setup lang="ts">
import type { QTableColumn } from 'quasar'

const { columns, tableClasses, selection='none' } = defineProps<{ columns: QTableColumn[], tableClasses: Record<string, unknown> , selection?: 'none' | 'multiple' | 'single' }>()
</script>
