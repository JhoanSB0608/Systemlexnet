import React, { useContext } from 'react';
import { AppBar, Toolbar, Button, Box, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { useThemeMode } from '../theme/ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

const navegacion = [
  { to: '/acreedores', label: 'Acreedores', color: '#2563eb', icon: '💳' },
  { to: '/nueva-solicitud', label: 'Nueva Solicitud', color: '#16a34a', icon: '➕' },
  { to: '/archiver', label: 'Archivador', color: '#d97706', icon: '🗄️' },
  { to: '/admin', label: 'Admin', color: '#7c3aed', icon: '⚙️', soloAdmin: true },
];

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const homePath = user ? '/admin' : '/';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        zIndex: 1200,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.75)} 0%, ${alpha(theme.palette.background.paper, 0.55)} 100%)`,
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: `1px solid ${alpha(mode === 'dark' ? '#ffffff' : '#0f172a', 0.08)}`,
        boxShadow: mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.45)'
          : '0 8px 32px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: '64px', sm: '68px' },
          padding: { xs: '0 16px', sm: '0 24px' },
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        <Box
          component={Link}
          to={homePath}
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { transform: 'scale(1.02)' },
          }}
        >
          <img src="/logoPrincipal.png" alt="SystemLEX Logo" style={{ height: '52px', marginRight: '8px' }} />
        </Box>

        {user && (
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              marginRight: 1,
              padding: '6px 16px',
              borderRadius: '25px',
              background: alpha(theme.palette.primary.main, 0.1),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
             {user.name || 'Usuario'}
          </Box>
        )}

        {/* Toggle modo claro/oscuro */}
        <Tooltip title={mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}>
          <IconButton
            onClick={toggleMode}
            sx={{
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
              color: theme.palette.text.primary,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                transform: 'translateY(-2px)',
              },
            }}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {user ? (
            <>
              {navegacion.filter((n) => !n.soloAdmin || user.isAdmin).map((item) => (
                <Button
                  key={item.to}
                  color="inherit"
                  component={Link}
                  to={item.to}
                  sx={{
                    borderRadius: '12px',
                    padding: { xs: '6px 8px', sm: '8px 16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    color: theme.palette.text.primary,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    background: alpha(item.color, 0.08),
                    border: `1px solid ${alpha(item.color, 0.22)}`,
                    '&:hover': {
                      background: alpha(item.color, 0.18),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 20px ${alpha(item.color, 0.3)}`,
                    },
                    '&::before': {
                      content: `"${item.icon}"`,
                      marginRight: { xs: 0, sm: '8px' },
                      fontSize: '14px',
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {item.label}
                  </Box>
                </Button>
              ))}

              <Button
                color="inherit"
                onClick={logout}
                sx={{
                  borderRadius: '12px',
                  padding: { xs: '6px 8px', sm: '8px 16px' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  color: theme.palette.text.primary,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: alpha('#dc2626', 0.1),
                  border: `1px solid ${alpha('#dc2626', 0.25)}`,
                  '&:hover': {
                    background: alpha('#dc2626', 0.18),
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)',
                  },
                  '&::before': {
                    content: '"🚪"',
                    marginRight: { xs: 0, sm: '8px' },
                    fontSize: '14px',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Salir
                </Box>
              </Button>
            </>
          ) : (
            <>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                sx={{
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: alpha(theme.palette.background.paper, 0.5),
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.1),
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Iniciar Sesión
              </Button>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                sx={{
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #16a34a, #0d9488)',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(22, 163, 74, 0.45)',
                  },
                }}
              >
                Registrarse
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;