import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const DEFAULT_THEME = {
  mode: "dark", // "system" | "light" | "dark"
  bgEnabled: true,
  bgImage: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
  overlayColor: "transparent",
  bgBlur: false,
  applyToAll: true,
  chatColorEnabled: false,
  fontSize: 15,
  textColor: "#0f172a",
  sidebarColor: "#ffffff",
  chatBgColor: "#ffffff",
  userBubbleColor: "#ffffff",
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('lyx-theme-v2');
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  const setTheme = (newThemeOrUpdater) => {
    setThemeState((prev) => {
      const updated = typeof newThemeOrUpdater === 'function' ? newThemeOrUpdater(prev) : newThemeOrUpdater;
      localStorage.setItem('lyx-theme-v2', JSON.stringify(updated));
      return updated;
    });
  };

  const resetTheme = () => {
    setThemeState(DEFAULT_THEME);
    localStorage.removeItem('lyx-theme-v2');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme.mode === "dark") {
      root.classList.add("dark-mode");
      root.classList.remove("light-mode");
    } else if (theme.mode === "light") {
      root.classList.add("light-mode");
      root.classList.remove("dark-mode");
    }

    if (theme.bgEnabled && theme.bgImage) {
      root.style.setProperty('--app-bg-image', `url(${theme.bgImage})`);
      root.style.setProperty('--app-bg-overlay', theme.overlayColor || 'transparent');
      root.style.setProperty('--app-bg-blur', theme.bgBlur ? 'blur(16px)' : 'none');
    } else {
      root.style.setProperty('--app-bg-image', 'none');
      root.style.setProperty('--app-bg-overlay', 'transparent');
      root.style.setProperty('--app-bg-blur', 'none');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
