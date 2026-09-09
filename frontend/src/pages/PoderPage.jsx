import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Alert, AlertTitle, Collapse, Stack, Container, alpha, useTheme,
  Fade, Grow, Avatar, IconButton, CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import PoderForm from '../components/forms/PoderForm';
import { generarPoderPdf } from '../services/poderService';
import { showSuccess, handleAxiosError } from '../utils/alert';
import SharedGlassCard from '../components/common/GlassCard';

const GlassCard = React.forwardRef(({ children, ...props }, ref) => (
  <SharedGlassCard ref={ref} {...props}>
    {children}
  </SharedGlassCard>
));

const PoderPage = () => {
  const theme = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (data) => {
    try {
      setIsUploading(true);
      setError('');
      setSuccess('');

      console.log('[PoderPage] Data received from form:', {
        ...data,
        firma: data.firma ? { source: data.firma.source, data: '[base64 omitido en logs]' } : null,
      });

      // El servicio genera el PDF en el backend y fuerza la descarga en el navegador
      await generarPoderPdf(data);

      showSuccess('¡Éxito! El documento de poder fue generado y se inició su descarga.');
      setSuccess('¡Éxito! El documento de poder fue generado y se inició su descarga.');
    } catch (err) {
      handleAxiosError(err, 'No se pudo generar el PDF del poder. Intente de nuevo.');
      setError(err.message || 'No se pudo generar el PDF del poder. Intente de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        py: { xs: 4, md: 6 },
        background: `
          linear-gradient(135deg, rgba(30, 144, 255, 0.05) 0%, rgba(138, 43, 226, 0.05) 100%),
          radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.1), transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1), transparent 50%)
        `,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          opacity: 0.03,
          zIndex: -1,
        },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          {/* Header */}
          <Fade in={isVisible} timeout={800}>
            <GlassCard hover={false}>
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.05)' },
                      },
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: { xs: '1.5rem', md: '2rem' }
                      }}
                    >
                      Generar Poder
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      Diligencie los datos para generar y descargar el documento de poder en PDF.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </GlassCard>
          </Fade>

          {/* Success Alert */}
          <Collapse in={!!success}>
            <GlassCard
              hover={false}
              sx={{
                border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              }}
            >
              <Alert
                severity="success"
                icon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
                sx={{
                  background: 'transparent',
                  border: 'none',
                  '& .MuiAlert-message': { width: '100%' }
                }}
                action={
                  <IconButton
                    size="small"
                    onClick={() => setSuccess('')}
                    sx={{ color: theme.palette.success.main }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <AlertTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  ¡Documento Generado Exitosamente!
                </AlertTitle>
                <Typography variant="body2">{success}</Typography>
              </Alert>
            </GlassCard>
          </Collapse>

          {/* Error Alert */}
          <Collapse in={!!error}>
            <GlassCard
              hover={false}
              sx={{
                border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
              }}
            >
              <Alert
                severity="error"
                icon={<ErrorIcon sx={{ fontSize: 28 }} />}
                sx={{ background: 'transparent', border: 'none' }}
                action={
                  <IconButton
                    size="small"
                    onClick={() => setError('')}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <AlertTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Error al Procesar</AlertTitle>
                <Typography variant="body2">{error}</Typography>
              </Alert>
            </GlassCard>
          </Collapse>

          {/* Info */}
          <Grow in={isVisible} timeout={1000}>
            <GlassCard>
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={1} direction="row" alignItems="center">
                  <InfoIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="body2" color="text.secondary">
                    Complete los campos, firme sobre el recuadro y pulse "Generar". El PDF se descargará automáticamente.
                  </Typography>
                </Stack>
              </Box>
            </GlassCard>
          </Grow>

          {/* Form */}
          <Grow in={isVisible} timeout={1200}>
            <GlassCard>
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                {isUploading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <Stack alignItems="center" spacing={2}>
                      <CircularProgress size={48} thickness={4} />
                      <Typography variant="body2" color="text.secondary">
                        Generando documento PDF...
                      </Typography>
                    </Stack>
                  </Box>
                ) : (
                  <PoderForm isUploading={isUploading} onSubmit={handleSubmit} />
                )}
              </Box>
            </GlassCard>
          </Grow>
        </Stack>
      </Container>
    </Box>
  );
};

export default PoderPage;