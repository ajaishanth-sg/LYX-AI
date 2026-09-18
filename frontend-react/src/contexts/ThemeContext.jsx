import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const DEFAULT_THEME = {
  version: 4,
  mode: "light",
  bgEnabled: false,
  bgImage: null,
  overlayColor: "transparent",
  bgBlur: false,
  applyToAll: false,
  chatColorEnabled: false,
  fontSize: 15,
};

const THEME_STORAGE_KEY = 'lyx-theme-v2';

const normalizeTheme = (savedTheme) => {
  const parsed = typeof savedTheme === 'string' ? JSON.parse(savedTheme) : savedTheme;
  const theme = { ...DEFAULT_THEME, ...(parsed && typeof parsed === 'object' ? parsed : {}) };

  if (theme.version !== DEFAULT_THEME.version || theme.bgEnabled) {
    theme.version = DEFAULT_THEME.version;
    theme.mode = "light";
    theme.bgEnabled = false;
    theme.bgImage = null;
    theme.overlayColor = "transparent";
    theme.bgBlur = false;
    theme.applyToAll = false;
    theme.chatColorEnabled = false;
  }

  return theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        const migrated = normalizeTheme(saved);
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (error) {
      console.warn('Unable to load appearance settings', error);
    }

    return DEFAULT_THEME;
  });

  const setTheme = (newThemeOrUpdater) => {
    setThemeState((prev) => {
      const updated = typeof newThemeOrUpdater === 'function' ? newThemeOrUpdater(prev) : newThemeOrUpdater;
      const normalized = normalizeTheme(updated);
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    });
  };

  const resetTheme = () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    setThemeState(DEFAULT_THEME);
  };

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = theme.mode === 'dark' || (theme.mode === 'system' && mediaQuery.matches);

      root.classList.toggle('dark-mode', isDark);
      root.classList.toggle('light-mode', !isDark);
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
      root.style.setProperty('--app-bg-image', 'none');
      root.style.setProperty('--app-bg-overlay', 'transparent');
      root.style.setProperty('--app-bg-blur', 'none');
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme.mode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
