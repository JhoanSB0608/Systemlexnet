import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { alpha } from '@mui/material/styles';

export const THEME_STORAGE_KEY = 'systemlex_theme_mode';

export const ThemeModeContext = createContext({
  mode: 'light',
  toggleMode: () => {},
  setMode: () => {},
});

const sharedTypography = {
  fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.02em' },
  h2: { fontWeight: 800, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, letterSpacing: '-0.01em' },
  h4: { fontWeight: 700 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 600 },
};

const sharedShape = {
  borderRadius: 12,
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },
  },
};

const buildBackgroundOverrides = (mode) => {
  if (mode === 'dark') {
    return {
      body: {
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.16), transparent 45%),
          radial-gradient(circle at 85% 20%, rgba(139, 92, 246, 0.14), transparent 45%),
          radial-gradient(circle at 50% 100%, rgba(22, 163, 74, 0.08), transparent 55%)
        `,
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
      },
    };
  }
  return {
    body: {
      backgroundImage: `
        radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.10), transparent 45%),
        radial-gradient(circle at 85% 20%, rgba(139, 92, 246, 0.10), transparent 45%),
        radial-gradient(circle at 50% 100%, rgba(22, 163, 74, 0.07), transparent 55%)
      `,
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
    },
  };
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#60a5fa' },
    secondary: { main: '#7c3aed', dark: '#6d28d9', light: '#a78bfa' },
    success: { main: '#16a34a', dark: '#15803d', light: '#4ade80' },
    error: { main: '#dc2626', dark: '#b91c1c', light: '#f87171' },
    warning: { main: '#d97706', dark: '#b45309', light: '#fbbf24' },
    info: { main: '#0284c7', dark: '#0369a1', light: '#38bdf8' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    text: { primary: 'rgba(15, 23, 42, 0.92)', secondary: 'rgba(71, 85, 105, 0.85)' },
    divider: alpha('#0f172a', 0.08),
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: buildBackgroundOverrides('light'),
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#60a5fa', dark: '#3b82f6', light: '#93c5fd' },
    secondary: { main: '#a78bfa', dark: '#8b5cf6', light: '#c4b5fd' },
    success: { main: '#4ade80', dark: '#22c55e', light: '#86efac' },
    error: { main: '#f87171', dark: '#ef4444', light: '#fca5a5' },
    warning: { main: '#fbbf24', dark: '#f59e0b', light: '#fcd34d' },
    info: { main: '#38bdf8', dark: '#0ea5e9', light: '#7dd3fc' },
    background: { default: '#0b1220', paper: '#111a2e' },
    text: { primary: 'rgba(240, 244, 250, 0.92)', secondary: 'rgba(160, 174, 192, 0.85)' },
    divider: alpha('#ffffff', 0.08),
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: buildBackgroundOverrides('dark'),
    },
  },
});

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      setMode,
    }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <MuiThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);