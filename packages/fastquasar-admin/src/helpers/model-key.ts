/**
 * Text key of a model (`app.model`), used to hide models and for per-field formatters/components.
 *
 * @param app - app name
 * @param model - model name
 * @returns `app.model`
 */
export function modelKey(app: string, model: string): string {
  return `${app}.${model}`
}

/**
 * Text key of a field (`app.model.field`).
 *
 * @param app - app name
 * @param model - model name
 * @param field - field name (camelCase)
 * @returns `app.model.field`
 */
export function fieldKey(app: string, model: string, field: string): string {
  return `${app}.${model}.${field}`
}
