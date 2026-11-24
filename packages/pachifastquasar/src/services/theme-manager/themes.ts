import type { PachiBuiltinThemeId, ThemeDefinition } from './types/theme-manager'

/** Built-in themes (matching the selectors of `themes.css`). */
export const PACHI_BUILTIN_THEMES: Record<PachiBuiltinThemeId, ThemeDefinition> = {
  slate: {
    id: 'slate',
    label: 'Slate',
    tagline: 'Modern enterprise',
    colors: {
      dark: {
        primary: '#3b82f6',
        secondary: '#60a5fa',
        accent: '#93c5fd',
        dark: '#1e293b',
        darkPage: '#0f172a',
        positive: '#10b981',
        negative: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
      },
      light: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        accent: '#1d4ed8',
        dark: '#0f172a',
        darkPage: '#f8fafc',
        positive: '#059669',
        negative: '#dc2626',
        info: '#2563eb',
        warning: '#d97706'
      }
    },
    preview: {
      dark: {
        bg: '#0f172a',
        surface: '#1e293b',
        surface2: '#334155',
        accent: '#3b82f6',
        border: '#334155',
        ink: '#f8fafc'
      },
      light: {
        bg: '#f8fafc',
        surface: '#ffffff',
        surface2: '#f1f5f9',
        accent: '#2563eb',
        border: '#e2e8f0',
        ink: '#0f172a'
      }
    }
  },

  zinc: {
    id: 'zinc',
    label: 'Zinc',
    tagline: 'Neutral minimalist',
    colors: {
      dark: {
        primary: '#e4e4e7',
        secondary: '#a1a1aa',
        accent: '#ffffff',
        dark: '#18181b',
        darkPage: '#121215',
        positive: '#22c55e',
        negative: '#ef4444',
        info: '#a1a1aa',
        warning: '#eab308'
      },
      light: {
        primary: '#18181b',
        secondary: '#3f3f46',
        accent: '#09090b',
        dark: '#09090b',
        darkPage: '#fafafa',
        positive: '#16a34a',
        negative: '#dc2626',
        info: '#71717a',
        warning: '#ca8a04'
      }
    },
    preview: {
      dark: {
        bg: '#121215',
        surface: '#18181b',
        surface2: '#27272a',
        accent: '#e4e4e7',
        border: '#27272a',
        ink: '#fafafa'
      },
      light: {
        bg: '#fafafa',
        surface: '#ffffff',
        surface2: '#f4f4f5',
        accent: '#18181b',
        border: '#e4e4e7',
        ink: '#09090b'
      }
    }
  },

  emerald: {
    id: 'emerald',
    label: 'Emerald',
    tagline: 'FinTech and cloud ops',
    colors: {
      dark: {
        primary: '#10b981',
        secondary: '#34d399',
        accent: '#6ee7b7',
        dark: '#14231b',
        darkPage: '#0d1712',
        positive: '#10b981',
        negative: '#f87171',
        info: '#38bdf8',
        warning: '#fbbf24'
      },
      light: {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#047857',
        dark: '#064e3b',
        darkPage: '#f6faf7',
        positive: '#059669',
        negative: '#dc2626',
        info: '#0284c7',
        warning: '#d97706'
      }
    },
    preview: {
      dark: {
        bg: '#0d1712',
        surface: '#14231b',
        surface2: '#1c3327',
        accent: '#10b981',
        border: '#223e30',
        ink: '#f0fdf4'
      },
      light: {
        bg: '#f6faf7',
        surface: '#ffffff',
        surface2: '#edf7f0',
        accent: '#059669',
        border: '#d1e7dd',
        ink: '#064e3b'
      }
    }
  },

  cosmic: {
    id: 'cosmic',
    label: 'Cosmic',
    tagline: 'Modern workflow',
    colors: {
      dark: {
        primary: '#818cf8',
        secondary: '#a78bfa',
        accent: '#c7d2fe',
        dark: '#181b2c',
        darkPage: '#10121d',
        positive: '#34d399',
        negative: '#f87171',
        info: '#818cf8',
        warning: '#fbbf24'
      },
      light: {
        primary: '#4f46e5',
        secondary: '#6366f1',
        accent: '#3730a3',
        dark: '#181926',
        darkPage: '#f7f8fc',
        positive: '#059669',
        negative: '#dc2626',
        info: '#4f46e5',
        warning: '#d97706'
      }
    },
    preview: {
      dark: {
        bg: '#10121d',
        surface: '#181b2c',
        surface2: '#21253c',
        accent: '#818cf8',
        border: '#292d49',
        ink: '#f3f4f6'
      },
      light: {
        bg: '#f7f8fc',
        surface: '#ffffff',
        surface2: '#eef0f8',
        accent: '#4f46e5',
        border: '#dfe2f0',
        ink: '#111827'
      }
    }
  },

  amber: {
    id: 'amber',
    label: 'Amber',
    tagline: 'Executive comfort',
    colors: {
      dark: {
        primary: '#f59e0b',
        secondary: '#fbbf24',
        accent: '#fde68a',
        dark: '#292524',
        darkPage: '#1c1917',
        positive: '#34d399',
        negative: '#f87171',
        info: '#60a5fa',
        warning: '#f59e0b'
      },
      light: {
        primary: '#d97706',
        secondary: '#f59e0b',
        accent: '#92400e',
        dark: '#1c1917',
        darkPage: '#faf8f5',
        positive: '#059669',
        negative: '#dc2626',
        info: '#2563eb',
        warning: '#d97706'
      }
    },
    preview: {
      dark: {
        bg: '#1c1917',
        surface: '#292524',
        surface2: '#383431',
        accent: '#f59e0b',
        border: '#383431',
        ink: '#f5f5f4'
      },
      light: {
        bg: '#faf8f5',
        surface: '#ffffff',
        surface2: '#f3efea',
        accent: '#d97706',
        border: '#e6e0d6',
        ink: '#1c1917'
      }
    }
  },

  teal: {
    id: 'teal',
    label: 'Teal',
    tagline: 'Dense cockpit (classic Pachi look)',
    colors: {
      dark: {
        primary: '#2dd4bf',
        secondary: '#60a5fa',
        accent: '#5eead4',
        dark: '#10141b',
        darkPage: '#0a0d12',
        positive: '#34d399',
        negative: '#f87171',
        info: '#60a5fa',
        warning: '#fbbf24'
      },
      light: {
        primary: '#0d9488',
        secondary: '#2dd4bf',
        accent: '#0f766e',
        dark: '#1a2232',
        darkPage: '#f0f4f8',
        positive: '#059669',
        negative: '#dc2626',
        info: '#2563eb',
        warning: '#d97706'
      }
    },
    preview: {
      dark: {
        bg: '#0a0d12',
        surface: '#10141b',
        surface2: '#161b23',
        accent: '#2dd4bf',
        border: '#1f2530',
        ink: '#e6eaf2'
      },
      light: {
        bg: '#f0f4f8',
        surface: '#ffffff',
        surface2: '#e8edf3',
        accent: '#0d9488',
        border: '#d1d9e0',
        ink: '#1a2232'
      }
    }
  }
}
