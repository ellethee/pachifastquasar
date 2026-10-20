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
        <!-- routed pages: with `meta.pageScroll` the whole page scrolls within the bottom limit -->
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
 * Themed photographic background for the whole app, from `route.meta.img` (no
 * background if absent), with a light/dark gradient overlay on top, applied
 * to the `q-layout` so it covers the whole viewport (header included).
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

/** Logo size (CSS) shared by bar and container: the bar height derives from it. */
const layoutVars = computed(() => ({ "--pachi-app-logo-size": appConfig.app.logoSize }));

const deepest = computed(() => route.matched[route.matched.length - 1]);

const deepestRecord = computed(() =>
  router.getRoutes().find((r) => r.path === deepest.value?.path),
);

/** Home is always a dashboard; routes with children only if `meta.dashboard` or `appConfig.app.autoDashboard` allow it. */
const isDashboard = computed(
  () =>
    deepest.value?.path === "/" ||
    ((deepestRecord.value?.children?.length ?? 0) > 0 &&
      (deepest.value?.meta?.dashboard ?? appConfig.app.autoDashboard !== false)),
);

/** Whole page scrollable within the bottom limit (opt-in with `meta.pageScroll`). */
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

/** Maximum width and columns of the dashboard: `route.meta` > configuration > CSS default. */
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
 * Minimum height of `q-page`: the bar is a `q-toolbar` in the flow (not a `q-header`), so Quasar's offset
 * is 0 and the page would be a full viewport tall, beyond the bottom limit of the layout.
 *
 * @returns the style with `min-height` net of the bar
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

// the bar can grow with the logo: the height comes from --pachi-appbar-height (default 52px)
$height: calc(100vh - 48px - var(--pachi-appbar-height, 52px));

// usable page height (below the bar, inside q-page padding): usable by any app style
.q-layout {
  --pachi-page-height: #{$height};
}

.pachi-app-container {
  max-height: $height;
  height: $height;
  overflow-y: auto;
}

// Scrollable area that stays within the bottom limit of the page. Wraps the routed pages with
// `meta.pageScroll`; the app can use the same class on its own container (e.g. `<div class="pachi-page-scroll">`).
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

  // default columns follow the width (3 / 2 / 1); `dashboardColumns` (--pachi-hub-columns) overrides them.
  // `minmax(0, 1fr)` lets the cards shrink below their content instead of being cut on small screens
  &__grid {
    --pachi-hub-default-columns: repeat(3, minmax(0, 1fr));
    display: grid;
    grid-template-columns: var(--pachi-hub-columns, var(--pachi-hub-default-columns));
    gap: 14px;
  }

  &__widgets {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 14px;
    margin-top: 14px;
  }

  @media (max-width: 1023px) {
    &__grid {
      --pachi-hub-default-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 599px) {
    &__grid {
      --pachi-hub-default-columns: minmax(0, 1fr);
    }

    &__widgets {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__widget--full {
    grid-column: 1 / -1;
  }
}
</style>
