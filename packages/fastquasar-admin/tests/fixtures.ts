import type { IAdminSchema } from '../src/types/admin'

/** Test schema, modeled on the backend `demo/item`. */
export const itemSchema: IAdminSchema = {
  app: 'demo',
  model: 'item',
  title: 'Item',
  titleKey: 'admin.demo.item.title',
  primaryKey: 'id',
  primaryKeyType: 'int',
  permissions: { view: true, add: true, change: true, delete: true },
  list: {
    display: ['name', 'status', 'price', 'active', 'createdAt'],
    search: true,
    ordering: ['-id'],
    orderFields: ['name', 'price', 'id'],
    filters: [{ field: 'active', component: 'toggle', label: 'Active' }],
  },
  fields: {
    id: { component: 'number', type: 'integer', label: 'Id', readonly: true, primaryKey: true, nullable: true, default: null },
    name: { component: 'input', type: 'string', label: 'Name', required: true, maxlength: 120, default: null },
    status: {
      component: 'select', type: 'string', label: 'Status', default: 'draft',
      properties: { options: [{ label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' }] },
      optionKeys: { draft: 'admin.demo.item.status.options.draft' },
    },
    price: { component: 'number', type: 'number', label: 'Price', default: 0, properties: { step: 'any' } },
    qty: { component: 'number', type: 'integer', label: 'Qty', default: 0, nullable: true },
    active: { component: 'toggle', type: 'boolean', label: 'Active', default: true },
    notes: { component: 'input', type: 'string', label: 'Notes', nullable: true, default: null },
    meta: { component: 'json', type: 'json', label: 'Meta', nullable: true, default: null },
    when: { component: 'datetime', type: 'datetime', label: 'When', nullable: true, default: null },
    owner: { component: 'lookup', type: 'integer', label: 'Owner', nullable: true, default: null, lookup: { app: 'auth', model: 'user' } },
    createdAt: { component: 'datetime', type: 'datetime', label: 'Created', readonly: true, default: null },
  },
  actions: [
    { name: 'delete_selected', label: 'Delete selected', permission: 'delete', confirm: true, allowed: true },
  ],
  history: true,
}
