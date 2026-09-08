import React, { useState } from 'react';
import { Card, useTheme, alpha } from '@mui/material';

// GlassCard theme-aware compartido para toda la plataforma.
// Se usa en modo claro y oscuro; soporta un efecto "shimmer" opcional.
const GlassCard = React.forwardRef(({ children, sx = {}, hover = true, shimmer = false }, ref) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const isDark = theme.palette.mode === 'dark';
  const glowColor = isDark ? theme.palette.text.primary : theme.palette.primary.main;

  return (
    <Card
      ref={ref}
      onMouseEnter={() => hover && shimmer && setIsHovered(true)}
      onMouseLeave={() => hover && shimmer && setIsHovered(false)}
      sx={{
        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, isDark ? 0.55 : 0.8)} 0%, ${alpha(theme.palette.background.paper, isDark ? 0.35 : 0.45)} 100%)`,
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        border: `1px solid ${alpha(isDark ? '#ffffff' : theme.palette.primary.main, isDark ? 0.12 : 0.1)}`,
        borderRadius: 3,
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.5)'
          : '0 8px 32px rgba(15, 23, 42, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        color: theme.palette.text.primary,
        ...(hover && {
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.01)',
            boxShadow: `0 20px 40px ${alpha(glowColor, 0.15)}`,
            '&::before': {
              opacity: 1,
            }
          }
        }),
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        },
        ...(isHovered && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)',
            animation: 'shimmer 2s ease-in-out infinite',
            '@keyframes shimmer': {
              '0%': { left: '-100%' },
              '100%': { left: '100%' },
            },
          }
        }),
        ...sx,
      }}
    >
      {children}
    </Card>
  );
});

export default GlassCard;