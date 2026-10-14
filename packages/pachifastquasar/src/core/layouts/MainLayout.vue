<template>
  <q-layout
    view="lHh Lpr lFf"
    :style="[pageBgStyle, layoutVars]"
    :class="{ 'pachi-layout--logo-overlap': appConfig.app.logoOverlap }"
  >
    <app-bar />
    <q-page-container :key="userInfoVersion">
      <q-page padding :style-fn="pageStyleFn">
        <div v-if="isDashboard" class="pachi-app-container">
          <div class="pachi-hub-dash pachi-blueprint-card" :style="hubVars">
            <div v-if="!hubHeader.hide" class="pachi-hub-dash__header">
              <div class="pachi-hub-dash__code">{{ hubHeader.code }}</div>
              <h1 class="pachi-hub-dash__title">
                {{ hubHeader.title }}
                <span class="pachi-hub-dash__sub">{{ hubHeader.sub }}</span>
              </h1>
              <p class="pachi-hub-dash__desc">{{ hubHeader.desc }}</p>
            </div>
            <pachi-empty-state
              v-if="cards.length === 0"
              :icon="mdiApps"
              :title="t('dashboard.emptyTitle')"
              :description="t('dashboard.emptyDescription')"
            />
            <div v-else class="pachi-hub-dash__grid">
              <dashboard-card v-for="(c, i) in cards" :key="c.to" :card="c" :index="i" />
            </div>
            <div v-if="hasWidgets" class="pachi-hub-dash__widgets">
              <component
                :is="w.component"
                v-for="(w, i) in widgets"
                :key="i"
                v-bind="w.props"
                :class="{ 'pachi-hub-dash__widget--full': widgets.length === 1 }"
              />
            </div>
          </div>
        </div>
        <!-- pagine instradate: con `meta.pageScroll` l'intera pagina scorre dentro il limite inferiore -->
        <div v-else-if="pageScroll" class="pachi-page-scroll">
          <router-view class="pachi-blueprint-card" />
        </div>
        <router-view v-else class="pachi-blueprint-card" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
import { mdiApps } from "@quasar/extras/mdi-v7";
import { computed } from "vue";
import { useQuasar } from "quasar";
import AppBar from "../components/AppBar.vue";
import PachiEmptyState from "../components/PachiEmptyState.vue";
import { useAppBar } from "../composables/use-app-bar";
import { useRoute, useRouter } from "vue-router";
import type { RouteRecordRaw, RouteMeta } from "vue-router";
import type { IDashboardCard } from "../dashboard/types/dashboard";
import DashboardCard from "../dashboard/components/DashboardCard.vue";
import { AuthManager } from "../../services/auth-manager";
import { useAuthStore } from "../../services/auth-manager/auth-store";
import { storeToRefs } from "pinia";
import { getPachiConfig } from "../config";
import { useI18n } from "vue-i18n";
import { useRouteText } from "../../router/route-text";
import { resolveDashboardColumns, resolveDashboardMaxWidth } from "../dashboard/helpers/dashboard-layout";

const appConfig = getPachiConfig();
const { userInfoVersion } = storeToRefs(useAuthStore());

const { parentTo } = useAppBar();
const { t } = useI18n();
const { routeTitle, routeDescription } = useRouteText();

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

/**
 * Sfondo fotografico a tema per l'intera app, da `route.meta.img` (nessuno
 * sfondo se assente), con overlay a gradiente chiaro/scuro sopra, applicato
 * al `q-layout` così copre tutta la viewport (header incluso).
 */
