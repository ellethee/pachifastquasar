// Quasar configuration: the @ilpachi/pachifastquasar preset does everything (boot, styles, aliases, env, proxy).
// Optional overrides go in the first argument, preset options in the second.
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

{{configPreamble}}export default definePachiQuasarConfig({{configOverrides}}{{presetOptions}})
