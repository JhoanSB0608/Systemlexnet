import React, { useState, useEffect } from 'react';
import {
  Select, MenuItem, FormControl, InputLabel, Typography, Box, Alert, AlertTitle,
  Collapse, Button, Stack, Container, Paper, alpha, useTheme, Fade, Grow, Avatar,
  Chip, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Archive as ArchiveIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import ArchiverInsolvenciaForm from '../components/forms/ArchiverInsolvenciaForm';
import ArchiverConciliacionForm from '../components/forms/ArchiverConciliacionForm';
import { createArchiverEntry, getArchiverEntryById } from '../services/archiverService';
import { showSuccess, handleAxiosError } from '../utils/alert';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// Glassmorphism Card Component (reused)
const GlassCard = React.forwardRef(({ children, sx = {}, hover = true, ...props }, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Paper
      ref={ref}
      elevation={0}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
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

// Unified list of request types with metadata
const tiposDeSolicitud = [
  {
    value: 'Solicitud de Insolvencia Económica',
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

const ArchiverPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Get navigate function
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdArchiverEntryId, setCreatedArchiverEntryId] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [archiverEntryRefreshKey, setArchiverEntryRefreshKey] = useState(0); // To refetch entry after anexo upload

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleTipoChange = (event) => {
    setTipoSeleccionado(event.target.value);
    setSuccess('');
    setError('');
    setCreatedArchiverEntryId(null);
  };

  const { data: currentArchiverEntry, isLoading: isLoadingArchiverEntry } = useQuery({
    queryKey: ['archiverEntry', createdArchiverEntryId, archiverEntryRefreshKey],
    queryFn: () => getArchiverEntryById(createdArchiverEntryId),
    enabled: !!createdArchiverEntryId,
    onSuccess: (data) => {
      console.log("Fetched current archiver entry for display:", data);
    },
    onError: (err) => {
      handleAxiosError(err, "Error al cargar la entrada del archivador.");
    }
  });

  const handleFormSubmit = async (data) => {
    try {
      setError('');
      setSuccess('');
      setCreatedArchiverEntryId(null);

      console.log("[ArchiverPage] Data received from form:", data);

      const createdEntry = await createArchiverEntry(data);

      showSuccess('¡Éxito! La entrada del archivador ha sido guardada correctamente.');
      setCreatedArchiverEntryId(createdEntry._id);
      setSuccess('¡Éxito! La entrada del archivador ha sido guardada correctamente.');
      queryClient.invalidateQueries(['archivedEntries']); // Invalidate archived entries list
    } catch (err) {
      handleAxiosError(err, 'No se pudo guardar la entrada del archivador. Intente de nuevo.');
      setError(err.message || 'No se pudo guardar la entrada del archivador. Intente de nuevo.');
    }
  };

  const handleAnexoUploadSuccess = () => {
    setArchiverEntryRefreshKey(prev => prev + 1); // Trigger refetch of the entry
    queryClient.invalidateQueries(['archivedEntries']); // Invalidate archived entries list
  };


  const renderForm = () => {
    if (!tipoSeleccionado) return null;

    const commonProps = {
      onSubmit: handleFormSubmit,
      archiverEntryId: createdArchiverEntryId,
      onUploadSuccess: handleAnexoUploadSuccess,
    };

    if (tipoSeleccionado === 'Solicitud de Insolvencia Económica') {
      return (
        <ArchiverInsolvenciaForm
          {...commonProps}
          initialData={currentArchiverEntry?.insolvenciaData}
        />
      );
    } else if (tipoSeleccionado === 'Solicitud de Conciliación Unificada') {
      return (
        <ArchiverConciliacionForm
          {...commonProps}
          initialData={currentArchiverEntry?.conciliacionData}
        />
      );
    }
    return null;
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
                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.05)' },
                        },
                      }}
                    >
                      <ArchiveIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                      >
                        Archivador de Solicitudes
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Cree y gestione registros de insolvencia o conciliación.
                      </Typography>
                    </Box>
                  </Stack>
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
                  ¡Entrada Archivada Exitosamente! 🎉
                </AlertTitle>
                <Typography variant="body2">{success}</Typography>
                <Button
                  component={Tooltip}
                  title="Ver entradas archivadas"
                  variant="contained"
                  startIcon={<FolderOpenIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/archiver')} // Navigate to /archiver
                >
                  Ver mis archivos
                </Button>
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
                      <InfoIcon sx={{ color: theme.palette.primary.main }} />
                      Seleccione el tipo de solicitud a archivar
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
                  {isLoadingArchiverEntry ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <Stack alignItems="center" spacing={2}>
                        <CircularProgress size={40} thickness={4} />
                        <Typography variant="body2" color="text.secondary">
                          Cargando datos del archivador...
                        </Typography>
                      </Stack>
                    </Box>
                  ) : (
                    renderForm()
                  )}
                </Box>
              </GlassCard>
            </Grow>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default ArchiverPage;
