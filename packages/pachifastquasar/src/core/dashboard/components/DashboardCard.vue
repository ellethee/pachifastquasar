<template>
  <div
    class="pachi-dashboard-card"
    role="link"
    tabindex="0"
    @click="$router.push(card.to)"
    @keydown.enter.self.prevent="$router.push(card.to)"
    @keydown.space.self.prevent="$router.push(card.to)"
  >
    <div
      v-if="card.img"
      class="pachi-dc-photo"
      :style="{ backgroundImage: `url(${card.img})` }"
    ></div>
    <div class="pachi-dc-bg"></div>
    <div class="pachi-dc-glow"></div>

    <div class="pachi-dc-top">
      <div class="pachi-dc-icon">
        <q-icon
          :name="card.icon || mdiApps"
          size="22px"
          :style="{ color: card.iconColor || 'var(--pachi-accent-ink)' }"
        />
      </div>
      <div class="pachi-dc-top-right">
        <q-btn
          v-if="card.parentIcon && card.parentUrl"
          flat
          round
          dense
          :icon="card.parentIcon"
          size="10px"
          class="pachi-dc-parent-btn"
          :aria-label="t('dashboard.backToParent')"
          @click.stop="onParentClick"
        >
          <q-tooltip>{{ t('dashboard.backToParent') }}</q-tooltip>
        </q-btn>
        <span class="pachi-dc-code">{{ String(index + 1).padStart(2, '0') }}</span>
      </div>
    </div>

    <h2 class="pachi-dc-title" :style="titleStyle">{{ card.title }}</h2>
    <p class="pachi-dc-desc">{{ card.description }}</p>

    <q-space class="pachi-dc-spacer" />

    <div class="pachi-dc-footer">
      <div v-for="(stat, statIndex) in stats" :key="statIndex" class="pachi-dc-stats-group">
        <div class="pachi-dc-stat">{{ stat.main }}</div>
        <div v-for="(sub, subIndex) in stat.sub" :key="subIndex" class="pachi-dc-delta">
          {{ sub }}
        </div>
      </div>
      <!-- <span class="pachi-dc-open">Apri →</span> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiApps } from '@quasar/extras/mdi-v7'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { IDashboardCard, IDashboardCardStat } from '../types/dashboard'
import { computed, ref, onMounted } from 'vue'
import { getUseAlovaInstance } from '@ilpachi/use-alova'
import { isSameOrigin } from '../../../helpers/url-helper'
import { getPachiConfig } from '../../config'
import { resolveTitleAnimation, titleAnimationCss } from '../helpers/title-animation'
const { card, index = 0 } = defineProps<{
  card: IDashboardCard
  index?: number
}>()
const { alova } = getUseAlovaInstance()()
const router = useRouter()
const { t } = useI18n()

/** Title animation: the route's `meta.titleAnimation` > `app.titleAnimation` > CSS default (rubber-band). */
const titleStyle = computed(() => {
  const name = resolveTitleAnimation(card.titleAnimation) ?? resolveTitleAnimation(getPachiConfig().app.titleAnimation)
  return name ? { '--pachi-dc-title-animation': titleAnimationCss(name) } : undefined
})

async function onParentClick() {
  if (card.parentUrl) {
    await router.push(card.parentUrl)
  }
}

const stats = ref<IDashboardCardStat[]>([])

function fetchStats() {
  if (card.statsUrl) {
    // the app's Bearer must not be sent to other origins: for those a plain fetch is used
    const request = isSameOrigin(card.statsUrl)
      ? alova.Get<IDashboardCardStat[]>(card.statsUrl)
      : fetch(card.statsUrl, { credentials: 'omit' }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json() as Promise<IDashboardCardStat[]>
        })
    request
      .then((data: IDashboardCardStat[]) => {
        stats.value = data
      })
      .catch(() => {
        stats.value = []
      })
  } else if (typeof card.stats === 'function') {
    stats.value = card.stats()
  } else {
    stats.value = card.stats || []
  }
}
onMounted(() => {
  fetchStats()
})
</script>

<style lang="scss">
.pachi-dashboard-card {
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: 12px;
  padding: 22px 22px 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 230px;
  transition:
    border-color 0.15s,
    transform 0.2s ease-in-out;

  &:focus-visible {
    outline: 2px solid var(--pachi-accent);
    outline-offset: 2px;
  }

  &:hover {
    border-color: var(--pachi-border-hi);
    transform: var(--pachi-hover-fx-transform);

    .pachi-dc-title {
      animation: var(--pachi-dc-title-animation, var(--pachi-hover-fx-animation));
    }
  }
}

.pachi-dc-photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.28;
  pointer-events: none;
}

.pachi-dc-bg {
  position: absolute;
  inset: 0 0 50%;
  pointer-events: none;
  opacity: 0.3;
  background-image:
    linear-gradient(var(--pachi-border-hi) 1px, transparent 1px),
    linear-gradient(90deg, var(--pachi-border-hi) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: radial-gradient(circle at 80% 0%, black, transparent 70%);
}

.pachi-dc-glow {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(45 212 191 / 13%), transparent 70%);
  pointer-events: none;
}

.pachi-dc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.pachi-dc-top-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pachi-dc-icon {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgb(45 212 191 / 20%), rgb(45 212 191 / 7%));
  border: 1px solid rgb(45 212 191 / 27%);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pachi-dc-parent-btn {
  color: var(--pachi-faint) !important;

  &:hover {
    color: var(--pachi-muted) !important;
  }
}

.pachi-dc-code {
  font-family: var(--pachi-mono);
  font-size: 10px;
  color: var(--pachi-faint);
  letter-spacing: 0.06em;
}

.pachi-dc-title {
  margin: 18px 0 4px;
  font-family: var(--pachi-font);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--pachi-ink);
  position: relative;
  z-index: 1;
  // the title is full width: scaling from the center would shift it left, so the origin is the left edge
  transform-origin: left center;
}

.pachi-dc-desc {
  margin: 0;
  font-size: 12px;
  color: var(--pachi-muted);
  position: relative;
  z-index: 1;
  line-height: 1.5;
}

.pachi-dc-spacer {
  flex: 1;
}

.pachi-dc-footer {
  margin: 18px -22px 0;
  padding: 12px 22px;
  border-top: 1px solid var(--pachi-border);
  background: var(--pachi-surface-2);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.pachi-dc-stat {
  font-family: var(--pachi-mono);
  font-size: 16px;
  font-weight: 600;
  color: var(--pachi-ink);
  letter-spacing: -0.02em;
}

.pachi-dc-delta {
  font-size: 10px;
  color: var(--pachi-muted);
  margin-top: 1px;
}

.pachi-dc-open {
  font-family: var(--pachi-mono);
  font-size: 11px;
  color: var(--pachi-accent-ink);
  display: flex;
  align-items: center;
  gap: 4px;
}

// hover effects off (`hoverEffectsEnabled: false`) or reduced motion: no animation, whatever `titleAnimation` is
body.pachi-hover-fx-disabled .pachi-dashboard-card:hover .pachi-dc-title {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .pachi-dashboard-card {
    transition: none;

    &:hover {
      transform: none;

      .pachi-dc-title {
        animation: none;
      }
    }
  }
}
</style>
