import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Typography, 
  Box, 
  Alert, 
  AlertTitle, 
  Collapse, 
  Button, 
  Stack,
  Container,
  Paper,
  alpha,
  useTheme,
  Fade,
  Grow,
  Avatar,
  Chip,
  IconButton,
  Zoom
} from '@mui/material';
import {
  Description as DescriptionIcon,
  PictureAsPdf as PictureAsPdfIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import InsolvenciaForm from '../components/forms/InsolvenciaForm';
import ConciliacionUnificadaForm from '../components/forms/ConciliacionUnificadaForm';
import { createSolicitud, downloadSolicitudDocument } from '../services/solicitudService';
import { createConciliacion, downloadConciliacionDocument } from '../services/conciliacionService';
import { toast } from 'react-toastify';
import { handleAxiosError, showSuccess } from '../utils/alert';

// Glassmorphism Card Component
const GlassCard = React.forwardRef(({ children, sx = {}, hover = true, ...props }, ref) => {
  return (
    <Paper
      ref={ref}
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.05)
        `,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
        },
        ...(hover && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.1)
            `,
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Paper>
  );
});

// Lista unificada de tipos de solicitud con metadata
const tiposDeSolicitud = [
  {
    value: 'Solicitud de Insolvencia Económica de Persona Natural No Comerciante',
    label: 'Insolvencia Económica',
    shortLabel: 'Insolvencia',
    icon: '💰',
    color: '#f44336',
  },
  {
    value: 'Solicitud de Conciliación Unificada',
    label: 'Solicitud de Conciliación',
    shortLabel: 'Conciliación',
    icon: '⚖️',
    color: '#4caf50',
  }
];

// Mapa para renderizar el formulario correcto
const formComponentMap = {
  'Solicitud de Insolvencia Económica de Persona Natural No Comerciante': <InsolvenciaForm />,
  'Solicitud de Conciliación Unificada': <ConciliacionUnificadaForm />
};