const pageBgStyle = computed(() => {
  const img = route.meta.img;
  if (!img) return {};
  const isDark = $q.dark.isActive;
  const tint = isDark ? "29, 29, 29" : "255, 255, 255";
  const start = isDark ? 0.85 : 0.75;
  const end = isDark ? 0.95 : 0.75;
  return {
    backgroundImage: `linear-gradient(to bottom, rgba(${tint}, ${start}) 20%, rgba(${tint}, ${end})), url(${img})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
});

/** Dimensione del logo (CSS) condivisa da barra e contenitore: l'altezza della barra ne deriva. */
const layoutVars = computed(() => ({ "--pachi-app-logo-size": appConfig.app.logoSize }));

const deepest = computed(() => route.matched[route.matched.length - 1]);

const deepestRecord = computed(() =>
  router.getRoutes().find((r) => r.path === deepest.value?.path),
);

/** Home sempre dashboard; route con figli solo se `meta.dashboard` o `appConfig.app.autoDashboard` lo consentono. */
const isDashboard = computed(
  () =>
    deepest.value?.path === "/" ||
    ((deepestRecord.value?.children?.length ?? 0) > 0 &&
      (deepest.value?.meta?.dashboard ?? appConfig.app.autoDashboard !== false)),
);

/** Pagina intera scrollabile entro il limite inferiore (opt-in con `meta.pageScroll`). */
const pageScroll = computed(() => deepest.value?.meta?.pageScroll === true);

const cardRoutes = computed((): RouteRecordRaw[] => {
  if (deepest.value?.path === "/") {
    return (
      router.options.routes.find((r) => r.path === "/")?.children ?? router.options.routes[0]?.children ?? []
    );
  }
  return deepestRecord.value?.children ?? [];
});

const authManager = AuthManager.getInstance();

const hubHeader = computed(() => {
  if (deepest.value?.path === "/") {
    return {
      hide: appConfig.app.hideHubHeader,
      code: t("dashboard.overviewCode"),
      title: t("dashboard.overviewTitle"),
      sub: t("dashboard.overviewSub", { count: cards.value.length }),
      desc: t("dashboard.overviewDesc"),
    };
  }
  const meta: RouteMeta = deepest.value?.meta ?? {};
  return {
    hide: meta.hideHubHeader === true,
    code: t("dashboard.sectionCode", { title: routeTitle(meta).toLowerCase() }),
    title: routeTitle(meta),
    sub: t("dashboard.sectionSub", { count: cards.value.length }),
    desc: routeDescription(meta),
  };
});

/** Larghezza massima e colonne della dashboard: `route.meta` > configurazione > default CSS. */
const hubVars = computed(() => {
  const meta: RouteMeta = deepest.value?.meta ?? {};
  const vars: Record<string, string> = {};
  const maxWidth =
    resolveDashboardMaxWidth(meta.dashboardMaxWidth) ??
    resolveDashboardMaxWidth(appConfig.app.dashboardMaxWidth);
  const columns =
    resolveDashboardColumns(meta.dashboardColumns) ??
    resolveDashboardColumns(appConfig.app.dashboardColumns);
  if (maxWidth) vars["--pachi-hub-max-width"] = maxWidth;
  if (columns) vars["--pachi-hub-columns"] = columns;
  return vars;
});

const widgets = computed(() => (isDashboard.value ? (deepest.value?.meta?.widgets ?? []) : []));
const hasWidgets = computed(() => widgets.value.length > 0);

const cards = computed<IDashboardCard[]>(() => {
  void userInfoVersion.value;
  if (!isDashboard.value || cardRoutes.value.length === 0) return [];
  const sectionPath = deepest.value?.path ?? "/";
  const parentIcon = (deepest.value?.meta?.icon as string) ?? null;
  const parentIconColor = (deepest.value?.meta?.iconColor as string) || null;
  const parentUrl = parentTo.value;

  return cardRoutes.value
    .filter(
      (ch) =>
        ch.meta?.hidden !== true &&
        (!appConfig.auth.enabled || authManager.canAccess(ch.meta ?? {})),
    )
    .map((ch) => {
      const childPath = String(ch.path || "");
      const to = childPath.startsWith("/")
        ? childPath
        : `${sectionPath}/${childPath}`.replace(/\/+/g, "/");
      return {
        title: routeTitle(ch.meta) || childPath,
        description: routeDescription(ch.meta),
        icon: (ch.meta?.icon as string) ?? mdiApps,
        iconColor: (ch.meta?.iconColor as string) || null,
        img: (ch.meta?.img as string) || null,
        statsUrl: (ch.meta?.statsUrl as string) ?? undefined,
        stats: (ch.meta?.stats as IDashboardCard["stats"]) || [],
        titleAnimation: (ch.meta?.titleAnimation as string) || undefined,
        parentIcon,
        parentIconColor,
        parentUrl,
        to,
      };
    });
});

/**
 * Altezza minima di `q-page`: la barra è un `q-toolbar` nel flusso (non un `q-header`), quindi l'offset di Quasar
 * è 0 e la pagina sarebbe alta un viewport intero, oltre il limite inferiore del layout.
 *
 * @returns lo stile con la `min-height` al netto della barra
 */
function pageStyleFn(): Record<string, string> {
  return { minHeight: "calc(100vh - var(--pachi-appbar-height, 52px))" };
}
</script>
<style lang="scss">
.q-layout {
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

// la barra può crescere con il logo: l'altezza arriva da --pachi-appbar-height (default 52px)
$height: calc(100vh - 48px - var(--pachi-appbar-height, 52px));

// altezza utile della pagina (sotto la barra, dentro il padding di q-page): usabile da qualsiasi stile dell'app
.q-layout {
  --pachi-page-height: #{$height};
}

.pachi-app-container {
  max-height: $height;
  height: $height;
  overflow-y: auto;
}

// Area scrollabile che resta dentro il limite inferiore della pagina. Avvolge le pagine instradate con
// `meta.pageScroll`; l'app può usare la stessa classe su un proprio contenitore (es. `<div class="pachi-page-scroll">`).
.pachi-page-scroll {
  max-height: var(--pachi-page-height, #{$height});
  overflow-y: auto;
}

.pachi-hub-dash {
  max-width: var(--pachi-hub-max-width, 1080px);
  margin: 0 auto;
  width: 100%;
  padding: 16px;

  &__header {
    margin-bottom: 20px;
  }

  &__code {
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
    letter-spacing: 0.06em;
  }

  &__title {
    margin: 4px 0 0;
    font-family: var(--pachi-font);
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--pachi-ink);
  }

  &__sub {
    color: var(--pachi-muted);
    font-weight: 400;
  }

  &__desc {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--pachi-muted);
  }

  &__grid {
    display: grid;
    grid-template-columns: var(--pachi-hub-columns, repeat(3, 1fr));
    gap: 14px;
  }

  &__widgets {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 14px;
    margin-top: 14px;
  }

  &__widget--full {
    grid-column: 1 / -1;
  }
}
</style>
