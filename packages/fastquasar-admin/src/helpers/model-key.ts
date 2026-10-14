/**
 * Chiave testuale di un modello (`app.model`), usata per nascondere modelli e per i formatter/componenti per campo.
 *
 * @param app - nome dell'app
 * @param model - nome del modello
 * @returns `app.model`
 */
export function modelKey(app: string, model: string): string {
  return `${app}.${model}`
}

/**
 * Chiave testuale di un campo (`app.model.campo`).
 *
 * @param app - nome dell'app
 * @param model - nome del modello
 * @param field - nome del campo (camelCase)
 * @returns `app.model.campo`
 */
export function fieldKey(app: string, model: string, field: string): string {
  return `${app}.${model}.${field}`
}