const NuevaSolicitudPage = () => {
  const theme = useTheme();
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdSolicitudId, setCreatedSolicitudId] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState({ pdf: false, docx: false });
  const [formResetToken, setFormResetToken] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleTipoChange = (event) => {
    setTipoSeleccionado(event.target.value);
    setSuccess('');
    setError('');
    setCreatedSolicitudId(null);
  };

  const handleFormSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');
      setCreatedSolicitudId(null);
      
      console.log("[NuevaSolicitudPage] Data received from form:", data);

      let createdSolicitud;
      if (tipoSeleccionado === 'Solicitud de Conciliación Unificada') {
        // The data object from the form is sent directly
        createdSolicitud = await createConciliacion(data);
      } else {
        // Add the tipoSolicitud to the data object and send directly
        const dataToSend = { ...data, tipoSolicitud: tipoSeleccionado };
        createdSolicitud = await createSolicitud(dataToSend);
      }
      
      showSuccess('¡Éxito! La solicitud ha sido guardada correctamente.');
      setCreatedSolicitudId(createdSolicitud._id);
      setFormResetToken(Date.now());
      setSuccess('¡Éxito! La solicitud ha sido guardada correctamente.'); // Keep to show download buttons
    } catch (err) {
      handleAxiosError(err, 'No se pudo guardar la solicitud. Intente de nuevo.');
      setError(err.message || 'No se pudo guardar la solicitud. Intente de nuevo.'); // Keep for local error display if needed
    }
  };


  const handleDownload = async (format) => {
    if (!createdSolicitudId) return;
    
    setIsDownloading(prev => ({ ...prev, [format]: true }));
    const toastId = toast.loading(`Descargando documento ${format.toUpperCase()}, por favor espere...`);

    try {
      if (tipoSeleccionado === 'Solicitud de Conciliación Unificada') {
        await downloadConciliacionDocument(createdSolicitudId, format);
      } else {
        await downloadSolicitudDocument(createdSolicitudId, format);
      }

      toast.update(toastId, { 
        render: "¡Descarga Completada!", 
        type: "success", 
        isLoading: false, 
        autoClose: 5000 
      });
    } catch (err) {
      toast.dismiss(toastId);
      handleAxiosError(err, 'Error al descargar el documento');
    } finally {
      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, [format]: false }));
      }, 1000);
    }
  };


  const renderForm = () => {
    if (!tipoSeleccionado) return null;
    const formToRender = formComponentMap[tipoSeleccionado];
    return React.cloneElement(formToRender, { onSubmit: handleFormSubmit, resetToken: formResetToken });
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                      >
                        Nueva Solicitud
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Complete el formulario para generar su documento legal
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            </GlassCard>
          </Fade>

          {/* Success Alert */}
          <Collapse in={!!success}>
            <Zoom in={!!success}>
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
                  <AlertTitle sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
                    ¡Solicitud Guardada Exitosamente! 🎉
                  </AlertTitle>
                  <Typography variant="body2" sx={{ mb: 2 }}>{success}</Typography>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={isDownloading.pdf ? null : <PictureAsPdfIcon />}
                      onClick={() => handleDownload('pdf')}
                      disabled={!createdSolicitudId || isDownloading.pdf}
                      sx={{
                        borderRadius: '12px',
                        py: 1.2,
                        px: 3,
                        background: 'linear-gradient(135deg, #f44336, #e91e63)',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 16px rgba(244, 67, 54, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #d32f2f, #c2185b)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4)',
                        },
                        '&:disabled': {
                          background: 'rgba(0, 0, 0, 0.12)',
                        }
                      }}
                    >
                      {isDownloading.pdf ? (
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          }
                        }} />
                      ) : 'Descargar PDF'}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={isDownloading.docx ? null : <DescriptionIcon />}
                      onClick={() => handleDownload('docx')}
                      disabled={!createdSolicitudId || isDownloading.docx}
                      sx={{
                        borderRadius: '12px',
                        py: 1.2,
                        px: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                        '&:disabled': {
                          background: 'rgba(0, 0, 0, 0.12)',
                        }
                      }}
                    >
                      {isDownloading.docx ? (
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          }
                        }} />
                      ) : 'Descargar DOCX'}
                    </Button>
                  </Stack>
                </Alert>
              </GlassCard>
            </Zoom>
          </Collapse>

          {/* Error Alert */}
          <Collapse in={!!error}>
            <Zoom in={!!error}>
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
                  sx={{ 
                    background: 'transparent',
                    border: 'none'
                  }}
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
            </Zoom>
          </Collapse>

          {/* Form Selection */}
          <Grow in={isVisible} timeout={1000}>
            <GlassCard>
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                      Seleccione el tipo de solicitud
                    </Typography>
                    
                    <FormControl fullWidth>
                      <InputLabel id="tipo-solicitud-label">Tipo de Solicitud</InputLabel>
                      <Select
                        labelId="tipo-solicitud-label"
                        value={tipoSeleccionado}
                        label="Tipo de Solicitud"
                        onChange={handleTipoChange}
                        sx={{
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                          },
                          '& .MuiSelect-select': {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }
                        }}
                      >
                        {tiposDeSolicitud.map((tipo) => (
                          <MenuItem 
                            key={tipo.value} 
                            value={tipo.value}
                            sx={{
                              borderRadius: '8px',
                              mx: 1,
                              my: 0.5,
                              '&:hover': {
                                background: alpha(tipo.color, 0.1),
                              },
                              '&.Mui-selected': {
                                background: alpha(tipo.color, 0.15),
                                '&:hover': {
                                  background: alpha(tipo.color, 0.2),
                                }
                              }
                            }}
                          >
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  background: alpha(tipo.color, 0.1),
                                  fontSize: '1.2rem'
                                }}
                              >
                                {tipo.icon}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {tipo.label}
                                </Typography>
                              </Box>
                              <Chip
                                label={tipo.shortLabel}
                                size="small"
                                sx={{
                                  background: alpha(tipo.color, 0.1),
                                  color: tipo.color,
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              />
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Stack>
              </Box>
            </GlassCard>
          </Grow>

          {/* Form Container */}
          {tipoSeleccionado && (
            <Grow in={!!tipoSeleccionado} timeout={1200}>
              <GlassCard>
                <Box sx={{ p: { xs: 3, md: 4 } }}>
                  {renderForm()}
                </Box>
              </GlassCard>
            </Grow>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default NuevaSolicitudPage;