<template>
  <q-btn
    v-if="appConfig.auth.enabled"
    :key="userInfoVersion"
    round
    color="white"
    text-color="black"
    class="pachi-account-menu-button"
    :aria-label="t('menu.account')"
  >
    <q-avatar size="42px">
      <pachi-gravatar :email="email" :full-name="fullName" size="40" />
    </q-avatar>
    <q-menu
      fit
      anchor="bottom right"
      self="top right"
      :offset="[0, 10]"
      class="pachi-bento-profile-menu shadow-6"
    >
      <div class="row no-wrap q-pa-md items-center pachi-bento-header">
        <q-avatar size="64px" class="q-mr-md">
          <pachi-gravatar :email="email" :full-name="fullName" />
        </q-avatar>
        <div>
          <div class="text-h6 text-primary">{{ fullName }}</div>
          <div class="text-subtitle2 text-grey-7">{{ email }}</div>
        </div>
      </div>

      <q-separator />
      <div class="q-pa-sm pachi-bento-grid">
        <div class="row q-col-gutter-sm">
          <template
            v-for="(button, bi) in menuItems"
            :key="`${bi}-${button.to ?? button.label}`"
          >
            <div v-if="checkIfMenuShouldBeShown(button)" class="col-6">
              <q-item
                v-close-popup
                clickable
                class="pachi-bento-tile q-pa-md"
                :to="button.to ? button.to : undefined"
                @click="button.onClick ? button.onClick() : undefined"
              >
                <q-item-section avatar>
                  <q-icon :name="button.icon || mdiAccount" color="gold-8" size="24px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ button.label }}</q-item-label>
                  <q-item-label caption>{{ button.caption }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
          </template>
        </div>
      </div>

      <template v-if="engines.length > 0">
        <q-separator />
        <q-list class="" dense>
          <q-item-label header>{{ t('menu.databases') }}</q-item-label>
          <q-item
            v-for="(engine, ni) in engines"
            :key="`${ni}-${engine.host}-${engine.dbname}`"
            class="q-pa-md"
          >
            <q-item-section avatar>
              <q-icon
                :name="mdiMemory"
                :color="
                  (() => {
                    switch (engine.scope) {
                      case 'production':
                        return 'red-7'
                      case 'development':
                        return 'orange-7'
                      default:
                        return 'green-7'
                    }
                  })()
                "
                size="24px"
              />
            </q-item-section>
            <q-item-section>{{ engine.dbname }}</q-item-section>
            <q-item-section side>{{ engine.scope }}</q-item-section>
          </q-item>
        </q-list>
      </template>
      <q-separator />
      <div class="q-pa-sm row justify-center pachi-bento-footer">
        <q-btn
          v-close-popup
          flat
          color="negative"
          :label="t('menu.logout')"
          :icon="mdiLogout"
          class="full-width"
          @click="logout"
        />
      </div>
    </q-menu>
    <q-tooltip class="black">
      {{ t('menu.account') }}
    </q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import { mdiAccount, mdiLogout, mdiMemory } from '@quasar/extras/mdi-v7'
import { AuthManager } from '../../../services/auth-manager'
import { useAuthStore } from '../../../services/auth-manager/auth-store'
import { usePachiEventsStore } from '../../../stores/pachi-events'
import { useRouter } from 'vue-router'
import PachiGravatar from '../PachiGravatar.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { IEngineInfo } from '../../../services/auth-manager/types/auth-manager'
import type { IWebSocketManagerHandler } from '../../../services/ws-manager/types/ws-manager'
import { getPachiConfig } from '../../config'
import { buildMenuItems } from '../../menu/menu-items'
import { useI18n } from 'vue-i18n'
import type { IMenuButton } from './types/account-menu-button'

const appConfig = getPachiConfig()
const router = useRouter()
const { t } = useI18n()
const { userInfo, userInfoVersion } = storeToRefs(useAuthStore())
/** Voci del menu (package, predefinite, app): ricalcolate al cambio lingua o utente. */
const menuItems = computed(() =>
  buildMenuItems({ t, router, config: appConfig, user: userInfo.value })
)
const engines = ref<IEngineInfo[]>([])
const authManager = AuthManager.getInstance()
const email = computed(() => {
  return userInfo.value?.email ?? ''
})
const fullName = computed(() => {
  const u = userInfo.value
  return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.username?.trim() || ''
})
const userPermissionsChanged: IWebSocketManagerHandler = {
  onMessage: (data: unknown) => {
    const payload = data as { userId?: string | number } | null
    const eventUserId = payload?.userId
    if (eventUserId === undefined || String(eventUserId) === userInfo.value?.id) {
      void authManager.refreshUserInfo().catch(err => {
        console.error('Errore aggiornando extra info dopo cambio permessi', err)
      })
    }
  }
}
const logout = () => {
  void authManager.logout()
}
onMounted(async () => {
  if (!appConfig.auth.enabled) return
  await authManager.getExtraInfo().then((info: { engines: IEngineInfo[] }) => {
    engines.value = info.engines || []
  })
  usePachiEventsStore().addHandler('user_permissions_changed', userPermissionsChanged)
})
onUnmounted(() => {
  if (!appConfig.auth.enabled) return
  usePachiEventsStore().removeHandler('user_permissions_changed', userPermissionsChanged)
})
/** Vero se `to` risolve su una route reale (non sul catch-all): profilo/impostazioni sono opzionali (package). */
function routeExists(to?: string) {
  if (!to) return true
  const matched = router.resolve(to).matched
  return matched.length > 0 && !matched.some(m => m.path.includes('catchAll'))
}
function checkIfMenuShouldBeShown(button: IMenuButton) {
  if (!routeExists(button.to)) return false
  if (typeof button.visible === 'function') {
    return button.visible()
  }
  return button.visible ?? true
}
</script>
<style lang="scss">
@use 'sass:color';

.pachi-account-menu-active-class {
  .body--light & {
    background-color: color.adjust(white, $lightness: -5%);
  }

  .body--dark & {
    background-color: color.adjust(black, $lightness: -5%);
  }
}

// Definiamo i colori personalizzati basati sul logo Pachi
:root {
  --pachi-gold-1: #fffde7;
  --pachi-gold-2: #fff9c4;
  --pachi-gold-8: #fbc02d;
  --pachi-gold-10: #f57f17; // Il colore "dorato" principale del logo
  --pachi-gold-10-rgb: 245, 127, 23; // stesso colore in RGB (per rgba() con trasparenza)
}

.pachi-text-gold-10 {
  color: var(--pachi-gold-10);
}

.pachi-bg-gold-2 {
  background-color: var(--pachi-gold-2);
}

// 🎨 CSS STYLING PER IL MENU PROFILO BENTO-STYLE 🎨

.pachi-bento-profile-menu {
  width: 380px; // Un po' più largo del menu standard
  border: 1px solid rgb(0 0 0 / 5%);
  box-shadow: 0 10px 30px rgb(0 0 0 / 10%);
  border-radius: var(--pachi-card-r);

  .pachi-bento-header {
    border-bottom: 1px solid rgb(0 0 0 / 5%);
  }

  .pachi-bento-grid {
    // background-color: #fafafa;
  }

  // 👇 LA CHIAVE PER IL LOOK MODERNO 👇
  .pachi-bento-tile {
    // background-color: white;
    border: 1px solid rgb(0 0 0 / 3%); // Bordo quasi invisibile
    transition: all 0.3s ease; // Animazione dolce al passaggio del mouse
    height: 100%; // Forza l'altezza uniforme nelle righe

    // Effetto Hover moderno: leggera ombra e sollevamento
    &:hover {
      // background-color: white !important; // Evitiamo il grigio di default
      border-color: rgb(var(--pachi-gold-10-rgb), 0.2); // Bordo dorato tenue
      transform: translateY(-2px); // Si alza leggermente
      box-shadow: 0 4px 12px rgb(0 0 0 / 5%); // Ombra morbida
    }

    // Una tile speciale per far risaltare un'azione (es: Il Mio Profilo)
    &.pachi-bento-tile--primary {
      // background-color: var(--pachi-gold-1); // Sfondo dorato chiarissimo
      border-color: rgb(var(--pachi-gold-10-rgb), 0.1);

      &:hover {
        border-color: rgb(var(--pachi-gold-10-rgb), 0.3);
      }
    }

    // Formattazione interna delle tile
    .q-item__section--avatar {
      min-width: 40px;
      padding-right: 12px;
    }

    .q-item__label--caption {
      font-size: 11px;
      line-height: 1.3;
      margin-top: 2px;
    }
  }

  .pachi-bento-footer {
    // background-color: #fafafa;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pachi-bento-profile-menu .pachi-bento-tile {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}
</style>
