export type Theme =
  | 'backbar'
  | 'daylight'
  | 'classic'
  | 'blacklight'
  | 'sunset'
  | 'arcade'
  | 'honkytonk'
  | 'broadcast';

export interface ThemeInfo {
  id: Theme;
  label: string;
  colors: [string, string, string];
  swatch: [string, string, string];
}

export const THEME_KEY = 'htpn-theme';
export const ANIM_KEY = 'htpn-anim';

export const THEMES: ThemeInfo[] = [
  {
    id: 'backbar',
    label: 'Back-Bar',
    colors: ['#121010', '#23262A', '#FFB238'],
    swatch: ['#121010', '#23262A', '#FFB238'],
  },
  {
    id: 'daylight',
    label: 'Daylight Chalk',
    colors: ['#F3EEE4', '#E2DCD0', '#C77A00'],
    swatch: ['#F3EEE4', '#E2DCD0', '#C77A00'],
  },
  {
    id: 'classic',
    label: 'Classic Glass',
    colors: ['#070B10', '#0E1520', '#10B981'],
    swatch: ['#070B10', '#0E1520', '#10B981'],
  },
  {
    id: 'blacklight',
    label: 'Blacklight UV',
    colors: ['#070312', '#130924', '#00F0FF'],
    swatch: ['#070312', '#130924', '#00F0FF'],
  },
  {
    id: 'sunset',
    label: 'Patio Sunset',
    colors: ['#240D1E', '#3A1E13', '#F97316'],
    swatch: ['#240D1E', '#3A1E13', '#F97316'],
  },
  {
    id: 'arcade',
    label: '8-Bit Arcade',
    colors: ['#050813', '#0C1222', '#FF0055'],
    swatch: ['#050813', '#0C1222', '#FF0055'],
  },
  {
    id: 'honkytonk',
    label: 'Honky Tonk',
    colors: ['#F5EBD7', '#FCF7ED', '#B22222'],
    swatch: ['#F5EBD7', '#FCF7ED', '#B22222'],
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    colors: ['#0D2818', '#F8F9FA', '#E5B842'],
    swatch: ['#0D2818', '#F8F9FA', '#E5B842'],
  },
];

export const THEME_META_COLORS: Record<Theme, string> = {
  backbar: '#121010',
  daylight: '#F3EEE4',
  classic: '#070B10',
  blacklight: '#070312',
  sunset: '#240D1E',
  arcade: '#050813',
  honkytonk: '#F5EBD7',
  broadcast: '#0D2818',
};

export type AnimationsSetting = 'on' | 'off';

export async function loadThemeFonts(theme: Theme): Promise<void> {
  try {
    switch (theme) {
      case 'arcade':
        await import('@fontsource/press-start-2p/400.css');
        break;
      case 'sunset':
        await import('@fontsource/rye/400.css');
        break;
      case 'honkytonk':
        await import('@fontsource/rye/400.css');
        break;
      case 'broadcast':
        await Promise.all([
          import('@fontsource/oswald/400.css'),
          import('@fontsource/oswald/500.css'),
          import('@fontsource/oswald/700.css'),
        ]);
        break;
      default:
        break;
    }
  } catch (err) {
    console.warn('Failed to load fonts for theme:', theme, err);
  }
}

export function getTheme(): Theme {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark') return 'backbar';
      if (urlTheme === 'light') return 'daylight';
      if (urlTheme && THEMES.some(t => t.id === urlTheme)) {
        return urlTheme as Theme;
      }
    }
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'dark') {
      try {
        localStorage.setItem(THEME_KEY, 'backbar');
      } catch {
        // Ignore
      }
      return 'backbar';
    }
    if (val === 'light') {
      try {
        localStorage.setItem(THEME_KEY, 'daylight');
      } catch {
        // Ignore
      }
      return 'daylight';
    }
    if (val && THEMES.some(t => t.id === val)) {
      return val as Theme;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'backbar';
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore localStorage errors
  }

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEME_META_COLORS[theme] || '#121010';
  }

  void loadThemeFonts(theme);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('htpn-theme-change', { detail: theme }));
  }
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const currentIndex = THEMES.findIndex(t => t.id === current);
  const nextIndex = (currentIndex + 1) % THEMES.length;
  const next = THEMES[nextIndex >= 0 ? nextIndex : 0].id;
  setTheme(next);
  return next;
}

export function getAnimations(): AnimationsSetting {
  try {
    const val = localStorage.getItem(ANIM_KEY);
    if (val === 'on' || val === 'off') {
      return val;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'off';
    }
  } catch {
    // Ignore
  }
  return 'on';
}

export function setAnimations(anim: AnimationsSetting): void {
  try {
    localStorage.setItem(ANIM_KEY, anim);
  } catch {
    // Ignore
  }

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.anim = anim;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('htpn-anim-change', { detail: anim }));
  }
}

export function toggleAnimations(): AnimationsSetting {
  const next = getAnimations() === 'on' ? 'off' : 'on';
  setAnimations(next);
  return next;
}

// Ensure fonts are loaded and early attributes are set on load
if (typeof window !== 'undefined') {
  const initialTheme = getTheme();
  void loadThemeFonts(initialTheme);
  const initialAnim = getAnimations();
  if (typeof document !== 'undefined') {
    if (!document.documentElement.dataset.theme) {
      document.documentElement.dataset.theme = initialTheme;
    }
    if (!document.documentElement.dataset.anim) {
      document.documentElement.dataset.anim = initialAnim;
    }
  }
}
