export type Theme = 'dark' | 'light';

export const THEME_KEY = 'htpn-theme';

export function getTheme(): Theme {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'light' || val === 'dark') {
      return val;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'dark';
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore localStorage errors
  }

  document.documentElement.dataset.theme = theme;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = theme === 'light' ? '#F3EEE4' : '#121010';

  window.dispatchEvent(new CustomEvent('htpn-theme-change', { detail: theme }));
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
