import React, { useContext } from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const homePath = user ? '/admin' : '/';

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        top: 0, 
        zIndex: 1100,
        // Glassmorphism effect
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        // Gradient overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(30, 144, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%)',
          zIndex: -1,
        },
      }}
    >
      <Toolbar 
        sx={{ 
          minHeight: { xs: '64px', sm: '70px' },
          padding: { xs: '0 16px', sm: '0 24px' },
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
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <img src="/logoPrincipal.png" alt="SystemLEX Logo" style={{ height: '60px', marginRight: '8px' }} />
        </Box>
        
        {/* User indicator for smaller screens */}
        {user && (
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            marginRight: 2,
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '0.875rem',
          }}>
            {user.name || 'Usuario'}
          </Box>
        )}
        
        {/* Navigation buttons - always visible */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1 },
        }}>
          {user ? (
            <>
              {/* User name for larger screens */}
              <Box sx={{ 
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                marginRight: 2,
                padding: '6px 16px',
                borderRadius: '25px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}>
                👤 {user.name || 'Usuario'}
              </Box>

              <Button 
                color="inherit" 
                component={Link} 
                to="/acreedores"
                sx={{
                  borderRadius: '12px',
                  padding: { xs: '6px 8px', sm: '8px 16px' },
                  margin: '0 2px',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  },
                  '&::before': {
                    content: '"💳"',
                    marginRight: { xs: 0, sm: '8px' },
                    fontSize: { xs: '12px', sm: '14px' },
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Acreedores
                </Box>
              </Button>

              <Button 
                color="inherit" 
                component={Link} 
                to="/nueva-solicitud"
                sx={{
                  borderRadius: '12px',
                  padding: { xs: '6px 8px', sm: '8px 16px' },
                  margin: '0 2px',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  '&:hover': {
                    background: 'rgba(76, 175, 80, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                  },
                  '&::before': {
                    content: '"➕"',
                    marginRight: { xs: 0, sm: '8px' },
                    fontSize: { xs: '12px', sm: '14px' },
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                    Nueva Solicitud
                                  </Box>
                                </Button>
                  
                                <Button 
                                  color="inherit" 
                                  component={Link} 
                                  to="/archiver"
                                  sx={{
                                    borderRadius: '12px',
                                    padding: { xs: '6px 8px', sm: '8px 16px' },
                                    margin: '0 2px',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    fontWeight: 500,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    background: 'rgba(255, 159, 0, 0.1)',
                                    border: '1px solid rgba(255, 159, 0, 0.2)',
                                    '&:hover': {
                                      background: 'rgba(255, 159, 0, 0.2)',
                                      transform: 'translateY(-2px)',
                                      boxShadow: '0 4px 20px rgba(255, 159, 0, 0.3)',
                                    },
                                    '&::before': {
                                      content: '"🗄️"',
                                      marginRight: { xs: 0, sm: '8px' },
                                      fontSize: { xs: '12px', sm: '14px' },
                                    },
                                  }}
                                >
                                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                    Archivador
                                  </Box>
                                </Button>
                  
                                {user.isAdmin && (                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/admin"
                  sx={{
                    borderRadius: '12px',
                    padding: { xs: '6px 8px', sm: '8px 16px' },
                    margin: '0 2px',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 500,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    background: 'rgba(138, 43, 226, 0.1)',
                    border: '1px solid rgba(138, 43, 226, 0.2)',
                    '&:hover': {
                      background: 'rgba(138, 43, 226, 0.2)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)',
                    },
                    '&::before': {
                      content: '"⚙️"',
                      marginRight: { xs: 0, sm: '8px' },
                      fontSize: { xs: '12px', sm: '14px' },
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Admin
                  </Box>
                </Button>
              )}

              <Button 
                color="inherit" 
                onClick={logout}
                sx={{
                  borderRadius: '12px',
                  padding: { xs: '6px 8px', sm: '8px 16px' },
                  margin: '0 2px',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.2)',
                  '&:hover': {
                    background: 'rgba(244, 67, 54, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
                  },
                  '&::before': {
                    content: '"🚪"',
                    marginRight: { xs: 0, sm: '8px' },
                    fontSize: { xs: '12px', sm: '14px' },
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
                  margin: '0 4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  },
                  '&::before': {
                    content: '"🔐"',
                    marginRight: '8px',
                    fontSize: '14px',
                  },
                }}
              >
                Iniciar Sesión
              </Button>

              <Button 
                color="inherit" 
                component={Link} 
                to="/register"
                sx={{
                  borderRadius: '12px',
                  padding: '8px 16px',
                  margin: '0 4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  '&:hover': {
                    background: 'rgba(76, 175, 80, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                  },
                  '&::before': {
                    content: '"👤➕"',
                    marginRight: '8px',
                    fontSize: '14px',
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